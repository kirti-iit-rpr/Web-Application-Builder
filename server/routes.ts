import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { activateVehicleSchema } from "@shared/schema";
import { z } from "zod";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required for JWT signing");
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const token = authHeader.split(" ")[1];
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USERNAME;
    const adminPass = process.env.ADMIN_PASSWORD;
    if (!adminUser || !adminPass) {
      return res.status(500).json({ message: "Admin credentials not configured" });
    }
    if (username !== adminUser || password !== adminPass) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token });
  });

  app.get("/api/auth/me", requireAdmin, (_req, res) => {
    res.json({ role: "admin" });
  });

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

  app.get("/api/vehicles", requireAdmin, async (_req, res) => {
    try {
      const vehicles = await storage.getAllVehicles();
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/vehicle", requireAdmin, async (req, res) => {
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

  app.post("/api/verify/:qrId", async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.qrId);
      if (!vehicle) {
        return res.status(404).json({ message: "QR code not found" });
      }

      if (!vehicle.verificationEnabled || !vehicle.bagColor) {
        return res.json({ verified: true });
      }

      const { answer } = req.body;
      if (!answer || typeof answer !== "string") {
        return res.status(400).json({ message: "Answer is required" });
      }

      const correct = answer.toLowerCase().trim() === vehicle.bagColor.toLowerCase().trim();
      return res.json({ verified: correct });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tags/bulk", requireAdmin, async (req, res) => {
    try {
      const { qrIds } = req.body;
      if (!Array.isArray(qrIds) || qrIds.length === 0) {
        return res.status(400).json({ message: "qrIds array is required" });
      }
      if (qrIds.length > 5000) {
        return res.status(400).json({ message: "Maximum 5000 tags per batch" });
      }
      const result = await storage.bulkCreateVehicles(qrIds);
      res.status(201).json({
        created: result.created.length,
        duplicates: result.duplicates,
        tags: result.created,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/vehicle/:qrId", requireAdmin, async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.qrId);
      if (!vehicle) {
        return res.status(404).json({ message: "QR code not found" });
      }
      await storage.deleteVehicle(req.params.qrId);
      res.json({ message: "Deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/tags/bulk", requireAdmin, async (req, res) => {
    try {
      const { qrIds } = req.body;
      if (!Array.isArray(qrIds) || qrIds.length === 0) {
        return res.status(400).json({ message: "qrIds array is required" });
      }
      for (const qrId of qrIds) {
        await storage.deleteVehicle(qrId);
      }
      res.json({ message: `Deleted ${qrIds.length} tags`, count: qrIds.length });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/tags/export", requireAdmin, async (_req, res) => {
    try {
      const vehicles = await storage.getAllVehicles();
      const header = "Tag ID,Tag URL,Status,Created";
      const rows = vehicles.map(
        (v) =>
          `${v.qrId},https://findmyowner.replit.app/v/${v.qrId},${v.isActive ? "active" : "inactive"},${v.createdAt ? new Date(v.createdAt).toISOString().split("T")[0] : ""}`
      );
      const csv = header + "\n" + rows.join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=reho-tags-export.csv");
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/qr/generate", requireAdmin, async (req, res) => {
    try {
      const { tag_ids, base_url, module_color, bg_color, size } = req.body;
      if (!Array.isArray(tag_ids) || tag_ids.length === 0) {
        return res.status(400).json({ message: "tag_ids array is required" });
      }
      if (tag_ids.length > 500) {
        return res.status(400).json({ message: "Maximum 500 QR codes per batch" });
      }

      const config = {
        tag_ids,
        base_url: base_url || "https://findmyowner.replit.app/v/",
        output_dir: `/tmp/qr_${Date.now()}`,
        zip_path: `/tmp/qr_${Date.now()}.zip`,
        size: size || 800,
        module_color: module_color || "#FF6B1A",
        bg_color: bg_color || "#1a1a1a",
      };

      const result = await new Promise<string>((resolve, reject) => {
        const proc = spawn("python3", [
          path.join(process.cwd(), "scripts", "qr_generator.py"),
        ]);
        let stdout = "";
        let stderr = "";
        proc.stdin.write(JSON.stringify(config));
        proc.stdin.end();
        proc.stdout.on("data", (d) => (stdout += d.toString()));
        proc.stderr.on("data", (d) => (stderr += d.toString()));
        proc.on("close", (code) => {
          if (code === 0) resolve(stdout.trim());
          else reject(new Error(stderr || `Process exited with code ${code}`));
        });
        proc.on("error", reject);
      });

      const parsed = JSON.parse(result);
      if (!parsed.success) {
        return res.status(500).json({ message: "QR generation failed" });
      }

      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=reho_qrs_${Date.now()}.zip`
      );
      const zipStream = fs.createReadStream(parsed.zip_path);
      zipStream.pipe(res);
      zipStream.on("end", () => {
        fs.unlink(parsed.zip_path, () => {});
        fs.rm(config.output_dir, { recursive: true }, () => {});
      });
    } catch (error) {
      console.error("QR generation error:", error);
      res.status(500).json({ message: "QR generation failed" });
    }
  });

  app.patch("/api/vehicle/:qrId", requireAdmin, async (req, res) => {
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
