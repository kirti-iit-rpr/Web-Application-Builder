import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const vehicleProfiles = pgTable("vehicle_profiles", {
  qrId: varchar("qr_id", { length: 50 }).primaryKey(),
  isActive: boolean("is_active").default(false).notNull(),
  vehicleLabel: text("vehicle_label"),
  ownerPhone: text("owner_phone"),
  whatsappPhone: text("whatsapp_phone"),
  emergencyPhone: text("emergency_phone"),
  profileMessage: text("profile_message"),
  verificationEnabled: boolean("verification_enabled").default(false).notNull(),
  bagBrand: text("bag_brand"),
  bagColor: text("bag_color"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVehicleSchema = createInsertSchema(vehicleProfiles).pick({
  qrId: true,
});

export const activateVehicleSchema = createInsertSchema(vehicleProfiles).pick({
  vehicleLabel: true,
  ownerPhone: true,
  whatsappPhone: true,
  emergencyPhone: true,
  profileMessage: true,
  verificationEnabled: true,
  bagBrand: true,
  bagColor: true,
}).extend({
  ownerPhone: z.string().min(1, "Owner phone number is required"),
});

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type ActivateVehicle = z.infer<typeof activateVehicleSchema>;
export type VehicleProfile = typeof vehicleProfiles.$inferSelect;
