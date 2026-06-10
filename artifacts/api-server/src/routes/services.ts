import { Router, type IRouter } from "express";
import { db, servicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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

router.get("/services", async (_req, res): Promise<void> => {
  const services = await db
    .select()
    .from(servicesTable)
    .orderBy(servicesTable.category, servicesTable.name);

  const mapped = services.map((s) => ({
    ...s,
    price: Number(s.price),
  }));

  res.json(ListServicesResponse.parse(mapped));
});

router.post("/services", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [service] = await db
    .insert(servicesTable)
    .values({
      ...parsed.data,
      price: String(parsed.data.price),
    })
    .returning();

  res.status(201).json(GetServiceResponse.parse({ ...service, price: Number(service.price) }));
});

router.get("/services/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetServiceParams.safeParse({ id: Number(raw) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid service ID" });
    return;
  }

  const [service] = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.id, params.data.id));

  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  res.json(GetServiceResponse.parse({ ...service, price: Number(service.price) }));
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

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.price !== undefined) {
    updateData.price = String(parsed.data.price);
  }

  const [service] = await db
    .update(servicesTable)
    .set(updateData)
    .where(eq(servicesTable.id, params.data.id))
    .returning();

  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  res.json(UpdateServiceResponse.parse({ ...service, price: Number(service.price) }));
});

router.delete("/services/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteServiceParams.safeParse({ id: Number(raw) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid service ID" });
    return;
  }

  await db.delete(servicesTable).where(eq(servicesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
