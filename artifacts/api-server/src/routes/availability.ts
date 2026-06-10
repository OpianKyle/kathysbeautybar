import { Router, type IRouter } from "express";
import { db, appointmentsTable, servicesTable } from "@workspace/db";
import { eq, and, gte, lt } from "drizzle-orm";
import { GetAvailabilityQueryParams, GetAvailabilityResponse } from "@workspace/api-zod";
import { loadSettings } from "./settings";

const router: IRouter = Router();

router.get("/availability", async (req, res): Promise<void> => {
  const parsed = GetAvailabilityQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { date, serviceId } = parsed.data;

  // Load the service to get duration
  const [service] = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.id, serviceId));

  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }

  const settings = await loadSettings();
  const openingHours = settings.openingHours as Record<
    string,
    { open: boolean; openTime: string | null; closeTime: string | null }
  >;

  // Get day of week from date string (YYYY-MM-DD)
  const [year, month, day] = date.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayName = dayNames[dateObj.getDay()];
  const dayHours = openingHours[dayName];

  if (!dayHours || !dayHours.open || !dayHours.openTime || !dayHours.closeTime) {
    res.json(
      GetAvailabilityResponse.parse({
        date,
        slots: [],
        businessHours: { open: false, openTime: null, closeTime: null },
      }),
    );
    return;
  }

  // Get all existing appointments for that day
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);

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

  // Generate time slots
  const slots: { time: string; available: boolean; reason: string | null }[] = [];
  const intervalMinutes = settings.slotIntervalMinutes;
  const serviceDuration = service.durationMinutes;

  const [openHour, openMin] = dayHours.openTime.split(":").map(Number);
  const [closeHour, closeMin] = dayHours.closeTime.split(":").map(Number);

  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;

  for (let minutes = openMinutes; minutes + serviceDuration <= closeMinutes; minutes += intervalMinutes) {
    const slotHour = Math.floor(minutes / 60);
    const slotMin = minutes % 60;
    const timeStr = `${String(slotHour).padStart(2, "0")}:${String(slotMin).padStart(2, "0")}`;

    const slotStart = new Date(`${date}T${timeStr}:00`);
    const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60 * 1000);

    // Check if this slot conflicts with any existing appointment
    let available = true;
    let reason: string | null = null;

    for (const appt of existingAppointments) {
      const apptStart = new Date(appt.startTime);
      const apptEnd = new Date(appt.endTime);

      // Overlaps if: slotStart < apptEnd AND slotEnd > apptStart
      if (slotStart < apptEnd && slotEnd > apptStart) {
        available = false;
        reason = "booked";
        break;
      }
    }

    // Don't allow bookings in the past
    if (slotStart <= new Date()) {
      available = false;
      reason = "past";
    }

    slots.push({ time: timeStr, available, reason });
  }

  res.json(
    GetAvailabilityResponse.parse({
      date,
      slots,
      businessHours: {
        open: true,
        openTime: dayHours.openTime,
        closeTime: dayHours.closeTime,
      },
    }),
  );
});

export default router;
