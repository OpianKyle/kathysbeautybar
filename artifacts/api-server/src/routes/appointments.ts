import { Router, type IRouter } from "express";
import { z } from "zod";
import { pool, type DbAppointment, type DbService, type ResultSetHeader } from "../lib/db";
import {
  ListAppointmentsQueryParams,
  ListAppointmentsResponse,
  CreateAppointmentBody,
  GetAppointmentParams,
  GetAppointmentResponse,
  UpdateAppointmentParams,
  UpdateAppointmentBody,
  UpdateAppointmentResponse,
  CancelAppointmentParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";
import { loadSettings } from "./settings";
import { sendBookingConfirmation } from "../lib/email";

const router: IRouter = Router();

const APPT_SELECT = `
  SELECT a.id, a.customer_name AS customerName, a.email, a.phone,
         a.service_id AS serviceId, a.start_time AS startTime, a.end_time AS endTime,
         a.notes, a.status, a.created_at AS createdAt,
         COALESCE(s.name, 'Unknown Service') AS serviceName
  FROM appointments a
  LEFT JOIN services s ON a.service_id = s.id
`;

interface AppointmentRow extends DbAppointment {
  serviceName: string;
}

function formatAppointment(row: AppointmentRow) {
  return {
    id: row.id,
    customerName: row.customerName,
    email: row.email,
    phone: row.phone,
    serviceId: row.serviceId,
    serviceName: row.serviceName,
    startTime: row.startTime instanceof Date ? row.startTime.toISOString() : String(row.startTime),
    endTime: row.endTime instanceof Date ? row.endTime.toISOString() : String(row.endTime),
    durationMinutes: Math.round(
      (new Date(row.endTime).getTime() - new Date(row.startTime).getTime()) / 60000,
    ),
    notes: row.notes,
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

router.get("/appointments", requireAdmin, async (req, res): Promise<void> => {
  const parsed = ListAppointmentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (parsed.data.date) {
    conditions.push("a.start_time >= ? AND a.start_time <= ?");
    values.push(`${parsed.data.date} 00:00:00`, `${parsed.data.date} 23:59:59`);
  }

  if (parsed.data.status) {
    conditions.push("a.status = ?");
    values.push(parsed.data.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await pool.execute<AppointmentRow[]>(
    `${APPT_SELECT} ${where} ORDER BY a.start_time DESC`,
    values,
  );

  res.json(ListAppointmentsResponse.parse(rows.map(formatAppointment)));
});

router.post("/appointments", async (req, res): Promise<void> => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { customerName, email, phone, serviceId, startTime, notes } = parsed.data;

  const [serviceRows] = await pool.execute<DbService[]>(
    "SELECT id, name, description, price, duration_minutes AS durationMinutes, category, image_url AS imageUrl, active FROM services WHERE id = ?",
    [serviceId],
  );

  const service = serviceRows[0];
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  const start = new Date(startTime);
  const end = new Date(start.getTime() + service.durationMinutes * 60 * 1000);

  const dateStr = start.toISOString().split("T")[0];

  const [existing] = await pool.execute<DbAppointment[]>(
    `SELECT id, start_time AS startTime, end_time AS endTime FROM appointments
     WHERE DATE(start_time) = ? AND status = 'confirmed'`,
    [dateStr],
  );

  for (const appt of existing) {
    const apptStart = new Date(appt.startTime);
    const apptEnd = new Date(appt.endTime);
    if (start < apptEnd && end > apptStart) {
      res.status(409).json({ error: "This time slot is already booked" });
      return;
    }
  }

  const startMysql = start.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
  const endMysql = end.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO appointments (customer_name, email, phone, service_id, start_time, end_time, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
    [customerName, email, phone, serviceId, startMysql, endMysql, notes ?? null],
  );

  const [rows] = await pool.execute<AppointmentRow[]>(
    `${APPT_SELECT} WHERE a.id = ?`,
    [result.insertId],
  );

  const settings = await loadSettings();
  sendBookingConfirmation(
    {
      customerName,
      email,
      phone,
      notes,
      services: [
        {
          name: service.name,
          startTime: start,
          durationMinutes: service.durationMinutes,
          price: Number(service.price),
        },
      ],
    },
    settings.ownerEmail,
  ).catch(() => {});

  res.status(201).json(GetAppointmentResponse.parse(formatAppointment(rows[0])));
});

router.post("/appointments/batch", async (req, res): Promise<void> => {
  const BatchBody = z.object({
    customerName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    notes: z.string().optional(),
    services: z.array(
      z.object({
        serviceId: z.number().int().positive(),
        startTime: z.string(),
      }),
    ).min(1),
  });

  const parsed = BatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { customerName, email, phone, notes, services: serviceSlots } = parsed.data;

  const serviceIds = serviceSlots.map((s) => s.serviceId);
  const placeholders = serviceIds.map(() => "?").join(", ");
  const [serviceRows] = await pool.execute<DbService[]>(
    `SELECT id, name, description, price, duration_minutes AS durationMinutes, category, image_url AS imageUrl, active FROM services WHERE id IN (${placeholders})`,
    serviceIds,
  );

  const serviceMap = new Map(serviceRows.map((s) => [s.id, s]));

  for (const slot of serviceSlots) {
    if (!serviceMap.has(slot.serviceId)) {
      res.status(404).json({ error: `Service ${slot.serviceId} not found` });
      return;
    }
  }

  const dateStr = new Date(serviceSlots[0].startTime).toISOString().split("T")[0];
  const [existing] = await pool.execute<DbAppointment[]>(
    `SELECT id, start_time AS startTime, end_time AS endTime FROM appointments WHERE DATE(start_time) = ? AND status = 'confirmed'`,
    [dateStr],
  );

  const insertedIds: number[] = [];
  const emailServiceItems: { name: string; startTime: Date; durationMinutes: number; price: number }[] = [];

  for (const slot of serviceSlots) {
    const service = serviceMap.get(slot.serviceId)!;
    const start = new Date(slot.startTime);
    const end = new Date(start.getTime() + service.durationMinutes * 60 * 1000);

    for (const appt of existing) {
      const apptStart = new Date(appt.startTime);
      const apptEnd = new Date(appt.endTime);
      if (start < apptEnd && end > apptStart) {
        res.status(409).json({ error: `Time slot ${slot.startTime} is already booked` });
        return;
      }
    }

    const startMysql = start.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
    const endMysql = end.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO appointments (customer_name, email, phone, service_id, start_time, end_time, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
      [customerName, email, phone, slot.serviceId, startMysql, endMysql, notes ?? null],
    );
    insertedIds.push(result.insertId);

    existing.push({ id: result.insertId, startTime: start, endTime: end } as DbAppointment);

    emailServiceItems.push({
      name: service.name,
      startTime: start,
      durationMinutes: service.durationMinutes,
      price: Number(service.price),
    });
  }

  const settings = await loadSettings();
  sendBookingConfirmation(
    { customerName, email, phone, notes, services: emailServiceItems },
    settings.ownerEmail,
  ).catch(() => {});

  const idPlaceholders = insertedIds.map(() => "?").join(", ");
  const [rows] = await pool.execute<AppointmentRow[]>(
    `${APPT_SELECT} WHERE a.id IN (${idPlaceholders})`,
    insertedIds,
  );

  res.status(201).json(rows.map(formatAppointment));
});

router.get("/appointments/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetAppointmentParams.safeParse({ id: Number(raw) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid appointment ID" });
    return;
  }

  const [rows] = await pool.execute<AppointmentRow[]>(
    `${APPT_SELECT} WHERE a.id = ?`,
    [params.data.id],
  );

  if (!rows[0]) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }

  res.json(GetAppointmentResponse.parse(formatAppointment(rows[0])));
});

