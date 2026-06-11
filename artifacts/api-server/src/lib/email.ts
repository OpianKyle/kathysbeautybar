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
      tls: { rejectUnauthorized: false },
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

export interface ServiceLineItem {
  name: string;
  startTime: Date;
  durationMinutes: number;
  price: number;
}

export interface MultiBookingEmailData {
  customerName: string;
  email: string;
  phone: string;
  services: ServiceLineItem[];
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

const DIRECTIONS_HTML = `
  <div style="background: #fff8f4; border: 1px solid #e8d5c4; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h3 style="color: #c9956e; margin-top: 0; margin-bottom: 12px;">📍 How to Find Us</h3>
    <p style="margin: 0 0 8px 0; font-weight: bold;">Kat's Beauty Bar</p>
    <p style="margin: 0 0 8px 0; color: #5a3e3e;">Caltex Garage, Heideveld Road<br>Heideveld, Cape Town</p>
    <p style="margin: 0 0 4px 0; color: #8a6b6b; font-size: 13px;">We are located inside the Caltex Garage on Heideveld Road. Look out for our signage at the entrance.</p>
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e8d5c4;">
      <a href="https://maps.google.com/?q=Caltex+Garage+Heideveld+Road+Cape+Town"
         style="display: inline-block; background: #c9956e; color: #fff; text-decoration: none; padding: 8px 18px; border-radius: 20px; font-size: 13px;">
        Open in Google Maps
      </a>
    </div>
    <p style="margin: 12px 0 0 0; color: #8a6b6b; font-size: 13px;">
      Questions? Call us:<br>
      Tanya: <a href="tel:+27671344631" style="color: #c9956e;">067 134 4631</a> &nbsp;|&nbsp;
      Kathy: <a href="tel:+27848210018" style="color: #c9956e;">084 821 0018</a>
    </p>
  </div>
`;

export async function sendBookingConfirmation(
  data: MultiBookingEmailData,
  ownerEmail: string,
): Promise<void> {
  const transporter = createTransporter();

  const totalPrice = data.services.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = data.services.reduce((sum, s) => sum + s.durationMinutes, 0);
  const appointmentDate = formatDate(data.services[0].startTime);
  const appointmentStartTime = formatTime(data.services[0].startTime);
  const isSingle = data.services.length === 1;

  const servicesTableRows = data.services
    .map(
      (s) => `
      <tr style="border-bottom: 1px solid #f0e0d0;">
        <td style="padding: 10px 8px; color: #3d2c2c;">${s.name}</td>
        <td style="padding: 10px 8px; color: #8a6b6b; text-align: center;">${formatTime(s.startTime)}</td>
        <td style="padding: 10px 8px; color: #8a6b6b; text-align: center;">${s.durationMinutes} min</td>
        <td style="padding: 10px 8px; font-weight: bold; color: #c9956e; text-align: right;">R${s.price.toFixed(2)}</td>
      </tr>`,
    )
    .join("");

  const totalRow = !isSingle
    ? `
      <tr style="background: #fdf0e6;">
        <td colspan="2" style="padding: 10px 8px; font-weight: bold; color: #3d2c2c;">Total</td>
        <td style="padding: 10px 8px; color: #8a6b6b; text-align: center; font-weight: bold;">${totalDuration} min</td>
        <td style="padding: 10px 8px; font-weight: bold; color: #c9956e; text-align: right; font-size: 16px;">R${totalPrice.toFixed(2)}</td>
      </tr>`
    : "";

  const customerHtml = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fdf6f0; color: #3d2c2c;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9956e;">
        <h1 style="color: #c9956e; font-size: 28px; margin: 0;">Kat's Beauty Bar</h1>
        <p style="color: #8a6b6b; margin: 5px 0;">Enhancing Your Natural Beauty</p>
      </div>

      <div style="padding: 30px 0;">
        <h2 style="color: #3d2c2c;">Hi ${data.customerName},</h2>
        <p>Thank you for booking with Kat's Beauty Bar. Your ${isSingle ? "appointment is" : "appointments are"} confirmed!</p>

        <div style="background: #fff; border: 1px solid #e8d5c4; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #c9956e; margin-top: 0;">📅 Appointment Details</h3>
          <p style="margin: 0 0 4px 0;"><strong>Date:</strong> ${appointmentDate}</p>
          <p style="margin: 0 0 16px 0;"><strong>Arrival time:</strong> ${appointmentStartTime}</p>

          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #e8d5c4;">
                <th style="padding: 8px; text-align: left; color: #8a6b6b; font-weight: normal; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Service</th>
                <th style="padding: 8px; text-align: center; color: #8a6b6b; font-weight: normal; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Time</th>
                <th style="padding: 8px; text-align: center; color: #8a6b6b; font-weight: normal; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Duration</th>
                <th style="padding: 8px; text-align: right; color: #8a6b6b; font-weight: normal; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${servicesTableRows}
              ${totalRow}
            </tbody>
          </table>

          ${data.notes ? `<p style="margin: 16px 0 0 0; color: #8a6b6b; font-size: 13px;"><em>Notes: ${data.notes}</em></p>` : ""}
        </div>

        ${DIRECTIONS_HTML}

        <p style="color: #8a6b6b;">We look forward to seeing you!</p>
        <p style="font-style: italic; color: #c9956e;">Kat's Beauty Bar</p>
      </div>

      <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e8d5c4; color: #8a6b6b; font-size: 12px;">
        <p>Caltex Garage, Heideveld Road &nbsp;|&nbsp; Tanya: 067 134 4631 &nbsp;|&nbsp; Kathy: 084 821 0018</p>
      </div>
    </div>
  `;

  const ownerServiceList = data.services
    .map((s) => `<tr><td style="padding:6px 8px;color:#8a6b6b;">${formatTime(s.startTime)}</td><td style="padding:6px 8px;">${s.name}</td><td style="padding:6px 8px;text-align:right;color:#c9956e;">R${s.price.toFixed(2)}</td></tr>`)
    .join("");

  const ownerHtml = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #c9956e;">New Booking — ${data.customerName}</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <tr><td style="padding: 6px 0; color: #8a6b6b; width: 35%;">Customer:</td><td>${data.customerName}</td></tr>
        <tr><td style="padding: 6px 0; color: #8a6b6b;">Phone:</td><td><a href="tel:${data.phone}">${data.phone}</a></td></tr>
        <tr><td style="padding: 6px 0; color: #8a6b6b;">Email:</td><td>${data.email}</td></tr>
        <tr><td style="padding: 6px 0; color: #8a6b6b;">Date:</td><td>${appointmentDate}</td></tr>
        ${data.notes ? `<tr><td style="padding: 6px 0; color: #8a6b6b;">Notes:</td><td>${data.notes}</td></tr>` : ""}
      </table>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e8d5c4; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #fdf0e6;">
            <th style="padding: 8px; text-align: left; color: #8a6b6b; font-weight: normal;">Time</th>
            <th style="padding: 8px; text-align: left; color: #8a6b6b; font-weight: normal;">Service</th>
            <th style="padding: 8px; text-align: right; color: #8a6b6b; font-weight: normal;">Price</th>
          </tr>
        </thead>
        <tbody>${ownerServiceList}</tbody>
        ${!isSingle ? `<tfoot><tr style="background: #fdf0e6;"><td colspan="2" style="padding:8px;font-weight:bold;">Total</td><td style="padding:8px;text-align:right;font-weight:bold;color:#c9956e;">R${totalPrice.toFixed(2)}</td></tr></tfoot>` : ""}
      </table>
    </div>
  `;

  try {
    const info1 = await transporter.sendMail({
      from: MAIL_FROM,
      to: data.email,
      subject: isSingle ? "Your Appointment is Confirmed — Kat's Beauty Bar" : `Your ${data.services.length} Appointments are Confirmed — Kat's Beauty Bar`,
      html: customerHtml,
    });
    const info2 = await transporter.sendMail({
      from: MAIL_FROM,
      to: ownerEmail,
      subject: `New Booking: ${data.customerName} — ${appointmentDate} at ${appointmentStartTime}`,
      html: ownerHtml,
    });
    logger.info(
      { messageId1: (info1 as any).messageId, messageId2: (info2 as any).messageId },
      "Confirmation emails sent",
    );
    if ((info1 as any).envelope) {
      try {
        logger.info({ email: JSON.parse((info1 as any).message) }, "Customer confirmation email (dev)");
      } catch { /* jsonTransport may not always produce parseable message */ }
    }
  } catch (err) {
    logger.error({ err }, "Failed to send confirmation emails");
  }
}

// Legacy single-appointment wrapper (used by scheduler reminders)
export async function sendCustomerConfirmation(
  data: AppointmentEmailData,
  ownerEmail: string,
): Promise<void> {
  return sendBookingConfirmation(
    {
      customerName: data.customerName,
      email: data.email,
      phone: data.phone,
      notes: data.notes,
      services: [
        {
          name: data.serviceName,
          startTime: data.startTime,
          durationMinutes: data.durationMinutes,
          price: 0,
        },
      ],
    },
    ownerEmail,
  );
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
    subject: `Appointment Reminder — ${hoursUntil} hour${hoursUntil > 1 ? "s" : ""} away`,
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
          ${DIRECTIONS_HTML}
          <p>We look forward to seeing you!</p>
          <p style="color: #c9956e; font-style: italic;">Kat's Beauty Bar</p>
        </div>
      </div>
    `,
  };

  const ownerMail = {
    from: MAIL_FROM,
    to: ownerEmail,
    subject: `Reminder: ${data.customerName} — ${data.serviceName} in ${hoursUntil}h`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #c9956e;">Appointment Reminder (${hoursUntil}h)</h2>
        <p>${data.customerName} has <strong>${data.serviceName}</strong> at ${formatTime(data.startTime)} on ${formatDate(data.startTime)}.</p>
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
