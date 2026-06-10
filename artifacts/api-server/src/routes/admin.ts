import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, adminUsersTable, appointmentsTable, servicesTable } from "@workspace/db";
import { eq, gte, lt, and, count, sql } from "drizzle-orm";
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

  const [admin] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.email, email));

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

  const [admin] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, adminPayload.id));

  if (!admin) {
    res.status(401).json({ error: "Admin not found" });
    return;
  }

  res.json(GetAdminMeResponse.parse({ id: admin.id, name: admin.name, email: admin.email }));
});

router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [todayResult] = await db
    .select({ count: count() })
    .from(appointmentsTable)
    .where(
      and(
        gte(appointmentsTable.startTime, todayStart),
        lt(appointmentsTable.startTime, todayEnd),
        eq(appointmentsTable.status, "confirmed"),
      ),
    );

  const [upcomingResult] = await db
    .select({ count: count() })
    .from(appointmentsTable)
    .where(
      and(
        gte(appointmentsTable.startTime, now),
        eq(appointmentsTable.status, "confirmed"),
      ),
    );

  const [monthlyResult] = await db
    .select({ count: count() })
    .from(appointmentsTable)
    .where(
      and(
        gte(appointmentsTable.startTime, monthStart),
        lt(appointmentsTable.startTime, monthEnd),
      ),
    );

  const popularServicesRaw = await db
    .select({
      serviceName: servicesTable.name,
      bookingCount: count(appointmentsTable.id),
    })
    .from(appointmentsTable)
    .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .groupBy(servicesTable.name)
    .orderBy(sql`count(${appointmentsTable.id}) DESC`)
    .limit(5);

  const stats = {
    todayAppointments: todayResult?.count ?? 0,
    upcomingAppointments: upcomingResult?.count ?? 0,
    monthlyBookings: monthlyResult?.count ?? 0,
    popularServices: popularServicesRaw.map((p) => ({
      serviceName: p.serviceName || "Unknown",
      bookingCount: p.bookingCount,
    })),
  };

  res.json(GetAdminStatsResponse.parse(stats));
});

export default router;
