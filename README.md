# Dental Clinic Management System

A full-stack dental clinic management web application built with Next.js 16, React 19, TypeScript, Supabase, and Tailwind CSS v4. Features an AI-powered Messenger chatbot for appointment booking, a comprehensive staff dashboard, and a mobile-first dentist portal.

## Features

- **Patient Management** � CRUD operations, search, archive/restore, medical history, allergies
- **Appointment System** � Calendar view, booking dashboard (approve/decline), triple status model (booking/visit/payment), conflict detection, walk-ins, reschedule/cancel flows
- **Messenger Chatbot** � Facebook Messenger integration for automated appointment booking, rescheduling, cancellation, and reminders via natural language
- **Live Chat Dashboard** � Staff can take over bot conversations, chat with patients in real-time, and hand back to the bot
- **Check-In & Queue** � QR code generation, patient check-in, queue management with FIFO ordering, delay/no-show handling
- **Consultation & Consent** — Treatment documentation with FDI dental chart (findings-based model: presence per tooth, multiple conditions/restorations/surgeries per tooth with multi-surface selection), electronic consent forms with signature pad
- **Billing & Payments** � Invoice generation, partial payment tracking, multiple payment methods (cash, GCash, Maya, card, bank transfer), follow-up scheduling
- **Dentist Portal** � Mobile-first portal with schedule view, queue, emergency declaration, patient quick-view
- **Waitlist Management** � Same-day dynamic availability, FIFO waitlist with patient notifications
- **Unavailability Management** � Declare dentist unavailability, auto-mark affected appointments, reassign to alternate dentists
- **Audit & Settings** � Full audit log viewer, system settings with 6 categories, appointment history timeline
- **Security** � RBAC with Supabase RLS, CSP headers, webhook signature verification, rate limiting, spam prevention, Messenger 24h window compliance with Message Tags

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.3.3 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4, shadcn/ui (base-nova), Lucide icons |
| Language | TypeScript (strict mode) |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| File Storage | Cloudflare R2 (S3-compatible) |
| Chatbot | Facebook Messenger Platform API v21.0 |
| Testing | Playwright E2E (31 tests) |
| Validation | Zod schemas (shared client/server) |

## Prerequisites

- Node.js 20+
- npm or yarn
- Docker & Docker Compose (for Supabase local dev)
- Supabase CLI (`npm install -g supabase`)

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/Eyadan/Dental-Clinic.git
cd Dental-Clinic
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values. See [`.env.example`](.env.example) for all required variables.

### 3. Start Supabase local stack

```bash
npx supabase start
npx supabase db reset
```

This starts:
- Supabase API: http://127.0.0.1:54321
- PostgreSQL DB: port 54322
- Supabase Studio: http://127.0.0.1:54323

### 4. Create auth users (for local dev)

After `db reset`, create Supabase Auth accounts so you can log in:

```bash
npx supabase db execute --file supabase/create_auth_users.sql
```

### 5. Run the dev server

```bash
npm run dev
```

The app will be available at http://localhost:3000.

### Default Login Credentials (Local Dev)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ dentalclinic.ph | (set in create_auth_users.sql) |
| Reception | reception@dentalclinic.ph | (set in create_auth_users.sql) |
| Dentist | dr.smith@dentalclinic.ph | (set in create_auth_users.sql) |
| Dentist | dr.jones@dentalclinic.ph | (set in create_auth_users.sql) |

## Messenger Chatbot Setup

1. Create a Facebook App at [developers.facebook.com](https://developers.facebook.com/apps/)
2. Add Messenger product to your app
3. Configure webhook URL: `https://your-domain/api/webhooks/messenger`
4. Set verify token to match `MESSENGER_VERIFY_TOKEN` in `.env.local`
5. Subscribe to `messages` and `messaging_postbacks` events
6. Configure Messenger Profile (get_started button, persistent menu, greeting):

```bash
curl -X POST http://localhost:3000/api/messenger-profile
```

## Cron Jobs

Configure these cron endpoints (e.g., via Vercel Cron or external scheduler):

| Endpoint | Schedule | Description |
|----------|----------|-------------|
| `/api/cron/reminders` | Daily 8:00 AM | Sends appointment reminders to patients with confirm/reschedule/cancel quick replies |
| `/api/cron/expiration` | Hourly | Expires pending bookings older than 24 hours |

Authenticate with `Authorization: Bearer <CRON_SECRET>` header.

## Testing

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# View test report
npm run test:e2e:report
```

## Project Structure

```
src/
+-- app/
�   +-- (auth)/              # Login, unauthorized pages
�   +-- (dashboard)/         # Staff dashboard (admin, reception)
�   +-- (dentist)/           # Dentist mobile portal
�   +-- (public)/            # Public QR registration page
�   +-- api/                 # API routes (webhooks, cron, upload, queue)
+-- components/
�   +-- layout/              # Sidebar, topbar, dashboard shell
�   +-- ui/                  # shadcn/ui base components
�   +-- [feature]/           # Feature-specific components
+-- lib/
�   +-- services/            # Business logic (booking-parser, notification, messenger, etc.)
�   +-- supabase/            # Supabase client utilities
�   +-- types/               # TypeScript types & database interfaces
�   +-- validations/         # Zod schemas
�   +-- hooks/               # React hooks
�   +-- constants/           # Theme, navigation constants
�   +-- utils/               # Utility functions
+-- middleware.ts            # RBAC route guards + session refresh
supabase/`n+-- migrations/              # SQL migrations
+-- seed.sql                 # Seed data
+-- create_auth_users.sql    # Auth user creation script
tests/
+-- e2e/                     # Playwright E2E tests
```

## Documentation

- [PRD](docs/PRD.md) � Product Requirements Document
- [Architecture](docs/ARCHITECTURE.md) � System architecture & design
- [Security](docs/SECURITY.md) � Security model & threat analysis
- [UI/UX](docs/UI_UX.md) � UI/UX design document
- [Dev Order](docs/dev-order.md) � Development task ordering
- [Plan](docs/plan.md) � Implementation plan
- [Completed Tasks](docs/plan_done.md) � Completed tasks log
- [Bug Log](docs/donetask_bug-encountered.md) � Bug tracking

## License

This project is proprietary. All rights reserved.
