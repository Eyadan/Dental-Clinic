# Project Plan — Dental Clinic Management System

> **Living document.** Updated every time a plan is created or modified.
> Completed tasks are logged in [plan_done.md](./plan_done.md).

---

## Documentation Phase

| # | Task | Status | Dependencies | Notes |
|---|------|--------|--------------|-------|
| D-01 | Create PRD from FR/NFR requirements | ✅ Done | — | `docs/PRD.md` |
| D-02 | Create Architecture Document from PRD | ✅ Done | D-01 | `docs/ARCHITECTURE.md` |
| D-03 | Create Security Document expanding PRD/Architecture | ✅ Done | D-01, D-02 | `docs/SECURITY.md` |
| D-04 | Create plan.md and plan_done.md | ✅ Done | — | This file + `docs/plan_done.md` |
| D-05 | Create UI/UX Design Document | ✅ Done | D-01, D-02, D-03 | `docs/UI_UX.md` — 17 sections covering product analysis, personas, journey, IA, navigation, all 14 screens, UX heuristics, design system, accessibility, microinteractions, motion, edge cases, developer notes, future improvements, UX audit |
| D-06 | Create Development Order Document | ✅ Done | D-01, D-02, D-03, D-05 | `docs/dev-order.md` — 7 phases, 42 tasks with QA checklists, dependency graph, reference links |
| D-07 | Create bug tracking document | ✅ Done | — | `docs/donetask_bug-encountered.md` — Bug log table + detail template + summary stats |
| D-08 | Update all docs with correct library links | ✅ Done | D-01 to D-07 | Updated PRD, ARCHITECTURE, UI_UX, SECURITY, dev-order: `qrcode.react` (was qrcode/react-qr-code), `react-signature-canvas` npm link, added Calendar.js, added RA 8792 + PDA Dental Chart refs |

---

## Implementation Phase 1 — Foundation & Auth

| # | Task | Status | Dependencies | Notes |
|---|------|--------|--------------|-------|
| P1-01 | Initialize Next.js 14+ project (App Router, TypeScript strict) | ⬜ Pending | D-01, D-02 | |
| P1-02 | Setup Tailwind CSS + shadcn/ui + Lucide icons | ⬜ Pending | P1-01 | |
| P1-03 | Setup Supabase CLI local dev (init, Docker, config) | ⬜ Pending | P1-01 | |
| P1-04 | Create database schema migrations (all 21 tables, 3NF) | ⬜ Pending | P1-03 | Per ARCHITECTURE §5 |
| P1-05 | Create RLS policies for all tables | ⬜ Pending | P1-04 | Per SECURITY §4.3 |
| P1-06 | Create database triggers (audit, status validation, QR invalidation) | ⬜ Pending | P1-04 | Per ARCHITECTURE §4.3 |
| P1-07 | Create database indexes | ⬜ Pending | P1-04 | Per ARCHITECTURE §5.2 |
| P1-08 | Setup Supabase Auth (login, logout, session, JWT cookies) | ⬜ Pending | P1-03 | Per SECURITY §3 |
| P1-09 | Implement RBAC route guards (Next.js middleware) | ⬜ Pending | P1-08 | Per ARCHITECTURE §4.2 |
| P1-10 | Create base layout (sidebar, topbar, mobile nav) | ⬜ Pending | P1-02, P1-09 | |
| P1-11 | Create login page | ⬜ Pending | P1-08 | |
| P1-12 | Setup service layer skeleton (lib/services/) | ⬜ Pending | P1-03 | Per ARCHITECTURE §3.5 |
| P1-13 | Setup type system (lib/types/) | ⬜ Pending | P1-04 | Per ARCHITECTURE §3.6 |
| P1-14 | Setup Zod validation schemas (lib/validations/) | ⬜ Pending | P1-13 | Per ARCHITECTURE §3.6 |
| P1-15 | Setup custom hooks skeleton (lib/hooks/) | ⬜ Pending | P1-12 | Per ARCHITECTURE §3.3 |
| P1-16 | Configure security headers in next.config.js | ⬜ Pending | P1-01 | Per SECURITY §14 |
| P1-17 | Setup .env.example and .gitignore | ⬜ Pending | P1-01 | Per SECURITY §13 |
| P1-18 | Seed data for local development | ⬜ Pending | P1-04 | |

