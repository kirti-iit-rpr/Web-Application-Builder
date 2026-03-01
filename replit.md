# Reho — QR Tag Identity System

## Overview
A mobile-first web application for QR tag identity and contact system. Tag owners register QR codes that, when scanned, allow anyone to contact the owner via phone, WhatsApp, or emergency number without revealing actual phone numbers. Brand name: **Reho**.

## Architecture
- **Frontend**: React + TypeScript with custom Reho CSS + Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: JWT-based admin auth (credentials in env vars, token in localStorage, 24h expiry)
- **QR Generation**: Python (qrcode + pillow) for server-side Reho pill-style QR PNGs, JS canvas for browser preview
- **Routing**: wouter for client-side, Express for API
- **Fonts**: Syne (headings), DM Sans (body), DM Mono (labels)

## Key Routes
- `/` - Landing page with how-it-works info
- `/login` - Admin login page (Reho branded)
- `/tag/:qrId` - Dynamic tag profile page (states: unregistered, inactive activation form, verification gate, blocked, active contact page)
- `/tag/:qrId/thank-you` - Thank You page shown after first-time activation
- `/admin` - Admin panel with Bulk Create + Manage tabs (protected, requires login)
- `/qr-generator` - QR Batch Generator with live canvas preview + ZIP download (protected, requires login)
- **Base URL for QR codes**: `https://scan.reho.co.in/tag/`

## Authentication
- Admin credentials stored as env vars: ADMIN_USERNAME, ADMIN_PASSWORD
- `POST /api/auth/login` — returns JWT token (signed with SESSION_SECRET, 24h expiry)
- `GET /api/auth/me` — validates token (protected)
- Protected routes require `Authorization: Bearer <token>` header
- Frontend stores token in localStorage, attaches to all API requests automatically
- Admin pages (`/admin`, `/qr-generator`) redirect to `/login` if not authenticated

## API Endpoints
### Public (no auth required)
- `GET /api/vehicle/:qrId` - Get tag profile (for QR scanning)
- `POST /api/activate/:qrId` - Activate with owner details
- `POST /api/verify/:qrId` - Verify scanner's answer (returns {verified: true/false})

### Protected (requires admin JWT)
- `POST /api/auth/login` - Admin login (returns token)
- `GET /api/auth/me` - Verify token validity
- `GET /api/vehicles` - List all tags
- `POST /api/vehicle` - Create new QR code
- `POST /api/tags/bulk` - Bulk create tags (accepts qrIds array, returns created/duplicates)
- `DELETE /api/vehicle/:qrId` - Delete a tag
- `DELETE /api/tags/bulk` - Bulk delete tags (accepts qrIds array)
- `PATCH /api/vehicle/:qrId` - Edit tag profile (including isActive toggle)
- `GET /api/tags/export` - Export all tags as CSV
- `POST /api/qr/generate` - Generate QR PNGs as ZIP (calls Python script via subprocess)

## Database Schema
- `vehicle_profiles` table with qr_id (PK), is_active, vehicle_label (tag name), owner_phone, whatsapp_phone, emergency_phone, profile_message, verification_enabled, bag_brand, bag_color, created_at

## Design System
- Dark theme: bg #0e0d0b, surface #161410, orange accent #e06000
- Custom CSS in `client/src/styles/reho.css` (reho-* class prefix)
- Owner screens (activation form + thank you) use Reho design
- Scanner pages (verification, blocked, contact) use Reho design
- Admin panel + QR Generator use shadcn/ui components

## Key Files
- `scripts/qr_generator.py` - Python QR generator (Reho pill-style, called by Express via child_process)
- `client/src/pages/admin.tsx` - Admin panel with Bulk Create + Manage QR tabs
- `client/src/pages/qr-generator.tsx` - QR Batch Generator with canvas preview
- `client/src/pages/vehicle-profile.tsx` - Tag profile page (scanner + owner flows)
- `client/src/pages/login.tsx` - Admin login page
- `client/src/lib/auth.ts` - Token management helpers (getToken, setToken, removeToken, isLoggedIn)

## Dependencies
- **Node.js**: express, drizzle-orm, qrcode, jszip, jsonwebtoken, shadcn/ui, tanstack/react-query, wouter
- **Python**: qrcode, pillow (for server-side QR PNG generation)

## Test Data
- TEST001, TEST002, TEST003 are auto-seeded on startup

## Recent Changes
- 2026-03-01: Changed routes from /v/:qrId to /tag/:qrId, updated base URL from findmyowner.replit.app to scan.reho.co.in
- 2026-03-01: Added admin authentication with JWT — login page, protected admin routes, logout, auth guards on /admin and /qr-generator
- 2026-02-23: Added QR Batch Generator page with live canvas preview and server-side Python ZIP generation
- 2026-02-23: Rebuilt admin panel with Bulk Create tab (series config, duplicate detection, progress, batch stats) and Manage tab (table with search, multi-select, status toggle, delete, CSV export)
- 2026-02-23: Added bulk create, delete, CSV export, and QR generation API endpoints
- 2026-02-22: Redesigned scanner pages with Reho brand design — verification gate (color question + 3 attempts), wrong answer state with pips, blocked screen, and redesigned contact page with owner card, styled call/WhatsApp/emergency buttons, privacy note, and "Verified" pill
- 2026-02-22: Redesigned owner activation form and thank you page with Reho brand design, added 2FA verification toggle with brand/color chips, OTP button visual (not functional yet)
- 2026-02-20: Added Thank You screen after first-time activation
- 2026-02-16: Initial MVP build with full CRUD, mobile-first UI, seed data