router.patch("/appointments/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateAppointmentParams.safeParse({ id: Number(raw) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid appointment ID" });
    return;
  }

  const parsed = UpdateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existingRows] = await pool.execute<AppointmentRow[]>(
    `${APPT_SELECT} WHERE a.id = ?`,
    [params.data.id],
  );

  if (!existingRows[0]) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }

  const existing = existingRows[0];
  const updates: string[] = [];
  const values: unknown[] = [];

  if (parsed.data.status) {
    updates.push("status = ?");
    values.push(parsed.data.status);
  }

  if (parsed.data.notes !== undefined) {
    updates.push("notes = ?");
    values.push(parsed.data.notes);
  }

  if (parsed.data.startTime) {
    const newStart = new Date(parsed.data.startTime);
    const durationMs =
      new Date(existing.endTime).getTime() - new Date(existing.startTime).getTime();
    const newEnd = new Date(newStart.getTime() + durationMs);
    updates.push("start_time = ?", "end_time = ?");
    values.push(
      newStart.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, ""),
      newEnd.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, ""),
    );
  }

  if (updates.length > 0) {
    values.push(params.data.id);
    await pool.execute(
      `UPDATE appointments SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );
  }

  const [updatedRows] = await pool.execute<AppointmentRow[]>(
    `${APPT_SELECT} WHERE a.id = ?`,
    [params.data.id],
  );

  res.json(UpdateAppointmentResponse.parse(formatAppointment(updatedRows[0])));
});

router.delete("/appointments/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = CancelAppointmentParams.safeParse({ id: Number(raw) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid appointment ID" });
    return;
  }

  await pool.execute(
    "UPDATE appointments SET status = 'cancelled' WHERE id = ?",
    [params.data.id],
  );

  res.sendStatus(204);
});

export default router;
