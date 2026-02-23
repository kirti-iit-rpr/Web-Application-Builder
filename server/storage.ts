import { vehicleProfiles, type VehicleProfile, type ActivateVehicle } from "@shared/schema";
import { db } from "./db";
import { eq, inArray } from "drizzle-orm";

export interface IStorage {
  getVehicle(qrId: string): Promise<VehicleProfile | undefined>;
  getAllVehicles(): Promise<VehicleProfile[]>;
  createVehicle(qrId: string): Promise<VehicleProfile>;
  activateVehicle(qrId: string, data: ActivateVehicle): Promise<VehicleProfile>;
  updateVehicle(qrId: string, data: Partial<ActivateVehicle>): Promise<VehicleProfile>;
  deleteVehicle(qrId: string): Promise<void>;
  bulkCreateVehicles(qrIds: string[]): Promise<{ created: VehicleProfile[]; duplicates: string[] }>;
}

export class DatabaseStorage implements IStorage {
  async getVehicle(qrId: string): Promise<VehicleProfile | undefined> {
    const [vehicle] = await db
      .select()
      .from(vehicleProfiles)
      .where(eq(vehicleProfiles.qrId, qrId));
    return vehicle;
  }

  async getAllVehicles(): Promise<VehicleProfile[]> {
    return db.select().from(vehicleProfiles);
  }

  async createVehicle(qrId: string): Promise<VehicleProfile> {
    const [vehicle] = await db
      .insert(vehicleProfiles)
      .values({ qrId, isActive: false })
      .returning();
    return vehicle;
  }

  async activateVehicle(qrId: string, data: ActivateVehicle): Promise<VehicleProfile> {
    const [vehicle] = await db
      .update(vehicleProfiles)
      .set({
        ...data,
        isActive: true,
      })
      .where(eq(vehicleProfiles.qrId, qrId))
      .returning();
    return vehicle;
  }

  async updateVehicle(qrId: string, data: Partial<ActivateVehicle>): Promise<VehicleProfile> {
    const [vehicle] = await db
      .update(vehicleProfiles)
      .set(data)
      .where(eq(vehicleProfiles.qrId, qrId))
      .returning();
    return vehicle;
  }

  async deleteVehicle(qrId: string): Promise<void> {
    await db.delete(vehicleProfiles).where(eq(vehicleProfiles.qrId, qrId));
  }

  async bulkCreateVehicles(qrIds: string[]): Promise<{ created: VehicleProfile[]; duplicates: string[] }> {
    const existing = await db
      .select({ qrId: vehicleProfiles.qrId })
      .from(vehicleProfiles)
      .where(inArray(vehicleProfiles.qrId, qrIds));

    const existingSet = new Set(existing.map((e) => e.qrId));
    const duplicates = qrIds.filter((id) => existingSet.has(id));
    const newIds = qrIds.filter((id) => !existingSet.has(id));

    let created: VehicleProfile[] = [];
    if (newIds.length > 0) {
      created = await db
        .insert(vehicleProfiles)
        .values(newIds.map((qrId) => ({ qrId, isActive: false })))
        .returning();
    }

    return { created, duplicates };
  }
}

export const storage = new DatabaseStorage();
