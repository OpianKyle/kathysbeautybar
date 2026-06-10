import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const businessSettingsTable = pgTable("business_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const insertBusinessSettingSchema = createInsertSchema(businessSettingsTable).omit({ id: true });
export type InsertBusinessSetting = z.infer<typeof insertBusinessSettingSchema>;
export type BusinessSetting = typeof businessSettingsTable.$inferSelect;
