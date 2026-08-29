# Development Order — Dental Clinic Management System

> **Purpose:** Ordered task list for AI-driven development. Each task is QA-checkable. Track progress in [plan.md](./plan.md). Log completions in [plan_done.md](./plan_done.md).
>
> **References:** [PRD](./PRD.md) · [Architecture](./ARCHITECTURE.md) · [Security](./SECURITY.md) · [UI/UX](./UI_UX.md) · [FR/NFR](./fr_nfr.md)

---

## How to Use This Document

1. **AI Developer:** Complete tasks in order. Do not skip ahead. Each task builds on prior ones.
2. **QA (You):** After each task, verify using the **QA Checklist** column. Mark pass/fail.
3. **Status tracking:** Update `plan.md` (mark 🔄 in-progress → ✅ done) and `plan_done.md` (add timestamp).

---

## Phase 1 — Foundation & Auth

### Task 1.1 — Project Initialization

| Field | Detail |
|---|---|
| **What** | Initialize Next.js 14+ project with TypeScript strict, Tailwind CSS, shadcn/ui, Lucide icons |
| **Files** | `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.js`, `app/layout.tsx`, `app/globals.css` |
| **Refs** | [Next.js Docs](https://nextjs.org/docs) · [Tailwind Docs](https://tailwindcss.com/docs) · [shadcn/ui Docs](https://ui.shadcn.com/docs) · [Lucide Icons](https://lucide.dev/guide/) |
| **QA Checklist** | ☐ `npm run dev` starts without errors ☐ TypeScript strict mode enabled ☐ Tailwind classes work ☐ shadcn/ui Button renders ☐ Lucide icon renders |

### Task 1.2 — Design System Setup

| Field | Detail |
|---|---|
| **What** | Implement all design tokens from UI/UX doc as CSS variables + Tailwind config. Set up Inter font. |
| **Files** | `app/globals.css`, `tailwind.config.ts`, `lib/constants/theme.ts` |
| **Refs** | [UI/UX §10 — Design System](./UI_UX.md#10-design-system) · [Inter Font](https://rsms.me/inter/) |
| **QA Checklist** | ☐ All color tokens defined as CSS vars ☐ Inter font loaded ☐ Tabular numerals enabled ☐ Spacing scale matches doc ☐ Border radius tokens match ☐ Shadow tokens match |

### Task 1.3 — Supabase Local Dev Setup

| Field | Detail |
|---|---|
| **What** | Install Supabase CLI, init project, start local stack, verify Studio dashboard |
| **Files** | `supabase/config.toml`, `supabase/seed.sql`, `.env.local`, `.env.example`, `.gitignore` |
| **Refs** | [Supabase CLI Docs](https://supabase.com/docs/guides/local-development) · [PRD §3 — Local Dev Setup](./PRD.md) · [Security §13 — Secrets](./SECURITY.md#13-secrets-management) |
| **QA Checklist** | ☐ `npx supabase init` creates `supabase/` folder ☐ `npx supabase start` runs (Docker required) ☐ Studio at `http://localhost:54323` loads ☐ `.env.local` has local keys ☐ `.env.example` has placeholders ☐ `.gitignore` includes `.env.local` |

### Task 1.4 — Database Schema Migrations (All 21 Tables, 3NF)

| Field | Detail |
|---|---|
| **What** | Create SQL migration files for all 21 tables with columns, types, constraints, FKs, indexes |
| **Files** | `supabase/migrations/00001_create_tables.sql`, `00002_indexes.sql` |
| **Refs** | [Architecture §5.1 — Schema](./ARCHITECTURE.md#51-schema-overview-3nf-compliant) · [Architecture §5.2 — Indexes](./ARCHITECTURE.md#52-indexes) · [PRD §4.2 — Core Entities](./PRD.md) |
| **Tables** | `users`, `dentists`, `dentist_schedules`, `dentist_blocks`, `clinic_settings`, `clinic_holidays`, `patients`, `dental_services`, `appointments`, `appointment_services`, `appointment_history`, `qr_codes`, `consent_forms`, `treatment_records`, `invoices`, `payments`, `waitlist_entries`, `audit_logs`, `messenger_conversations`, `messenger_messages`, `reassignment_logs` |
| **QA Checklist** | ☐ `npx supabase db reset` applies all migrations ☐ All 21 tables exist in Studio ☐ FK constraints enforced ☐ Unique constraints on `email`, `reference_no`, `token`, `setting_key` ☐ All indexes created ☐ 3NF — no transitive dependencies ☐ Snake_case throughout |

### Task 1.5 — RLS Policies (All Tables)

| Field | Detail |
|---|---|
| **What** | Enable RLS on all tables. Create SELECT/INSERT/UPDATE/DELETE policies per role matrix. |
| **Files** | `supabase/migrations/00003_rls_policies.sql` |
| **Refs** | [Security §4.3 — RLS Policy Summary](./SECURITY.md#43-rls-policy-summary-full-table) · [Architecture §5.3 — RLS](./ARCHITECTURE.md#53-row-level-security-rls-policies) |
| **QA Checklist** | ☐ RLS enabled on all 21 tables ☐ Admin can SELECT all ☐ Dentist can only SELECT own appointments ☐ Reception can SELECT/INSERT patients ☐ `audit_logs` UPDATE/DELETE denied for ALL ☐ `consent_forms` UPDATE denied (immutable) ☐ `appointment_history` UPDATE/DELETE denied ☐ Service role bypasses RLS |

### Task 1.6 — Database Triggers

| Field | Detail |
|---|---|
| **What** | Create all triggers: audit log, status validation, QR invalidation, appointment history, payment status, slot release notify |
| **Files** | `supabase/migrations/00004_triggers.sql` |
| **Refs** | [Architecture §4.3 — Triggers](./ARCHITECTURE.md#43-database-triggers) · [Security §11 — Audit Logging](./SECURITY.md#11-audit-logging--immutable-trail) |
| **Triggers** | `audit_log_insert` (all auditable tables), `appointment_status_validate` (BEFORE UPDATE on appointments), `qr_code_invalidate` (AFTER UPDATE on qr_codes), `appointment_history_log` (AFTER UPDATE on appointments), `payment_status_update` (AFTER INSERT on payments) |
| **QA Checklist** | ☐ Inserting a row in auditable table creates `audit_logs` entry ☐ Invalid status transition rejected by trigger ☐ QR code `is_used` flips to true on first use ☐ Appointment field change creates `appointment_history` row ☐ Payment insert recalculates invoice `payment_status` |

### Task 1.7 — Seed Data

| Field | Detail |
|---|---|
| **What** | Create seed data for local dev: 3 users (admin/reception/dentist), 1 dentist profile, 5 dental services, clinic settings defaults, 3 patients, 2 appointments |
| **Files** | `supabase/seed.sql` |
| **Refs** | [Architecture §9.2 — Local Dev](./ARCHITECTURE.md#92-local-development-supabase-cli) |
| **QA Checklist** | ☐ `npx supabase db reset` seeds all data ☐ Login works with seeded users ☐ Services appear in catalog ☐ Clinic settings have defaults |

### Task 1.8 — Supabase Client Setup

| Field | Detail |
|---|---|
| **What** | Create browser and server Supabase clients. Set up auth context provider. |
| **Files** | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/auth-context.tsx`, `app/providers.tsx` |
| **Refs** | [Supabase JS Client](https://supabase.com/docs/reference/javascript) · [Architecture §3.4 — Service Layer](./ARCHITECTURE.md) |
| **QA Checklist** | ☐ Browser client uses `NEXT_PUBLIC_SUPABASE_URL` + anon key ☐ Server client uses service role key (server-only) ☐ Auth provider wraps app in `layout.tsx` ☐ `useSession()` hook returns session or null |

### Task 1.9 — Type System & Validation Schemas

| Field | Detail |
|---|---|
| **What** | Create TypeScript interfaces for all entities. Create Zod schemas for all forms. |
| **Files** | `lib/types/index.ts` (or split per entity), `lib/validations/*.schema.ts` |
| **Refs** | [Architecture §3.6 — Type System](./ARCHITECTURE.md) · [Zod Docs](https://zod.dev) |
| **Types** | `User`, `Dentist`, `DentistSchedule`, `DentistBlock`, `ClinicSetting`, `ClinicHoliday`, `Patient`, `DentalService`, `Appointment`, `AppointmentService`, `AppointmentHistory`, `QRCode`, `ConsentForm`, `TreatmentRecord`, `Invoice`, `Payment`, `WaitlistEntry`, `AuditLog`, `MessengerConversation`, `MessengerMessage`, `ReassignmentLog` |
| **Schemas** | `loginSchema`, `patientRegistrationSchema`, `appointmentCreateSchema`, `bookingApprovalSchema`, `consentSchema`, `treatmentRecordSchema`, `invoiceSchema`, `paymentSchema`, `settingsSchema` |
| **QA Checklist** | ☐ All interfaces match DB columns ☐ No `any` types ☐ Zod schemas validate correctly (test with valid + invalid data) ☐ Schemas are shared between client and server |

### Task 1.10 — Service Layer Skeleton

| Field | Detail |
|---|---|
| **What** | Create service modules for each entity with CRUD methods using Supabase client. |
| **Files** | `lib/services/auth.service.ts`, `patient.service.ts`, `appointment.service.ts`, `dentist.service.ts`, `service-catalog.service.ts`, `booking.service.ts`, `queue.service.ts`, `consent.service.ts`, `treatment.service.ts`, `billing.service.ts`, `messenger.service.ts`, `settings.service.ts`, `audit.service.ts`, `qr.service.ts`, `r2.service.ts` |
| **Refs** | [Architecture §3.5 — Service Layer](./ARCHITECTURE.md) · [PRD §5 — Dependencies](./PRD.md) |
| **QA Checklist** | ☐ Each service has typed methods ☐ No direct API calls in components (all through services) ☐ Services return typed results ☐ Error handling returns `{ success, error }` tuples |

### Task 1.11 — Custom Hooks Skeleton

| Field | Detail |
|---|---|
| **What** | Create React Query hooks for data fetching + Realtime subscription hook. |
| **Files** | `lib/hooks/use-appointments.ts`, `use-patients.ts`, `use-queue.ts`, `use-bookings.ts`, `use-realtime-subscription.ts`, `use-session.ts` |
| **Refs** | [Architecture §8.2 — Realtime Hook](./ARCHITECTURE.md#82-realtime-hook-pattern) · [TanStack Query Docs](https://tanstack.com/query/latest/docs) |
| **QA Checklist** | ☐ `useRealtimeSubscription` cleans up on unmount ☐ React Query hooks have proper query keys ☐ Loading/error states handled ☐ Realtime subscription triggers refetch on payload |

### Task 1.12 — Security Headers & Middleware

| Field | Detail |
|---|---|
| **What** | Configure CSP, HSTS, X-Frame-Options, etc. in `next.config.js`. Create auth middleware for route protection. |
| **Files** | `next.config.js`, `middleware.ts` |
| **Refs** | [Security §14 — Security Headers](./SECURITY.md#14-security-headers-configuration) · [Security §4.2 — Route Guards](./SECURITY.md#42-authorization-enforcement-points) · [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware) |
| **QA Checklist** | ☐ `curl -I localhost:3000` shows all security headers ☐ Unauthenticated request to `/dashboard` redirects to `/login` ☐ Dentist accessing `/settings` redirects to `/unauthorized` ☐ Public routes (`/login`, `/register/[token]`) accessible without auth |

### Task 1.13 — App Layout & Navigation

| Field | Detail |
|---|---|
| **What** | Create dashboard layout with sidebar (role-filtered), top bar (user menu), mobile responsive. |
| **Files** | `app/(dashboard)/layout.tsx`, `components/layout/sidebar.tsx`, `components/layout/topbar.tsx`, `components/layout/mobile-nav.tsx` |
| **Refs** | [UI/UX §6.1 — Desktop Nav](./UI_UX.md#61-desktop-navigation-staff-dashboard) · [UI/UX §7.2 — Dashboard Overview](./UI_UX.md#72-staff-dashboard-overview) |
| **QA Checklist** | ☐ Sidebar shows correct items per role ☐ Sidebar collapses on mobile ☐ User menu shows email + logout ☐ Active route highlighted in sidebar ☐ 48px sidebar item height ☐ Icons + labels (not icon-only) |

### Task 1.14 — Login Page

| Field | Detail |
|---|---|
| **What** | Create login page with email/password form, error handling, redirect to role-based dashboard. |
| **Files** | `app/(auth)/login/page.tsx`, `app/(auth)/login/actions.ts` |
| **Refs** | [UI/UX §7.1 — Login Screen](./UI_UX.md#71-login-screen) · [Security §3 — Authentication](./SECURITY.md#3-authentication--session-management) |
| **QA Checklist** | ☐ Form validates with Zod before submit ☐ Invalid credentials show generic error (no field hint) ☐ Successful login redirects to `/` (dashboard) ☐ Password show/hide toggle works ☐ Enter key submits form ☐ Loading state on button during submit |

### Task 1.15 — Unauthorized Page

| Field | Detail |
|---|---|
| **What** | Simple page shown when user accesses a route outside their role. |
| **Files** | `app/unauthorized/page.tsx` |
| **Refs** | [UI/UX §6.1 — Nav](./UI_UX.md#61-desktop-navigation-staff-dashboard) |
| **QA Checklist** | ☐ Shows "You don't have permission to access this page" ☐ Link back to dashboard ☐ No sensitive info displayed |

---

## Phase 2 — Patient & Appointment Core

### Task 2.1 — Dental Services Catalog

| Field | Detail |
|---|---|
| **What** | CRUD page for dental services (admin only). List, create, edit, activate/deactivate. |
| **Files** | `app/(dashboard)/services/page.tsx`, `app/(dashboard)/services/actions.ts`, `components/services/service-form.tsx`, `components/services/service-list.tsx` |
| **Refs** | [PRD §2.4 — Services Catalog](./PRD.md) · [UI/UX §7.12 — Settings](./UI_UX.md#712-system-settings) |
| **QA Checklist** | ☐ Admin can create service with name, description, duration ☐ Duplicate name rejected ☐ Edit updates record ☐ Deactivate (not delete) hides from active list ☐ Empty state shows when no services ☐ Loading skeleton on list |

### Task 2.2 — Patient CRUD & Search

| Field | Detail |
|---|---|
| **What** | Patient list with debounced search (name, phone, email, ref no). Patient detail with tabs (Profile, Medical, Dental Chart, Visits, Billing). Create/edit patient form. |
| **Files** | `app/(dashboard)/patients/page.tsx`, `app/(dashboard)/patients/[id]/page.tsx`, `app/(dashboard)/patients/actions.ts`, `components/patients/patient-search.tsx`, `components/patients/patient-form.tsx`, `components/patients/patient-detail.tsx` |
| **Refs** | [UI/UX §7.4 — Patient List](./UI_UX.md#74-patient-list--search) · [UI/UX §7.5 — Patient Detail](./UI_UX.md#75-patient-detail) · [PRD §2.3 — Registration](./PRD.md) |
| **QA Checklist** | ☐ Search debounced (300ms) ☐ Search matches name, phone, email, ref ☐ Results show in table with columns ☐ Empty state: "No patients found" + register CTA ☐ Detail page has 5 tabs ☐ Edit form validates with Zod ☐ Archive (not delete) patient ☐ Archived patients excluded from search |

### Task 2.3 — Dentist Schedule Management

| Field | Detail |
|---|---|
| **What** | Admin can configure dentist working schedules (day of week, start/end time) and blocks (vacation, breaks). Dentist can view own schedule. |
| **Files** | `app/(dashboard)/dentists/[id]/schedule/page.tsx`, `app/(dashboard)/dentists/[id]/schedule/actions.ts`, `components/dentists/schedule-form.tsx`, `components/dentists/block-form.tsx` |
| **Refs** | [PRD §2.13 — Dentist Scheduling](./PRD.md) · [Architecture §5.1 — dentist_schedules, dentist_blocks](./ARCHITECTURE.md#51-schema-overview-3nf-compliant) |
| **QA Checklist** | ☐ Admin can set working days/hours per dentist ☐ Admin can create time-off blocks ☐ Dentist can view own schedule ☐ Overlapping schedule detection ☐ Recurring blocks supported |

### Task 2.4 — Appointment Creation with Triple Status

| Field | Detail |
|---|---|
| **What** | Create appointment form: select patient (or walk-in), dentist, date, time, services. Auto-calculate duration from services. Generate reference number. Initialize triple status (booking_status, visit_status, payment_status). |
| **Files** | `app/(dashboard)/appointments/new/page.tsx`, `app/(dashboard)/appointments/actions.ts`, `components/appointments/appointment-form.tsx` |
| **Refs** | [PRD §4.3 — Status Models](./PRD.md) · [Architecture §5.1 — appointments](./ARCHITECTURE.md#51-schema-overview-3nf-compliant) · [UI/UX §7.8 — Consultation](./UI_UX.md#78-consultation-view) |
| **QA Checklist** | ☐ Dentist dropdown shows only active dentists ☐ Date picker disables past dates ☐ Time slots filtered by dentist schedule ☐ Duration auto-calculated from selected services ☐ Reference number auto-generated (unique) ☐ Conflict detection prevents double-booking ☐ Triple status initialized correctly ☐ Form validates with Zod |

### Task 2.5 — Scheduling Engine (Conflict Detection)

| Field | Detail |
|---|---|
| **What** | Server-side conflict detection: check dentist schedule, existing appointments, holidays, blocks. Return available time slots for a given dentist + date. |
| **Files** | `lib/services/scheduling.service.ts`, `app/(dashboard)/appointments/actions.ts` (integrate) |
| **Refs** | [PRD §2.13 — Scheduling](./PRD.md) · [Architecture §5.1](./ARCHITECTURE.md#51-schema-overview-3nf-compliant) |
| **QA Checklist** | ☐ No double-booking possible ☐ Holidays block all appointments ☐ Dentist blocks prevent booking ☐ Outside working hours rejected ☐ Available slots calculated correctly ☐ Walk-in slots handled |

### Task 2.6 — Booking Dashboard (Pending Approvals)

| Field | Detail |
|---|---|
| **What** | List pending booking requests with filters. Detail panel with Messenger conversation (if linked), dentist availability, conflict warnings. Approve/Decline actions with confirmation. |
| **Files** | `app/(dashboard)/bookings/page.tsx`, `app/(dashboard)/bookings/[id]/page.tsx`, `app/(dashboard)/bookings/actions.ts`, `components/bookings/booking-list.tsx`, `components/bookings/booking-detail.tsx`, `components/bookings/booking-filters.tsx` |
| **Refs** | [UI/UX §7.3 — Booking Dashboard](./UI_UX.md#73-booking-dashboard) · [PRD §2.1 — Messenger Booking](./PRD.md) |
| **QA Checklist** | ☐ Pending bookings appear in list ☐ Filters work (All/Pending/Approved/Declined/Expired) ☐ Detail panel shows full booking info ☐ Approve sets booking_status=Approved ☐ Decline sets booking_status=Declined ☐ Confirmation dialog before approve/decline ☐ Audit log entry created on approve/decline ☐ Empty state when no pending bookings ☐ Loading skeleton |

### Task 2.7 — Appointment Calendar View

| Field | Detail |
|---|---|
| **What** | Calendar view showing appointments by day/week. Color-coded by status. Click appointment to see detail. |
| **Files** | `app/(dashboard)/appointments/page.tsx`, `components/appointments/calendar-view.tsx`, `components/appointments/appointment-card.tsx` |
| **Refs** | [UI/UX §7.7 — Queue](./UI_UX.md#77-queue-management) · [PRD §2.13 — Scheduling](./PRD.md) · [Calendar.js](https://calendarjs.com/) |
| **QA Checklist** | ☐ Day/week toggle works ☐ Appointments color-coded by booking_status ☐ Click opens detail ☐ Past dates greyed out ☐ Today highlighted ☐ Dentist filter works ☐ Empty day shows "No appointments" |

---

## Phase 3 — Visit Workflow

### Task 3.1 — Patient Check-In

| Field | Detail |
|---|---|
| **What** | Check-in flow: search patient by name/phone/ref → verify identity → set visit_status=Checked In → add to queue. |
| **Files** | `app/(dashboard)/check-in/page.tsx`, `app/(dashboard)/check-in/actions.ts`, `components/check-in/check-in-form.tsx` |
| **Refs** | [PRD §2.5 — Check-In](./PRD.md) · [UI/UX §7.7 — Queue](./UI_UX.md#77-queue-management) |
| **QA Checklist** | ☐ Search finds patient by name, phone, or ref no ☐ Selecting patient shows appointment for today ☐ Check-in sets visit_status=Checked In ☐ Patient appears in queue after check-in ☐ Already checked-in patient shows warning ☐ No appointment today shows error |

### Task 3.2 — QR Code Generation (Staff Side)

| Field | Detail |
|---|---|
| **What** | Staff clicks "Generate QR" for an approved appointment. Server creates qr_codes record (UUID token, 5-min expiry). QR image displayed. |
| **Files** | `lib/services/qr.service.ts`, `components/qr/qr-display.tsx`, `app/(dashboard)/check-in/qr/[appointmentId]/page.tsx` |
| **Refs** | [Architecture §10 — QR Data Flow](./ARCHITECTURE.md) · [Security §10 — QR Security](./SECURITY.md#10-qr-code-security) · [qrcode.react](https://www.npmjs.com/package/qrcode.react) |
| **QA Checklist** | ☐ QR code generates with UUID token ☐ Token stored in qr_codes with expires_at ☐ QR image renders on screen ☐ Countdown timer shows remaining time ☐ Expired QR shows "Regenerate" button |

### Task 3.3 — QR Self-Registration Page (Public)

| Field | Detail |
|---|---|
| **What** | Public route `/register/[token]`. Validate token (is_used=false, expires_at > now). 4-step registration form. On submit: atomic token invalidation + create patient + link to appointment. |
| **Files** | `app/(public)/register/[token]/page.tsx`, `app/(public)/register/[token]/actions.ts`, `components/registration/registration-wizard.tsx`, `components/registration/step-personal.tsx`, `components/registration/step-contact.tsx`, `components/registration/step-medical.tsx`, `components/registration/step-review.tsx` |
| **Refs** | [UI/UX §7.14 — QR Registration](./UI_UX.md#714-qr-self-registration-public) · [Security §10.3 — Validation Flow](./SECURITY.md#103-qr-code-validation-flow) · [Architecture §10 — QR Data Flow](./ARCHITECTURE.md) |
| **QA Checklist** | ☐ Expired token shows error page ☐ Used token shows error page ☐ Valid token shows 4-step form ☐ Progress bar updates per step ☐ Each step validates before advancing ☐ Back button preserves data ☐ Submit creates patient + links to appointment ☐ Token invalidated after use (cannot reuse) ☐ Success screen shows "Proceed to reception" ☐ Privacy notice visible ☐ Completable in < 3 minutes |

### Task 3.4 — Staff-Assisted Registration

| Field | Detail |
|---|---|
| **What** | Staff fills registration form on behalf of patient (same form as QR but staff-entered). |
| **Files** | `app/(dashboard)/patients/new/page.tsx`, `components/patients/staff-registration-form.tsx` |
| **Refs** | [PRD §2.3 — Registration](./PRD.md) · [UI/UX §7.4 — Patient List](./UI_UX.md#74-patient-list--search) |
| **QA Checklist** | ☐ Form validates with Zod ☐ Duplicate detection (name + phone) warns staff ☐ Created patient appears in search ☐ Can link to existing appointment |

### Task 3.5 — Walk-In Visit Creation

| Field | Detail |
|---|---|
| **What** | Staff creates walk-in appointment (no prior booking). Select dentist, services, immediate time. |
| **Files** | `app/(dashboard)/appointments/walk-in/page.tsx`, `components/appointments/walk-in-form.tsx` |
| **Refs** | [PRD §2.5 — Walk-In](./PRD.md) |
| **QA Checklist** | ☐ Walk-in creates appointment with booking_status=Approved (bypass pending) ☐ Dentist availability checked ☐ Patient can be selected or created inline ☐ Walk-in appears in queue immediately |

### Task 3.6 — Queue Management (Real-Time)

| Field | Detail |
|---|---|
| **What** | Real-time queue view ordered by scheduled time → checked-in status → arrival time. Status badges. Call Next / Call Specific actions. |
| **Files** | `app/(dashboard)/queue/page.tsx`, `components/queue/queue-list.tsx`, `components/queue/queue-card.tsx`, `lib/hooks/use-queue.ts` |
| **Refs** | [UI/UX §7.7 — Queue](./UI_UX.md#77-queue-management) · [Architecture §8 — Realtime](./ARCHITECTURE.md#81-supabase-realtime-websocket) · [PRD §2.6 — Queue](./PRD.md) |
| **QA Checklist** | ☐ Queue updates in real-time (Supabase Realtime) ☐ New check-in appears in queue automatically ☐ Status badges show correct colors ☐ "Call Next" advances queue ☐ "Call Specific" works ☐ Queue ordering correct (scheduled → checked-in → arrival) ☐ Empty state: "No patients in queue" ☐ Fallback to polling if Realtime disconnects ☐ ARIA live region for screen readers |

### Task 3.7 — Consultation View

| Field | Detail |
|---|---|
| **What** | Dentist-only view: patient record (left, tabbed) + consultation form (right). Examination findings, diagnosis, treatment plan. "Generate Consent" button. |
| **Files** | `app/(dashboard)/consultation/[appointmentId]/page.tsx`, `app/(dashboard)/consultation/actions.ts`, `components/consultation/consultation-view.tsx`, `components/consultation/examination-form.tsx` |
| **Refs** | [UI/UX §7.8 — Consultation](./UI_UX.md#78-consultation-view) · [PRD §2.7 — Consultation](./PRD.md) |
| **QA Checklist** | ☐ Only dentist role can access ☐ Patient record tabs work (Profile, Medical, Chart, Visits) ☐ Examination form saves draft ☐ "Generate Consent" creates consent form record ☐ Visit status changes to In Consultation ☐ Dentist sees only own appointments |

### Task 3.8 — Electronic Consent (Tablet)

| Field | Detail |
|---|---|
| **What** | Tablet-optimized consent screen. Consent text (scrollable, must scroll to bottom). Signature pad (react-signature-canvas). Submit uploads signature to R2, saves URL. Decline option. |
| **Files** | `app/(dashboard)/consent/[appointmentId]/page.tsx`, `app/(dashboard)/consent/actions.ts`, `components/consent/consent-view.tsx`, `components/consent/signature-pad.tsx` |
| **Refs** | [UI/UX §7.9 — Consent Screen](./UI_UX.md#79-consent-screen-tablet) · [PRD §2.8 — Consent](./PRD.md) · [react-signature-canvas](https://www.npmjs.com/package/react-signature-canvas) · [Security §8 — R2 Storage](./SECURITY.md#8-file-storage-security-cloudflare-r2) · [RA 8792 — E-Commerce Act](https://www.gppb.gov.ph/wp-content/uploads/2023/06/Republic-Act-No.-8792.pdf) |
| **QA Checklist** | ☐ Consent text displays treatment info ☐ Must scroll to bottom before sign enabled ☐ Signature pad captures stylus/touch input ☐ Clear button resets canvas ☐ "Type name instead" alternative works ☐ Submit uploads signature PNG to R2 ☐ Signature URL saved to consent_forms ☐ Visit status → Consent Signed ☐ Decline blocks treatment + records refusal ☐ Works in landscape + portrait ☐ No auto-timeout on this screen |

### Task 3.9 — Dental Chart Component (FDI/ISO 3950)

| Field | Detail |
|---|---|
| **What** | Interactive SVG dental chart with FDI two-digit notation. Click tooth → popover with state selector + notes. States: Healthy, Caries, Filled, Crown, Missing, Implant, Root Canal, Bridge, Extraction Needed. |
| **Files** | `components/dental-chart/dental-chart.tsx`, `components/dental-chart/tooth.tsx`, `components/dental-chart/tooth-popover.tsx`, `lib/constants/tooth-states.ts` |
| **Refs** | [UI/UX §7.6 — Dental Chart](./UI_UX.md#76-dental-chart-fdi-notation) · [FDI Notation (ISO 3950)](https://en.wikipedia.org/wiki/FDI_World_Dental_Federation_notation) · [PDA Dental Chart](https://pda.com.ph/wp-content/uploads/2022/10/PDA-Dental-Chart.pdf) |
| **QA Checklist** | ☐ All 32 permanent teeth displayed (FDI 11-48) ☐ Dentist's view orientation (patient's right = chart left) ☐ Click tooth opens state selector popover ☐ State change updates tooth color ☐ FDI number visible on each tooth ☐ Tooth states stored as JSONB in treatment_records ☐ Each tooth is a button with ARIA label ☐ Touch target ≥ 32px on tablet ☐ Hover shows tooltip with FDI number + state |

### Task 3.10 — Treatment Documentation

| Field | Detail |
|---|---|
| **What** | Dentist documents treatment: dental chart, clinical notes, diagnosis, procedures, prescriptions, treatment plan. Save/update treatment record. |
| **Files** | `app/(dashboard)/treatment/[appointmentId]/page.tsx`, `app/(dashboard)/treatment/actions.ts`, `components/treatment/treatment-form.tsx` |
| **Refs** | [PRD §2.9 — Treatment](./PRD.md) · [UI/UX §7.6 — Dental Chart](./UI_UX.md#76-dental-chart-fdi-notation) |
| **QA Checklist** | ☐ Dental chart integrated in treatment form ☐ Clinical notes save to treatment_records ☐ Diagnosis and procedures recorded ☐ Prescriptions field works ☐ Treatment plan field works ☐ Visit status → Treatment Ongoing on first save ☐ Only dentist assigned to appointment can edit |

### Task 3.11 — Treatment Pause/Resume

| Field | Detail |
|---|---|
| **What** | Dentist can pause treatment (reason required) and resume later. Tracks paused_at, resumed_at, pause_reason. |
| **Files** | `app/(dashboard)/treatment/[appointmentId]/actions.ts` (add pause/resume), `components/treatment/pause-dialog.tsx` |
| **Refs** | [PRD §2.9 — Treatment Pause](./PRD.md) · [PRD §4.3 — Visit Status](./PRD.md) |
| **QA Checklist** | ☐ Pause requires reason ☐ Visit status → Treatment Paused ☐ Resume sets visit status → Resumed ☐ Pause/resume timestamps recorded ☐ "Awaiting Requirement" status supported ☐ Paused treatment shows indicator in queue |

---

## Phase 4 — Billing & Follow-Up

### Task 4.1 — Cloudflare R2 Integration

| Field | Detail |
|---|---|
| **What** | Set up R2 service: generate presigned URLs for upload/read. File type + size validation. |
| **Files** | `lib/services/r2.service.ts` |
| **Refs** | [Security §8 — R2 Storage](./SECURITY.md#8-file-storage-security-cloudflare-r2) · [Architecture §6.2 — R2 Upload Flow](./ARCHITECTURE.md) · [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/) |
| **QA Checklist** | ☐ Presigned URL generated server-side ☐ URL expires in 15 minutes ☐ Only jpg/png/pdf accepted ☐ Max file size enforced (10MB) ☐ Upload requires authentication ☐ Object keys use UUIDs (not predictable) |

### Task 4.2 — Invoice Generation

| Field | Detail |
|---|---|
| **What** | Generate invoice from appointment services + prices. Line items, subtotal, total. Payment status = Pending Payment. |
| **Files** | `app/(dashboard)/billing/[appointmentId]/page.tsx`, `app/(dashboard)/billing/actions.ts`, `components/billing/invoice-detail.tsx` |
| **Refs** | [UI/UX §7.10 — Billing](./UI_UX.md#710-billing--invoice) · [PRD §2.10 — Billing](./PRD.md) |
| **QA Checklist** | ☐ Invoice auto-generates from appointment services ☐ Line items show service name + price ☐ Total calculated correctly ☐ Payment status = Pending Payment ☐ Invoice linked to appointment ☐ Duplicate invoice prevention |

### Task 4.3 — Payment Processing

| Field | Detail |
|---|---|
| **What** | Record payment: amount, method (Cash/GCash/Maya/Card), proof photo upload for e-wallets. Partial payments supported. Payment status auto-updates via trigger. |
| **Files** | `app/(dashboard)/billing/[appointmentId]/actions.ts` (add payment), `components/billing/payment-form.tsx`, `components/billing/payment-proof-upload.tsx` |
| **Refs** | [PRD §2.10 — Payment](./PRD.md) · [UI/UX §7.10 — Billing](./UI_UX.md#710-billing--invoice) · [Security §8 — R2](./SECURITY.md#8-file-storage-security-cloudflare-r2) |
| **QA Checklist** | ☐ Cash/GCash/Maya/Card options work ☐ Amount > remaining balance rejected ☐ Proof photo uploads to R2 for e-wallets ☐ Partial payment updates status to Partially Paid ☐ Full payment updates status to Paid (via trigger) ☐ Payment recorded by user logged ☐ Amount displayed in ₱ with tabular numerals ☐ Payment success toast shows |

### Task 4.4 — Checkout & Visit Completion

| Field | Detail |
|---|---|
| **What** | After payment (or partial), staff completes checkout. Visit status → Completed. Follow-up scheduling if needed. |
| **Files** | `app/(dashboard)/billing/[appointmentId]/actions.ts` (add checkout), `components/billing/checkout-dialog.tsx` |
| **Refs** | [PRD §2.11 — Follow-Up](./PRD.md) · [PRD §4.3 — Visit Status](./PRD.md) |
| **QA Checklist** | ☐ Checkout sets visit_status=Completed ☐ Booking_status=Completed ☐ Follow-up appointment can be scheduled during checkout ☐ Checkout blocked if consent not signed ☐ Checkout blocked if treatment not documented ☐ Audit log entry created |

### Task 4.5 — Follow-Up Appointment Scheduling

| Field | Detail |
|---|---|
| **What** | Schedule follow-up appointment linked to original visit. Same flow as appointment creation but pre-filled with patient + dentist. |
| **Files** | `components/billing/follow-up-scheduler.tsx`, `app/(dashboard)/billing/[appointmentId]/actions.ts` (add follow-up) |
| **Refs** | [PRD §2.11 — Follow-Up](./PRD.md) |
| **QA Checklist** | ☐ Follow-up pre-fills patient + dentist ☐ Date/time selection with conflict detection ☐ Follow-up creates new appointment ☐ Original appointment references follow-up (if tracked) ☐ Patient notified (when Messenger integrated) |

---

## Phase 5 — Messenger Integration

### Task 5.1 — Messenger Webhook Setup

| Field | Detail |
|---|---|
| **What** | Create webhook route handler: GET (verify token) + POST (receive messages). HMAC-SHA256 signature verification. |
| **Files** | `app/api/webhooks/messenger/route.ts`, `supabase/functions/messenger-webhook/index.ts` |
| **Refs** | [Security §9.1 — Webhook Verification](./SECURITY.md#91-webhook-verification) · [Architecture §6.1 — Messenger](./ARCHITECTURE.md) · [Messenger Platform Docs](https://developers.facebook.com/docs/messenger-platform/webhook) · [Graph API Docs](https://developers.facebook.com/docs/graph-api) |
| **QA Checklist** | ☐ GET with correct verify_token returns challenge ☐ GET with wrong token returns 403 ☐ POST with invalid signature returns 401 ☐ POST with valid signature processes message ☐ Constant-time signature comparison used ☐ Webhook events logged |

### Task 5.2 — Booking Request Parsing (Edge Function)

| Field | Detail |
|---|---|
| **What** | Parse incoming Messenger messages. Extract intent (book, confirm, reschedule, cancel). Collect booking info (date, time, service). Create pending appointment. |
| **Files** | `supabase/functions/messenger-webhook/index.ts` (extend), `lib/services/messenger.service.ts` |
| **Refs** | [PRD §2.1 — Messenger Booking](./PRD.md) · [Architecture §6.1](./ARCHITECTURE.md) · [Messenger Send API](https://developers.facebook.com/docs/messenger-platform/send-messages) |
| **QA Checklist** | ☐ "Book" intent creates pending appointment ☐ Missing info prompts follow-up questions ☐ Reference number generated and sent to patient ☐ Conversation stored in messenger_conversations ☐ Messages stored in messenger_messages ☐ Invalid/unrecognized intent sends helpful response |

### Task 5.3 — Send Notification Edge Function

| Field | Detail |
|---|---|
| **What** | Edge function to send Messenger messages (approval, decline, reminder, reschedule, cancellation notifications). |
| **Files** | `supabase/functions/send-notification/index.ts` |
| **Refs** | [PRD §2.14 — Notifications](./PRD.md) · [Architecture §4.2 — Edge Functions](./ARCHITECTURE.md#42-edge-functions) · [Messenger Send API](https://developers.facebook.com/docs/messenger-platform/send-messages) |
| **QA Checklist** | ☐ Approval notification sent to patient ☐ Decline notification sent with reason ☐ Uses MESSENGER_PAGE_ACCESS_TOKEN (server-only) ☐ API version pinned (e.g., v21.0) ☐ Failed delivery creates pending_staff_notification record ☐ Retry with exponential backoff (3 attempts) |

### Task 5.4 — Confirmation Reminder Flow

| Field | Detail |
|---|---|
| **What** | Send reminder day before appointment. Patient can Confirm/Reschedule/Cancel via Messenger quick replies. Handle responses. |
| **Files** | `supabase/functions/reminder-cron/index.ts`, `supabase/functions/messenger-webhook/index.ts` (handle responses) |
| **Refs** | [PRD §2.14 — Reminders](./PRD.md) · [Architecture §4.4 — Cron Jobs](./ARCHITECTURE.md#44-cron-jobs) · [Vercel Cron Docs](https://vercel.com/docs/cron-jobs) |
| **QA Checklist** | ☐ Reminder sent 24h before appointment ☐ Quick reply buttons (Confirm/Reschedule/Cancel) work ☐ Confirm sets booking_status=Confirmed ☐ Reschedule sets booking_status=Reschedule Requested ☐ Cancel sets booking_status=Pending Cancellation ☐ Reminder time configurable via settings |

### Task 5.5 — Reminder & Expiration Cron Jobs

| Field | Detail |
|---|---|
| **What** | Vercel Cron: daily reminder job + hourly expiration job. Protected by CRON_SECRET. |
| **Files** | `app/api/cron/reminders/route.ts`, `app/api/cron/expiration/route.ts`, `vercel.json` |
| **Refs** | [Architecture §4.4 — Cron Jobs](./ARCHITECTURE.md#44-cron-jobs) · [Vercel Cron Docs](https://vercel.com/docs/cron-jobs) · [Security §13 — CRON_SECRET](./SECURITY.md#13-secrets-management) |
| **QA Checklist** | ☐ Cron jobs registered in vercel.json ☐ CRON_SECRET verified before execution ☐ Reminder cron sends reminders for tomorrow's appointments ☐ Expiration cron sets stale pending bookings to Expired ☐ Expired booking notifies patient ☐ Cron execution logged |

### Task 5.6 — Live Chat Dashboard

| Field | Detail |
|---|---|
| **What** | 3-panel layout: conversation list + chat thread + patient info. Staff can take over conversation (bot pauses). Send messages. End chat (bot resumes). |
| **Files** | `app/(dashboard)/chat/page.tsx`, `app/(dashboard)/chat/actions.ts`, `components/chat/conversation-list.tsx`, `components/chat/chat-thread.tsx`, `components/chat/patient-info-panel.tsx` |
| **Refs** | [UI/UX §7.11 — Live Chat](./UI_UX.md#711-live-chat-dashboard) · [PRD §2.16 — Live Chat](./PRD.md) · [Architecture §8 — Realtime](./ARCHITECTURE.md#81-supabase-realtime-websocket) |
| **QA Checklist** | ☐ Conversation list shows active conversations ☐ Unread indicator works ☐ Take Chat pauses bot replies ☐ Staff messages sent to patient's Messenger ☐ End Chat restores bot ☐ Real-time: new messages appear without refresh ☐ Patient info panel shows appointment history ☐ Empty state: "No active conversations" ☐ Only reception/admin can access |

### Task 5.7 — Messenger Notification Fallback

| Field | Detail |
|---|---|
| **What** | When Messenger notification fails (expired window, delivery error), create pending_staff_notification record. Show alert on dashboard. |
| **Files** | `supabase/functions/send-notification/index.ts` (extend), `app/(dashboard)/page.tsx` (add alerts), `lib/services/notification.service.ts` |
| **Refs** | [PRD §2.14 — Fallback](./PRD.md) · [Architecture §11 — Error Handling](./ARCHITECTURE.md#111-error-handling-strategy) |
| **QA Checklist** | ☐ Failed notification creates staff notification record ☐ Dashboard shows alert for pending staff notifications ☐ Staff can manually notify patient (call/alternative) ☐ Staff notification dismissed after action |

---

## Phase 6 — Exception Handling & Advanced Features

### Task 6.1 — Dentist Unavailability & Reassignment

| Field | Detail |
|---|---|
| **What** | Dentist/staff declare unavailability (date range + reason). System finds affected appointments. Sets booking_status=Reschedule Required. Suggests alternate dentists. Staff confirms reassignment. Original slot released. Reassignment log created. Patient notified. |
| **Files** | `app/(dashboard)/dentists/[id]/unavailability/page.tsx`, `app/(dashboard)/dentists/[id]/unavailability/actions.ts`, `lib/services/reassignment.service.ts`, `supabase/functions/reassignment/index.ts`, `components/dentists/unavailability-form.tsx`, `components/dentists/reassignment-dialog.tsx` |
| **Refs** | [PRD §2.15 — Unavailability](./PRD.md) · [Architecture §4.2 — reassignment Edge Function](./ARCHITECTURE.md#42-edge-functions) |
| **QA Checklist** | ☐ Declare unavailability shows affected appointments ☐ Booking status → Reschedule Required ☐ Alternate dentists suggested (based on schedule + availability) ☐ Reassignment creates reassignment_logs entry ☐ Original slot released ☐ Patient notified via Messenger ☐ Audit log entry created ☐ History preserved (appointment_history) |

### Task 6.2 — Dentist Mobile Portal

| Field | Detail |
|---|---|
| **What** | Mobile-first pages: today's schedule, queue view, emergency declaration (long-press button), patient quick-view. |
| **Files** | `app/(dentist)/page.tsx`, `app/(dentist)/schedule/page.tsx`, `app/(dentist)/queue/page.tsx`, `app/(dentist)/emergency/page.tsx`, `components/dentist-portal/emergency-button.tsx` |
| **Refs** | [UI/UX §7.13 — Dentist Mobile Portal](./UI_UX.md#713-dentist-mobile-portal) · [PRD §2.17 — Mobile Portal](./PRD.md) |
| **QA Checklist** | ☐ Mobile-first layout (bottom tabs) ☐ Schedule shows today's appointments ☐ Queue view simplified ☐ Emergency button requires long-press (1.5s) ☐ Emergency triggers reassignment workflow ☐ Bottom tabs: Schedule, Queue, More ☐ 44×44px touch targets ☐ Only dentist role can access |

### Task 6.3 — Late Arrival, Delayed & No-Show

| Field | Detail |
|---|---|
| **What** | Configurable grace period. If patient arrives late → Delayed status. Staff can: call next, move to later slot, or reschedule. If not accommodated same day → No Show. |
| **Files** | `app/(dashboard)/queue/actions.ts` (add late/no-show), `components/queue/late-arrival-dialog.tsx`, `components/queue/no-show-dialog.tsx` |
| **Refs** | [PRD §2.15 — Late/No-Show](./PRD.md) |
| **QA Checklist** | ☐ Grace period configurable in settings ☐ Late arrival sets visit_status=Delayed ☐ Staff can call next patient when current is delayed ☐ Move to later slot works ☐ No Show sets booking_status=No Show ☐ No Show releases slot ☐ Audit log entries created |

### Task 6.4 — Same-Day Dynamic Availability & Waitlist

| Field | Detail |
|---|---|
| **What** | Auto-release slots on early completion/cancellation/no-show. Released slots immediately visible. Waitlist with FIFO notification. |
| **Files** | `supabase/functions/slot-release/index.ts`, `supabase/functions/waitlist-notify/index.ts`, `app/(dashboard)/waitlist/page.tsx`, `app/(dashboard)/waitlist/actions.ts`, `components/waitlist/waitlist-list.tsx` |
| **Refs** | [PRD §2.15 — Dynamic Availability](./PRD.md) · [Architecture §4.2 — slot-release, waitlist-notify](./ARCHITECTURE.md#42-edge-functions) |
| **QA Checklist** | ☐ Early completion releases slot ☐ Cancellation releases slot ☐ No-show releases slot ☐ Released slot visible in booking dashboard ☐ Waitlist entries ordered FIFO ☐ First waitlisted patient notified on slot release ☐ Notified patient can accept/decline ☐ Accepted → appointment created; declined → next patient notified |

### Task 6.5 — Patient-Initiated Cancellation (Messenger)

| Field | Detail |
|---|---|
| **What** | Patient sends "Cancel" via Messenger → booking_status=Pending Cancellation → staff reviews with reason → confirm/deny → slot released on confirm. |
| **Files** | `supabase/functions/messenger-webhook/index.ts` (extend), `app/(dashboard)/bookings/actions.ts` (add cancellation review) |
| **Refs** | [PRD §2.15 — Cancellation](./PRD.md) |
| **QA Checklist** | ☐ "Cancel" intent sets Pending Cancellation ☐ Staff sees cancellation request on dashboard ☐ Staff can confirm or deny ☐ Confirm → Cancelled + slot released + patient notified ☐ Deny → booking remains + patient notified ☐ Cancellation cutoff period enforced ☐ Reason captured |

### Task 6.6 — Patient-Initiated Reschedule (Messenger)

| Field | Detail |
|---|---|
| **What** | Patient sends "Reschedule" via Messenger → booking_status=Reschedule Requested → staff reviews → selects new slot → Rescheduled → original slot released → patient notified. |
| **Files** | `supabase/functions/messenger-webhook/index.ts` (extend), `app/(dashboard)/bookings/actions.ts` (add reschedule review) |
| **Refs** | [PRD §2.15 — Reschedule](./PRD.md) |
| **QA Checklist** | ☐ "Reschedule" intent sets Reschedule Requested ☐ Staff sees reschedule request on dashboard ☐ Staff selects new slot (with conflict detection) ☐ Confirm → Rescheduled + original slot released + patient notified ☐ Appointment history records the change |

---

## Phase 7 — Settings, Audit & Polish

### Task 7.1 — System Settings Module

| Field | Detail |
|---|---|
| **What** | Admin settings page with 6 categories: Clinic, Dentist, Appointment, Messenger, Payment, Security. Save per category. Unsaved changes warning. |
| **Files** | `app/(dashboard)/settings/page.tsx`, `app/(dashboard)/settings/[category]/page.tsx`, `app/(dashboard)/settings/actions.ts`, `components/settings/settings-tabs.tsx`, `components/settings/clinic-settings.tsx`, `components/settings/dentist-settings.tsx`, `components/settings/appointment-settings.tsx`, `components/settings/messenger-settings.tsx`, `components/settings/payment-settings.tsx`, `components/settings/security-settings.tsx` |
| **Refs** | [PRD §2.20 — System Settings](./PRD.md) · [UI/UX §7.12 — Settings](./UI_UX.md#712-system-settings) |
| **QA Checklist** | ☐ All 6 categories accessible ☐ Clinic: working days, holidays, closures, half-day schedules ☐ Dentist: schedules, breaks, vacations ☐ Appointment: advance booking, grace period, approval expiration, QR validity, cancellation cutoff, reminder schedule, waitlist policy, walk-in policy ☐ Messenger: templates, triggers, fallback behavior ☐ Payment: accepted methods, partial payment policy ☐ Security: password policy, session timeout, audit retention ☐ Save persists to clinic_settings ☐ Unsaved changes warning on tab switch ☐ Only admin can access |

### Task 7.2 — Audit Log Viewer

| Field | Detail |
|---|---|
| **What** | Admin-only page to view audit logs. Filter by entity type, user, date range. Read-only. |
| **Files** | `app/(dashboard)/audit/page.tsx`, `components/audit/audit-log-table.tsx`, `components/audit/audit-filters.tsx` |
| **Refs** | [Security §11 — Audit Logging](./SECURITY.md#11-audit-logging--immutable-trail) · [PRD §2.18 — Audit](./PRD.md) |
| **QA Checklist** | ☐ Only admin can access ☐ Logs show user, action, entity, timestamp ☐ Filters work (entity type, user, date) ☐ Logs are read-only (no edit/delete) ☐ Pagination for large log sets ☐ Empty state: "No logs found" |

### Task 7.3 — Record Archiving

| Field | Detail |
|---|---|
| **What** | Archive (not delete) patients, appointments, invoices. Archived records excluded from active views but retrievable. |
| **Files** | `app/(dashboard)/patients/[id]/actions.ts` (add archive), `app/(dashboard)/appointments/[id]/actions.ts` (add archive), `app/(dashboard)/billing/[id]/actions.ts` (add archive), `components/shared/archive-dialog.tsx` |
| **Refs** | [PRD §2.19 — Archiving](./PRD.md) |
| **QA Checklist** | ☐ Archive sets is_archived=true ☐ Archived records excluded from search/list ☐ Archived records retrievable by admin ☐ Archive confirmation dialog ☐ Audit log entry created ☐ Delete is never available (only archive) |

### Task 7.4 — Appointment History View

| Field | Detail |
|---|---|
| **What** | View complete change history for an appointment (field, old value, new value, changed by, timestamp). |
| **Files** | `app/(dashboard)/appointments/[id]/history/page.tsx`, `components/appointments/history-timeline.tsx` |
| **Refs** | [PRD §2.19 — History](./PRD.md) · [Architecture §5.1 — appointment_history](./ARCHITECTURE.md#51-schema-overview-3nf-compliant) |
| **QA Checklist** | ☐ History shows all changes for appointment ☐ Each entry shows field, old/new value, who changed, when ☐ History is read-only ☐ Empty state: "No changes recorded" |

### Task 7.5 — Loading, Error & Empty States (All Pages)

| Field | Detail |
|---|---|
| **What** | Ensure every data-driven page has: skeleton loaders, error states with retry, empty states with illustration + CTA. |
| **Files** | `components/shared/skeleton-loader.tsx`, `components/shared/error-state.tsx`, `components/shared/empty-state.tsx`, `app/error.tsx`, `app/not-found.tsx` |
| **Refs** | [UI/UX §10 — Design System (Skeleton, Empty)](./UI_UX.md#10-design-system) · [Architecture §11 — Error Handling](./ARCHITECTURE.md#111-error-handling-strategy) |
| **QA Checklist** | ☐ Every list page has skeleton loader ☐ Every page has error state with retry button ☐ Every list has empty state with illustration + CTA ☐ Global error boundary (`error.tsx`) catches unexpected errors ☐ 404 page exists ☐ Toasts for all action success/error |

### Task 7.6 — Performance Optimization

| Field | Detail |
|---|---|
| **What** | React.memo on list items, virtualization on large lists, lazy load heavy components (dental chart, signature pad, chat panel), code-split per route. |
| **Files** | Update components across app |
| **Refs** | [UI/UX §15 — Developer Notes](./UI_UX.md#15-developer-notes) · [Next.js Code Splitting](https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading) |
| **QA Checklist** | ☐ Patient list virtualized (>100 items) ☐ Dental chart lazy loaded ☐ Signature pad lazy loaded ☐ React.memo on queue cards, booking cards, chat messages ☐ Lighthouse score > 90 ☐ Initial page load < 3s |

### Task 7.7 — Security Audit (Devin 5-Subagent)

| Field | Detail |
|---|---|
| **What** | Run Devin automated security review: 5 parallel subagent audits (Auth, RLS, Input Validation, Data Exposure, Dependencies). Fix all CRITICAL/HIGH issues. |
| **Refs** | [Security §18 — Security Audit Process](./SECURITY.md#18-security-audit--review-process) |
| **Subagents** | ① Authentication & Session ② Authorization & RLS ③ Input Validation & Injection ④ Data Exposure & Privacy ⑤ Dependency & Configuration |
| **QA Checklist** | ☐ All 5 audits pass ☐ No CRITICAL issues ☐ No HIGH issues ☐ MEDIUM/LOW documented for future sprint |

### Task 7.8 — Production Deployment

| Field | Detail |
|---|---|
| **What** | Deploy to Vercel + Supabase Cloud + Cloudflare R2. Set all environment variables. Run `supabase db push`. Verify cron jobs. |
| **Files** | `vercel.json`, `.env.example` (update if needed) |
| **Refs** | [Architecture §9 — Deployment](./ARCHITECTURE.md#9-deployment-architecture) · [Security §19 — Pre-Deployment Checklist](./SECURITY.md#19-security-checklist) · [Vercel Docs](https://vercel.com/docs) · [Supabase CLI Docs](https://supabase.com/docs/guides/local-development) |
| **QA Checklist** | ☐ All env vars set in Vercel ☐ `SUPABASE_SERVICE_ROLE_KEY` is server-only (not NEXT_PUBLIC_) ☐ `npx supabase link --project-ref <id>` succeeds ☐ `npx supabase db push` applies migrations ☐ App loads on Vercel URL ☐ Login works in production ☐ Cron jobs registered ☐ Security headers present (curl -I) ☐ HTTPS enforced ☐ R2 bucket private + presigned URLs work |

---

## Summary: Task Dependency Graph

```
Phase 1 (Foundation)
  1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7
  1.3 → 1.8 → 1.9 → 1.10 → 1.11
  1.8 → 1.12 → 1.13 → 1.14 → 1.15
         ↓
Phase 2 (Patient & Appointments)
  2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6 → 2.7
         ↓
Phase 3 (Visit Workflow)
  3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6 → 3.7 → 3.8 → 3.9 → 3.10 → 3.11
         ↓
Phase 4 (Billing)
  4.1 → 4.2 → 4.3 → 4.4 → 4.5
         ↓
Phase 5 (Messenger)
  5.1 → 5.2 → 5.3 → 5.4 → 5.5 → 5.6 → 5.7
         ↓
Phase 6 (Exceptions)
  6.1 → 6.2 → 6.3 → 6.4 → 6.5 → 6.6
         ↓
Phase 7 (Polish)
  7.1 → 7.2 → 7.3 → 7.4 → 7.5 → 7.6 → 7.7 → 7.8
```

---

## Reference Links for AI Development

| Technology | Documentation |
|---|---|
| Next.js 14+ (App Router) | https://nextjs.org/docs |
| React 18+ | https://react.dev/reference |
| TypeScript | https://www.typescriptlang.org/docs/ |
| Tailwind CSS | https://tailwindcss.com/docs |
| shadcn/ui | https://ui.shadcn.com/docs |
| Lucide Icons | https://lucide.dev/guide/ |
| Supabase JS Client | https://supabase.com/docs/reference/javascript |
| Supabase CLI (Local Dev) | https://supabase.com/docs/guides/local-development |
| Supabase Auth | https://supabase.com/docs/guides/auth |
| Supabase RLS | https://supabase.com/docs/guides/auth/row-level-security |
| Supabase Realtime | https://supabase.com/docs/guides/realtime |
| Supabase Edge Functions | https://supabase.com/docs/guides/functions |
| Supabase Migrations | https://supabase.com/docs/guides/local-development#database-migrations |
| Cloudflare R2 | https://developers.cloudflare.com/r2/ |
| Facebook Messenger Platform | https://developers.facebook.com/docs/messenger-platform |
| Facebook Graph API | https://developers.facebook.com/docs/graph-api |
| TanStack Query (React Query) | https://tanstack.com/query/latest/docs |
| React Hook Form | https://react-hook-form.com/docs |
| Zod | https://zod.dev |
| react-signature-canvas | https://www.npmjs.com/package/react-signature-canvas |
| qrcode.react | https://www.npmjs.com/package/qrcode.react |
| Calendar.js | https://calendarjs.com/ |
| Vercel Deployment | https://vercel.com/docs |
| Vercel Cron Jobs | https://vercel.com/docs/cron-jobs |
| Date-fns | https://date-fns.org/docs |
| Inter Font | https://rsms.me/inter/ |
| FDI Notation (ISO 3950) | https://en.wikipedia.org/wiki/FDI_World_Dental_Federation_notation |
| PDA Dental Chart | https://pda.com.ph/wp-content/uploads/2022/10/PDA-Dental-Chart.pdf |
| Electronic Commerce Act (RA 8792) | https://www.gppb.gov.ph/wp-content/uploads/2023/06/Republic-Act-No.-8792.pdf |
| WCAG 2.2 | https://www.w3.org/TR/WCAG22/ |
| Philippine Data Privacy Act | https://www.privacy.gov.ph/data-privacy-act/ |
| OWASP Top 10 | https://owasp.org/www-project-top-ten/ |
| Next.js Middleware | https://nextjs.org/docs/app/building-your-application/routing/middleware |
| Next.js Security Headers | https://nextjs.org/docs/app/building-your-application/configuring/security-headers |
