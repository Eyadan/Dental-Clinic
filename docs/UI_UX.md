# UI/UX Design Document
## Dental Clinic Management System — Comprehensive Interface & Experience Specification

> **Reference:** Derived from [PRD](./PRD.md), [Architecture](./ARCHITECTURE.md), [Security](./SECURITY.md). FDI notation per [PDA Dental Chart](https://pda.com.ph/wp-content/uploads/2022/10/PDA-Dental-Chart.pdf) and [ISO 3950](https://en.wikipedia.org/wiki/FDI_World_Dental_Federation_notation).

---

## Table of Contents

1. [Product Analysis](#1-product-analysis)
2. [UX Goals](#2-ux-goals)
3. [User Personas](#3-user-personas)
4. [User Journey](#4-user-journey)
5. [Information Architecture](#5-information-architecture)
6. [Navigation](#6-navigation)
7. [Screen-by-Screen Breakdown](#7-screen-by-screen-breakdown)
8. [UX Decisions & Heuristics](#8-ux-decisions--heuristics)
9. [UI Design Direction](#9-ui-design-direction)
10. [Design System](#10-design-system)
11. [Accessibility Review](#11-accessibility-review)
12. [Microinteractions](#12-microinteractions)
13. [Motion Design](#13-motion-design)
14. [Edge Cases](#14-edge-cases)
15. [Developer Notes](#15-developer-notes)
16. [Future Improvements](#16-future-improvements)
17. [UX Audit & Recommendations](#17-ux-audit--recommendations)

---

## 1. Product Analysis

### Product Vision
A dental clinic management system that digitizes the full patient journey — from Messenger booking through treatment and billing — replacing paper-based workflows and fragmented communication with a unified, role-aware web application.

### Business Goals
- Reduce no-shows through automated Messenger reminders
- Increase booking conversion via frictionless Messenger intake
- Streamline front-desk operations (check-in, registration, billing)
- Maintain compliance with Philippine Data Privacy Act (RA 10173)
- Enable multi-branch scalability

### User Goals
- **Reception staff:** Process bookings, check-ins, and billing quickly with minimal clicks
- **Dentists:** Access patient records instantly, document treatment without leaving the patient
- **Admins:** Configure clinic operations without technical assistance
- **Patients:** Book, confirm, reschedule, or cancel through Messenger without installing an app

### Target Audience
Philippine dental clinics (single or multi-branch), staffed by reception personnel and licensed dentists. Patients are Filipino adults who use Facebook Messenger as their primary communication tool.

### Key Constraints
- Staff work 8+ hour shifts — UI must reduce fatigue, not add to it
- Tablet devices used for consent signatures at chairside
- Dentists need a mobile portal for emergencies on the go
- Patients interact only through Messenger and QR-scanned forms — no app install
- Network reliability varies in the Philippines — must degrade gracefully

### Assumptions
- Clinics have stable WiFi for desktop/tablet workstations
- Dentists have personal smartphones for the mobile portal
- Patients have Facebook accounts and smartphone cameras for QR scanning
- Clinics process payments via cash, GCash, Maya, or card

---

## 2. UX Goals

| Goal | Metric | Measurement |
|---|---|---|
| **Speed of common tasks** | Booking approval < 3 clicks; Check-in < 5 clicks; Bill generation < 5 clicks | Task completion time tracking |
| **Reduce cognitive load** | Max 7 items in primary navigation; One primary action per screen | Heuristic evaluation |
| **Error prevention** | Status transitions validated before UI allows them; Confirm destructive actions | Error rate tracking |
| **Trust & professionalism** | Medical-grade aesthetic; No playful animations in clinical contexts | User interviews |
| **Accessibility** | WCAG 2.2 AA compliance; 44×44px touch targets; 16px minimum body text | Automated + manual audit |
| **Patient self-registration** | Completable in < 3 minutes by a non-technical user | Usability testing |
| **Real-time awareness** | Queue and slot changes visible within 5 seconds | Realtime latency monitoring |
| **Graceful degradation** | UI remains usable during network interruptions | Offline testing |

---

## 3. User Personas

### 3.1 Primary: Maria — Reception Staff

- **Age:** 28
- **Role:** Front desk receptionist
- **Tech comfort:** Moderate — uses Facebook, GCash, basic office software
- **Workday:** 8am–5pm, handles 20–40 patients/day
- **Pain points:** Juggling phone calls, walk-ins, and Messenger bookings simultaneously; manual paper registration forms; difficulty tracking which patient is next in queue
- **JTBD:** "I need to process patients quickly so the waiting room doesn't back up"
- **Mental model:** "Who's next? What's pending? What needs my attention right now?"

### 3.2 Primary: Dr. Santos — Dentist

- **Age:** 42
- **Role:** Licensed dentist, clinic owner
- **Tech comfort:** Moderate — uses iPad for clinical apps, smartphone for communication
- **Workday:** 9am–6pm, sees 12–18 patients/day
- **Pain points:** Paper dental charts get lost or damaged; can't access patient history during emergency calls; treatment pauses are hard to track across visits
- **JTBD:** "I need to see the patient's full history instantly and document treatment without leaving the chair"
- **Mental model:** "What's the patient's history? What am I doing today? Is there an emergency?"

### 3.3 Secondary: Admin Carla — Clinic Administrator

- **Age:** 35
- **Role:** Practice manager / admin
- **Tech comfort:** High — manages social media, spreadsheets, online banking
- **Workday:** Flexible, oversees operations
- **Pain points:** Can't easily change clinic schedules; no visibility into no-show rates or booking patterns; manual holiday closures
- **JTBD:** "I need to configure clinic operations and see performance without calling IT"
- **Mental model:** "Is the clinic running smoothly? What needs configuring?"

### 3.4 Tertiary: Patient Juan — Messenger User

- **Age:** 25
- **Role:** Patient
- **Tech comfort:** High — lives on Messenger, GCash, social media
- **Interaction:** Only through Facebook Messenger and QR-scanned forms
- **Pain points:** Doesn't want to call the clinic; wants to book at 2am; forgets appointment dates
- **JTBD:** "I need to book, confirm, or cancel my dental appointment without calling anyone"
- **Mental model:** "Can I just message the clinic and they'll handle it?"

---

## 4. User Journey

### 4.1 Patient Journey (via Messenger)

```
1. AWARENESS → Patient discovers clinic on Facebook
2. BOOKING  → Patient messages clinic on Messenger
              → Bot/AI collects: preferred date, time, service
              → System generates reference number
              → Patient receives: "Your booking is pending approval"
3. APPROVAL → Staff reviews on dashboard
              → Patient receives: "Approved! See you on [date] at [time]"
4. REMINDER → Day before appointment: "Confirm, Reschedule, or Cancel?"
              → Patient taps "Confirm"
5. ARRIVAL  → Patient arrives, staff checks them in
              → If new patient: scans QR code → fills registration form on phone
6. WAITING  → Patient waits in queue (status visible to staff)
7. CONSULT  → Dentist calls patient, reviews history, confirms treatment
8. CONSENT  → Patient signs electronic consent on tablet
9. TREATMENT → Dentist performs procedure, documents in system
10. CHECKOUT → Staff generates bill, patient pays (cash/GCash/Maya/card)
11. FOLLOW-UP → Staff schedules follow-up if needed
                → Patient receives Messenger confirmation
```

### 4.2 Reception Staff Journey

```
1. LOGIN → Enters credentials → lands on dashboard
2. REVIEW → Sees pending bookings, today's queue, alerts
3. APPROVE → Reviews booking → checks dentist availability → approves/declines
4. CHECK-IN → Patient arrives → search by name/phone/ref → verify → check in
5. REGISTER → If new: generate QR → patient scans → form auto-links to appointment
6. QUEUE → Monitor queue → call next when dentist ready
7. BILL → Treatment complete → generate invoice → process payment
8. FOLLOW-UP → Schedule follow-up → mark visit complete
```

### 4.3 Dentist Journey

```
1. LOGIN → Enters credentials → lands on today's schedule
2. QUEUE → Sees ordered queue for the day
3. CALL → Taps "Call Next" → patient enters
4. REVIEW → Opens patient record (history, allergies, dental chart, past visits)
5. CONSULT → Records examination findings → confirms treatment plan
6. CONSENT → System generates consent form → patient signs on tablet
7. TREAT → Updates dental chart, clinical notes, diagnosis, procedures
8. PAUSE (if needed) → Records pause reason → resumes later
9. COMPLETE → Marks treatment done → reception notified
10. EMERGENCY (if needed) → Mobile portal → declare unavailability → system handles reassignment
```

---

## 5. Information Architecture

### 5.1 App Structure

```
Dental Clinic Management System
│
├── AUTH (public)
│   └── Login
│
├── STAFF DASHBOARD (authenticated: admin, reception, dentist)
│   ├── Overview (dashboard home)
│   ├── Bookings
│   │   ├── Pending list
│   │   ├── Active list
│   │   └── Detail view (with Messenger conversation)
│   ├── Patients
│   │   ├── Search & list
│   │   └── Detail (profile, medical history, dental chart, visit history)
│   ├── Appointments
│   │   ├── Calendar view
│   │   └── Detail view
│   ├── Queue (real-time)
│   ├── Consultation (dentist only)
│   ├── Consent (dentist only, tablet view)
│   ├── Billing
│   │   ├── Invoice list
│   │   └── Invoice detail + payment
│   ├── Live Chat
│   │   ├── Conversation list
│   │   └── Chat panel
│   └── Settings (admin only)
│       ├── Clinic
│       ├── Dentist
│       ├── Appointment
│       ├── Messenger
│       ├── Payment
│       └── Security
│
├── DENTIST PORTAL (authenticated: dentist, mobile-first)
│   ├── Today's schedule
│   ├── Emergency declaration
│   └── Patient quick-view
│
└── PUBLIC (no auth)
    └── QR Registration /register/[token]
```

### 5.2 Why This Structure Works

- **Role-based entry points:** Each role sees what matters most — reception starts with bookings/queue, dentists start with schedule, admins start with overview
- **Feature organization follows workflow:** Bookings → Patients → Appointments → Queue → Consultation → Billing mirrors the patient visit lifecycle
- **Settings isolated to admin:** Prevents accidental configuration changes by non-admin staff
- **Dentist portal is separate:** Mobile-first layout optimized for on-the-go emergency declarations, not full desktop workflows
- **Public registration is isolated:** No navigation to authenticated areas; single-purpose form with no distractions

---

## 6. Navigation

### 6.1 Desktop Navigation (Staff Dashboard)

**Pattern:** Persistent left sidebar + contextual top bar

```
┌─────────────────────────────────────────────────────┐
│  [Logo]  Dental Clinic Management          [User ▾]  │  ← Top bar
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│ Overview │                                          │
│ Bookings │           Main content area              │
│ Patients │                                          │
│ Appts    │                                          │
│ Queue    │                                          │
│ Billing  │                                          │
│ Live Chat│                                          │
│ Settings │                                          │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

**Sidebar items by role:**

| Item | Admin | Reception | Dentist |
|---|---|---|---|
| Overview | ✅ | ✅ | ✅ |
| Bookings | ✅ | ✅ | ✅ (view only) |
| Patients | ✅ | ✅ | ✅ (own patients) |
| Appointments | ✅ | ✅ | ✅ |
| Queue | ✅ | ✅ | ✅ |
| Consultation | ✅ | — | ✅ |
| Consent | ✅ | — | ✅ |
| Billing | ✅ | ✅ | ✅ (view only) |
| Live Chat | ✅ | ✅ | — |
| Settings | ✅ | — | — |

**Design rationale:**
- **Jakob's Law:** Users expect sidebar navigation on desktop dashboards (familiar from Gmail, Slack, Linear)
- **Hick's Law:** Max 10 items in sidebar — decision time stays low
- **Fitts's Law:** Sidebar items are full-width, tall (48px height) — easy to hit
- **Recognition over recall:** Icons + labels (not icon-only) — no memorization needed

### 6.2 Mobile Navigation (Dentist Portal)

**Pattern:** Bottom tab bar (3 items) + hamburger for secondary

```
┌─────────────────────────┐
│                         │
│    Main content area    │
│                         │
│                         │
├─────────┬──────┬────────┤
│ Schedule│ Queue│  More  │  ← Bottom tabs
└─────────┴──────┴────────┘
```

| Tab | Purpose |
|---|---|
| Schedule | Today's appointments, call next patient |
| Queue | Real-time queue view |
| More | Emergency, patient search, settings |

**Design rationale:**
- **Fitts's Law:** Bottom tab bar is within thumb reach on mobile
- **44×44px minimum:** All tab targets exceed WCAG 2.2 minimum
- **Miller's Law:** 3 primary tabs + overflow — within working memory capacity
- **Material Design 3:** Bottom navigation is the standard mobile pattern

### 6.3 Patient Registration (Public, No Navigation)

**Pattern:** Single-page form, no navigation, progress indicator only

```
┌─────────────────────────┐
│  ████████░░░░  Step 2/4 │  ← Progress bar
│                         │
│  Registration form      │
│  fields...              │
│                         │
│  [  Back  ] [  Next  ]  │
└─────────────────────────┘
```

**Design rationale:**
- **No navigation:** Prevents abandonment — user can only go forward or back
- **Progressive disclosure:** 4 steps (Personal → Contact → Medical → Review) reduces form overwhelm
- **Goal Gradient Effect:** Progress bar motivates completion
- **3-minute target:** Form designed for speed — autocomplete, smart defaults, minimal required fields

---

## 7. Screen-by-Screen Breakdown

### 7.1 Login Screen

| Aspect | Detail |
|---|---|
| **Purpose** | Authenticate staff before system access |
| **User goal** | Log in quickly and securely |
| **Primary action** | Submit credentials |
| **Secondary actions** | Forgot password link |
| **Layout** | Centered card on split-screen background (clinic branding left, form right) |
| **Components** | Email input, password input (with show/hide toggle), submit button, error alert |
| **Loading** | Button shows spinner + "Signing in..." text; inputs disabled |
| **Error** | Red alert: "Invalid email or password" — no indication of which field is wrong (security) |
| **Success** | Redirect to role-based dashboard |
| **Empty** | N/A |
| **Accessibility** | Labels on all inputs; focus order: email → password → submit; Enter key submits |
| **Microinteraction** | Password show/hide eye icon toggles; button press scale 0.98 |
| **UX writing** | "Welcome back" heading; "Sign in to your account" subtext |

### 7.2 Staff Dashboard Overview

| Aspect | Detail |
|---|---|
| **Purpose** | At-a-glance view of today's clinic status |
| **User goal** | Understand what needs attention right now |
| **Primary actions** | Approve pending bookings, call next patient, process checkout |
| **Secondary actions** | View full queue, view all bookings, open live chat |
| **Layout** | 3-column responsive grid of stat cards + action lists |
| **Content** | |
| — Stat cards | Pending bookings count, Today's appointments count, Patients in queue, Awaiting checkout |
| — Pending bookings list | Top 5 pending with patient name, service, requested time, Approve/Decline buttons |
| — Today's queue | Next 5 patients with status badges |
| — Alerts | Expired bookings, no-response reminders, staff notifications |
| **Loading** | Skeleton loaders for each card section |
| **Error** | Per-card error state with retry button |
| **Empty** | "No pending bookings" / "Queue is empty" with illustration |
| **Realtime** | Stat counts update live; new pending bookings appear with subtle highlight animation |
| **Accessibility** | Stat cards are ARIA live regions for screen readers |
| **Microinteraction** | Stat count rolls up on load; new items slide in from top |
| **UX writing** | "Good morning, Maria" personalized greeting; actionable card titles |

### 7.3 Booking Dashboard

| Aspect | Detail |
|---|---|
| **Purpose** | Review and process pending booking requests |
| **User goal** | Quickly decide approve/decline for each booking |
| **Primary actions** | Approve, Decline |
| **Secondary actions** | View conversation, view patient history, filter by status |
| **Layout** | List view (left) + detail panel (right) on desktop; stacked on mobile |
| **Content** | |
| — List | Patient name, service(s), requested date/time, reference no, status badge, time elapsed since request |
| — Detail | Full booking info, Messenger conversation history, dentist availability calendar, conflict warnings |
| **Filters** | All / Pending / Approved / Declined / Expired / Reschedule Requested |
| **Loading** | Skeleton list items |
| **Error** | "Failed to load bookings" with retry |
| **Empty** | "No bookings to review" with illustration |
| **Interaction** | Click list item → detail panel slides in; Approve opens confirmation dialog with dentist + time slot selector |
| **Accessibility** | List is navigable via keyboard; approve/decline are keyboard accessible |
| **Microinteraction** | Approve button: green checkmark animation on success; Decline: subtle red shake on error |
| **UX writing** | "Pending Review" (not "Pending" — clearer action needed); "Approve and Notify" (not just "Approve" — sets expectation) |

### 7.4 Patient List & Search

| Aspect | Detail |
|---|---|
| **Purpose** | Find and access patient records |
| **User goal** | Locate a patient by name, phone, or reference number in < 3 seconds |
| **Primary action** | Search |
| **Secondary actions** | New patient registration, view detail |
| **Layout** | Search bar (top) + results table (below) |
| **Search** | Debounced (300ms); searches name, contact_no, email, reference_no simultaneously |
| **Results** | Table: Name, Contact, Last Visit, Status (Active/Archived), Actions |
| **Loading** | Skeleton rows; search shows spinner in search bar |
| **Error** | "Search failed" with retry |
| **Empty (no results)** | "No patients found matching '[query]'" + "Register as new patient?" CTA |
| **Empty (no search)** | Recently viewed patients list |
| **Accessibility** | Search has ARIA label; table has proper headers; keyboard navigable |
| **Microinteraction** | Search results appear with fade-in; row hover highlights |
| **UX writing** | "Search patients by name, phone, or reference number" placeholder |

### 7.5 Patient Detail

| Aspect | Detail |
|---|---|
| **Purpose** | View complete patient record |
| **User goal** | Access medical history, dental chart, visit history, billing |
| **Layout** | Tabbed interface: Profile \| Medical History \| Dental Chart \| Visit History \| Billing |
| **Tab: Profile** | Name, contact, birth date, email, registration date, archived status |
| **Tab: Medical History** | Allergies, conditions, medications, previous treatments summary |
| **Tab: Dental Chart** | Interactive FDI notation chart (see §7.6) |
| **Tab: Visit History** | Chronological list of all appointments with status, treatment, dentist |
| **Tab: Billing** | All invoices and payments for this patient |
| **Loading** | Tab content skeleton |
| **Error** | Per-tab error with retry |
| **Empty** | "No visit history yet" / "No invoices yet" per tab |
| **Accessibility** | Tabs are ARIA tablist; content is ARIAtabpanel; keyboard arrow navigation between tabs |
| **Microinteraction** | Tab switch: content fade-in (150ms) |
| **UX writing** | Tab labels are noun-based (not verb-based) for scanability |

### 7.6 Dental Chart (FDI Notation)

| Aspect | Detail |
|---|---|
| **Purpose** | Visual interactive tooth chart for documenting dental conditions |
| **User goal** | Click a tooth to record findings, procedures, or conditions |
| **Standard** | FDI Two-Digit Notation (ISO 3950) — used by PDA and Philippine dentists |
| **Layout** | Full-width interactive chart, dentist's view orientation (patient's right = chart left) |
| **Chart structure** | |
| — Upper arch | Quadrants 1 (upper right) and 2 (upper left), teeth 11–18 and 21–28 |
| — Lower arch | Quadrants 4 (lower right) and 3 (lower left), teeth 41–48 and 31–38 |
| — Deciduous | Quadrants 5–8 (toggle for pediatric patients) |
| **Tooth states** | Healthy, Caries, Filled, Crown, Missing, Implant, Root Canal, Bridge, Extraction Needed |
| **Interaction** | Click tooth → popover with state selector + notes field → save updates chart |
| **Visual** | Each tooth is an SVG shape; color-coded by state (see Design System §10) |
| **Loading** | Skeleton chart outline |
| **Error** | "Failed to load dental chart" with retry |
| **Empty** | All teeth default to "Healthy" (white/neutral) |
| **Accessibility** | Each tooth is a button with ARIA label: "Tooth 11, upper right central incisor, healthy" |
| **Microinteraction** | Tooth hover: scale 1.1 + tooltip with FDI number; state change: color transition 200ms |
| **UX writing** | FDI number always displayed on tooth; state name in tooltip and popover |

**FDI Chart Visual Layout:**

```
        UPPER ARCH (Maxillary)
  Patient's Right ←          → Patient's Left

  18 17 16 15 14 13 12 11 │ 21 22 23 24 25 26 27 28
  ─────────────────────────┼─────────────────────────
  48 47 46 45 44 43 42 41 │ 31 32 33 34 35 36 37 38

        LOWER ARCH (Mandibular)
```

### 7.7 Queue Management

| Aspect | Detail |
|---|---|
| **Purpose** | Real-time view of waiting patients ordered by priority |
| **User goal** | Know who's next and current patient status |
| **Primary action** | Call Next (dentist), Call Patient (specific) |
| **Secondary actions** | Move to later slot, reschedule, mark no-show |
| **Layout** | Vertical list of patient cards, ordered by: scheduled time → checked-in status → arrival time |
| **Card content** | Patient name, appointment time, arrival time, visit status badge, service, dentist avatar |
| **Status badges** | Waiting (blue), In Consultation (purple), Treatment Ongoing (orange), Delayed (yellow), Checkout (teal) |
| **Realtime** | New check-ins appear at correct position with slide-in animation; status changes animate badge color |
| **Loading** | Skeleton cards |
| **Error** | "Failed to load queue" with retry; falls back to polling if Realtime disconnects |
| **Empty** | "No patients in queue" illustration |
| **Accessibility** | List is ARIA live region; status changes announced to screen readers |
| **Microinteraction** | "Call Next" button: pulse animation when queue has waiting patients; card slides up when called |
| **UX writing** | "Call Next Patient" (not just "Next"); "In Consultation with Dr. Santos" (contextual status) |

### 7.8 Consultation View

| Aspect | Detail |
|---|---|
| **Purpose** | Dentist reviews patient record and documents consultation |
| **User goal** | Access full history, record findings, confirm treatment plan |
| **Layout** | Split panel: patient record (left, tabbed) + consultation form (right) |
| **Left panel tabs** | Profile, Medical History, Dental Chart, Previous Visits |
| **Right panel** | Examination findings textarea, diagnosis input, treatment plan selector, "Generate Consent" button |
| **Primary action** | Generate Consent Form (triggers consent screen) |
| **Secondary actions** | Save draft, view previous treatment records |
| **Loading** | Skeleton for both panels |
| **Error** | Per-panel error with retry |
| **Empty** | "No previous visits" in history tab; "Start consultation" prompt in form |
| **Accessibility** | Tab navigation between panels; all form fields labeled |
| **Microinteraction** | "Generate Consent" button: success checkmark → redirect to consent screen |
| **UX writing** | "Record your findings below" (not "Enter data"); "Generate Consent Form" (not "Submit") |

### 7.9 Consent Screen (Tablet)

| Aspect | Detail |
|---|---|
| **Purpose** | Patient reviews and signs informed consent on a tablet |
| **User goal** | Understand treatment, sign electronically |
| **Primary action** | Sign and Submit |
| **Secondary action** | Decline (records refusal, blocks treatment) |
| **Layout** | Full-screen tablet view: consent text (scrollable) + signature pad (bottom) + buttons |
| **Content** | Treatment description, risks, alternatives, consent statement, patient name, appointment reference, dentist name, date |
| **Signature pad** | `react-signature-canvas` — full-width canvas, stylus/touch input, clear button |
| **Loading** | Consent text loads first; signature pad initializes after |
| **Error** | "Failed to submit consent" with retry; signature not lost on error |
| **Empty** | N/A (consent text always present) |
| **Accessibility** | Consent text is screen-reader accessible; signature pad has "Type name instead" alternative for motor-impaired patients |
| **Microinteraction** | Submit: signature fades to checkmark → success screen; Decline: confirmation dialog "Are you sure?" |
| **UX writing** | Plain language consent (not legal jargon); "I understand and agree" (not "I hereby affix my signature") |
| **Orientation** | Works in both portrait and landscape; optimized for landscape (wider signature area) |
| **Timeout** | No auto-timeout on this screen (patient needs time to read); but session heartbeat keeps auth alive |

### 7.10 Billing & Invoice

| Aspect | Detail |
|---|---|
| **Purpose** | Generate invoices and process payments |
| **User goal** | Bill patient accurately and record payment |
| **Primary actions** | Generate Invoice, Record Payment |
| **Secondary actions** | Add line item, apply partial payment, upload proof |
| **Layout** | Invoice detail (left) + payment panel (right) |
| **Invoice content** | Line items (services with prices), subtotal, total, payment status badge |
| **Payment panel** | Amount input, method selector (Cash/GCash/Maya/Card), proof photo upload (for e-wallet), "Record Payment" button |
| **Payment status** | Pending Payment (yellow), Partially Paid (orange), Paid (green), Payment Failed (red) |
| **Loading** | Skeleton invoice; payment button spinner |
| **Error** | "Failed to record payment" with retry; "Failed to upload proof" with retry |
| **Empty** | "No invoice generated yet" + "Generate Invoice" CTA |
| **Accessibility** | All amounts are tabular numerals; payment method is radio group with labels |
| **Microinteraction** | Payment recorded: success checkmark + toast "Payment recorded"; status badge animates to new state |
| **UX writing** | "Record Payment" (not "Pay"); "Proof of Payment" (not "Receipt Upload"); amounts in PHP with ₱ symbol |

### 7.11 Live Chat Dashboard

| Aspect | Detail |
|---|---|
| **Purpose** | Staff takes over Messenger conversations from bot |
| **User goal** | Respond to patient inquiries in real-time |
| **Primary actions** | Take Chat, Send Message, End Chat |
| **Secondary actions** | View conversation history, search conversations |
| **Layout** | 3-panel: conversation list (left) + chat thread (center) + patient info (right) |
| **Conversation list** | Patient name/PSID, last message preview, status (Bot Active / Staff Taken Over), unread indicator |
| **Chat thread** | Message bubbles (staff right, patient left), timestamp, message input at bottom |
| **Patient info** | Name, appointment history, booking status (if linked) |
| **Takeover** | "Take Chat" button → bot pauses → staff messages go to Messenger → "End Chat" restores bot |
| **Loading** | Skeleton messages |
| **Error** | "Failed to send message" with retry |
| **Empty** | "No active conversations" illustration; "Select a conversation to start" |
| **Accessibility** | Messages are ARIA live region; input has label; send via Enter key |
| **Microinteraction** | New message: slide-in + subtle sound (optional); Take Chat: button morphs to "End Chat" |
| **UX writing** | "Take Chat" (not "Override Bot"); "End Chat" (not "Release Control") |

### 7.12 System Settings

| Aspect | Detail |
|---|---|
| **Purpose** | Admin configures clinic-wide operations |
| **User goal** | Change settings without technical assistance |
| **Layout** | Left tab bar (6 categories) + settings form (right) |
| **Categories** | Clinic, Dentist, Appointment, Messenger, Payment, Security |
| **Save behavior** | "Save Changes" button per category; unsaved changes warning on tab switch |
| **Loading** | Skeleton form |
| **Error** | "Failed to save settings" with retry |
| **Empty** | N/A (all categories have defaults) |
| **Accessibility** | All inputs labeled; tab navigation; save confirmation announced |
| **Microinteraction** | Save: button spinner → success toast "Settings saved"; unsaved changes: tab switch shows confirm dialog |
| **UX writing** | Setting names are plain English ("Maximum advance booking period (days): 30" not "ADVANCE_BOOKING_MAX: 30") |

### 7.13 Dentist Mobile Portal

| Aspect | Detail |
|---|---|
| **Purpose** | Dentists view schedule and declare emergencies on the go |
| **User goal** | Quick access to today's patients and emergency button |
| **Layout** | Mobile-first; bottom tab bar (Schedule, Queue, More) |
| **Schedule tab** | Today's appointments as cards (time, patient, service, status) |
| **Queue tab** | Simplified queue view (name, status, call button) |
| **More tab** | Emergency declaration, patient search, logout |
| **Emergency** | Large red "Declare Emergency" button → form: date range, reason → confirm → system triggers reassignment |
| **Loading** | Skeleton cards |
| **Error** | "Failed to load schedule" with retry |
| **Empty** | "No appointments today" |
| **Accessibility** | 44×44px touch targets; bottom tabs in thumb zone; emergency button is high contrast |
| **Microinteraction** | Emergency button: long-press confirmation (prevents accidental trigger); success: haptic feedback + toast |
| **UX writing** | "Declare Emergency" (not "Activate Unavailability Event"); "I'm unavailable from [time] to [time]" |

### 7.14 QR Self-Registration (Public)

| Aspect | Detail |
|---|---|
| **Purpose** | New patient fills registration form on their phone |
| **User goal** | Complete registration in < 3 minutes |
| **Layout** | Single-column mobile form, progress bar, step navigation |
| **Steps** | 1. Personal (name, birth date, gender) → 2. Contact (phone, email) → 3. Medical (allergies, conditions, medications) → 4. Review & Submit |
| **Validation** | Real-time per field; error below field; step blocked if errors |
| **Loading** | Submit: full-screen spinner with "Registering..." |
| **Error** | Token expired: "This QR code has expired. Please ask the reception desk for a new one." |
| **Error** | Token used: "This QR code has already been used." |
| **Success** | "Registration complete! Please proceed to the reception desk." |
| **Accessibility** | All inputs labeled; error messages associated with fields; keyboard accessible |
| **Microinteraction** | Step advance: slide transition; progress bar animates; success: checkmark animation |
| **UX writing** | "Let's get you registered" (not "Patient Information Form"); "In case of emergency, we need to know about:" (not "Medical History") |
| **Privacy** | Data privacy notice at top of form: "Your information is protected under RA 10173" |

---

## 8. UX Decisions & Heuristics

### 8.1 Nielsen's 10 Heuristics Applied

| Heuristic | Application |
|---|---|
| **Visibility of system status** | Realtime queue updates; booking status badges; toast notifications for all actions; progress bar on registration |
| **Match between system and real world** | FDI dental chart matches what dentists learned in dental school; "Booking" not "Reservation"; "Checkout" not "Transaction Finalization" |
| **User control and freedom** | Cancel actions with confirmation dialogs; undo on recent deletions (archive instead); back buttons on all flows |
| **Consistency and standards** | Same status badge colors everywhere; same button styles; same form patterns; FDI notation throughout |
| **Error prevention** | Status transitions validated before UI allows them; booking conflict detection before approval; QR code single-use enforcement |
| **Recognition over recall** | Icons + labels in sidebar; patient search with autocomplete; recently viewed patients; status badges with icons |
| **Flexibility and efficiency** | Keyboard shortcuts for power users (J/K to navigate queue, A to approve, Enter to call next); quick actions on dashboard |
| **Aesthetic and minimalist design** | No decorative elements in clinical views; whitespace generous; one primary action per screen; calm color palette |
| **Help users recover from errors** | Plain language error messages; retry buttons; no error codes to users; guidance on how to fix |
| **Help and documentation** | Inline tooltips on first use; empty states with guidance; settings have descriptions per field |

### 8.2 Cognitive Psychology Principles

| Principle | Where Applied |
|---|---|
| **Hick's Law** | Max 10 sidebar items; max 4 registration steps; max 5 items in action dropdowns |
| **Fitts's Law** | Full-width sidebar items; 48px height; bottom tab bar on mobile; large "Approve" / "Call Next" buttons |
| **Miller's Law** | 3 bottom tabs on mobile; 4 registration steps; 6 settings categories (chunked) |
| **Jakob's Law** | Sidebar nav (like Gmail/Slack); tabbed patient detail (like browser tabs); bottom tabs (like iOS/Android apps) |
| **Progressive Disclosure** | Registration in 4 steps; settings in tabs; advanced options in expandable sections |
| **Recognition over Recall** | Status badges with icons + text; recent patients list; dentist avatars in queue |
| **Peak-End Rule** | Registration success screen with delightful checkmark; billing success with "Payment recorded" toast |
| **Goal Gradient Effect** | Progress bar on registration; queue position indicator; checkout step indicator |
| **Cognitive Load Reduction** | One primary action per screen; related information grouped; complex forms split into steps |

---

## 9. UI Design Direction

### Visual Identity

- **Aesthetic:** Clinical calm — inspired by Linear, Stripe, and Headspace's approach to professional tools that feel human
- **Mood:** Trustworthy, competent, efficient, calm
- **Avoid:** Playful illustrations in clinical contexts, aggressive reds, cluttered data displays, dark mode as default (medical staff prefer light mode for accuracy)

### Color Philosophy

- **Primary blue** as the single saturated chrome color — conveys trust and professionalism (healthcare standard)
- **Warm neutrals** (not blue-grey) for backgrounds — reduces eye fatigue during 8+ hour shifts
- **Pastel semantic colors** for status indicators — identifiable at a glance without causing visual fatigue
- **Saturated colors reserved** for icons, accent rails (2-3px), and destructive buttons only — never for large fills

### Typography Philosophy

- **Inter** as primary font — designed for screens, excellent legibility, tabular numerals for clinical data
- **Minimum 16px body text** — WCAG 2.2 compliance, reduces squinting
- **Tabular numerals** for all amounts, times, FDI tooth numbers — prevents misreading
- **Clear hierarchy** — size + weight, not color alone, for emphasis

### Layout Philosophy

- **Generous whitespace** between sections, denser within cards — content breathes
- **Adjustable density** — comfortable for forms/reading, compact for dense clinical surfaces (dental chart, calendar, treatment lists)
- **Vertical rhythm** — consistent spacing scale throughout
- **Responsive breakpoints** — desktop (1280px+), tablet (768px+), mobile (375px+)

---

## 10. Design System

### 10.1 Color System

**Primary (Blue — Trust & Professionalism):**

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | #2563EB | Primary buttons, active states, links |
| `--color-primary-hover` | #1D4ED8 | Button hover |
| `--color-primary-light` | #DBEAFE | Selected row background, subtle highlights |
| `--color-primary-accent` | #1E40AF | Icons, accent rails |

**Neutrals (Warm — Reduced Fatigue):**

| Token | Hex | Usage |
|---|---|---|
| `--color-surface` | #FFFFFF | Card backgrounds, main content |
| `--color-surface-sunken` | #F9FAFB | Input backgrounds, secondary surfaces |
| `--color-border` | #E5E7EB | Borders, dividers |
| `--color-text` | #111827 | Primary text |
| `--color-text-secondary` | #4B5563 | Secondary text, labels |
| `--color-text-subtle` | #9CA3AF | Placeholder, captions |
| `--color-text-on-primary` | #FFFFFF | Text on primary color |

**Semantic (Pastel Pattern — Calm but Identifiable):**

| Token | Background | Text | Accent | Usage |
|---|---|---|---|---|
| `--color-success` | #DCFCE7 | #166534 | #16A34A | Paid status, completed, success toasts |
| `--color-warning` | #FEF3C7 | #92400E | #F59E0B | Pending, delayed, expiring |
| `--color-danger` | #FEE2E2 | #991B1B | #DC2626 | Declined, failed, no-show, destructive |
| `--color-info` | #DBEAFE | #1E40AF | #3B82F6 | Info toasts, notifications |
| `--color-purple` | #EDE9FE | #5B21B6 | #8B5CF6 | In Consultation status |
| `--color-teal` | #CCFBF1 | #115E59 | #14B8A6 | Checkout status, consent signed |

**Dental Chart Tooth States:**

| State | Color | Hex |
|---|---|---|
| Healthy | White/neutral | #FFFFFF with #E5E7EB border |
| Caries | Red fill | #FEE2E2 with #DC2626 border |
| Filled | Blue fill | #DBEAFE with #2563EB border |
| Crown | Gold fill | #FEF3C7 with #F59E0B border |
| Missing | Grey (dashed outline) | #F3F4F6 with #9CA3AF dashed border |
| Implant | Purple fill | #EDE9FE with #8B5CF6 border |
| Root Canal | Dark blue fill | #1E3A8A |
| Bridge | Teal fill | #CCFBF1 with #14B8A6 border |
| Extraction Needed | Red (diagonal stripes) | #FEE2E2 with #DC2626 diagonal pattern |

### 10.2 Typography

| Element | Font | Size | Weight | Line Height | Usage |
|---|---|---|---|---|---|
| Display | Inter | 30px | 700 | 1.2 | Dashboard greeting, page titles |
| H1 | Inter | 24px | 700 | 1.3 | Section headers |
| H2 | Inter | 20px | 600 | 1.4 | Card headers, modal titles |
| H3 | Inter | 18px | 600 | 1.4 | Subsection headers |
| Body | Inter | 16px | 400 | 1.5 | Default text, form labels |
| Body Small | Inter | 14px | 400 | 1.5 | Table cells, secondary info |
| Caption | Inter | 12px | 400 | 1.4 | Timestamps, helper text |
| Label | Inter | 14px | 500 | 1.4 | Form labels, button text |
| Tabular | Inter (tabular-nums) | varies | varies | varies | Amounts, times, FDI numbers |

**Font features:** `cv11` (distinguishable 1/l/I), `tnum` (tabular numerals for all clinical data)

### 10.3 Spacing Scale

| Token | Value | Usage |
|---|---|---|
| `--space-0` | 0px | No spacing |
| `--space-1` | 4px | Inline icon-text gap, tight element spacing |
| `--space-2` | 8px | Form field error text gap, compact list item padding |
| `--space-3` | 12px | Card internal padding (compact mode) |
| `--space-4` | 16px | Default element spacing, card internal padding (comfortable) |
| `--space-5` | 20px | Card header padding (comfortable) |
| `--space-6` | 24px | Section spacing within a page |
| `--space-8` | 32px | Between cards/sections on a page |
| `--space-10` | 40px | Page edge padding (desktop) |
| `--space-12` | 48px | Major section breaks |

### 10.4 Grid & Layout

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | 375px – 767px | Single column, 16px page padding |
| Tablet | 768px – 1279px | 2-column where needed, 24px page padding |
| Desktop | 1280px+ | Sidebar (240px) + content (max 1200px), 32px page padding |

**Grid:** 12-column grid on desktop, 4-column on tablet, single column on mobile

### 10.5 Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 6px | Badges, chips, small elements |
| `--radius-md` | 8px | Inputs, buttons |
| `--radius-lg` | 12px | Cards, modals |
| `--radius-xl` | 16px | Large cards, panels |
| `--radius-full` | 9999px | Avatars, pills, status dots |

### 10.6 Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-xs` | 0 1px 2px rgba(0,0,0,0.05) | Subtle elevation (badges) |
| `--shadow-sm` | 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06) | Cards, dropdowns |
| `--shadow-md` | 0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06) | Modals, popovers |
| `--shadow-lg` | 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05) | Floating panels, toasts |

### 10.7 Component Specifications

**Buttons:**

| Variant | Background | Text | Border | Height | Padding | Radius |
|---|---|---|---|---|---|---|
| Primary | `--color-primary` | White | None | 40px | 16px 24px | 8px |
| Primary Hover | `--color-primary-hover` | White | None | 40px | 16px 24px | 8px |
| Secondary | Transparent | `--color-text` | `--color-border` | 40px | 16px 24px | 8px |
| Destructive | `--color-danger` | White | None | 40px | 16px 24px | 8px |
| Ghost | Transparent | `--color-primary` | None | 40px | 16px 24px | 8px |
| Icon | Transparent | `--color-text-secondary` | None | 40px | 10px | 8px |

**Button states:** Default → Hover (bg change) → Focus (2px ring `--color-primary`) → Active (scale 0.98) → Disabled (50% opacity, no pointer)

**Inputs:**

| Property | Value |
|---|---|
| Height | 40px (default), 48px (mobile) |
| Background | `--color-surface-sunken` |
| Border | 1px solid `--color-border` |
| Focus border | 1px solid `--color-primary` + 2px ring |
| Placeholder | `--color-text-subtle` |
| Label | 14px, 500 weight, above input, 6px gap |
| Error text | 12px, `--color-danger`, below input, 4px gap |
| Required marker | Red dot `•` after label (not asterisk) |

**Cards:**

| Property | Value |
|---|---|
| Background | `--color-surface` |
| Border | 1px solid `--color-border` |
| Radius | `--radius-lg` (12px) |
| Shadow | `--shadow-sm` |
| Padding (comfortable) | 16px / 20px |
| Padding (compact) | 10px / 14px |
| Header | No divider unless needed; rely on weight/size hierarchy |

**Status Badges:**

| Pattern | Implementation |
|---|---|
| Background | Semantic pastel background (e.g., `--color-success` bg #DCFCE7) |
| Text | Semantic text color (e.g., #166534) |
| Radius | `--radius-sm` (6px) |
| Padding | 4px 10px |
| Font | 12px, 500 weight |
| Icon | Optional leading icon in accent color |
| Accent rail | 2-3px left border in accent color for emphasis |

**Toasts:**

| Type | Background | Icon | Duration |
|---|---|---|---|
| Success | `--color-success` bg | CheckCircle (green accent) | 4 seconds |
| Error | `--color-danger` bg | XCircle (red accent) | 6 seconds |
| Info | `--color-info` bg | Info (blue accent) | 4 seconds |
| Warning | `--color-warning` bg | AlertTriangle (amber accent) | 5 seconds |

**Position:** Bottom-right on desktop, top-center on mobile. Auto-dismiss with manual close button.

**Tables:**

| Property | Value |
|---|---|
| Header | 14px, 500 weight, `--color-text-secondary`, no background |
| Row height | 48px (comfortable), 40px (compact) |
| Row hover | `--color-surface-sunken` |
| Row selected | `--color-primary-light` |
| Border | Bottom only, `--color-border`, 1px |
| Cell padding | 12px 16px (comfortable), 8px 12px (compact) |

**Empty States:**

| Element | Specification |
|---|---|
| Illustration | Simple line illustration (not photographic), 120×120px, `--color-text-subtle` |
| Title | 18px, 600 weight, `--color-text` |
| Description | 14px, 400 weight, `--color-text-secondary` |
| CTA | Secondary button if action available |

**Skeleton Loaders:**

| Element | Specification |
|---|---|
| Background | `--color-surface-sunken` |
| Animation | Shimmer (left-to-right gradient sweep), 1.5s loop |
| Shape | Match component shape (card, row, text line) |
| `prefers-reduced-motion` | Static grey, no animation |

**Dialogs (Modals):**

| Property | Value |
|---|---|
| Background | `--color-surface` |
| Radius | `--radius-lg` (12px) |
| Shadow | `--shadow-md` |
| Max width | 480px (confirm), 640px (form), 800px (detail) |
| Padding | 24px |
| Overlay | rgba(0,0,0,0.4) with backdrop-blur(4px) |
| Close | X button top-right, Esc key, click overlay |

**Bottom Sheets (Mobile):**

| Property | Value |
|---|---|
| Background | `--color-surface` |
| Radius | `--radius-xl` top-left and top-right only |
| Shadow | `--shadow-lg` |
| Max height | 80% viewport |
| Drag handle | 36×4px pill at top center, `--color-border` |
| Dismiss | Swipe down, tap overlay |

---

## 11. Accessibility Review

### WCAG 2.2 AA Compliance

| Criterion | Implementation |
|---|---|
| **1.4.3 Contrast (Minimum)** | All text meets 4.5:1 ratio (normal text) or 3:1 (large text); semantic pastel badges tested for contrast |
| **1.4.4 Resize Text** | Layout remains usable at 200% zoom; no fixed pixel layouts |
| **1.4.11 Non-text Contrast** | UI components (buttons, inputs, borders) meet 3:1 contrast against adjacent colors |
| **1.4.13 Content on Hover or Focus** | Tooltips dismissable, hoverable, persistent |
| **2.1.1 Keyboard** | All interactive elements keyboard accessible; visible focus indicators (2px ring) |
| **2.1.2 No Keyboard Trap** | Modals close with Esc; focus returns to trigger element |
| **2.4.3 Focus Order** | Logical tab order follows visual order; left-to-right, top-to-bottom |
| **2.4.7 Focus Visible** | 2px ring in `--color-primary` on all focusable elements |
| **2.5.5 Target Size (Enhanced)** | All touch targets ≥ 44×44px (mobile and tablet) |
| **3.2.1 On Focus** | No context change on focus alone; only on explicit action |
| **3.2.3 Consistent Navigation** | Sidebar consistent across all dashboard pages; same position, same order |
| **3.3.1 Error Identification** | Errors clearly identified per field with text description (not color alone) |
| **3.3.2 Labels or Instructions** | All form fields have visible labels; required fields marked |
| **3.3.3 Error Suggestion** | Error messages include fix suggestions (e.g., "Phone number must be 11 digits starting with 09") |
| **4.1.2 Name, Role, Value** | All components have ARIA labels, roles, and states |
| **4.1.3 Status Messages** | Toasts and status updates use ARIA live regions |

### Additional Accessibility Practices

- **Color is never the only indicator:** Status badges always include text + icon, not just color
- **Screen reader compatibility:** All content readable via NVDA/VoiceOver; ARIA labels on icon-only buttons
- **Motion reduction:** `@media (prefers-reduced-motion: reduce)` disables all non-essential animations
- **Dental chart accessibility:** Each tooth is a `<button>` with descriptive ARIA label: "Tooth 11, upper right central incisor, state: healthy"
- **Signature pad alternative:** "Type your full name instead" option for patients who cannot sign with stylus

---

## 12. Microinteractions

| Interaction | Trigger | Animation | Duration | Purpose |
|---|---|---|---|---|
| Button press | Click/tap | Scale to 0.98 | 100ms | Tactile feedback |
| Approve booking | Click Approve | Green checkmark appears in button → toast slides in | 300ms + 4s toast | Success confirmation |
| Decline booking | Click Decline | Button shakes briefly on error | 200ms shake | Error feedback |
| Queue update | Realtime event | New card slides in from top; status badge color transition | 300ms slide, 200ms color | Real-time awareness |
| Call Next Patient | Click Call Next | Patient card slides up and fades out; next card highlights | 300ms | Queue progression |
| Tab switch | Click tab | Content fade-in | 150ms | Smooth transition |
| Toast notification | Action complete | Slide in from bottom-right (desktop) / top-center (mobile) | 200ms slide, 4-6s display, 200ms slide out | Non-intrusive feedback |
| Modal open | Trigger action | Fade in overlay + scale up modal from 0.95 | 200ms | Focus attention |
| Modal close | Esc / overlay click / X | Scale down to 0.95 + fade out | 150ms | Dismissal |
| Skeleton loader | Page load | Shimmer sweep left-to-right | 1.5s loop | Loading indication |
| Dental chart tooth hover | Mouse over tooth | Scale 1.1 + tooltip with FDI number | 100ms scale, instant tooltip | Identification |
| Dental chart state change | Select new state | Color transition on tooth | 200ms | Visual feedback |
| Signature pad draw | Stylus/touch on canvas | Real-time ink rendering | Instant | Natural signing |
| Registration step advance | Click Next | Slide transition to next step | 250ms | Progress perception |
| Progress bar update | Step change | Width animates to new percentage | 300ms | Goal gradient |
| Emergency button (mobile) | Long-press (1.5s) | Progress ring fills → haptic feedback | 1.5s | Prevent accidental trigger |
| Toggle (switch) | Click | Knob slides; background color transitions | 200ms | State change |
| Search results | Typing (debounced 300ms) | Results fade in | 150ms | Responsive feel |
| Payment recorded | Click Record Payment | Checkmark in button → status badge animates → toast | 300ms + 4s toast | Success confirmation |
| Settings saved | Click Save | Button spinner → success toast "Settings saved" | Spinner until resolved + 4s toast | Confirmation |

---

## 13. Motion Design

### Motion Principles

1. **Motion is meaningful or absent** — no decorative animation; every transition serves a purpose
2. **Duration ≤ 200ms** for most transitions; ≤ 300ms for page-level changes
3. **Easing:** `ease-out` for entrances (decelerate into rest), `ease-in` for exits (accelerate away)
4. **Respect `prefers-reduced-motion`** — disable all non-essential animations
5. **No parallax** — causes motion sickness in some users
6. **No auto-scroll** — disorienting; let users control scrolling

### Page Transitions

| Transition | Method | Duration |
|---|---|---|
| Route change (App Router) | Fade content area | 150ms |
| Modal open | Overlay fade + modal scale 0.95→1 | 200ms |
| Modal close | Modal scale 1→0.95 + overlay fade | 150ms |
| Bottom sheet open | Slide up from bottom | 250ms |
| Bottom sheet close | Slide down | 200ms |
| Tab content switch | Fade in new content | 150ms |
| List item add | Slide in from top | 300ms |
| List item remove | Slide up + fade out | 300ms |

### Realtime Animations

| Event | Animation |
|---|---|
| New booking appears on dashboard | Card slides in from top with subtle blue highlight that fades over 2s |
| Queue status change | Badge color transition (200ms); card subtle pulse if priority increased |
| New chat message | Message bubble slides in from bottom (150ms) |
| Slot released | Calendar cell color transition to "available" (200ms) |

---

## 14. Edge Cases

### 14.1 Network & Connectivity

| Scenario | UX Response |
|---|---|
| Network drops during booking approval | Show toast "Connection lost. Retrying..." with spinner; queue action for when connection returns; do NOT lose form data |
| Realtime disconnects | Show subtle "Live updates paused" indicator; fall back to polling (React Query refetch every 10s); reconnect automatically |
| Slow connection (3G) | Skeleton loaders instead of spinners; lazy load non-critical content; defer image loading |
| Complete offline | Show offline banner; cache last viewed data; disable write actions with "You're offline" toast |

### 14.2 Data Edge Cases

| Scenario | UX Response |
|---|---|
| Patient with no appointment history | "No previous visits" empty state in history tab; "Start first consultation" CTA |
| Appointment with no linked patient (walk-in not yet registered) | Show "Unregistered" badge; "Register Patient" CTA in appointment detail |
| Invoice with zero amount | Allow but show confirmation: "Invoice total is ₱0.00. Continue?" |
| Multiple partial payments | Show payment timeline in invoice detail; running balance display |
| Consent declined by patient | Show "Consent Declined" state; block treatment actions; "Record reason" optional field; notify dentist |
| Dentist with no schedule configured | Show "Schedule not configured" warning in appointment creation; link to settings |
| All dentists unavailable | Show "No dentists available" in booking; suggest next available date |
| QR code expired before form submitted | Show "QR code expired" error; "Ask reception for a new code" guidance; do NOT lose entered data if possible |

### 14.3 User Error Scenarios

| Scenario | UX Response |
|---|---|
| Staff approves booking for wrong dentist | Allow reassignment with confirmation dialog; log change in audit trail |
| Duplicate patient registration | Detect on submit (name + phone match); show "This patient may already exist: [Name], registered [date]. Use existing record?" |
| Payment amount exceeds invoice total | Show error: "Payment amount exceeds remaining balance of ₱[X]" |
| Booking for past date | Disable past dates in date picker; if somehow submitted, show "Cannot book for a past date" |
| Treatment paused but never resumed | Show "Treatment Paused since [date]" in appointment detail; "Resume Treatment" CTA |

### 14.4 Device Edge Cases

| Scenario | UX Response |
|---|---|
| Tablet rotated during consent signing | Signature preserved; layout adapts to orientation; wider signature area in landscape |
| Mobile browser back button | Navigate to previous screen; warn if unsaved changes |
| Very small screen (< 375px) | Horizontal scroll prevented; content stacks vertically; text wraps |
| High DPI display | SVG icons scale crisply; dental chart renders at device resolution |
| Touch vs mouse | Both supported; hover states have touch equivalents (long-press for tooltips) |

---

## 15. Developer Notes

### Component Implementation Guidelines

- **shadcn/ui as base:** All primitives (Button, Input, Dialog, Toast, etc.) use shadcn/ui; customize via Tailwind classes and CSS variables
- **CSS variables:** All design tokens defined as CSS custom properties in `globals.css`; consumed via Tailwind config
- **Tailwind config:** Map design tokens to Tailwind theme extensions (colors, spacing, radius, shadows)
- **Responsive:** Use Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`) — mobile-first approach
- **Dark mode:** Not in scope for MVP; design tokens are light-mode only; future enhancement
- **Density mode:** Implement via `data-density="comfortable|compact"` attribute on `<html>`; Tailwind variant adjusts padding/spacing

### Performance Considerations

- **React.memo()** on: queue items, booking cards, chat messages, dental chart teeth, table rows
- **Virtualization** on: patient list (>100 items), appointment calendar (>50 items), audit log (>200 items)
- **Lazy loading:** Dental chart component (heavy SVG), live chat panel, settings tabs
- **Image optimization:** Next.js `<Image>` for all static assets; R2 images loaded via signed URL with `loading="lazy"`
- **Bundle size:** Code-split per route group; dental chart and signature pad in separate chunks

### Realtime Implementation

- **Supabase Realtime** channels with automatic reconnection
- **Cleanup:** All subscriptions cleaned up on component unmount (`useRealtimeSubscription` hook handles this)
- **Fallback:** If Realtime disconnects for > 5s, switch to polling (React Query `refetchInterval: 10000`)
- **Status indicator:** Subtle "Live" badge in header when connected; "Reconnecting..." when not

### Dental Chart Implementation

- **SVG-based:** Each tooth is an SVG path with unique ID; clickable button overlay for accessibility
- **FDI notation:** Tooth IDs use FDI two-digit system (11–48 for permanent, 51–85 for deciduous)
- **State storage:** Tooth states stored in `treatment_records.dental_chart` as JSONB: `{"11": "caries", "16": "filled", "37": "missing"}`
- **Tooth shapes:** Use standard dental chart SVG paths (upper/lower arch, adult/deciduous)
- **Touch support:** Teeth are large enough for touch (min 32×32px on tablet)

### Signature Pad Implementation

- **Library:** `react-signature-canvas`
- **Canvas size:** Full width × 200px height (landscape tablet)
- **Pen style:** 2px black round brush
- **Export:** PNG data URL → upload to Cloudflare R2 → save URL to `consent_forms.signature_image_url`
- **Clear button:** "Clear Signature" text button below canvas
- **Alternative:** "Type your name instead" toggle → renders typed name in cursive font as image

---

## 16. Future Improvements

### Short-term (Next Sprint)
- **Dark mode:** Full dark theme with warm neutral palette
- **Keyboard shortcuts overlay:** Press `?` to show all shortcuts
- **Appointment drag-and-drop:** Reschedule by dragging appointment to new slot on calendar
- **Bulk booking actions:** Select multiple pending bookings → approve all
- **Print invoice:** Generate PDF invoice for patient

### Medium-term (Next Quarter)
- **Analytics dashboard:** No-show rates, booking conversion, revenue trends, dentist utilization
- **Patient portal (web):** Self-service booking, appointment history, invoice download
- **SMS notifications:** Fallback for patients without Messenger
- **Multi-branch support:** Branch selector, cross-branch dentist scheduling
- **Treatment plan templates:** Pre-defined treatment plans for common procedures

### Long-term (Future)
- **AI-powered scheduling:** Optimize appointment slots based on historical data
- **Dental chart AI:** Photo upload → AI suggests tooth conditions
- **Insurance integration:** Real-time eligibility checks
- **Telemedicine:** Video consultation for follow-ups
- **Patient mobile app:** Native iOS/Android app with push notifications

---

## 17. UX Audit & Recommendations

### Known UX Risks

| Risk | Severity | Recommendation |
|---|---|---|
| Messenger messaging window limits may prevent notifications | High | Always show fallback staff notification on dashboard; never rely solely on Messenger delivery |
| QR code 5-min expiry may be too short for slow phone users | Medium | Make configurable in settings; show countdown timer to staff so they can regenerate proactively |
| Dental chart on small tablet screens may be hard to tap individual teeth | Medium | Implement pinch-to-zoom on dental chart; minimum 32px touch target per tooth |
| Consent text may be too long for tablet scrolling | Low | Use collapsible sections; "Read all" expand; require scroll-to-bottom before enabling sign button |
| Live chat takeover may confuse patients (sudden tone change from bot to human) | Low | System sends auto-message: "You're now chatting with [staff name] from [clinic name]" |

### UX Improvements Over Current PRD

| Area | Current | Recommendation | Rationale |
|---|---|---|---|
| Booking approval | Staff manually checks dentist availability | Auto-suggest available dentist + time slot on booking detail | Reduces approval time from 30s to 5s |
| Queue ordering | Staff manually calls next | Auto-highlight next patient with pulse animation | Reduces cognitive load; prevents skipping |
| Registration form | All fields on one form | 4-step wizard with progress bar | Reduces abandonment; 3-min target achievable |
| Billing | Manual invoice generation | Auto-generate invoice when treatment marked complete | Reduces checkout time; prevents missed billing |
| Dental chart | Static chart per visit | Show diff from last visit (highlighted changes) | Dentist sees what changed since last visit at a glance |

### Design System Governance

- **Single source of truth:** All tokens in `globals.css` as CSS variables; Tailwind config maps to these
- **Component library:** shadcn/ui components customized with design tokens; no raw Tailwind utility classes in components beyond layout
- **Storybook (future):** Document all components with variants, states, and accessibility annotations
- **Design review:** All new UI components reviewed against this document before implementation

---

## References

- [PRD — Product Requirements Document](./PRD.md)
- [Architecture Document](./ARCHITECTURE.md)
- [Security Document](./SECURITY.md)
- [FR/NFR Specification](./fr_nfr.md)
- [FDI World Dental Federation Notation (ISO 3950)](https://en.wikipedia.org/wiki/FDI_World_Dental_Federation_notation)
- [PDA Dental Chart](https://pda.com.ph/wp-content/uploads/2022/10/PDA-Dental-Chart.pdf)
- [Philippine Data Privacy Act (RA 10173)](https://www.privacy.gov.ph/data-privacy-act/)
- [Electronic Commerce Act (RA 8792)](https://www.gppb.gov.ph/wp-content/uploads/2023/06/Republic-Act-No.-8792.pdf)
- [WCAG 2.2 Guidelines](https://www.w3.org/TR/WCAG22/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design 3](https://m3.material.io/)
- [Nielsen Norman Group — 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/docs)
- [Inter Font](https://rsms.me/inter/)
- [react-signature-canvas](https://www.npmjs.com/package/react-signature-canvas)
- [qrcode.react](https://www.npmjs.com/package/qrcode.react)
- [Calendar.js](https://calendarjs.com/)
- [Baymard Institute — UX Research](https://baymard.com/)
- [Linear Design Approach](https://linear.app/blog/scaling-design)
