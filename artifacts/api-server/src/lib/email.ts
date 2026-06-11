import nodemailer from "nodemailer";
import { logger } from "./logger";

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  logger.warn("SMTP credentials not configured — emails will be logged to console only");
  return nodemailer.createTransport({ jsonTransport: true });
}

export async function testSmtpConnection(): Promise<void> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    logger.warn("SMTP not fully configured — skipping connection test");
    return;
  }

  const transporter = createTransporter();
  try {
    await transporter.verify();
    logger.info("SMTP connection successful");
  } catch (err) {
    logger.error({ err }, "SMTP connection FAILED — check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS");
    throw err;
  }
}

const MAIL_FROM = process.env.MAIL_FROM || '"Kat\'s Beauty Bar" <appointment@katsbeautybar.co.za>';

export interface AppointmentEmailData {
  customerName: string;
  email: string;
  phone: string;
  serviceName: string;
  startTime: Date;
  durationMinutes: number;
  notes?: string | null;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-ZA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Africa/Johannesburg",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Johannesburg",
  });
}

export async function sendCustomerConfirmation(
  data: AppointmentEmailData,
  ownerEmail: string,
): Promise<void> {
  const transporter = createTransporter();

  const customerMail = {
    from: MAIL_FROM,
    to: data.email,
    subject: "Your Appointment is Confirmed",
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fdf6f0; color: #3d2c2c;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9956e;">
          <h1 style="color: #c9956e; font-size: 28px; margin: 0;">Kat's Beauty Bar</h1>
          <p style="color: #8a6b6b; margin: 5px 0;">Enhancing Your Natural Beauty</p>
        </div>
        <div style="padding: 30px 0;">
          <h2 style="color: #3d2c2c;">Hi ${data.customerName},</h2>
          <p>Thank you for booking with Kat's Beauty Bar. Your appointment is confirmed!</p>
          <div style="background: #fff; border: 1px solid #e8d5c4; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #c9956e; margin-top: 0;">Appointment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #8a6b6b; width: 40%;">Service:</td><td style="padding: 8px 0; font-weight: bold;">${data.serviceName}</td></tr>
              <tr><td style="padding: 8px 0; color: #8a6b6b;">Date:</td><td style="padding: 8px 0; font-weight: bold;">${formatDate(data.startTime)}</td></tr>
              <tr><td style="padding: 8px 0; color: #8a6b6b;">Time:</td><td style="padding: 8px 0; font-weight: bold;">${formatTime(data.startTime)}</td></tr>
              <tr><td style="padding: 8px 0; color: #8a6b6b;">Duration:</td><td style="padding: 8px 0; font-weight: bold;">${data.durationMinutes} minutes</td></tr>
              ${data.notes ? `<tr><td style="padding: 8px 0; color: #8a6b6b;">Notes:</td><td style="padding: 8px 0;">${data.notes}</td></tr>` : ""}
            </table>
          </div>
          <p style="color: #8a6b6b;">We look forward to seeing you!</p>
          <p style="font-style: italic; color: #c9956e;">Kat's Beauty Bar</p>
        </div>
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e8d5c4; color: #8a6b6b; font-size: 12px;">
          <p>Caltex Garage, Heideveld Road | Tanya: 067 134 4631 | Kathy: 084 821 0018</p>
        </div>
      </div>
    `,
  };

  const ownerMail = {
    from: MAIL_FROM,
    to: ownerEmail,
    subject: "New Appointment Booked",
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #c9956e;">New Appointment Booked</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #8a6b6b; width: 40%;">Customer:</td><td style="padding: 8px 0;">${data.customerName}</td></tr>
          <tr><td style="padding: 8px 0; color: #8a6b6b;">Phone:</td><td style="padding: 8px 0;">${data.phone}</td></tr>
          <tr><td style="padding: 8px 0; color: #8a6b6b;">Email:</td><td style="padding: 8px 0;">${data.email}</td></tr>
          <tr><td style="padding: 8px 0; color: #8a6b6b;">Service:</td><td style="padding: 8px 0;">${data.serviceName}</td></tr>
          <tr><td style="padding: 8px 0; color: #8a6b6b;">Date:</td><td style="padding: 8px 0;">${formatDate(data.startTime)}</td></tr>
          <tr><td style="padding: 8px 0; color: #8a6b6b;">Time:</td><td style="padding: 8px 0;">${formatTime(data.startTime)}</td></tr>
          <tr><td style="padding: 8px 0; color: #8a6b6b;">Duration:</td><td style="padding: 8px 0;">${data.durationMinutes} minutes</td></tr>
          ${data.notes ? `<tr><td style="padding: 8px 0; color: #8a6b6b;">Notes:</td><td style="padding: 8px 0;">${data.notes}</td></tr>` : ""}
        </table>
      </div>
    `,
  };

  try {
    const info1 = await transporter.sendMail(customerMail);
    const info2 = await transporter.sendMail(ownerMail);
    logger.info(
      { messageId1: (info1 as any).messageId, messageId2: (info2 as any).messageId },
      "Confirmation emails sent",
    );
    if ((info1 as any).envelope) {
      logger.info({ email: JSON.parse((info1 as any).message) }, "Customer confirmation email (dev)");
    }
  } catch (err) {
    logger.error({ err }, "Failed to send confirmation emails");
  }
}

export async function sendReminderEmails(
  data: AppointmentEmailData,
  ownerEmail: string,
  hoursUntil: number,
): Promise<void> {
  const transporter = createTransporter();

  const customerMail = {
    from: MAIL_FROM,
    to: data.email,
    subject: `Appointment Reminder - ${hoursUntil} hour${hoursUntil > 1 ? "s" : ""} away`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fdf6f0;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9956e;">
          <h1 style="color: #c9956e;">Kat's Beauty Bar</h1>
        </div>
        <div style="padding: 30px 0;">
          <h2>Appointment Reminder</h2>
          <p>Hi ${data.customerName}, just a reminder that your appointment is in <strong>${hoursUntil} hour${hoursUntil > 1 ? "s" : ""}</strong>.</p>
          <div style="background: #fff; border: 1px solid #e8d5c4; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%;">
              <tr><td style="color: #8a6b6b; width: 40%;">Service:</td><td><strong>${data.serviceName}</strong></td></tr>
              <tr><td style="color: #8a6b6b;">Date:</td><td><strong>${formatDate(data.startTime)}</strong></td></tr>
              <tr><td style="color: #8a6b6b;">Time:</td><td><strong>${formatTime(data.startTime)}</strong></td></tr>
            </table>
          </div>
          <p>We look forward to seeing you!</p>
          <p style="color: #c9956e; font-style: italic;">Kat's Beauty Bar</p>
        </div>
      </div>
    `,
  };

  const ownerMail = {
    from: MAIL_FROM,
    to: ownerEmail,
    subject: `Reminder: ${data.customerName} - ${data.serviceName} in ${hoursUntil}h`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #c9956e;">Appointment Reminder (${hoursUntil}h)</h2>
        <p>${data.customerName} has ${data.serviceName} at ${formatTime(data.startTime)} on ${formatDate(data.startTime)}.</p>
        <p>Phone: ${data.phone}</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(customerMail);
    await transporter.sendMail(ownerMail);
    logger.info({ customer: data.email, hoursUntil }, "Reminder emails sent");
  } catch (err) {
    logger.error({ err }, "Failed to send reminder emails");
  }
}
