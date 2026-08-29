# Product Requirements Document (PRD)
## Dental Clinic Management System — Messenger Booking & Patient Visit Workflow

---

## 1. Overview

A web-based dental clinic management system that handles the full patient journey: Facebook Messenger booking, staff approval, patient check-in, self-registration via QR code, consultation, electronic informed consent, treatment documentation, billing/checkout, and follow-up appointments. The system supports role-based access for administrators, reception staff, and dentists, with a dedicated Dentist Mobile Portal for emergency declarations. It integrates with the Facebook Messenger Platform API for automated booking requests, notifications, and live chat handoff.

**Target Users:** Clinic administrators, reception staff, dentists, and patients (via Messenger and QR self-registration).

**Deployment:** Vercel (frontend hosting), Supabase (backend/database/auth), Cloudflare R2 (image/file storage).

---

## 2. Core Features

### 2.1 Messenger Booking Module
- Patients submit appointment requests through Facebook Messenger (preferred date, time, dental service, basic details)
- System generates unique appointment reference numbers
- Staff Booking Dashboard shows all pending requests for review/approve/decline
- Scheduling conflict detection against existing appointments
- Auto-notifications to patients via Messenger on approval/decline
- Prevents duplicate pending requests from the same patient
- Staff can view patient's Messenger conversation history before deciding

### 2.2 Staff Authentication & Access Control
- Login required for all clinic personnel (admins, reception, dentists)
- Role-Based Access Control (RBAC) — each role sees only permitted features/records

### 2.3 Patient Check-in & Identification
- Staff checks in patients on arrival
- New vs. existing patient identification
- Search existing records by name, contact number, reference number, or identifiers
- Identity verification before check-in
- Appointment detail confirmation

### 2.4 Patient Registration
- **Self-Registration:** Staff generates a temporary QR code (5-min default validity, configurable). Patient scans it on their mobile device to open a secure online registration form. QR code is single-use and expires after use or timeout.
- **Staff-Assisted Registration:** Reception staff can manually register new patients directly in the system.
- Both methods auto-link the new patient record to the corresponding approved appointment.

### 2.5 Walk-in Patient Visits
- Staff can create walk-in visits without prior Messenger booking
- Same-day capacity verification before acceptance
- Walk-in patients follow the same identification, registration, consent, and queue process

### 2.6 Queue Management
- Patients placed in dentist's waiting queue after check-in/registration
- Queue ordered by: scheduled appointment time → checked-in status → earliest arrival time (tie-breaker)
- Dentist can call next patient or call early-arriving patient ahead of schedule
- Real-time visit status updates (Waiting, In Consultation, Treatment Ongoing, etc.)

### 2.7 Consultation
- Dentist accesses complete electronic patient record (profile, medical history, allergies, dental chart, previous visits, appointment details)
- Dentist records examination findings and confirms treatment plan

