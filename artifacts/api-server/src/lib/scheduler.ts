import cron from "node-cron";
import { pool, type DbAppointment, type RowDataPacket } from "./db";
import { sendReminderEmails } from "./email";
import { logger } from "./logger";

async function getOwnerEmail(): Promise<string> {
  interface SettingRow extends RowDataPacket { value: string }
  const [rows] = await pool.execute<SettingRow[]>(
    "SELECT value FROM business_settings WHERE `key` = 'ownerEmail'",
  );
  return rows[0]?.value || "owner@katbeautybar.co.za";
}

interface ReminderRow extends DbAppointment {
  serviceName: string;
  durationMinutes: number;
}

async function sendReminders(): Promise<void> {
  const now = new Date();

  const windows = [
    { hours: 24, label: "24h" },
    { hours: 2, label: "2h" },
  ];

  const ownerEmail = await getOwnerEmail();

  for (const window of windows) {
    const targetStart = new Date(now.getTime() + window.hours * 60 * 60 * 1000 - 5 * 60 * 1000);
    const targetEnd = new Date(now.getTime() + window.hours * 60 * 60 * 1000 + 5 * 60 * 1000);

    function toMysqlDatetime(d: Date) {
      return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
    }

    const [rows] = await pool.execute<ReminderRow[]>(
      `SELECT a.id, a.customer_name AS customerName, a.email, a.phone,
              a.service_id AS serviceId, a.start_time AS startTime, a.end_time AS endTime,
              a.notes, a.status, a.created_at AS createdAt,
              COALESCE(s.name, 'Unknown') AS serviceName,
              COALESCE(s.duration_minutes, 0) AS durationMinutes
       FROM appointments a
       LEFT JOIN services s ON a.service_id = s.id
       WHERE a.status = 'confirmed'
         AND a.start_time BETWEEN ? AND ?`,
      [toMysqlDatetime(targetStart), toMysqlDatetime(targetEnd)],
    );

    for (const row of rows) {
      await sendReminderEmails(
        {
          customerName: row.customerName,
          email: row.email,
          phone: row.phone,
          serviceName: row.serviceName,
          startTime: new Date(row.startTime),
          durationMinutes: row.durationMinutes,
          notes: row.notes,
        },
        ownerEmail,
        window.hours,
      );
    }
  }
}

export function startScheduler(): void {
  cron.schedule("*/5 * * * *", async () => {
    try {
      await sendReminders();
    } catch (err) {
      logger.error({ err }, "Scheduler error sending reminders");
    }
  });

  logger.info("Appointment reminder scheduler started");
}
