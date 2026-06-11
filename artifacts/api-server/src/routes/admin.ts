import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { pool, type DbAdminUser, type DbAppointment, type RowDataPacket } from "../lib/db";
import {
  AdminLoginBody,
  AdminLoginResponse,
  GetAdminMeResponse,
  GetAdminStatsResponse,
} from "@workspace/api-zod";
import { requireAdmin, signToken } from "../lib/auth";

const router: IRouter = Router();

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [rows] = await pool.execute<DbAdminUser[]>(
    "SELECT id, name, email, password_hash AS passwordHash, created_at AS createdAt FROM admin_users WHERE email = ?",
    [email],
  );

  const admin = rows[0];
  if (!admin) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken({ id: admin.id, email: admin.email, name: admin.name });

  res.json(
    AdminLoginResponse.parse({
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email },
    }),
  );
});

router.get("/admin/me", requireAdmin, async (req, res): Promise<void> => {
  const adminPayload = (req as any).admin as { id: number; email: string; name: string };

  const [rows] = await pool.execute<DbAdminUser[]>(
    "SELECT id, name, email, password_hash AS passwordHash, created_at AS createdAt FROM admin_users WHERE id = ?",
    [adminPayload.id],
  );

  if (!rows[0]) {
    res.status(401).json({ error: "Admin not found" });
    return;
  }

  const admin = rows[0];
  res.json(GetAdminMeResponse.parse({ id: admin.id, name: admin.name, email: admin.email }));
});

router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  function toMysqlDatetime(d: Date) {
    return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
  }

  interface CountRow extends RowDataPacket { count: number }
  interface PopularRow extends RowDataPacket { serviceName: string; bookingCount: number }

  const [[todayResult]] = await pool.execute<CountRow[]>(
    "SELECT COUNT(*) AS count FROM appointments WHERE start_time >= ? AND start_time < ? AND status = 'confirmed'",
    [toMysqlDatetime(todayStart), toMysqlDatetime(todayEnd)],
  );

  const [[upcomingResult]] = await pool.execute<CountRow[]>(
    "SELECT COUNT(*) AS count FROM appointments WHERE start_time >= ? AND status = 'confirmed'",
    [toMysqlDatetime(now)],
  );

  const [[monthlyResult]] = await pool.execute<CountRow[]>(
    "SELECT COUNT(*) AS count FROM appointments WHERE start_time >= ? AND start_time <= ?",
    [toMysqlDatetime(monthStart), toMysqlDatetime(monthEnd)],
  );

  const [popularRows] = await pool.execute<PopularRow[]>(
    `SELECT COALESCE(s.name, 'Unknown') AS serviceName, COUNT(a.id) AS bookingCount
     FROM appointments a
     LEFT JOIN services s ON a.service_id = s.id
     GROUP BY s.name
     ORDER BY bookingCount DESC
     LIMIT 5`,
  );

  const stats = {
    todayAppointments: todayResult?.count ?? 0,
    upcomingAppointments: upcomingResult?.count ?? 0,
    monthlyBookings: monthlyResult?.count ?? 0,
    popularServices: popularRows.map((p) => ({
      serviceName: p.serviceName,
      bookingCount: Number(p.bookingCount),
    })),
  };

  res.json(GetAdminStatsResponse.parse(stats));
});

export default router;
