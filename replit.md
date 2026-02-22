# Reho — QR Tag Identity System

## Overview
A mobile-first web application for QR tag identity and contact system. Tag owners register QR codes that, when scanned, allow anyone to contact the owner via phone, WhatsApp, or emergency number without revealing actual phone numbers. Brand name: **Reho**.

## Architecture
- **Frontend**: React + TypeScript with custom Reho CSS + Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter for client-side, Express for API
- **Fonts**: Syne (headings), DM Sans (body), DM Mono (labels)

## Key Routes
- `/` - Landing page with how-it-works info
- `/v/:qrId` - Dynamic tag profile page (3 states: unregistered, inactive activation form, active profile)
- `/v/:qrId/thank-you` - Thank You page shown after first-time activation
- `/admin` - Admin panel for managing QR codes

## API Endpoints
- `GET /api/vehicle/:qrId` - Get tag profile
- `GET /api/vehicles` - List all tags
- `POST /api/vehicle` - Create new QR code
- `POST /api/activate/:qrId` - Activate with owner details
- `PATCH /api/vehicle/:qrId` - Edit tag profile

## Database Schema
- `vehicle_profiles` table with qr_id (PK), is_active, vehicle_label (tag name), owner_phone, whatsapp_phone, emergency_phone, profile_message, verification_enabled, bag_brand, bag_color, created_at

## Design System
- Dark theme: bg #0e0d0b, surface #161410, orange accent #e06000
- Custom CSS in `client/src/styles/reho.css` (reho-* class prefix)
- Owner screens (activation form + thank you) use Reho design
- Scanner contact page and admin panel use shadcn/ui components

## Test Data
- TEST001, TEST002, TEST003 are auto-seeded on startup

## Recent Changes
- 2026-02-22: Redesigned owner activation form and thank you page with Reho brand design, added 2FA verification toggle with brand/color chips, OTP button visual (not functional yet)
- 2026-02-20: Added Thank You screen after first-time activation
- 2026-02-16: Initial MVP build with full CRUD, mobile-first UI, seed data