---

## Implementation Phase 2 — Patient & Appointment Core

| # | Task | Status | Dependencies | Notes |
|---|------|--------|--------------|-------|
| P2-01 | Patient CRUD service + hooks | ⬜ Pending | P1-12, P1-13 | |
| P2-02 | Patient list page with search | ⬜ Pending | P2-01 | |
| P2-03 | Patient detail page (record, history, dental chart) | ⬜ Pending | P2-01 | |
| P2-04 | Dental services catalog CRUD | ⬜ Pending | P1-12 | |
| P2-05 | Appointment creation with triple status model | ⬜ Pending | P1-13, P2-04 | |
| P2-06 | Scheduling engine (dentist schedules, holidays, conflict detection) | ⬜ Pending | P1-04, P2-05 | |
| P2-07 | Appointment duration calculation (sum of service durations) | ⬜ Pending | P2-04, P2-05 | |
| P2-08 | Staff Booking Dashboard (pending requests, approve/decline) | ⬜ Pending | P2-05, P2-06 | |
| P2-09 | Calendar view for appointments | ⬜ Pending | P2-05 | |

---

## Implementation Phase 3 — Visit Workflow

| # | Task | Status | Dependencies | Notes |
|---|------|--------|--------------|-------|
| P3-01 | Patient check-in & identification flow | ⬜ Pending | P2-01, P2-05 | |
| P3-02 | QR code generation service (staff-side) | ⬜ Pending | P1-12, P1-14 | |
| P3-03 | QR code self-registration page (public route) | ⬜ Pending | P3-02 | |
| P3-04 | QR code validation + invalidation logic | ⬜ Pending | P3-02 | Per SECURITY §10 |
| P3-05 | Staff-assisted registration form | ⬜ Pending | P2-01 | |
| P3-06 | Walk-in visit creation | ⬜ Pending | P2-05, P2-06 | |
| P3-07 | Queue management with ordering rules | ⬜ Pending | P2-05 | |
| P3-08 | Realtime queue view (Supabase Realtime) | ⬜ Pending | P3-07 | Per ARCHITECTURE §8 |
| P3-09 | Consultation view (patient record access for dentist) | ⬜ Pending | P2-03 | |
| P3-10 | Electronic consent form generation | ⬜ Pending | P2-05 | |
| P3-11 | Signature pad component (react-signature-canvas) | ⬜ Pending | P1-02 | |
| P3-12 | Consent signing flow + R2 upload | ⬜ Pending | P3-10, P3-11 | |
| P3-13 | Treatment documentation (dental chart, clinical notes) | ⬜ Pending | P2-05 | |
| P3-14 | Treatment pause/resume workflow | ⬜ Pending | P3-13 | |

---

## Implementation Phase 4 — Billing & Follow-up

| # | Task | Status | Dependencies | Notes |
|---|------|--------|--------------|-------|
| P4-01 | Invoice generation service | ⬜ Pending | P2-05 | |
| P4-02 | Invoice list + detail pages | ⬜ Pending | P4-01 | |
| P4-03 | Payment processing (cash, GCash, Maya, card) | ⬜ Pending | P4-01 | |
| P4-04 | Proof of payment photo upload (Cloudflare R2) | ⬜ Pending | P4-03 | Per ARCHITECTURE §6.2 |
| P4-05 | Partial payment tracking | ⬜ Pending | P4-03 | |
| P4-06 | Payment status auto-calculation (trigger) | ⬜ Pending | P1-06, P4-03 | |
| P4-07 | Follow-up appointment scheduling | ⬜ Pending | P2-05 | |
| P4-08 | Checkout & visit completion flow | ⬜ Pending | P4-01, P3-13 | |

