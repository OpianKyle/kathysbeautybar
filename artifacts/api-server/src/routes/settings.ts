import { Router, type IRouter } from "express";
import { pool, type DbBusinessSetting } from "../lib/db";
import { GetSettingsResponse, UpdateSettingsBody, UpdateSettingsResponse } from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

const DEFAULT_SETTINGS = {
  slotIntervalMinutes: 30,
  ownerEmail: "owner@katbeautybar.co.za",
  openingHours: {
    monday: { open: true, openTime: "08:00", closeTime: "17:00" },
    tuesday: { open: true, openTime: "08:00", closeTime: "17:00" },
    wednesday: { open: true, openTime: "08:00", closeTime: "17:00" },
    thursday: { open: true, openTime: "08:00", closeTime: "17:00" },
    friday: { open: true, openTime: "08:00", closeTime: "17:00" },
    saturday: { open: true, openTime: "08:00", closeTime: "14:00" },
    sunday: { open: false, openTime: null, closeTime: null },
  },
};

export async function loadSettings() {
  const [rows] = await pool.execute<DbBusinessSetting[]>(
    "SELECT `key`, value FROM business_settings",
  );
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }

  return {
    slotIntervalMinutes: map["slotIntervalMinutes"]
      ? Number(map["slotIntervalMinutes"])
      : DEFAULT_SETTINGS.slotIntervalMinutes,
    ownerEmail: map["ownerEmail"] || DEFAULT_SETTINGS.ownerEmail,
    openingHours: map["openingHours"]
      ? JSON.parse(map["openingHours"])
      : DEFAULT_SETTINGS.openingHours,
  };
}

router.get("/settings", async (_req, res): Promise<void> => {
  const settings = await loadSettings();
  res.json(GetSettingsResponse.parse(settings));
});

router.patch("/settings", requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: { key: string; value: string }[] = [];

  if (parsed.data.slotIntervalMinutes !== undefined) {
    updates.push({ key: "slotIntervalMinutes", value: String(parsed.data.slotIntervalMinutes) });
  }
  if (parsed.data.ownerEmail !== undefined) {
    updates.push({ key: "ownerEmail", value: parsed.data.ownerEmail });
  }
  if (parsed.data.openingHours !== undefined) {
    updates.push({ key: "openingHours", value: JSON.stringify(parsed.data.openingHours) });
  }

  for (const update of updates) {
    await pool.execute(
      "INSERT INTO business_settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
      [update.key, update.value],
    );
  }

  const settings = await loadSettings();
  res.json(UpdateSettingsResponse.parse(settings));
});

export default router;
