import { Router, type IRouter } from "express";
import { db, appointmentsTable, servicesTable } from "@workspace/db";
import { eq, and, gte, lt, desc } from "drizzle-orm";
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
import { sendCustomerConfirmation } from "../lib/email";

const router: IRouter = Router();

function formatAppointment(appt: typeof appointmentsTable.$inferSelect, serviceName: string) {
  return {
    id: appt.id,
    customerName: appt.customerName,
    email: appt.email,
    phone: appt.phone,
    serviceId: appt.serviceId,
    serviceName,
    startTime: appt.startTime.toISOString(),
    endTime: appt.endTime.toISOString(),
    durationMinutes: Math.round(
      (appt.endTime.getTime() - appt.startTime.getTime()) / 60000,
    ),
    notes: appt.notes,
    status: appt.status,
    createdAt: appt.createdAt.toISOString(),
  };
}

router.get("/appointments", requireAdmin, async (req, res): Promise<void> => {
  const parsed = ListAppointmentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const conditions = [];

  if (parsed.data.date) {
    const date = parsed.data.date;
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);
    conditions.push(gte(appointmentsTable.startTime, dayStart));
    conditions.push(lt(appointmentsTable.startTime, dayEnd));
  }

  if (parsed.data.status) {
    conditions.push(
      eq(
        appointmentsTable.status,
        parsed.data.status as "pending" | "confirmed" | "completed" | "cancelled",
      ),
    );
  }

  const appointments = await db
    .select({
      appointment: appointmentsTable,
      service: servicesTable,
    })
    .from(appointmentsTable)
    .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(appointmentsTable.startTime));

  const formatted = appointments.map(({ appointment, service }) =>
    formatAppointment(appointment, service?.name || "Unknown Service"),
  );

  res.json(ListAppointmentsResponse.parse(formatted));
});

router.post("/appointments", async (req, res): Promise<void> => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { customerName, email, phone, serviceId, startTime, notes } = parsed.data;

  // Load the service
  const [service] = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.id, serviceId));

  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  const start = new Date(startTime);
  const end = new Date(start.getTime() + service.durationMinutes * 60 * 1000);

  // Check for conflicts
  const dateStr = start.toISOString().split("T")[0];
  const dayStart = new Date(`${dateStr}T00:00:00`);
  const dayEnd = new Date(`${dateStr}T23:59:59`);

  const existingAppointments = await db
    .select()
    .from(appointmentsTable)
    .where(
      and(
        gte(appointmentsTable.startTime, dayStart),
        lt(appointmentsTable.startTime, dayEnd),
        eq(appointmentsTable.status, "confirmed"),
      ),
    );

  for (const appt of existingAppointments) {
    const apptStart = new Date(appt.startTime);
    const apptEnd = new Date(appt.endTime);
    if (start < apptEnd && end > apptStart) {
      res.status(409).json({ error: "This time slot is already booked" });
      return;
    }
  }

  const [appointment] = await db
    .insert(appointmentsTable)
    .values({
      customerName,
      email,
      phone,
      serviceId,
      startTime: start,
      endTime: end,
      notes: notes || null,
      status: "confirmed",
    })
    .returning();

  // Send confirmation emails asynchronously
  const settings = await loadSettings();
  sendCustomerConfirmation(
    {
      customerName,
      email,
      phone,
      serviceName: service.name,
      startTime: start,
      durationMinutes: service.durationMinutes,
      notes,
    },
    settings.ownerEmail,
  ).catch(() => {});

  res.status(201).json(
    GetAppointmentResponse.parse(
      formatAppointment(appointment, service.name),
    ),
  );
});

router.get("/appointments/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetAppointmentParams.safeParse({ id: Number(raw) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid appointment ID" });
    return;
  }

  const [result] = await db
    .select({ appointment: appointmentsTable, service: servicesTable })
    .from(appointmentsTable)
    .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .where(eq(appointmentsTable.id, params.data.id));

  if (!result) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }

  res.json(
    GetAppointmentResponse.parse(
      formatAppointment(result.appointment, result.service?.name || "Unknown"),
    ),
  );
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

  // Load existing appointment
  const [existing] = await db
    .select({ appointment: appointmentsTable, service: servicesTable })
    .from(appointmentsTable)
    .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .where(eq(appointmentsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }

  const updateData: Record<string, unknown> = {};

  if (parsed.data.status) {
    updateData.status = parsed.data.status;
  }

  if (parsed.data.notes !== undefined) {
    updateData.notes = parsed.data.notes;
  }

  if (parsed.data.startTime) {
    const newStart = new Date(parsed.data.startTime);
    const durationMs =
      existing.appointment.endTime.getTime() - existing.appointment.startTime.getTime();
    updateData.startTime = newStart;
    updateData.endTime = new Date(newStart.getTime() + durationMs);
  }

  const [updated] = await db
    .update(appointmentsTable)
    .set(updateData)
    .where(eq(appointmentsTable.id, params.data.id))
    .returning();

  res.json(
    UpdateAppointmentResponse.parse(
      formatAppointment(updated, existing.service?.name || "Unknown"),
    ),
  );
});

router.delete("/appointments/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = CancelAppointmentParams.safeParse({ id: Number(raw) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid appointment ID" });
    return;
  }

  await db
    .update(appointmentsTable)
    .set({ status: "cancelled" })
    .where(eq(appointmentsTable.id, params.data.id));

  res.sendStatus(204);
});

export default router;