---

## Implementation Phase 5 — Messenger Integration

| # | Task | Status | Dependencies | Notes |
|---|------|--------|--------------|-------|
| P5-01 | Facebook Messenger webhook setup (GET verification + POST handler) | ⬜ Pending | P1-09 | Per SECURITY §9.1 |
| P5-02 | Messenger webhook Edge Function (intent parsing) | ⬜ Pending | P5-01 | |
| P5-03 | Automated booking request parsing & creation | ⬜ Pending | P5-02, P2-05 | |
| P5-04 | Send notification Edge Function (Messenger Send API) | ⬜ Pending | P5-01 | |
| P5-05 | Auto-notifications (approval, decline, reschedule, cancel, follow-up) | ⬜ Pending | P5-04 | |
| P5-06 | Confirmation reminder flow (Confirm/Reschedule/Cancel in Messenger) | ⬜ Pending | P5-04 | |
| P5-07 | Reminder cron job | ⬜ Pending | P5-06 | Per ARCHITECTURE §6.3 |
| P5-08 | Live Chat Dashboard (conversation list + chat panel) | ⬜ Pending | P5-01 | |
| P5-09 | Staff takeover / AI handoff (bot pause, message relay) | ⬜ Pending | P5-08 | |
| P5-10 | Messenger notification fallback (staff notification on failure) | ⬜ Pending | P5-04 | |

---

## Implementation Phase 6 — Exception Handling & Advanced Features

| # | Task | Status | Dependencies | Notes |
|---|------|--------|--------------|-------|
| P6-01 | Dentist unavailability declaration | ⬜ Pending | P2-05 | |
| P6-02 | Reassignment workflow (affected appointments, alternate dentist suggestion) | ⬜ Pending | P6-01 | |
| P6-03 | Dentist Mobile Portal (schedule, emergency declaration) | ⬜ Pending | P1-10 | |
| P6-04 | Late arrival / Delayed / No-Show handling | ⬜ Pending | P3-07 | |
| P6-05 | Same-day dynamic availability & slot release | ⬜ Pending | P2-06 | |
| P6-06 | Waitlist management with FIFO notifications | ⬜ Pending | P6-05 | |
| P6-07 | Booking approval expiration cron | ⬜ Pending | P2-05 | Per ARCHITECTURE §6.3 |
| P6-08 | Patient-initiated cancellation via Messenger | ⬜ Pending | P5-02 | |
| P6-09 | Patient-initiated reschedule via Messenger | ⬜ Pending | P5-02 | |
| P6-10 | Reassignment logs & audit trail | ⬜ Pending | P6-02 | |

---

## Implementation Phase 7 — System Settings, Audit & Polish

| # | Task | Status | Dependencies | Notes |
|---|------|--------|--------------|-------|
| P7-01 | System Settings module (all 6 categories) | ⬜ Pending | P1-12 | |
| P7-02 | Audit logging integration (all services call audit.service) | ⬜ Pending | P1-06 | |
| P7-03 | Record archiving functionality | ⬜ Pending | P2-01, P2-05 | |
| P7-04 | Appointment history view | ⬜ Pending | P1-06 | |
| P7-05 | Loading/error/empty states on all data-driven components | ⬜ Pending | All phases | |
| P7-06 | Performance optimization (query tuning, React.memo, pagination) | ⬜ Pending | All phases | |
| P7-07 | End-to-end testing | ⬜ Pending | All phases | |
| P7-08 | Security audit (Devin 5-subagent review) | ⬜ Pending | All phases | Per SECURITY §18 |
| P7-09 | Production deployment (Vercel + Supabase Cloud + R2) | ⬜ Pending | P7-08 | |

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| ⬜ | Pending |
| ⛔ | Blocked |
