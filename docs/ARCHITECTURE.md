# Architecture Document
## Dental Clinic Management System — Messenger Booking & Patient Visit Workflow

> **Reference:** This document is derived from and governed by the [PRD](./PRD.md). All feature requirements, constraints, and success metrics originate there.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [Database Architecture](#5-database-architecture)
6. [Integration Architecture](#6-integration-architecture)
7. [Security Architecture](#7-security-architecture)
8. [Real-Time Architecture](#8-real-time-architecture)
9. [Deployment Architecture](#9-deployment-architecture)
10. [Key Workflow Data Flows](#10-key-workflow-data-flows)
11. [Error Handling & Resilience](#11-error-handling--resilience)
12. [Directory Structure](#12-directory-structure)
13. [Design Principles & Constraints](#13-design-principles--constraints)

---

## 1. System Overview

A web-based dental clinic management platform covering the full patient journey: Messenger booking, staff approval, check-in, registration, consultation, e-consent, treatment, billing, and follow-up. Three external services form the backbone: **Supabase** (Postgres, Auth, Edge Functions, Realtime), **Cloudflare R2** (file/image storage), and **Facebook Messenger Platform** (booking channel, notifications, live chat). The frontend is a **Next.js 14+ App Router** application deployed on **Vercel**.

**System Roles:**

| Role | Access Scope |
|---|---|
| Admin | Full system access including System Settings |
| Reception Staff | Booking dashboard, check-in, registration, billing, live chat |
| Dentist | Consultation, treatment documentation, consent, queue, mobile portal |
| Patient (external) | Messenger booking, QR self-registration, confirmation reminders |

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          CLIENT TIER                             │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │ Desktop   │  │ Tablet    │  │ Mobile   │  │  Messenger   │    │
│  │ (Staff    │  │ (Consent, │  │ (Dentist │  │  (Patient    │    │
│  │ Dashboard)│  │ Queue)    │  │ Portal)  │  │  Booking)    │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘    │
│       └──────────────┴──────────────┘                │           │
└──────────────────────┬───────────────────────────────┼───────────┘
                       │ HTTPS/TLS                     │
┌──────────────────────┼───────────────────────────────┼───────────┐
│              PRESENTATION & API TIER                  │           │
│                       │                               │           │
│  ┌────────────────────┴───────────────┐               │           │
│  │      Vercel (Next.js 14+)          │               │           │
│  │                                    │               │           │
│  │  App Router  │  Route Handlers  │  Server Actions  │           │
│  │  (RSC +      │  /api/*          │                  │           │
│  │   Client)    │                  │                  │           │
│  │      └───────────┬───────────────┘                  │           │
│  │     Service Layer (lib/services)│                  │           │
│  └──────────────────┬──────────────┘                  │           │
└─────────────────────┼─────────────────────────────────┼───────────┘
                      │                                 │
┌─────────────────────┼─────────────────────────────────┼───────────┐
│              BACKEND / DATA TIER                       │           │
│                      │                                 │           │
│  ┌───────────────────┴──────────────┐                  │           │
│  │          Supabase                 │                  │           │
│  │  ┌─────────┐  ┌────────────────┐  │                  │           │
│  │  │  Auth   │  │  PostgreSQL    │  │                  │           │
│  │  │ (JWT)   │  │ (3NF, RLS)     │  │                  │           │
│  │  └─────────┘  └────────────────┘  │                  │           │
│  │  ┌─────────┐  ┌────────────────┐  │                  │           │
│  │  │  Edge   │  │  Realtime      │  │                  │           │
│  │  │Functions│  │ (WebSocket)    │  │                  │           │
│  │  └────┬────┘  └────────────────┘  │                  │           │
│  └───────┼───────────────────────────┘                  │           │
│          │                                           │           │
│  ┌───────┴────────────┐  ┌──────────────────────────┐ │           │
│  │  Cloudflare R2     │  │  Facebook Messenger       │┘           │
│  │  (File Storage)    │  │  Platform API             │            │
│  └────────────────────┘  └───────────────────────────┘            │
└───────────────────────────────────────────────────────────────────┘
```

### Architecture Style

**Serverless, API-first architecture:**

- **No traditional backend server** — Next.js Server Actions + Route Handlers handle server-side logic; Supabase Edge Functions handle webhook/event-driven logic
- **Database-as-a-service** — Supabase manages Postgres, Auth, and Realtime
- **BaaS pattern** — Frontend talks to Supabase directly via JS client for standard CRUD, with RLS enforcing authorization at database level
- **Edge Functions for orchestration** — Complex multi-step operations (Messenger webhook, booking approval, reassignment) run as Supabase Edge Functions (Deno runtime)

### Request Flow Patterns

| Pattern | Path | Use Case |
|---|---|---|
| **Direct CRUD** | Client → Supabase JS Client → PostgREST → Postgres (RLS) | Patient search, appointment listing, settings reads |
| **Server Action** | Client → Next.js Server Action → Supabase → Postgres | Booking approval, billing, consent signing |
| **Edge Function** | Messenger Webhook → Edge Function → Postgres + Send API | Inbound booking, notifications, reminder cron |
| **Realtime** | Client subscribes → Supabase Realtime (WebSocket) → WAL | Queue updates, slot availability, live chat |
| **File Upload** | Client → Server Action → Cloudflare R2 (presigned URL) | Proof of payment, consent signatures |

---

## 3. Frontend Architecture

### 3.1 Framework: Next.js 14+ App Router

Uses **App Router** (`app/` directory) with **React Server Components (RSC)** and **Client Components**.

- **RSC:** Data-fetching pages without interactivity (dashboard overviews, patient records, settings). Fetch server-side, pass as props to client components.
- **Client Components:** Interactive UI — forms, signature pad (`react-signature-canvas`), QR codes (`qrcode.react`), calendar (`Calendar.js`), realtime queue, live chat, modals.

### 3.2 Routing Structure

```
app/
├── (auth)/                     # Auth route group
│   ├── login/page.tsx
│   └── layout.tsx
│
├── (dashboard)/                # Main staff dashboard (protected)
│   ├── layout.tsx              # Sidebar + topbar, RBAC guard
│   ├── page.tsx                # Dashboard overview
│   ├── bookings/
│   │   ├── page.tsx            # Booking dashboard
│   │   └── [id]/page.tsx       # Booking detail + conversation
│   ├── patients/
│   │   ├── page.tsx            # Patient list + search
│   │   └── [id]/page.tsx       # Patient detail
│   ├── appointments/
│   │   ├── page.tsx            # Calendar view
│   │   └── [id]/page.tsx       # Appointment detail
│   ├── queue/page.tsx          # Real-time queue
│   ├── consultation/[appointmentId]/page.tsx
│   ├── consent/[appointmentId]/page.tsx   # Tablet consent screen
│   ├── billing/
│   │   ├── page.tsx            # Invoice list
│   │   └── [id]/page.tsx       # Invoice + payment
│   ├── live-chat/page.tsx      # Live chat dashboard
│   └── settings/page.tsx       # System settings (admin)
│
├── (dentist)/                  # Dentist mobile portal (protected)
│   ├── layout.tsx              # Mobile-first layout
│   ├── page.tsx                # Today's schedule
│   ├── emergency/page.tsx      # Emergency declaration
│   └── patients/[id]/page.tsx
│
├── (public)/                   # Public routes (no auth)
│   └── register/[token]/page.tsx   # QR self-registration
│
├── api/
│   ├── webhooks/messenger/route.ts   # Messenger webhook
│   └── cron/
│       ├── reminders/route.ts        # Reminder cron
│       └── expiration/route.ts       # Expiration cron
│
├── layout.tsx                  # Root layout
├── error.tsx                   # Global error boundary
├── not-found.tsx
└── loading.tsx
```

### 3.3 State Management

| State Type | Tool | Purpose |
|---|---|---|
| **Server State** | TanStack Query | Caching, optimistic updates, background refetching |
| **Form State** | React Hook Form + Zod | Form values, validation, submission |
| **Realtime State** | Supabase Realtime | Queue, slot availability, live chat (WebSocket) |
| **Local UI State** | React useState/useReducer | Modals, tabs, filters (component-scoped) |
| **Global UI State** | Zustand (minimal) | Theme, sidebar, toast queue (cross-component) |

**React Query conventions:**
- Query keys: `['entity', 'sub-key', params]` (e.g., `['appointments', 'pending', { dentistId }]`)
- Custom hooks wrap all queries: `usePendingBookings()`, `usePatient(id)`, `useQueue(dentistId)`
- Mutations use `onMutate` for optimistic updates + `onError` for rollback

### 3.4 Component Architecture

```
components/
├── ui/                         # shadcn/ui primitives
├── layout/                     # dashboard-shell (collapsible sidebar), sidebar-nav (icon-only mode + tooltips), topbar
├── bookings/                   # booking-list, booking-card, booking-detail
├── patients/                   # patient-search, patient-form-dialog, patient-detail, patient-form-sections
├── dental-chart/               # dental-chart-panel, dental-chart-grid, tooth-icon, tooth-editor, dental-chart-legend, tooth-legend
├── queue/                      # queue-list, queue-item, call-next-button
├── consent/                    # consent-form, signature-pad, consent-preview
├── billing/                    # invoice-detail, payment-form, payment-method-selector, proof-upload
├── chat/                       # conversation-list, chat-thread, patient-info-panel, takeover-controls
├── schedule/                   # calendar-view, dentist-schedule-form, availability-picker
├── settings/                   # settings-tabs, clinic/dentist/appointment/messenger/payment/security-settings
├── shared/                     # error-state, empty-state, skeleton-loader, archive-dialog, confirm-dialog
├── dentist-portal/             # dentist-portal-shell, emergency-button, schedule/queue/more clients
└── qr/                         # qr-generator, qr-registration-form
```

**Component rules (PRD §7):**
- One component per file, max 200 lines
- Props for data, callbacks for actions
- `React.memo()` on performance-critical lists
- Loading, error, and empty states on every data-driven component
- No direct API calls in components — all go through service layer

### 3.5 Service Layer

All data access is centralized. Components never call Supabase directly.

```
lib/services/
├── auth.service.ts          # Login, logout, session, role checks
├── patient.service.ts       # CRUD, search, registration
├── appointment.service.ts   # Create, approve, decline, reschedule, cancel
├── booking.service.ts       # Pending bookings, conflict detection
├── queue.service.ts         # Queue ordering, call-next, status updates
├── consent.service.ts       # Generate, sign, retrieve consent forms
├── treatment.service.ts     # Treatment records, pause/resume
├── billing.service.ts       # Invoices, payments, partial payments
├── schedule.service.ts      # Dentist schedules, clinic holidays, slot calculation
├── messenger.service.ts     # Send API calls, conversation management
├── livechat.service.ts      # Takeover, end chat, message relay
├── qr.service.ts            # QR code generation, validation, invalidation
├── settings.service.ts      # System settings CRUD
├── audit.service.ts         # Audit log writes (called by other services)
├── storage.service.ts       # Cloudflare R2 upload/delete (presigned URLs)
├── waitlist.service.ts      # Waitlist management, FIFO notifications
└── reassignment.service.ts  # Dentist unavailability, reassignment workflow
```

Each service imports the shared Supabase client, returns typed results, handles errors, and calls `audit.service.ts` for auditable actions.

### 3.6 Type System & Validation

```
lib/types/          # TypeScript interfaces (appointment, patient, dentist, consent, etc.)
lib/validations/    # Zod schemas (shared client/server for defense-in-depth)
lib/hooks/          # Custom hooks (use-auth, use-rbac, use-pending-bookings, use-queue, etc.)
```

---

## 4. Backend Architecture

### 4.1 Server-Side Logic Distribution

| Layer | Responsibility | Examples |
|---|---|---|
| **Next.js Server Actions** | Form submissions, file upload orchestration, simple CRUD with audit | Settings updates, consent signing, billing |
| **Next.js Route Handlers** | Webhook verification, cron endpoints, health checks | `/api/webhooks/messenger`, `/api/cron/*` |
| **Supabase Edge Functions** | Webhook processing, notification delivery, cron logic, complex orchestration | Messenger webhook POST, send-notification, reminder-cron, reassignment |
| **PostgreSQL RLS + Triggers** | Authorization, audit logging, status validation, duplicate prevention | All tables |

### 4.2 Edge Functions

```
supabase/functions/
├── messenger-webhook/       # Inbound Messenger message handler
├── send-notification/       # Outbound Messenger notification sender
├── reminder-cron/           # Scheduled: confirmation reminders
├── expiration-cron/         # Scheduled: expires stale booking approvals
├── reassignment/            # Dentist unavailability → reassignment workflow
├── waitlist-notify/         # Notifies waitlisted patients on slot release
└── slot-release/            # Propagates released slots to booking flow
```

### 4.3 Database Triggers

| Trigger | Table | Event | Purpose |
|---|---|---|---|
| `audit_log_insert` | All auditable tables | INSERT/UPDATE/DELETE | Writes to `audit_logs` |
| `appointment_status_validate` | `appointments` | BEFORE UPDATE | Validates status combinations |
| `qr_code_invalidate` | `qr_codes` | AFTER UPDATE | Sets `is_used` + `used_at` on first use |
| `appointment_history_log` | `appointments` | AFTER UPDATE | Records field changes to history |
| `slot_release_notify` | `appointments` | AFTER UPDATE | Notifies Edge Function on slot release |
| `payment_status_update` | `payments` | AFTER INSERT | Recalculates invoice payment status |

### 4.4 Cron Jobs

| Cron | Schedule | Edge Function | PRD Ref |
|---|---|---|---|
| Confirmation reminders | Daily (configurable) | `reminder-cron` | §2.14 |
| Booking approval expiration | Hourly | `expiration-cron` | §2.15 |
| Waitlist notification | On slot release event | `waitlist-notify` | §2.15 |

---

## 5. Database Architecture

### 5.1 Schema Overview (3NF-Compliant)

All tables conform to **Third Normal Form** — no transitive dependencies, no repeated data.

**Core Tables:**

| Table | Key Columns | Relationships |
|---|---|---|
| `users` | `id`, `email` (UQ), `role`, `password_hash`, `created_at` | 1:1 → `dentists` |
| `dentists` | `id`, `user_id` (FK), `license_no`, `specialization` | 1:N → `dentist_schedules`, `dentist_blocks`, `appointments` |
| `dentist_schedules` | `id`, `dentist_id` (FK), `day_of_week`, `start_time`, `end_time` | N:1 ← `dentists` |
| `dentist_blocks` | `id`, `dentist_id` (FK), `start_datetime`, `end_datetime`, `block_type`, `recurrence_rule` | N:1 ← `dentists` |
| `clinic_settings` | `id`, `setting_key` (UQ), `setting_value`, `category`, `data_type` | Standalone |
| `clinic_holidays` | `id`, `date` (UQ), `description`, `is_half_day`, `operating_hours` | Standalone |
| `patients` | `id`, `first_name`, `last_name`, `contact_no`, `email`, `birth_date`, `medical_history`, `allergies`, `is_archived`, `created_at` | 1:N → `appointments`, `waitlist_entries` |
| `dental_services` | `id`, `name` (UQ), `description`, `default_duration_minutes`, `is_active` | M:N ↔ `appointments` |
| `appointments` | `id`, `patient_id` (FK), `dentist_id` (FK), `booking_status`, `visit_status`, `payment_status`, `scheduled_date`, `scheduled_time`, `total_duration`, `reference_no` (UQ), `is_archived`, `created_at` | M:N ↔ `dental_services` via `appointment_services` |
| `appointment_services` | `id`, `appointment_id` (FK), `service_id` (FK) | Junction table |
| `appointment_history` | `id`, `appointment_id` (FK), `changed_by` (FK), `field`, `old_value`, `new_value`, `changed_at` | N:1 ← `appointments` |
| `qr_codes` | `id`, `appointment_id` (FK), `token` (UQ), `expires_at`, `used_at`, `is_used` | N:1 ← `appointments` |
| `consent_forms` | `id`, `appointment_id` (FK), `treatment_info`, `consent_version`, `signature_image_url`, `signed_at`, `staff_id` (FK) | N:1 ← `appointments` |
| `treatment_records` | `id`, `appointment_id` (FK), `diagnosis`, `procedures`, `clinical_notes`, `prescriptions`, `treatment_plan`, `pause_reason`, `paused_at`, `resumed_at` | 1:1 ← `appointments` |
| `invoices` | `id`, `appointment_id` (FK), `total_amount`, `payment_status`, `created_at` | 1:N → `payments` |
| `payments` | `id`, `invoice_id` (FK), `amount`, `method`, `proof_image_url`, `recorded_by` (FK), `paid_at` | N:1 ← `invoices` |
| `waitlist_entries` | `id`, `patient_id` (FK), `requested_date`, `joined_at`, `notified_at` | N:1 ← `patients` |
| `audit_logs` | `id`, `user_id` (FK), `action`, `entity_type`, `entity_id`, `metadata` (JSONB), `timestamp` | **IMMUTABLE** (INSERT only) |
| `messenger_conversations` | `id`, `patient_psid`, `status`, `taken_over_by` (FK), `taken_over_at` | 1:N → `messenger_messages` |
| `messenger_messages` | `id`, `conversation_id` (FK), `direction`, `content`, `sent_at` | N:1 ← `messenger_conversations` |
| `reassignment_logs` | `id`, `appointment_id` (FK), `original_dentist_id` (FK), `new_dentist_id` (FK), `original_schedule`, `new_schedule`, `reason`, `staff_id` (FK), `created_at` | N:1 ← `appointments` |
| `dental_charts` | `id`, `patient_id` (FK UQ), `periodontal_*` (4 bools), `occlusion_*` (5 bools), `appliance_*` (3 fields), `tmd_*` (4 bools), `xray_*` (5 fields) | 1:1 ← `patients` |
| `tooth_presence` | `id`, `chart_id` (FK), `tooth_number`, `presence` (enum: present/missing/impacted/unerupted) | N:1 ← `dental_charts` |
| `tooth_findings` | `id`, `chart_id` (FK), `tooth_number`, `category` (enum: condition/restoration/surgery), `code` (string) | 1:N → `finding_surfaces` |
| `finding_surfaces` | `id`, `finding_id` (FK), `surface` (enum: mesial/distal/buccal/lingual/occlusal) | N:1 ← `tooth_findings` |
| `booking_sessions` | `id`, `patient_psid`, `session_data` (JSONB), `step`, `expires_at`, `created_at` | Standalone (Messenger booking flow) |
| `medical_conditions` | `id`, `name` (UQ), `category`, `is_active` | M:N ↔ `patients` via `patient_medical_conditions` |
| `patient_medical_records` | `id`, `patient_id` (FK UQ), `physician_name`, `physician_phone`, `current_medications`, `previous_surgeries`, `hospitalizations`, `family_history`, `created_at`, `updated_at` | 1:1 ← `patients` |
| `patient_medical_conditions` | `id`, `patient_id` (FK), `condition_id` (FK) | Junction table |
| `consent_clauses` | `id`, `code` (UQ), `title`, `body_text`, `is_active`, `display_order` | M:N ↔ `consent_forms` via `consent_form_clauses` |
| `consent_form_clauses` | `id`, `consent_form_id` (FK), `clause_id` (FK) | Junction table |

### 5.2 Indexes

```sql
-- Patient search (FR-20)
CREATE INDEX idx_patients_name ON patients (last_name, first_name);
CREATE INDEX idx_patients_contact ON patients (contact_no);
CREATE INDEX idx_patients_email ON patients (email);

-- Appointment queries (dashboard, calendar, conflict detection)
CREATE INDEX idx_appointments_date_dentist ON appointments (scheduled_date, dentist_id);
CREATE INDEX idx_appointments_booking_status ON appointments (booking_status);
CREATE INDEX idx_appointments_visit_status ON appointments (visit_status);
CREATE INDEX idx_appointments_payment_status ON appointments (payment_status);
CREATE INDEX idx_appointments_reference ON appointments (reference_no);

-- QR code validation
CREATE INDEX idx_qr_codes_token ON qr_codes (token);

-- Audit log queries
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs (user_id, timestamp);

-- Messenger conversations
CREATE INDEX idx_messenger_conversations_psid ON messenger_conversations (patient_psid);
CREATE INDEX idx_messenger_conversations_status ON messenger_conversations (status);

-- Waitlist (FIFO ordering)
CREATE INDEX idx_waitlist_date_joined ON waitlist_entries (requested_date, joined_at);

-- Dentist schedule lookups
CREATE INDEX idx_dentist_schedules_dentist ON dentist_schedules (dentist_id, day_of_week);
CREATE INDEX idx_dentist_blocks_dentist ON dentist_blocks (dentist_id, start_datetime);

-- Dental chart findings
CREATE INDEX idx_dental_charts_patient ON dental_charts (patient_id);
CREATE INDEX idx_tooth_presence_chart ON tooth_presence (chart_id, tooth_number);
CREATE INDEX idx_tooth_findings_chart ON tooth_findings (chart_id, tooth_number);
CREATE INDEX idx_finding_surfaces_finding ON finding_surfaces (finding_id);

-- Booking sessions
CREATE INDEX idx_booking_sessions_psid ON booking_sessions (patient_psid, expires_at);

-- Medical conditions
CREATE INDEX idx_medical_conditions_name ON medical_conditions (name);
CREATE INDEX idx_patient_medical_conditions_patient ON patient_medical_conditions (patient_id);
```

### 5.3 Row-Level Security (RLS) Policies

RLS enabled on **all tables**. Key policies:

| Table | SELECT | INSERT/UPDATE |
|---|---|---|
| `users` | Own row; admins read all | Own row; admins update all |
| `patients` | All authenticated staff (non-archived) | Reception, dentists, admins |
| `appointments` | All staff; dentists see own | Reception, dentists (own), admins |
| `qr_codes` | Staff; public validates by token | All staff (admin, reception, dentist) |
| `consent_forms` | Dentist (own), admin | Dentist, admin |
| `treatment_records` | Dentist (own), admin | Dentist, admin |
| `dental_charts` | All staff | Dentist, admin |
| `tooth_presence` | All staff | Dentist, admin |
| `tooth_findings` | All staff | Dentist, admin |
| `finding_surfaces` | All staff | Dentist, admin |
| `booking_sessions` | Service role only | Service role only |
| `medical_conditions` | All authenticated | Admin only |
| `patient_medical_records` | All staff | Reception, dentist, admin |
| `patient_medical_conditions` | All staff | Reception, dentist, admin |
| `consent_clauses` | All authenticated | Admin only |
| `consent_form_clauses` | Via consent_forms | Via consent_forms |
| `invoices` / `payments` | All authenticated staff | Reception, admins |
| `audit_logs` | Admins only | Service role only (no user INSERT); **UPDATE/DELETE DENIED** |
| `clinic_settings` | All authenticated staff | Admins only |
| `messenger_*` | Reception, admins | Service role, reception, admins |

### 5.4 Status Transition Constraints

Enforced via database trigger + application validation.

**Booking Status:**
```
Pending → Approved | Declined | Expired
Approved → Confirmed | Reschedule Required | Pending Cancellation | Cancelled | No Show | Completed
Confirmed → Reschedule Required | Pending Cancellation | Cancelled | No Show | Completed
Reschedule Required → Rescheduled
Reschedule Requested → Rescheduled | Approved (denied)
Rescheduled → Confirmed | Pending Cancellation | Cancelled | No Show | Completed
Pending Cancellation → Cancelled | Approved (denied)
```

**Visit Status:**
```
(null) → Checked In → Waiting | Delayed
Waiting → In Consultation | Delayed
Delayed → Waiting | No Show
In Consultation → Consent Signed → Treatment Ongoing
Treatment Ongoing → Treatment Paused | Checkout
Treatment Paused → Awaiting Requirement → Resumed → Treatment Ongoing
Checkout → Completed
```

**Invalid combinations (enforced):** Cancelled/No Show/Pending/Declined/Expired booking status → visit_status must be null.

### 5.5 Concurrency Control

| Scenario | Mechanism | PRD Ref |
|---|---|---|
| Booking approval (prevent double-booking) | Pessimistic locking — `SELECT FOR UPDATE` on schedule row within transaction | NFR-24 |
| Medical record edits | Optimistic concurrency — `updated_at` timestamp comparison; prompt refresh on conflict | NFR-25 |
| Appointment reassignment | Row-level lock on appointment during reassignment transaction | NFR-50/51 |
| QR code validation | Atomic UPDATE — `SET is_used = true WHERE is_used = false AND expires_at > now()` | FR-30/31 |

---

## 6. Integration Architecture

### 6.1 Facebook Messenger Platform

```
Facebook Messenger ──Webhook POST──→ Next.js Route Handler
                                        │
                                        ▼
                                   Supabase Edge Function
                                   (messenger-webhook)
                                        │
                                   ┌────┴────┐
                                   ▼         ▼
                               PostgreSQL  Messenger Send API
                               (records)   (response/notification)
```

**Webhook verification:** `GET /api/webhooks/messenger` handles `hub.mode`, `hub.token`, `hub.challenge`.

**Inbound:** `POST /api/webhooks/messenger` verifies `X-Hub-Signature-256`, forwards to Edge Function for intent detection (booking/cancel/reschedule/confirm) and record creation.

**Outbound notifications** via `send-notification` Edge Function calling:
```
POST https://graph.facebook.com/v21.0/{page-id}/messages?access_token={PAGE_ACCESS_TOKEN}
```

| Notification | Trigger | PRD Ref |
|---|---|---|
| Booking approved/declined | Staff decision | FR-11 |
| Confirmation reminder | Cron job | FR-83 |
| Reschedule required | Dentist unavailability | FR-94/153 |
| Reschedule confirmed | Staff confirms new slot | FR-98/163 |
| Cancellation confirmed | Staff confirms cancellation | FR-121 |
| Follow-up appointment | Staff schedules follow-up | FR-67 |
| Booking expired | Cron triggers expiration | FR-115 |
| Waitlist slot available | Slot release event | FR-112 |

**Messenger fallback:** If messaging window restrictions prevent delivery, Edge Function creates `pending_staff_notification` in `audit_logs` for manual follow-up (FR-90/91).

### 6.2 Cloudflare R2

```
Client → 1. Request presigned URL → Next.js Server Action
       → 2. PUT file directly to R2
       → 3. Save R2 object key to database (proof_image_url, signature_image_url)
       → 4. Access via signed URLs on demand (private bucket)
```

**Bucket structure:**
```
dental-clinic-prod/
├── payments/{invoice_id}/proof_{timestamp}.{ext}
├── consents/{appointment_id}/signature_{timestamp}.png
└── documents/{patient_id}/{filename}
```

### 6.3 Vercel Cron

```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/reminders", "schedule": "0 8 * * *" },
    { "path": "/api/cron/expiration", "schedule": "0 * * * *" }
  ]
}
```

Route handlers verify `CRON_SECRET` header, then invoke corresponding Edge Functions.

---

## 7. Security Architecture

### 7.1 Defense-in-Depth Layers

| Layer | Controls |
|---|---|
| **Network** | HTTPS/TLS everywhere, HSTS headers, R2 private bucket |
| **Application** | Zod validation (client + server), XSS protection (React + DOMPurify), CSRF tokens, CSP headers, rate limiting on public endpoints |
| **Auth & Authz** | Supabase Auth (JWT + refresh), route guards (server + client middleware), RBAC role checks, configurable session timeout, password policy |
| **Database** | RLS on all tables, parameterized queries only, FK constraints, status transition triggers, audit log immutability (INSERT-only) |
| **Data Protection** | TLS in transit, encryption at rest (Supabase managed), no sensitive data in localStorage, secrets in env vars only, Philippine Data Privacy Act compliance |

### 7.2 Authentication Flow

1. Client submits credentials to Supabase Auth
2. Supabase verifies password, issues JWT access token + refresh token (HTTP-only cookies)
3. Client includes JWT in Supabase JS client requests; RLS policies enforce row-level access
4. Server Actions / Edge Functions verify JWT and check role before executing
5. Refresh token auto-rotates access token; session timeout configurable via System Settings

### 7.3 Rate Limiting

| Endpoint | Limit | Method |
|---|---|---|
| Messenger webhook | Facebook-managed | Platform-level |
| QR code validation | 10/min per IP | Vercel Edge Middleware |
| Registration form submission | 5/min per IP | Vercel Edge Middleware |
| Login attempts | 10/min per IP | Supabase Auth built-in |

---

## 8. Real-Time Architecture

### 8.1 Supabase Realtime (WebSocket)

Clients subscribe to Postgres changes via Supabase Realtime, which uses Postgres WAL (Write-Ahead Log) for change data capture.

| Channel | Table Events | Consumers | PRD Ref |
|---|---|---|---|
| `queue:{dentistId}` | `appointments` UPDATE (visit_status) | Queue view (all staff) | §2.6 |
| `slots:{dentistId}:{date}` | `appointments` UPDATE/DELETE (booking_status) | Booking dashboard, Messenger flow | §2.15 |
| `chat:{conversationId}` | `messenger_messages` INSERT | Live chat dashboard | §2.16 |
| `appointments:{dentistId}` | `appointments` INSERT/UPDATE | Dentist portal, calendar | §2.13 |
| `bookings:pending` | `appointments` INSERT (booking_status=Pending) | Booking dashboard | §2.1 |

### 8.2 Realtime Hook Pattern

```typescript
// lib/hooks/use-queue.ts
function useQueue(dentistId: string) {
  const query = useQuery({
    queryKey: ['queue', dentistId],
    queryFn: () => queueService.getByDentist(dentistId),
  });

  useRealtimeSubscription({
    channel: `queue:${dentistId}`,
    event: 'UPDATE',
    table: 'appointments',
    filter: `dentist_id=eq.${dentistId}`,
    onPayload: () => query.refetch(),  // refetch on any change
  });

  return query;
}
```

---

## 9. Deployment Architecture

### 9.1 Environments

| Environment | Frontend | Backend | Storage |
|---|---|---|---|
| **Local Dev** | `next dev` (localhost:3000) | Supabase CLI + Docker (localhost:54323) | Supabase local storage |
| **Preview** | Vercel preview branch | Supabase staging project | Cloudflare R2 (staging bucket) |
| **Production** | Vercel production | Supabase Cloud (production project) | Cloudflare R2 (production bucket) |

### 9.2 Local Development (Supabase CLI)

```
# Prerequisites: Docker Desktop running, Node.js installed
npm install supabase --save-dev
npx supabase init        # creates supabase/ config folder
npx supabase start       # starts local stack (Postgres, Auth, Storage, Edge Functions, Studio)
# Dashboard: http://localhost:54323
# Status:   npx supabase status
# Stop:     npx supabase stop
# Migrations: npx supabase migration new <migration_name>
```

### 9.3 Production Deployment Flow

```
Developer pushes to main branch
        │
        ▼
Vercel auto-builds Next.js app
        │
        ├── Environment variables injected (Supabase URL, anon key, service role key,
        │   R2 credentials, Messenger page token, CRON_SECRET)
        │
        ├── Next.js deployed to Vercel Edge Network (global CDN)
        │
        └── Vercel Cron jobs registered

Database migrations:
        npx supabase link --project-ref <project-id>
        npx supabase db push     # pushes tested local migrations to production
```

### 9.4 Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>     # server-only, never exposed to client

# Cloudflare R2
R2_ACCOUNT_ID=<account_id>
R2_ACCESS_KEY_ID=<access_key>
R2_SECRET_ACCESS_KEY=<secret_key>
R2_BUCKET_NAME=dental-clinic-prod
R2_PUBLIC_URL=https://<r2-domain>.r2.dev

# Facebook Messenger
MESSENGER_PAGE_ACCESS_TOKEN=<page_token>
MESSENGER_VERIFY_TOKEN=<verify_token>
MESSENGER_APP_SECRET=<app_secret>

# Cron
CRON_SECRET=<random_secret>
```

---

## 10. Key Workflow Data Flows

### 10.1 Messenger Booking → Staff Approval

```
1. Patient sends message in Messenger
2. Facebook → POST /api/webhooks/messenger (with X-Hub-Signature-256)
3. Route Handler verifies signature → invokes messenger-webhook Edge Function
4. Edge Function:
   a. Parses message → detects booking intent
   b. Checks for existing Pending booking from same patient (FR-14)
   c. Creates appointment record (booking_status=Pending, reference_no generated)
   d. Creates messenger_conversation record
   e. Sends confirmation reply via Messenger Send API
5. Supabase Realtime → Staff Booking Dashboard receives new pending booking
6. Staff reviews → clicks Approve/Decline
7. Server Action:
   a. Verifies dentist availability + conflict detection (SELECT FOR UPDATE)
   b. Updates booking_status (Approved/Declined)
   c. Writes to appointment_history + audit_logs
   d. Invokes send-notification Edge Function
8. Edge Function sends Messenger notification to patient
```

### 10.2 Patient Check-in → Consultation → Consent → Treatment → Checkout

```
1. Staff searches patient (patient.service → Supabase query with idx_patients_name/contact)
2. Staff verifies identity → clicks Check In
3. Server Action: updates visit_status=Checked In → queue.service adds to queue
4. Realtime: queue view updates for all staff
5. Dentist clicks Call Next → visit_status=In Consultation
6. Dentist reviews patient record → records findings → confirms treatment plan
7. System generates consent form (consent.service) → displayed on tablet
8. Patient signs (react-signature-canvas) → Server Action:
   a. Upload signature image to R2 (presigned URL)
   b. Save consent_forms record with signature_image_url
   c. Update visit_status=Consent Signed
   d. Write audit log
9. Dentist begins treatment → visit_status=Treatment Ongoing
   a. Updates dental chart (presence per tooth, multi-finding per tooth/surface: conditions, restorations, surgeries), clinical notes, diagnosis
   b. Optional: pause/resume treatment (treatment.service)
10. Dentist completes treatment → visit_status=Checkout
11. Realtime: reception notified (FR-59)
12. Staff generates invoice → records payment(s)
    a. Proof photo uploaded to R2 (if e-wallet)
    b. payment_status calculated by trigger (Pending/Partially Paid/Paid)
13. Staff schedules follow-up (optional) → visit_status=Completed, booking_status=Completed
```

### 10.3 Dentist Unavailability → Reassignment

```
1. Dentist declares emergency via Mobile Portal OR staff marks dentist unavailable
2. Server Action → invokes reassignment Edge Function
3. Edge Function:
   a. Identifies all affected appointments in date/time range
   b. Updates booking_status=Reschedule Required for each
   c. Queries available alternate dentists based on schedules + existing appointments
   d. Sends Messenger notification to each affected patient (FR-153)
   e. Creates reassignment_logs entries
4. Staff reviews affected appointments on dashboard
5. Staff selects alternate dentist → confirms reassignment
6. Server Action:
   a. Verifies alternate dentist availability (SELECT FOR UPDATE)
   b. Updates appointment.dentist_id + scheduled_date/time
   c. Releases original slot (booking_status=Rescheduled)
   d. Writes appointment_history + reassignment_logs + audit_logs
   e. Invokes send-notification Edge Function
7. Edge Function sends confirmation to patient (FR-163)
8. If patient doesn't respond within 24h → flag for staff follow-up (FR-165)
```

### 10.4 QR Code Self-Registration

```
1. Staff clicks "Generate QR" for an approved appointment
2. Server Action (qr.service):
   a. Creates qr_codes record (token=UUID, expires_at=now()+5min, is_used=false)
   b. Returns QR code image (qrcode library)
3. QR code displayed at reception desk
4. Patient scans QR → opens /register/{token} on mobile
5. Page validates token:
   a. Checks is_used=false AND expires_at > now()
   b. If invalid → shows error, redirects
6. Patient completes registration form (React Hook Form + Zod validation)
7. Server Action:
   a. Re-validates token server-side (atomic UPDATE: SET is_used=true WHERE is_used=false)
   b. Creates patient record
   c. Links patient to appointment (appointment.patient_id)
   d. Writes audit log
8. Success screen shown to patient
```

---

## 11. Error Handling & Resilience

### 11.1 Error Handling Strategy

| Layer | Strategy |
|---|---|
| **Client Components** | Error boundaries (`error.tsx`), toast notifications, retry buttons |
| **Server Actions** | Try/catch with typed service errors, return `{ success, error }` tuples |
| **Edge Functions** | Try/catch with structured error responses, fallback to staff notification |
| **Database** | Constraints + triggers reject invalid data; application catches `PostgrestError` |
| **Messenger API** | Retry with exponential backoff (3 attempts); fallback to staff notification (FR-90) |

### 11.2 Resilience Patterns

- **Optimistic Updates:** React Query mutations update UI immediately, rollback on error
- **Offline Recovery:** Supabase client auto-reconnects; Realtime subscriptions auto-resume
- **Transaction Safety:** All multi-step operations wrapped in Postgres transactions (ACID)
- **Audit Trail:** Every state change logged — if partial failure occurs, audit logs show exactly what happened
- **Messenger Fallback:** All notification failures create `pending_staff_notification` records (FR-90/91)
- **Graceful Degradation:** If Realtime disconnects, UI falls back to polling (React Query refetch interval)

---

## 12. Directory Structure

```
dental_web_app/
├── app/                        # Next.js App Router pages
├── components/                 # React components (organized by feature)
├── lib/
│   ├── services/               # Service layer (all API/DB access)
│   ├── types/                  # TypeScript interfaces
│   ├── validations/            # Zod schemas (shared client/server)
│   ├── hooks/                  # Custom React hooks
│   ├── utils/                  # Utility functions (date, format, etc.)
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   └── server.ts           # Server Supabase client
│   └── constants/              # App constants (roles, statuses, enums)
├── supabase/
│   ├── functions/              # Edge Functions (Deno)
│   ├── migrations/             # SQL migration files
│   ├── seed.sql                # Seed data for local dev
│   └── config.toml             # Supabase CLI config
├── public/                     # Static assets
├── docs/                       # Documentation (PRD, architecture, FR/NFR)
├── .env.local                  # Local environment variables
├── .env.example                # Template for env vars
├── next.config.js              # Next.js config (CSP headers, etc.)
├── tailwind.config.ts          # Tailwind config
├── tsconfig.json               # TypeScript strict config
├── vercel.json                 # Vercel cron + deployment config
└── package.json
```

---

## 13. Design Principles & Constraints

### Architecture Principles (from PRD §9)

| Principle | Application |
|---|---|
| **SOLID** | Services have single responsibility; components open for extension via props; interfaces segregated by role; dependencies inverted through service layer |
| **DRY** | Shared service layer, shared Zod schemas, shared type definitions, reusable UI components |
| **KISS** | Serverless architecture (no server management), Supabase handles auth/DB/realtime, direct CRUD via PostgREST |
| **ACID** | All multi-step database operations wrapped in transactions; triggers enforce consistency; RLS enforces isolation |
| **3NF** | All tables normalized — junction tables for M:N, no transitive dependencies, FK constraints |

### Code Quality Constraints

- TypeScript strict mode, no `any` types
- `===` for all comparisons
- `const` by default, `let` only when reassignment needed
- Max 200 lines per file
- Early returns to reduce nesting
- `handle` prefix for event handlers (`handleApprove`, `handleSubmit`)
- `isLoading`, `hasError`, `canDelete` naming for booleans
- No todos, placeholders, or incomplete code
- Comprehensive error handling — no silent failures
- Loading, error, and empty states on every data-driven component

### Performance Targets (from PRD §10)

| Metric | Target |
|---|---|
| Dashboard load | < 3s |
| Messenger booking recording | < 5s |
| QR code generation | < 2s |
| Patient search | < 3s |
| Slot availability propagation | < 5s |
| System uptime | ≥ 99.5% |
| Concurrent users | 50+ without degradation |

---

## References

- [PRD — Product Requirements Document](./PRD.md)
- [FR/NFR — Functional & Non-Functional Requirements](./fr_nfr.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Row-Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase Local Development](https://supabase.com/docs/guides/local-development)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Facebook Messenger Platform](https://developers.facebook.com/docs/messenger-platform)
- [TanStack Query](https://tanstack.com/query/latest/docs)
- [react-signature-canvas](https://www.npmjs.com/package/react-signature-canvas)
- [qrcode.react](https://www.npmjs.com/package/qrcode.react)
- [Calendar.js](https://calendarjs.com/)
- [PDA Dental Chart (FDI Notation)](https://pda.com.ph/wp-content/uploads/2022/10/PDA-Dental-Chart.pdf)
- [Electronic Commerce Act (RA 8792)](https://www.gppb.gov.ph/wp-content/uploads/2023/06/Republic-Act-No.-8792.pdf)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Vercel Documentation](https://vercel.com/docs)
