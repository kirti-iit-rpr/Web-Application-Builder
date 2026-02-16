import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { activateVehicleSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/vehicle/:qrId", async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.qrId);
      if (!vehicle) {
        return res.status(404).json({ message: "QR code not found" });
      }
      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/vehicles", async (_req, res) => {
    try {
      const vehicles = await storage.getAllVehicles();
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/vehicle", async (req, res) => {
    try {
      const { qrId } = req.body;
      if (!qrId || typeof qrId !== "string") {
        return res.status(400).json({ message: "QR ID is required" });
      }

      const existing = await storage.getVehicle(qrId);
      if (existing) {
        return res.status(409).json({ message: "QR ID already exists" });
      }

      const vehicle = await storage.createVehicle(qrId);
      res.status(201).json(vehicle);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/activate/:qrId", async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.qrId);
      if (!vehicle) {
        return res.status(404).json({ message: "QR code not found" });
      }

      const parsed = activateVehicleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: parsed.error.errors.map((e) => e.message).join(", "),
        });
      }

      const updated = await storage.activateVehicle(req.params.qrId, parsed.data);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/vehicle/:qrId", async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.qrId);
      if (!vehicle) {
        return res.status(404).json({ message: "QR code not found" });
      }

      const updated = await storage.updateVehicle(req.params.qrId, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
