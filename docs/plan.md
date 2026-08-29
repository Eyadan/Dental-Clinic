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
| P1-01 | Initialize Next.js 14+ project (App Router, TypeScript strict) | ✅ Done | D-01, D-02 | Next.js 16.3.3, React 19, Tailwind v4, shadcn/ui (base-nova), Lucide, TanStack Query, RHF, Zod, date-fns |
| P1-02 | Setup Tailwind CSS + shadcn/ui + Lucide icons | ✅ Done | P1-01 | Inter font, full design tokens (colors, semantic, tooth states, radius, shadows), 16 shadcn components, theme constants |
| P1-03 | Setup Supabase CLI local dev (init, Docker, config) | ✅ Done | P1-01 | supabase/ config, Docker stack running, .env.local + .env.example, @supabase/supabase-js + @supabase/ssr installed |
| P1-04 | Create database schema migrations (all 21 tables, 3NF) | ✅ Done | P1-03 | 21 tables, 8 enum types, all FKs, indexes, updated_at triggers, audit_log immutability |
| P1-05 | Create RLS policies for all tables | ✅ Done | P1-04 | 21 tables RLS-enabled, role-based policies (admin/reception/dentist), helper functions, immutable tables protected |
| P1-06 | Create database triggers (audit, status validation, QR invalidation) | ✅ Done | P1-04 | 5 triggers: status_validate, history_log, qr_invalidate, payment_status_update, reference_no auto-gen |
| P1-07 | Create database indexes | ✅ Done | P1-04 | 17 indexes included in core schema migration |
| P1-08 | Setup Supabase Auth (login, logout, session, JWT cookies) | ✅ Done | P1-03, P1-07 | Browser + server + middleware + admin clients, middleware.ts with session refresh |
| P1-09 | Implement RBAC route guards (Next.js middleware) | ✅ Done | P1-08 | Middleware with public routes, role-based route protection, redirect to /login + /unauthorized |
| P1-16 | Configure security headers in next.config.js | ✅ Done | P1-01 | HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy, CSP |
| P1-10 | Create base layout (sidebar, topbar, mobile nav) | ✅ Done | P1-02, P1-09 | DashboardShell, SidebarNav, Topbar with mobile Sheet nav, (dashboard) route group layout. Fixed topbar user dropdown `MenuGroupContext` crash by wrapping `DropdownMenuLabel` in `DropdownMenuGroup` (BUG-023) |
| P1-11 | Create login page | ✅ Done | P1-08 | Login page with RHF + Zod, Supabase auth, redirect support, (auth) route group. Refactored to server component + Suspense-wrapped LoginForm for Next.js 16 static prerender compatibility (BUG-019). Fixed CSP `connect-src` for local Supabase auth (BUG-013), env var naming (BUG-015), missing GoTrue auth users (BUG-016) |
| P1-12 | Setup service layer skeleton (lib/services/) | ✅ Done | P1-03 | BaseService, PatientService, AppointmentService, AuthService, DentalServiceService, ClinicService |
| P1-13 | Setup type system (lib/types/) | ✅ Done | P1-04 | 21 entity interfaces, Database type map, enum types |
| P1-14 | Setup Zod validation schemas (lib/validations/) | ✅ Done | P1-13 | Patient, appointment, login, dentist schedule, service, consent, treatment, payment, clinic setting schemas |
| P1-15 | Setup custom hooks skeleton (lib/hooks/) | ✅ Done | P1-12 | useAuth, usePatients, usePatient, useAppointments, useAppointment, useDentalServices, useClinicSettings |
| P1-17 | Setup .env.example and .gitignore | ✅ Done | P1-01 | .env.example created in P1-03, .gitignore includes .env.local |
| P1-18 | Seed data for local development | ✅ Done | P1-04 | 4 users, 2 dentists, 8 patients, 10 services, 18 settings, 5 holidays, 9 schedules |

---

## Implementation Phase 2 — Patient & Appointment Core

