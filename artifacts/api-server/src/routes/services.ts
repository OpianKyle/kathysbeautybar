import { Router, type IRouter } from "express";
import { pool, type DbService, type ResultSetHeader } from "../lib/db";
import {
  ListServicesResponse,
  GetServiceResponse,
  GetServiceParams,
  CreateServiceBody,
  UpdateServiceBody,
  UpdateServiceParams,
  UpdateServiceResponse,
  DeleteServiceParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

const SERVICE_SELECT = `
  SELECT id, name, description, CAST(price AS DECIMAL(10,2)) AS price,
         duration_minutes AS durationMinutes, category, image_url AS imageUrl, active
  FROM services
`;

function mapService(s: DbService) {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    price: Number(s.price),
    durationMinutes: s.durationMinutes,
    category: s.category,
    imageUrl: s.imageUrl,
    active: !!s.active,
  };
}

router.get("/services", async (_req, res): Promise<void> => {
  const [rows] = await pool.execute<DbService[]>(
    `${SERVICE_SELECT} ORDER BY category, name`,
  );
  res.json(ListServicesResponse.parse(rows.map(mapService)));
});

router.post("/services", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, description, price, durationMinutes, category, imageUrl, active } = parsed.data;

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO services (name, description, price, duration_minutes, category, image_url, active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, description, price, durationMinutes, category, imageUrl ?? null, active !== false ? 1 : 0],
  );

  const [rows] = await pool.execute<DbService[]>(
    `${SERVICE_SELECT} WHERE id = ?`,
    [result.insertId],
  );

  res.status(201).json(GetServiceResponse.parse(mapService(rows[0])));
});

router.get("/services/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetServiceParams.safeParse({ id: Number(raw) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid service ID" });
    return;
  }

  const [rows] = await pool.execute<DbService[]>(
    `${SERVICE_SELECT} WHERE id = ?`,
    [params.data.id],
  );

  if (!rows[0]) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  res.json(GetServiceResponse.parse(mapService(rows[0])));
});

router.patch("/services/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateServiceParams.safeParse({ id: Number(raw) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid service ID" });
    return;
  }

  const parsed = UpdateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (parsed.data.name !== undefined) { updates.push("name = ?"); values.push(parsed.data.name); }
  if (parsed.data.description !== undefined) { updates.push("description = ?"); values.push(parsed.data.description); }
  if (parsed.data.price !== undefined) { updates.push("price = ?"); values.push(parsed.data.price); }
  if (parsed.data.durationMinutes !== undefined) { updates.push("duration_minutes = ?"); values.push(parsed.data.durationMinutes); }
  if (parsed.data.category !== undefined) { updates.push("category = ?"); values.push(parsed.data.category); }
  if (parsed.data.imageUrl !== undefined) { updates.push("image_url = ?"); values.push(parsed.data.imageUrl); }
  if (parsed.data.active !== undefined) { updates.push("active = ?"); values.push(parsed.data.active ? 1 : 0); }

  if (updates.length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  values.push(params.data.id);
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE services SET ${updates.join(", ")} WHERE id = ?`,
    values,
  );

  if (result.affectedRows === 0) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  const [rows] = await pool.execute<DbService[]>(
    `${SERVICE_SELECT} WHERE id = ?`,
    [params.data.id],
  );

  res.json(UpdateServiceResponse.parse(mapService(rows[0])));
});

router.delete("/services/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteServiceParams.safeParse({ id: Number(raw) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid service ID" });
    return;
  }

  await pool.execute(`DELETE FROM services WHERE id = ?`, [params.data.id]);
  res.sendStatus(204);
});

export default router;
