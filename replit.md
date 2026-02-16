# Vehicle QR Identity System

## Overview
A mobile-first web application for vehicle QR identity and contact system. Vehicle owners register QR codes that, when scanned, allow anyone to contact the owner via phone, WhatsApp, or emergency number without revealing actual phone numbers.

## Architecture
- **Frontend**: React + TypeScript with Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter for client-side, Express for API

## Key Routes
- `/` - Landing page with how-it-works info
- `/v/:qrId` - Dynamic vehicle profile page (3 states: unregistered, inactive activation form, active profile)
- `/admin` - Admin panel for managing QR codes

## API Endpoints
- `GET /api/vehicle/:qrId` - Get vehicle profile
- `GET /api/vehicles` - List all vehicles
- `POST /api/vehicle` - Create new QR code
- `POST /api/activate/:qrId` - Activate with owner details
- `PATCH /api/vehicle/:qrId` - Edit vehicle profile

## Database Schema
- `vehicle_profiles` table with qr_id (PK), is_active, vehicle_label, owner_phone, whatsapp_phone, emergency_phone, profile_message, created_at

## Test Data
- TEST001, TEST002, TEST003 are auto-seeded on startup

## Recent Changes
- 2026-02-16: Initial MVP build with full CRUD, mobile-first UI, seed data