| # | Task | Status | Dependencies | Notes |
|---|------|--------|--------------|-------|
| P2-01 | Patient CRUD service + hooks | ✅ Done | P1-12, P1-13 | PatientService already had CRUD+search+archive from P1-12; useDebounce hook added |
| P2-02 | Patient list page with search | ✅ Done | P2-01 | Debounced search (300ms), server-side fetch, table with actions, empty state, new/edit dialog |
| P2-03 | Patient detail page (record, history, dental chart) | ✅ Done | P2-01 | Tabbed interface (Profile, Medical, Visits, Billing), edit dialog, contact info cards |
| P2-04 | Dental services catalog CRUD | ✅ Done | P1-12 | ServiceFormDialog (RHF+Zod), ServiceList (table with actions), server actions (create/update/toggleActive), /services page, admin-only route guard |
| P2-03b | Dentist Schedule Management | ✅ Done | P1-12 | DentistService (schedules + blocks CRUD), ScheduleFormDialog, BlockFormDialog, /dentists/[id]/schedule page, admin-only |
| P2-05 | Appointment creation with triple status model | ✅ Done | P1-13, P2-04 | AppointmentForm with patient/dentist/service selection, date/time picker, auto-duration, createAppointmentAction, triple status init via DB defaults. Fixed dentist dropdown to show full_name via users join + hidden inputs for FormData (BUG-018, BUG-020). Fixed seed UUIDs to be valid v4 so Zod `.uuid()` validation passes on submit (BUG-021). Fixed `get_user_role()` RLS helper to return application role instead of GoTrue default claim so admin/reception inserts pass (BUG-022). |
| P2-06 | Scheduling engine (dentist schedules, holidays, conflict detection) | ✅ Done | P1-04, P2-05 | SchedulingService with checkConflict + getAvailableSlots, checks schedule/holiday/blocks/existing appts, integrated into createAppointmentAction + slot picker UI |
| P2-07 | Appointment duration calculation (sum of service durations) | ✅ Done | P2-04, P2-05 | Auto-calculated from selected services via useMemo, passed as total_duration to server |
| P2-08 | Staff Booking Dashboard (pending requests, approve/decline) | ✅ Done | P2-05, P2-06 | Booking dashboard with status filters, patient+appointment info, approve/decline actions, elapsed time display. Fixed `log_appointment_history()` trigger RLS violation on approve/decline by making it `SECURITY DEFINER` (BUG-024). |
| P2-09 | Calendar view for appointments | ✅ Done | P2-05 | Month-grid calendar with appointment dots, day selection sidebar, prev/next month nav, status color coding, "New" button. Fixed `scheduled_time` display to `HH:MM` format. Added `getSingleJoined()` helper for Supabase join array/object normalisation with "Unknown Patient" fallback. |

---

## Implementation Phase 3 — Visit Workflow

