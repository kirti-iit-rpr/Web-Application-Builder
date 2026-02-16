import { storage } from "./storage";
import { log } from "./index";

const TEST_QR_IDS = ["TEST001", "TEST002", "TEST003"];

export async function seedDatabase() {
  try {
    for (const qrId of TEST_QR_IDS) {
      const existing = await storage.getVehicle(qrId);
      if (!existing) {
        await storage.createVehicle(qrId);
        log(`Seeded test QR: ${qrId}`, "seed");
      }
    }
    log("Database seeding complete", "seed");
  } catch (error) {
    log(`Seeding error: ${error}`, "seed");
  }
}