### 2.8 Electronic Informed Consent
- Auto-generated visit-specific consent form once treatment plan is confirmed
- Displayed on tablet for patient review with electronic signature (stylus/touch)
- Signed consent stored securely, linked to appointment and treatment record
- Records: appointment reference, treatment info, timestamp, consent version, attending staff
- Treatment blocked if consent not given; decline outcome recorded
- Previous signed consents preserved exactly as presented (template changes don't alter past records)

### 2.9 Treatment Documentation
- Dentist updates electronic dental chart during treatment
- Records clinical notes, diagnosis, procedures performed, prescriptions, recommended treatment plans

### 2.10 Treatment Pause & Resume
- Dentist can pause ongoing treatment with reason (awaiting x-ray, lab result, specialist clearance, patient availability)
- Visit status transitions: Treatment Ongoing → Treatment Paused → Awaiting Requirement → Resumed → Treatment Ongoing
- Resumed under the same appointment/treatment record (no duplicate appointment)

### 2.11 Billing & Checkout
- Reception notified when treatment is complete
- Invoice/bill generation
- Payment methods: cash, GCash, Maya, card
- Photo attachment for e-wallet proof of payment
- Partial payment support with outstanding balance tracking
- Payment status: Pending Payment, Partially Paid, Paid, Payment Failed

### 2.12 Follow-up Appointments
- Staff can schedule follow-up appointments
- Auto Messenger confirmation to patient
- Visit marked complete (booking + visit status → Completed) when no follow-up needed

### 2.13 Scheduling & Configuration
- **Advance Booking:** Max advance booking period (default 30 days, configurable). Same-day requests allowed when capacity exists.
- **Appointment Duration:** Each service has a default duration; total = sum of all selected services. Staff can manually override. Prevents booking when insufficient time before closing.
- **Dentist Schedule:** Working days, working hours, lunch/break periods, vacation dates, recurring unavailable schedules — all per-dentist configurable.
- **Clinic Schedule:** Holidays, special closures, half-day operating schedules — admin configurable.

### 2.14 Appointment Confirmation Reminders
- Auto Messenger reminder before appointment (schedule configurable, e.g., 1 day before)
- Patient can Confirm, Reschedule, or Cancel directly in Messenger with a single tap
- No response → flagged for staff review (not auto-cancelled)

### 2.15 Appointment Exception Handling
- **Dentist Unavailability & Reassignment:** Dentist/staff declare unavailability → affected appointments shown → booking status set to Reschedule Required → patient notified via Messenger → system suggests available alternate dentists → staff confirms reassignment → original slot released → history preserved
- **Late Arrival & No-Show:** Configurable grace period → Delayed status → staff can call next patient, move to later same-day slot, or reschedule → No Show if not accommodated same day
- **Same-Day Dynamic Availability:** Real-time slot tracking → auto-release slots on early completion/cancellation/no-show → immediately visible to Messenger and dashboard → waitlist with FIFO notification
- **Booking Approval Expiration:** Configurable expiration (default 48 hours) → auto-Expired status → patient notified
- **Patient-Initiated Cancellation:** Via Messenger → Pending Cancellation → staff review with reason capture → confirm/deny → slot released on confirm → configurable cancellation cutoff period
- **Patient-Initiated Reschedule:** Via Messenger → Reschedule Requested → staff review → select new slot → Rescheduled → original slot released → patient notified

### 2.16 Live Chat & AI Handoff
- Staff Live Chat Dashboard shows all active Messenger inquiries
- Staff can take over conversation from automated bot/AI
- Bot replies auto-paused during human chat
- Staff sends real-time messages to patient's Messenger from dashboard
- Staff can end takeover → bot functionality restored

### 2.17 Dentist Mobile Portal
- Dentists can declare emergency/unavailability from mobile
- Triggers the same reassignment/rescheduling workflow as staff-initiated unavailability

### 2.18 Audit & Activity Logging
- Records all user activities: booking decisions, registrations, consent signing, treatment updates, billing, reassignments, cancellations, reschedules
- Records system events: reminders sent, slot releases, follow-up flags
- Each log entry includes timestamp and user identification
- Audit logs are immutable — protected from modification/deletion by all users including admins

### 2.19 Record Archiving & History
- Archive (not delete) patient records, appointments, invoices, consent forms
- Archived records excluded from active views but retrievable by authorized staff
- Complete appointment/treatment/visit history per patient without overwriting prior data

### 2.20 System Settings Module
- Centralized admin configuration in categories: Clinic, Dentist, Appointment, Messenger, Payment, Security
- Clinic: working days, holidays, closures, half-day schedules
- Dentist: working schedules, breaks, vacations, recurring unavailability
- Appointment: advance booking period, grace period, approval expiration, QR validity, cancellation cutoff, reminder schedule, waitlist policy, walk-in policy
- Messenger: message templates, notification triggers, fallback/retry behavior
- Payment: accepted methods, partial payment policy
- Security: password policy, session timeout, audit log retention

---

## 3. Technical Stack

| Layer | Technology | Notes |
|---|---|---|
| **Frontend Framework** | Next.js 14+ (App Router) | React 18+, TypeScript strict mode |
| **Styling** | Tailwind CSS + shadcn/ui | Responsive, modern component library |
| **Icons** | Lucide React | Consistent icon set |
| **Backend / Database / Auth** | Supabase | Postgres, Auth, Edge Functions, Realtime, Storage (local dev via Supabase CLI + Docker) |
| **File/Image Storage** | Cloudflare R2 | Proof of payment photos, consent form images, document attachments |
| **Hosting** | Vercel | Frontend deployment with CI/CD |
| **Messenger Integration** | Facebook Messenger Platform API | Webhooks for receiving messages, Send API for notifications |
| **QR Code Generation** | `qrcode.react` | For patient self-registration |
| **Electronic Signature** | `react-signature-canvas` | Tablet touch/stylus signature capture |
| **Calendar** | Calendar.js | Appointment calendar/scheduling UI |
| **State Management** | React Query (TanStack Query) | Server state, caching, optimistic updates |
| **Form Handling** | React Hook Form + Zod | Validation schemas shared between client/server |
| **Language** | TypeScript (strict) | No `any` types, full type safety |

### Local Development Setup (Supabase CLI)

```
# Prerequisites: Docker Desktop running, Node.js installed
npm install supabase --save-dev
npx supabase init        # creates supabase/ config folder
npx supabase start       # starts local Supabase stack (Postgres, Auth, Storage, Edge Functions, Studio)
# Dashboard: http://localhost:54323
# Status:   npx supabase status
# Stop:     npx supabase stop
# Migrations: npx supabase migration new <migration_name>
```

### Production Deployment

- **Frontend:** Vercel (auto-deploy from Git, preview branches)
- **Backend:** Supabase Cloud (managed Postgres, Auth, Edge Functions)
- **Storage:** Cloudflare R2 (S3-compatible, zero egress fees)
- **Link local to production:** `npx supabase link --project-ref <project-id>`
- **Push migrations:** `npx supabase db push`

---

## 4. Data Requirements

### 4.1 Database Principles
- **3NF Compliance:** All tables in Third Normal Form — no transitive dependencies, no repeated data
- **ACID Transactions:** All database operations must be Atomic, Consistent, Isolated, Durable
- **Parameterized Queries:** Use Supabase client / PostgREST — never raw SQL string concatenation
- **Foreign Key Constraints:** Enforce referential integrity on all relationships
- **Indexes:** Define on frequently queried columns (patient search, appointment date/dentist, booking status)
- **Migrations:** All schema changes via Supabase migration files — never modify production DB manually
- **Snake_case** for all table and column names

### 4.2 Core Data Entities (3NF-Compliant)

| Table | Purpose | Key Columns |
|---|---|---|
| `users` | System staff accounts | `id`, `email`, `role`, `password_hash`, `created_at` |
| `dentists` | Dentist profiles & schedules | `id`, `user_id` (FK), `license_no`, `specialization` |
| `dentist_schedules` | Per-dentist working days/hours | `id`, `dentist_id` (FK), `day_of_week`, `start_time`, `end_time` |
| `dentist_blocks` | Vacations, breaks, recurring unavailability | `id`, `dentist_id` (FK), `start_datetime`, `end_datetime`, `block_type` |
| `clinic_settings` | Clinic-wide configuration | `id`, `setting_key`, `setting_value`, `category` |
| `clinic_holidays` | Holidays and special closures | `id`, `date`, `description`, `is_half_day`, `operating_hours` |
| `patients` | Patient master records | `id`, `first_name`, `last_name`, `contact_no`, `email`, `birth_date`, `medical_history`, `allergies`, `created_at` |
| `dental_services` | Catalog of services with durations | `id`, `name`, `description`, `default_duration_minutes` |
| `appointments` | Booking records with triple status | `id`, `patient_id` (FK), `dentist_id` (FK), `booking_status`, `visit_status`, `payment_status`, `scheduled_date`, `scheduled_time`, `total_duration`, `reference_no` |
| `appointment_services` | M:N link appointments to services | `id`, `appointment_id` (FK), `service_id` (FK) |
| `appointment_history` | Audit trail of appointment changes | `id`, `appointment_id` (FK), `changed_by` (FK), `field`, `old_value`, `new_value`, `changed_at` |
| `qr_codes` | Registration QR codes | `id`, `appointment_id` (FK), `token`, `expires_at`, `used_at`, `is_used` |
| `consent_forms` | Electronic consent records | `id`, `appointment_id` (FK), `treatment_info`, `consent_version`, `signature_image_url`, `signed_at`, `staff_id` (FK) |
| `treatment_records` | Clinical documentation | `id`, `appointment_id` (FK), `diagnosis`, `procedures`, `clinical_notes`, `prescriptions`, `treatment_plan`, `pause_reason`, `paused_at`, `resumed_at` |
| `invoices` | Billing records | `id`, `appointment_id` (FK), `total_amount`, `payment_status`, `created_at` |
| `payments` | Individual payment transactions | `id`, `invoice_id` (FK), `amount`, `method`, `proof_image_url`, `recorded_by` (FK), `paid_at` |
| `waitlist_entries` | Same-day waitlist | `id`, `patient_id` (FK), `requested_date`, `joined_at`, `notified_at` |
| `audit_logs` | Immutable activity log | `id`, `user_id` (FK), `action`, `entity_type`, `entity_id`, `metadata`, `timestamp` |
| `messenger_conversations` | Messenger chat sessions | `id`, `patient_psid`, `status`, `taken_over_by` (FK), `taken_over_at` |
| `messenger_messages` | Individual messages | `id`, `conversation_id` (FK), `direction`, `content`, `sent_at` |
| `reassignment_logs` | Dentist reassignment records | `id`, `appointment_id` (FK), `original_dentist_id` (FK), `new_dentist_id` (FK), `original_schedule`, `new_schedule`, `reason`, `staff_id` (FK), `created_at` |

### 4.3 Status Models

**Booking Status:** Pending → Approved → Confirmed → Completed | Declined | Expired | Reschedule Required → Rescheduled | Pending Cancellation → Cancelled | No Show

**Visit Status:** Checked In → Waiting → In Consultation → Consent Signed → Treatment Ongoing → Checkout → Completed | Delayed | Treatment Paused → Awaiting Requirement → Resumed

**Payment Status:** Pending Payment → Partially Paid → Paid | Payment Failed | Refunded

---

## 5. Technical Dependencies

| Dependency | Purpose | Documentation |
|---|---|---|
| Next.js | React framework (App Router, SSR, API routes) | https://nextjs.org/docs |
| React | UI library | https://react.dev/reference |
| TypeScript | Type-safe JavaScript | https://www.typescriptlang.org/docs/ |
| Tailwind CSS | Utility-first CSS | https://tailwindcss.com/docs |
| shadcn/ui | Reusable UI components | https://ui.shadcn.com/docs |
| Lucide React | Icon library | https://lucide.dev/guide/ |
| Supabase (JS Client) | Backend client (Auth, DB, Realtime, Storage) | https://supabase.com/docs/reference/javascript |
| Supabase CLI | Local development stack | https://supabase.com/docs/guides/local-development |
| Cloudflare R2 | S3-compatible object storage | https://developers.cloudflare.com/r2/ |
| Facebook Messenger Platform | Booking & notification integration | https://developers.facebook.com/docs/messenger-platform |
| Facebook Graph API | Send API for Messenger messages | https://developers.facebook.com/docs/graph-api |
| React Query (TanStack Query) | Server state management | https://tanstack.com/query/latest/docs |
| React Hook Form | Form handling & validation | https://react-hook-form.com/docs |
| Zod | Schema validation (shared client/server) | https://zod.dev |
| react-signature-canvas | Electronic signature capture | https://www.npmjs.com/package/react-signature-canvas |
| qrcode.react | QR code generation (React component) | https://www.npmjs.com/package/qrcode.react |
| Calendar.js | Appointment calendar/scheduling UI | https://calendarjs.com/ |
| Vercel | Frontend hosting & deployment | https://vercel.com/docs |
| Date-fns | Date/time utilities | https://date-fns.org/docs |

---

## 6. Implementation Phases

### Phase 1 — Foundation & Auth
- Project setup (Next.js, Tailwind, shadcn/ui, TypeScript strict)
- Supabase local dev environment (CLI, Docker, migrations)
- Database schema (all tables in 3NF, migrations, seed data)
- Authentication & RBAC (admin, reception, dentist roles)
- Basic layout, navigation, and protected routes

### Phase 2 — Patient & Appointment Core
- Patient master records (CRUD, search)
- Dental services catalog
- Appointment creation with triple status model
- Scheduling engine (dentist schedules, clinic holidays, conflict detection, duration calculation)
- Staff Booking Dashboard (pending requests, approve/decline)

### Phase 3 — Visit Workflow
- Patient check-in & identification
- QR code self-registration + staff-assisted registration
- Walk-in visits
- Queue management with ordering rules
- Consultation view (patient record access)
- Electronic informed consent (generation, signature, storage)
- Treatment documentation (dental chart, clinical notes)
- Treatment pause/resume

### Phase 4 — Billing & Follow-up
- Invoice generation
- Payment processing (cash, GCash, Maya, card)
- Proof of payment photo upload (Cloudflare R2)
- Partial payment tracking
- Follow-up appointment scheduling
- Checkout & visit completion

### Phase 5 — Messenger Integration
- Facebook Messenger webhook setup
- Automated booking request parsing
- Auto-notifications (approval, decline, reminders, reschedule, cancellation)
- Confirmation reminder flow (Confirm/Reschedule/Cancel in Messenger)
- Live Chat Dashboard & AI handoff (staff takeover)
- Messenger notification fallback (staff notification on delivery failure)

### Phase 6 — Exception Handling & Advanced Features
- Dentist unavailability & reassignment workflow
- Dentist Mobile Portal (emergency declaration)
- Late arrival, No Show, and Delayed handling
- Same-day dynamic availability & waitlist
- Booking approval expiration
- Patient-initiated cancellation & reschedule via Messenger

### Phase 7 — System Settings, Audit & Polish
- System Settings module (all categories)
- Audit & activity logging (immutable)
- Record archiving
- Performance optimization
- Comprehensive error handling, loading states, empty states
- End-to-end testing

---

## 7. UI/UX Requirements

### Design Principles
- **Responsive:** Desktop (staff dashboard), tablet (consent signature, queue display), mobile (dentist portal, patient self-registration)
- **Clean & Professional:** Medical/dental aesthetic — calm color palette (blues/whites/teals), generous whitespace, clear typography
- **Accessibility:** WCAG 2.1 AA compliance, keyboard navigation, ARIA labels, sufficient color contrast
- **Minimal Steps:** Reduce clicks for common tasks (booking approval, check-in, billing)
- **Real-time Feedback:** Loading spinners, optimistic updates, toast notifications for all actions
- **Error States:** Clear, specific error messages and validation prompts on all forms
- **Empty States:** Helpful guidance when no data is available (no appointments, no pending requests, empty queue)

### Key Interfaces
- **Staff Dashboard:** Overview of pending bookings, today's queue, alerts, quick actions
- **Booking Dashboard:** List of pending/active booking requests with approve/decline actions, patient conversation history
- **Queue View:** Real-time ordered list of waiting patients with status badges, call-next button
- **Consultation View:** Tabbed patient record (profile, medical history, dental chart, previous visits) + treatment documentation panel
- **Consent Screen:** Full-screen tablet view with consent text, signature pad, submit button
- **Billing Screen:** Invoice line items, payment method selector, amount input, proof photo upload, split payment support
- **Dentist Mobile Portal:** Simplified mobile-first interface — today's schedule, emergency declaration button, patient quick-view
- **Live Chat Dashboard:** Conversation list + chat panel with takeover/end controls
- **System Settings:** Categorized tabbed settings with save/reset
- **Patient Self-Registration:** Mobile-optimized form, progress indicator, auto-scroll, 3-minute completion target

### Component Architecture
- One component per file, max 200 lines
- Props for data, events for actions
- `React.memo()` for performance-critical lists
- Centralized API service layer — no direct API calls in components
- Loading, error, and empty states on every data-driven component

---

## 8. Security

### 8.1 Frontend Security
- Validate and sanitize all user inputs (Zod schemas on forms)
- XSS protection on all rendered content (React auto-escaping + DOMPurify for rich text)
- CSRF tokens for all state-changing requests
- Never store sensitive data in `localStorage` or `sessionStorage` — use Supabase Auth session management
- Enforce HTTPS only (Vercel auto-provides TLS)
- Content Security Policy (CSP) headers via `next.config.js`
- Environment variables for all API keys and URLs (never hardcoded)
- Route guards based on RBAC roles (server-side + client-side checks)

### 8.2 Backend Security
- **Authentication:** Supabase Auth with JWT tokens (access + refresh)
- **Authorization:** Row-Level Security (RLS) policies in Postgres — enforce RBAC at database level
- **Rate Limiting:** Apply on all public endpoints (Messenger webhook, QR code validation, registration form submission)
- **SQL Injection Prevention:** Use Supabase client / parameterized queries only — never raw string concatenation
- **Data Encryption:** TLS in transit, Postgres encryption at rest (Supabase managed)
- **Secrets Management:** All secrets in environment variables — never in code or client bundles
- **Server-Side Validation:** Validate all inputs server-side regardless of frontend validation (Zod schemas shared)
- **RBAC Enforcement:** Role checks in Edge Functions / API routes + RLS policies as defense-in-depth
- **Audit Logging:** All authentication events, booking decisions, treatment updates, billing transactions, and suspicious activity logged immutably
- **Session Management:** Configurable session timeout, token refresh, secure cookie flags
- **Password Policy:** Configurable minimum length, complexity, expiration (enforced via Supabase Auth)
- **QR Code Security:** Single-use, time-limited tokens, server-side validation, immediate invalidation after use

### 8.3 Compliance
- Philippine Data Privacy Act of 2012 (Republic Act No. 10173) compliance for collection, processing, storage, and protection of patient personal and medical information
- Patient data minimization — collect only what's needed for dental care
- Data retention policy configurable via System Settings
- Right to be informed, right to access, right to rectification supported through archiving (not deletion)

---

## 9. Constraints

### Architecture & Code Quality
- **SOLID:** Single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion
- **DRY:** No repeated logic or duplicated code — extract shared utilities, hooks, and components
- **KISS:** Keep solutions simple and straightforward — avoid over-engineering
- **ACID:** All database transactions must be Atomic, Consistent, Isolated, Durable
- **3NF:** All database tables in Third Normal Form — no transitive dependencies
- **TypeScript Strict:** No `any` types, full type annotations, `===` for comparisons
- **Max 200 lines per file** — split if larger
- **No todos, placeholders, or incomplete code** in delivered output
- **Comprehensive error handling** — no silent failures
- **Modular architecture** — simplify maintenance, testing, and future enhancements

### Operational Constraints
- Dashboard pages load within 3 seconds
- Messenger booking recorded within 5 seconds
- QR code generated within 2 seconds
- Patient search results within 3 seconds
- Slot availability propagated within 5 seconds
- 99.5% uptime minimum (excluding scheduled maintenance)
- Support concurrent multi-user access without degradation
- Extensible to future multi-branch clinics
- Compatible with Chrome, Edge, Firefox, Safari (current versions)
- Touch-enabled tablet support for consent signatures
- Mobile QR self-registration without app installation

### Concurrency & Integrity
- Transactional locking when approving bookings (prevent double-booking same dentist/time slot)
- Optimistic concurrency control for medical record edits (detect conflicts, prompt refresh)
- Prevent duplicate patient records and appointment entries
- Booking status and visit status must always be in valid combinations
- Prevent simultaneous reassignment of same appointment to multiple dentists

---

## 10. Success Metrics

| Metric | Target |
|---|---|
| Dashboard page load time | < 3 seconds |
| Messenger booking recording time | < 5 seconds |
| QR code generation time | < 2 seconds |
| Patient search response time | < 3 seconds |
| Slot availability propagation | < 5 seconds |
| System uptime | ≥ 99.5% |
| Patient self-registration completion | < 3 minutes |
| Booking approval rate (vs. decline) | Track and report |
| No-show rate reduction | Track vs. pre-system baseline |
| Messenger notification delivery rate | ≥ 95% (with fallback for failures) |
| Concurrent users supported | 50+ without degradation |
| Audit log completeness | 100% of logged actions |
| Data integrity violations | 0 |
| Patient record duplication rate | 0% |

---

## 11. References & Documentation Links

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/reference)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/docs)
- [Lucide Icons](https://lucide.dev/guide/)
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Supabase Local Development](https://supabase.com/docs/guides/local-development)
- [Supabase Row-Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Migrations](https://supabase.com/docs/guides/database/migrations)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Facebook Messenger Platform](https://developers.facebook.com/docs/messenger-platform)
- [Facebook Graph API — Send API](https://developers.facebook.com/docs/graph-api)
- [TanStack Query (React Query)](https://tanstack.com/query/latest/docs)
- [React Hook Form](https://react-hook-form.com/docs)
- [Zod Validation](https://zod.dev)
- [Vercel Documentation](https://vercel.com/docs)
- [Philippine Data Privacy Act of 2012 (RA 10173)](https://www.privacy.gov.ph/data-privacy-act/)
- [Electronic Commerce Act (RA 8792)](https://www.gppb.gov.ph/wp-content/uploads/2023/06/Republic-Act-No.-8792.pdf)
- [PDA Dental Chart (FDI Notation)](https://pda.com.ph/wp-content/uploads/2022/10/PDA-Dental-Chart.pdf)
- [WCAG 2.1 Accessibility Guidelines](https://www.w3.org/TR/WCAG21/)