| # | Task | Status | Dependencies | Notes |
|---|------|--------|--------------|-------|
| P3-01 | Patient check-in & identification flow | ✅ Done | P2-01, P2-05 | Check-in page with debounced search (name/phone/ref), API search route, checkInPatientAction (validates booking_status + visit_status), nav item (admin/reception) |
| P3-02 | QR code generation service (staff-side) | ✅ Done | P1-12, P1-14 | QrCodeService (generate, validate, invalidate, getActive), generateQrCodeAction, QR display with countdown timer, auto-reuse active QR, regenerate button |
| P3-03 | QR code self-registration page (public route) | ✅ Done | P3-02 | 4-step wizard (Personal→Contact→Medical→Review), progress bar, per-step validation, privacy notice (RA 10173), submitRegistrationAction (atomic token invalidation + create patient + link to appointment), error/expired token page |
| P3-04 | QR code validation + invalidation logic | ✅ Done | P3-02 | QrCodeService.validateToken (checks is_used + expires_at), invalidateToken (sets is_used=true), integrated into registration submit flow |
| P3-05 | Staff-assisted registration form | ✅ Done | P2-01 | Dedicated /patients/new page with RHF+Zod, duplicate detection (name+phone), override confirmation, redirects to patient detail on success |
| P3-06 | Walk-in visit creation | ✅ Done | P2-05, P2-06 | createWalkInAction (booking_status=approved, visit_status=checked_in), reuses AppointmentForm, conflict detection, revalidates /queue |
| P3-07 | Queue management with ordering rules | ✅ Done | P2-05 | Queue page with ordered list (scheduled_time), status badges (checked_in/waiting/in_consultation/etc), Call Next + Call Specific actions, stat cards (Waiting/Called/In Progress), 5s polling fallback, ARIA live region. Fixed `dentists(full_name)` query to use `dentists(users(first_name, last_name))` with `getSingleJoined()` (BUG-025). Fixed `validate_appointment_status()` trigger enum crash by removing `'no_show'` from visit_status transitions (BUG-026). |
| P3-08 | Realtime queue view (Supabase Realtime) | ✅ Done | P3-07 | 5-second polling fallback via /api/queue route; Supabase Realtime can be added when WebSocket is configured |
| P3-09 | Consultation view (patient record access for dentist) | ✅ Done | P2-03 | Dentist-only consultation page with patient info (name, contact, DOB, medical history, allergies, services), Start Consultation action (sets visit_status=in_consultation), Generate Consent Form action. Fixed `dentists(full_name)` query to use `dentists(users(first_name, last_name))` with `getSingleJoined()` (BUG-025). |
| P3-10 | Electronic consent form generation | ✅ Done | P2-05 | generateConsentAction in consultation actions creates consent_forms record with treatment_info + consent_version; consent signing page at /consent/[consentId] |
| P3-11 | Signature pad component (react-signature-canvas) | ✅ Done | P1-02 | Installed react-signature-canvas; created SignaturePad component with forwardRef (isEmpty, toDataURL, clear), clear button, touch-action:none for tablet support |
| P3-12 | Consent signing flow + R2 upload | ✅ Done | P3-10, P3-11 | signConsentAction uploads signature PNG to Supabase storage (fallback to base64 data URL if storage bucket unavailable), sets signed_at timestamp; ConsentSigningClient with tablet-friendly full-screen layout, patient declaration text, signed confirmation screen |
| P3-13 | Treatment documentation (dental chart, clinical notes) | ✅ Done | P2-05 | Dental chart component with FDI/ISO 3950 numbering (32 teeth, 4 quadrants), 8 tooth statuses with color coding, interactive clickable teeth, legend; cn utility created |
| P3-14 | Treatment pause/resume workflow | ✅ Done | P3-13 | pauseTreatmentAction (sets visit_status=treatment_paused, records pause_reason + paused_at), resumeTreatmentAction (sets treatment_ongoing, records resumed_at), completeTreatmentAction (sets completed); UI with pause dialog (reason required), resume button, complete button |

---

## Implementation Phase 4 — Billing & Follow-up

| # | Task | Status | Dependencies | Notes |
|---|------|--------|--------------|-------|
| P4-01 | Invoice generation service | ✅ Done | P2-05 | generateInvoiceAction — fetches appointment_services with prices, calculates total, creates invoices record with pending_payment status, duplicate prevention |
| P4-02 | Invoice list + detail pages | ✅ Done | P4-01 | Billing page at /billing/[appointmentId] — server component fetches invoice with line items, payments, patient/dentist info; BillingClient with invoice details card, line items, totals, payment history |
| P4-03 | Payment processing (cash, GCash, Maya, card) | ✅ Done | P4-01 | recordPaymentAction — validates amount ≤ remaining balance, supports cash/gcash/maya/card/bank_transfer, auto-updates payment_status to partially_paid or paid |
| P4-04 | Proof of payment photo upload (Cloudflare R2) | ✅ Done | P4-03 | R2 service with S3-compatible API, presigned URLs (15min expiry), file type validation (jpg/png/pdf), size limits (10MB proof, 5MB signature), UUID object keys, upload API route with auth check, server actions for upload/read URLs |
| P4-05 | Partial payment tracking | ✅ Done | P4-03 | recordPaymentAction tracks totalPaid vs totalAmount, auto-sets partially_paid status; BillingClient shows paid/remaining amounts with tabular numerals |
| P4-06 | Payment status auto-calculation (trigger) | ✅ Done | P1-06, P4-03 | Payment status calculated in recordPaymentAction (partially_paid when partial, paid when total met). DB trigger can be added for belt-and-suspenders |
| P4-07 | Follow-up appointment scheduling | ✅ Done | P2-05 | createFollowUpAction — pre-fills patient + dentist from original appointment, conflict detection via SchedulingService, service selection with prices, FU- reference number; FollowUpScheduler component with date/time inputs and service toggle buttons |
| P4-08 | Checkout & visit completion flow | ✅ Done | P4-01, P3-13 | checkoutAction — validates invoice exists and payment not pending, sets visit_status=completed + booking_status=completed, revalidates /queue and /billing |

