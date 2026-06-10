import cron from "node-cron";
import { db, appointmentsTable, servicesTable, businessSettingsTable } from "@workspace/db";
import { eq, and, between } from "drizzle-orm";
import { sendReminderEmails } from "./email";
import { logger } from "./logger";

async function getOwnerEmail(): Promise<string> {
  const [setting] = await db
    .select()
    .from(businessSettingsTable)
    .where(eq(businessSettingsTable.key, "ownerEmail"));
  return setting?.value || "owner@katbeautybar.co.za";
}

async function sendReminders(): Promise<void> {
  const now = new Date();

  // Check for appointments in 24 hours and 2 hours
  const windows = [
    { hours: 24, label: "24h" },
    { hours: 2, label: "2h" },
  ];

  const ownerEmail = await getOwnerEmail();

  for (const window of windows) {
    const targetStart = new Date(now.getTime() + window.hours * 60 * 60 * 1000 - 5 * 60 * 1000);
    const targetEnd = new Date(now.getTime() + window.hours * 60 * 60 * 1000 + 5 * 60 * 1000);

    const upcoming = await db
      .select({
        appointment: appointmentsTable,
        service: servicesTable,
      })
      .from(appointmentsTable)
      .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
      .where(
        and(
          eq(appointmentsTable.status, "confirmed"),
          between(appointmentsTable.startTime, targetStart, targetEnd),
        ),
      );

    for (const { appointment, service } of upcoming) {
      if (!service) continue;

      await sendReminderEmails(
        {
          customerName: appointment.customerName,
          email: appointment.email,
          phone: appointment.phone,
          serviceName: service.name,
          startTime: appointment.startTime,
          durationMinutes: service.durationMinutes,
          notes: appointment.notes,
        },
        ownerEmail,
        window.hours,
      );
    }
  }
}

export function startScheduler(): void {
  // Run every 5 minutes to check for upcoming appointments
  cron.schedule("*/5 * * * *", async () => {
    try {
      await sendReminders();
    } catch (err) {
      logger.error({ err }, "Scheduler error sending reminders");
    }
  });

  logger.info("Appointment reminder scheduler started");
}