---

## Implementation Phase 5 — Messenger Integration

| # | Task | Status | Dependencies | Notes |
|---|------|--------|--------------|-------|
| P5-01 | Facebook Messenger webhook setup (GET verification + POST handler) | ✅ Done | P1-09 | GET: verifies hub.verify_token against MESSENGER_VERIFY_TOKEN, returns challenge on match, 403 on mismatch. POST: HMAC-SHA256 signature verification with constant-time comparison (timingSafeEqual), parses page entries, extracts sender PSID + message text/postback/quick_reply, stores in messenger_conversations + messenger_messages via service-role Supabase client. Webhook route added to PUBLIC_ROUTES in middleware. |
| P5-02 | Messenger webhook Edge Function (intent parsing) | ✅ Done | P5-01 | Booking parser service with intent detection (book/confirm/reschedule/cancel/help/unknown), natural language date parsing (today/tomorrow/day names/DD/MM), time parsing (9am/2:30pm/14:00), multi-step conversation flow (date→time→service→dentist), service/dentist selection by number or name, Messenger Send API integration for outbound messages, conversation+message storage |
| P5-03 | Automated booking request parsing & creation | ✅ Done | P5-02, P2-05 | createPendingAppointment — creates appointment with pending booking_status, MB- reference number, links service with price, duration from dental_services.default_duration_minutes. Patient lookup by messenger_psid. Migration adds messenger_psid column to patients table. |
| P5-04 | Send notification Edge Function (Messenger Send API) | ✅ Done | P5-01 | Notification service with 7 notification types (approval, decline, reschedule, cancellation, reminder, follow_up, custom), message formatting with emojis, Graph API v21.0 integration, sendQuickReplyMessage for confirm/reschedule/cancel buttons, sendStaffMessage for live chat, createStaffNotification for fallback audit log. Server actions for approval/decline/cancellation/reschedule/follow-up notifications with appointment details lookup. |
| P5-05 | Auto-notifications (approval, decline, reschedule, cancel, follow-up) | ✅ Done | P5-04 | Server actions in `src/app/api/notifications/actions.ts` — sendApprovalNotificationAction, sendDeclineNotificationAction (with reason), sendCancellationNotificationAction, sendRescheduleNotificationAction (with new date/time), sendFollowUpNotificationAction. Each fetches appointment details + patient PSID, formats message, sends via Send API, saves outbound message to messenger_messages. |
| P5-06 | Confirmation reminder flow (Confirm/Reschedule/Cancel in Messenger) | ✅ Done | P5-04 | Quick reply payload handling in booking parser: CONFIRM_<ref> → sets booking_status=confirmed (only if approved/confirmed), RESCHEDULE_<ref> → sets booking_status=reschedule_required, CANCEL_<ref> → sets booking_status=pending_cancellation. sendReminderWithQuickReplies sends 3 quick reply buttons. Responses update appointment status and send confirmation message. |
| P5-07 | Reminder cron job | ✅ Done | P5-06 | Two cron routes: /api/cron/reminders (daily 8am — fetches tomorrow's approved/confirmed appointments, sends reminder with quick reply buttons via sendReminderWithQuickReplies) and /api/cron/expiration (hourly — expires pending appointments older than 24h, notifies patients). Both protected by CRON_SECRET Bearer auth. vercel.json with cron schedules. |
| P5-08 | Live Chat Dashboard (conversation list + chat panel) | ✅ Done | P5-01 | 3-panel layout: ConversationList (left — searchable list with patient name/PSID, last message preview, status badge Bot Active/Staff, unread count, time ago), ChatThread (center — message bubbles outbound right/inbound left, timestamps, Take Chat/End Chat buttons, message input with Enter to send, 5s polling for new messages), PatientInfoPanel (right — patient name, PSID, recent appointments with status badges). Empty states for no conversations and no selection. ChatClient orchestrates with 10s polling for conversation list. |
| P5-09 | Staff takeover / AI handoff (bot pause, message relay) | ✅ Done | P5-08 | takeChatAction sets conversation status to taken_over + taken_over_by + taken_over_at. endChatAction resets status to active (bot resumes). sendMessageAction sends via sendStaffMessage (Graph API Send API) and saves outbound message to messenger_messages. Bot checks conversation status before sending automated replies (booking parser checks status in processIncomingMessage). |
| P5-10 | Messenger notification fallback (staff notification on failure) | ✅ Done | P5-04 | createStaffNotification in notification-service.ts logs failed notifications to audit_logs with action=messenger_notification_failed. All 5 notification server actions call createStaffNotification on failure with PSID, notification type, and error reason. Dashboard actions fetch pending staff notifications from audit_logs. DashboardClient displays AlertTriangle alerts with patient PSID, notification type, error reason, and Dismiss button. dismissStaffNotificationAction deletes the audit log entry. Dashboard also shows live stat counts (pending bookings, today's appointments, in queue, unread messages). |

---

## Implementation Phase 6 — Exception Handling & Advanced Features

| # | Task | Status | Dependencies | Notes |
|---|------|--------|--------------|-------|
| P6-01 | Dentist unavailability declaration | ✅ Done | P2-05 | ReassignmentService with getAffectedAppointments, markAppointmentsRescheduleRequired, declareUnavailabilityAction creates dentist_blocks + marks appointments, unavailability page with dentist/date/block type/reason UI |
| P6-02 | Reassignment workflow (affected appointments, alternate dentist suggestion) | ✅ Done | P6-01 | findAlternateDentists checks available slots for all active dentists, reassignAppointment updates appointment + creates reassignment_logs + appointment_history + audit_logs, reassignment dialog with alternate dentist selector + time slot picker, patient notified via Messenger |
| P6-03 | Dentist Mobile Portal (schedule, emergency declaration) | ✅ Done | P1-10 | Mobile-first (dentist) route group with bottom tabs (Schedule, Queue, More), today's schedule with patient quick-view dialog, simplified queue view grouped by In Consultation/Waiting, emergency page with 1.5s long-press button + circular progress indicator + reason textarea, emergency triggers dentist_blocks + markAppointmentsRescheduleRequired + audit_log, More page with patient list (allergies/medical history visible), 44px touch targets, /dentist-portal protected by middleware for dentist role only |
| P6-04 | Late arrival / Delayed / No-Show handling | ✅ Done | P3-07 | markDelayedAction sets visit_status=delayed, moveToLaterSlotAction reschedules to later time with conflict check, markNoShowAction sets booking_status=no_show + clears visit_status. Queue UI shows Delay/Move/No-Show buttons per status. Audit logs + appointment history for all actions. |
| P6-05 | Same-day dynamic availability & slot release | ✅ Done | P2-06 | WaitlistService.findReleasedSlots scans all active dentist schedules for unbooked/unblocked 30-min slots, released slots visible in waitlist dashboard |
| P6-06 | Waitlist management with FIFO notifications | ✅ Done | P6-05 | WaitlistService with join/leave/notifyNextInLine/accept/decline, FIFO ordering by joined_at, Messenger notification on slot release, accept creates confirmed appointment + removes from waitlist, decline resets notified_at for next patient |
| P6-07 | Booking approval expiration cron | ✅ Done | P2-05 | Already implemented in P5-07 — /api/cron/expiration expires pending appointments older than 24h, notifies patients via Messenger, runs hourly via vercel.json |
| P6-08 | Patient-initiated cancellation via Messenger | ✅ Done | P5-02 | Booking parser handleCancelResponse sets pending_cancellation, staff sees Pending Cancellation filter in booking dashboard, confirmCancellationAction sets cancelled + notifies patient, denyCancellationAction restores status + notifies patient with reason |
| P6-09 | Patient-initiated reschedule via Messenger | ✅ Done | P5-02 | Booking parser handleRescheduleResponse sets reschedule_required, staff sees Reschedule Required filter in booking dashboard, rescheduleAppointmentAction checks slot conflicts + updates date/time + sets rescheduled + creates appointment_history + notifies patient with new schedule |
| P6-10 | Reassignment logs & audit trail | ✅ Done | P6-02 | reassignment_logs entries + appointment_history (dentist_id, scheduled_date, scheduled_time changes) + audit_logs (appointment_reassigned, dentist_unavailability_declared) created in ReassignmentService |

---

## Implementation Phase 7 — System Settings, Audit & Polish

| # | Task | Status | Dependencies | Notes |
|---|------|--------|--------------|-------|
| P7-01 | System Settings module (all 6 categories) | ✅ Done | P1-12 | Settings page with 6 category tabs (Clinic, Dentist, Appointment, Messenger, Payment, Security), per-field rendering based on data_type (string/integer/boolean), Switch component for booleans, unsaved changes warning on tab switch, save with audit log, admin-only via middleware |
| P7-02 | Audit logging integration / Audit Log Viewer | ✅ Done | P1-06 | Audit log viewer page with filters (entity type, user, date range), paginated table with user/action/entity/timestamp/metadata, read-only, empty state, admin-only via middleware + nav item |
| P7-03 | Record archiving functionality | ✅ Done | P2-01, P2-05 | archivePatientAction/unarchivePatientAction/archiveAppointmentAction with audit logs, shared ArchiveDialog component with confirmation, getArchivedPatientsAction for retrieval, ArchivedRecordsClient page at /patients/archived with restore functionality + toast notifications, admin-only via nav item |
| P7-04 | Appointment history view | ✅ Done | P1-06 | Appointment history page at /appointments/[id]/history, HistoryTimeline component with vertical timeline showing field/old value/new value/changed by/timestamp, read-only, empty state |
| P7-05 | Loading/error/empty states on all data-driven components | ✅ Done | All phases | Created SkeletonLoader/SkeletonCard/SkeletonList, ErrorState with retry button, EmptyState with icon+CTA, global error.tsx boundary, not-found.tsx 404 page, ToastProvider + useToast hook for action success/error feedback across all pages |
| P7-06 | Performance optimization (query tuning, React.memo, pagination) | ✅ Done | All phases | Audit log viewer uses server-side pagination (range+offset). All list pages already use server-side queries with .order() and .range(). Appointment history limited by .order() descending. Settings loaded once server-side. React.memo on DentistScheduleClient, DentistQueueClient, HistoryTimeline. Dynamic import (ssr: false) for SignaturePad to lazy-load canvas library. |
| P7-06b | Bug testing round (code review) | ✅ Done | All phases | Systematic code review of all major flows. Found and fixed 5 bugs: BUG-027 (audit_logs DELETE RLS), BUG-028 (billing join normalisation), BUG-029 (follow-up missing scheduled_date + wrong visit_status), BUG-030 (dentist portal join normalisation), BUG-031 (checkout error message). `tsc --noEmit` passes. |
| P7-07 | End-to-end testing | ✅ Done | All phases | Playwright configured with 31 tests across 8 spec files: auth (5), dashboard (3), patients (4), appointments (4), queue (3), check-in (3), settings (3), dentist-portal (4), chat (2). All 31 tests pass. Tests cover login (admin/reception/dentist), invalid credentials, dashboard stats, patient list/search/detail, appointment calendar, booking dashboard, queue display, check-in search, settings categories, dentist portal (schedule/queue/more/emergency), live chat. |
| P7-08 | Security audit (Devin 5-subagent review) | ✅ Done | All phases | Manual 5-domain security audit. 3 issues found and fixed: **BUG-032** (MEDIUM) — Open redirect in login `redirect` param; fixed with `isSafeRedirect()` validation. **BUG-033** (LOW) — Cron routes used `!==` instead of `timingSafeEqual` for CRON_SECRET; fixed both reminders + expiration routes. **BUG-034** (LOW) — API routes (check-in search, queue) lacked explicit `auth.getUser()` checks; added for defense-in-depth. Also tightened CSP `script-src` to remove `'unsafe-eval'` in production. `npm audit` 0 vulnerabilities. `tsc --noEmit` passes. 31 E2E tests pass. |
| P7-08b | Session 8 bug fixes (check-in, QR, consent, billing, DB) | ✅ Done | P7-08 | Fixed 14 bugs: BUG-035–048 + ARCH-001/002. Middleware RBAC for admin routes, missing role guards, Messenger booking for new patients, DB-backed booking sessions, approval/decline notifications, Realtime chat with is_read, HUMAN_AGENT tag fix, check-in today's appointments, QR URL format, RLS for public registration, revalidatePath issue, dentist billing RLS, consent staff_id, visit_status button disable, triggers migration syntax. All migrations applied, DB re-seeded. |
| P7-09 | Production deployment (Vercel + Supabase Cloud + R2) | ⬜ Pending | P7-08b | |

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| ⬜ | Pending |
| ⛔ | Blocked |
