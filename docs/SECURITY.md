# Security Document
## Dental Clinic Management System — Messenger Booking & Patient Visit Workflow

> **Reference:** Expands on security sections from the [PRD §8](./PRD.md) and [Architecture §7](./ARCHITECTURE.md). All requirements originate from the [FR/NFR specification](./fr_nfr.md) (NFR-11 through NFR-18, NFR-54 through NFR-58).

---

## Table of Contents

1. [Security Overview](#1-security-overview)
2. [Threat Model (STRIDE)](#2-threat-model-stride)
3. [Authentication & Session Management](#3-authentication--session-management)
4. [Authorization & Access Control (RBAC)](#4-authorization--access-control-rbac)
5. [Frontend Security](#5-frontend-security)
6. [Backend Security](#6-backend-security)
7. [Database Security](#7-database-security)
8. [File Storage Security (Cloudflare R2)](#8-file-storage-security-cloudflare-r2)
9. [Messenger Integration Security](#9-messenger-integration-security)
10. [QR Code Security](#10-qr-code-security)
11. [Audit Logging & Immutable Trail](#11-audit-logging--immutable-trail)
12. [Data Privacy & Compliance](#12-data-privacy--compliance)
13. [Secrets Management](#13-secrets-management)
14. [Security Headers Configuration](#14-security-headers-configuration)
15. [Rate Limiting & DDoS Mitigation](#15-rate-limiting--ddos-mitigation)
16. [Secure Development Lifecycle (SDLC)](#16-secure-development-lifecycle-sdlc)
17. [Incident Response Plan](#17-incident-response-plan)
18. [Security Audit & Review Process](#18-security-audit--review-process)
19. [Security Checklist](#19-security-checklist)

---

## 1. Security Overview

This system handles **sensitive patient health data** (PHI — Protected Health Information) including medical histories, dental records, treatment notes, consent forms, and billing information. Security is engineered at every layer following a **defense-in-depth** strategy with **five concentric layers**: Network, Application, Authentication/Authorization, Database, and Data Protection.

### Security Principles

| Principle | Implementation |
|---|---|
| **Least Privilege** | Every role (admin, reception, dentist, patient) receives only the minimum access required. RLS policies enforce this at the database level. |
| **Defense-in-Depth** | Security controls at network, application, auth, database, and data layers — a breach at one layer is contained by the next. |
| **Fail Secure** | On error, systems deny access rather than grant it. Failed validations return errors, not partial data. |
| **Complete Mediation** | Every request is authenticated and authorized — no implicit trust between client and server. |
| **Economy of Mechanism** | Keep security controls simple and verifiable (KISS principle applied to security). |
| **Open Design** | Security does not depend on secrecy of implementation — only on secrets (keys, tokens) managed via environment variables. |
| **Separation of Duties** | Admin functions (settings, audit log access) are separated from operational functions (booking, billing). |

### Regulatory Context

- **Philippine Data Privacy Act of 2012 (RA 10173)** — Governs collection, processing, storage, and protection of patient personal and medical information
- **NPC (National Privacy Commission) guidelines** — Implementing rules and regulations for RA 10173
- Patient data is classified as **sensitive personal information** under Philippine law

---

## 2. Threat Model (STRIDE)

Threat modeling uses the **STRIDE** methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) applied to each system component.

### 2.1 System Components & Trust Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                    UNTRUSTED ZONE                            │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Patient  │  │ Patient  │  │ Dentist  │  │ Facebook  │  │
│  │ (Messeng │  │ (QR Self │  │ (Mobile  │  │ Messenger │  │
│  │  er)     │  │  -Reg)   │  │  Portal) │  │ Platform  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │
│       │             │             │               │        │
└───────┼─────────────┼─────────────┼───────────────┼────────┘
        │             │             │               │
========│=============│=============│===============│========== TRUST BOUNDARY
        │             │             │               │
┌───────┼─────────────┼─────────────┼───────────────┼────────┐
│       │   SEMI-TRUSTED ZONE (Authenticated)       │        │
│       ▼             ▼             ▼               ▼        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Vercel Edge Network (CDN)               │  │
│  │         Rate Limiting + WAF + TLS Termination        │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         │                                  │
│  ┌──────────────────────┴───────────────────────────────┐  │
│  │              Next.js Application                     │  │
│  │    (Server Actions, Route Handlers, Middleware)      │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         │                                  │
└─────────────────────────┼──────────────────────────────────┘
                          │
==========================│===================================== TRUST BOUNDARY
                          │
┌─────────────────────────┼──────────────────────────────────┐
│                    TRUSTED ZONE (Backend)                   │
│                         │                                  │
│  ┌──────────────────────┴───────────────────────────────┐  │
│  │              Supabase                                 │  │
│  │  ┌─────────┐  ┌──────────┐  ┌───────────────────┐   │  │
│  │  │  Auth   │  │  Edge    │  │  PostgreSQL       │   │  │
│  │  │  (JWT)  │  │ Functions│  │  (RLS + Triggers) │   │  │
│  │  └─────────┘  └──────────┘  └───────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Cloudflare R2 (Private Bucket, Signed URLs)         │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### 2.2 STRIDE Threat Analysis

#### Spoofing (Impersonating a user or system)

| Threat | Vector | Mitigation |
|---|---|---|
| Staff credential theft | Phishing, brute force | Supabase Auth with bcrypt password hashing; configurable password policy (min length, complexity, expiration); rate limiting on login (10/min per IP); session timeout |
| JWT token theft | XSS, MITM | HTTP-only cookies (not accessible via JS); Secure flag; SameSite=Strict; short-lived access tokens (15 min); TLS in transit |
| Messenger webhook spoofing | Fake POST to `/api/webhooks/messenger` | X-Hub-Signature-256 HMAC-SHA256 verification using `MESSENGER_APP_SECRET`; reject if signature invalid |
| QR code token replay | Reusing expired/used QR token | Server-side atomic invalidation: `UPDATE qr_codes SET is_used = true WHERE is_used = false AND expires_at > now()`; single-use enforcement |
| Service role key exposure | Accidental commit, client bundle leak | `SUPABASE_SERVICE_ROLE_KEY` is server-only — never prefixed with `NEXT_PUBLIC_`; Vercel env vars injected at runtime; `.env.local` in `.gitignore` |

#### Tampering (Modifying data or code)

| Threat | Vector | Mitigation |
|---|---|---|
| Appointment status manipulation | Direct API call with invalid status transition | Database trigger `appointment_status_validate` rejects invalid transitions; Server Actions validate before writing |
| Treatment record alteration | Unauthorized edit of clinical notes | RLS policy: dentists can only update own appointments; `updated_at` optimistic concurrency control detects conflicts (NFR-25) |
| Consent form tampering | Modifying signed consent after the fact | Consent forms are INSERT-only via RLS (no UPDATE/DELETE); `consent_version` + `signed_at` + `signature_image_url` are immutable once written; template changes don't alter past consents (FR-56) |
| Audit log modification | Admin or attacker deleting logs | `audit_logs` table: RLS denies UPDATE/DELETE for ALL users including admins; only service role can INSERT via triggers; trigger-based insertion prevents bypassing |
| Double-booking via race condition | Concurrent booking approvals | Pessimistic locking: `SELECT ... FOR UPDATE` on dentist schedule row within transaction (NFR-24) |
| Webhook payload tampering | MITM on Messenger webhook | HMAC-SHA256 signature verification; TLS; reject unsigned requests |

#### Repudiation (Denying an action was performed)

| Threat | Vector | Mitigation |
|---|---|---|
| Staff denies booking approval | No record of who approved | `audit_logs` records `user_id`, `action`, `entity_type`, `entity_id`, `timestamp` for every booking decision (FR-130) |
| Dentist denies treatment documentation | No record of who edited | `treatment_records` linked to `appointment_id` → `dentist_id`; `appointment_history` records `changed_by` for every field change |
| Staff denies reassignment decision | No record of who reassigned | `reassignment_logs` records `original_dentist_id`, `new_dentist_id`, `staff_id`, `reason`, `created_at` (FR-164) |
| System denies notification sent | No proof of delivery | `audit_logs` records system events including reminders sent, notification attempts, and fallback staff notifications (FR-131) |

#### Information Disclosure (Exposing data to unauthorized parties)

| Threat | Vector | Mitigation |
|---|---|---|
| Patient data exposure to wrong role | Dentist sees billing, reception sees treatment | RLS policies enforce role-based row filtering; Server Actions check role before returning data |
| Patient record in search results | Unauthorized search | RLS on `patients` table: all authenticated staff can read, but only non-archived; archived records require admin role |
| Error message leaks internals | Stack trace in error response | Next.js error boundary returns generic error to client; detailed errors logged server-side only; `NODE_ENV=production` in deployment |
| R2 file URL guessed | Predictable URL pattern | R2 bucket is private; file keys use UUIDs + timestamps (not predictable); access via signed URLs with short expiration (15 min) |
| Messenger conversation leak | Non-staff sees chat | RLS on `messenger_conversations` and `messenger_messages`: reception staff + admins only |
| Realtime subscription data leak | Client subscribes to unauthorized channel | Supabase Realtime respects RLS policies; client must be authenticated; channel filters include `dentist_id` / `conversation_id` scoping |

#### Denial of Service (Disrupting service availability)

| Threat | Vector | Mitigation |
|---|---|---|
| Login brute force | Repeated credential attempts | Rate limiting: 10 login attempts/min per IP (Supabase Auth built-in); account lockout after configurable failed attempts |
| QR code endpoint flooding | Repeated token validation requests | Rate limiting: 10 requests/min per IP (Vercel Edge Middleware) |
| Registration form spam | Automated form submissions | Rate limiting: 5 submissions/min per IP; Zod validation rejects malformed data; honeypot field (hidden from users) |
| Messenger webhook flood | Fake or high-volume webhook POSTs | Facebook-managed rate limiting at platform level; HMAC signature verification rejects non-Facebook requests; Edge Function processes asynchronously |
| Database query overload | Complex unbounded queries | Supabase PostgREST enforces query limits (configurable max rows); pagination on all list endpoints; indexes on frequently queried columns |
| Realtime subscription flood | Excessive WebSocket connections | Supabase manages connection limits; client cleans up subscriptions on unmount; max 1 subscription per channel per client |

#### Elevation of Privilege (Gaining unauthorized access levels)

| Threat | Vector | Mitigation |
|---|---|---|
| Role manipulation via API | Client sends role=admin in request | Role is stored in `users` table (server-side); never accepted from client input; RLS policies use `auth.jwt() ->> 'role'` for authorization |
| Direct table access bypassing RLS | Attacker uses service role key | `SUPABASE_SERVICE_ROLE_KEY` is server-only (never in client bundle); Edge Functions use anon key + auth context, not service role |
| IDOR on patient records | `/patients/{id}` with guessed ID | RLS policy: all authenticated staff can read, but Server Actions verify the requesting user's role and the resource context; audit log records every access |
| IDOR on appointments | `/appointments/{id}` with guessed ID | Same RLS + Server Action role check pattern; dentists can only access own appointments via RLS filter `dentist_id = auth.uid()` |
| Privilege escalation via Edge Function | Edge Function runs with elevated privileges | Edge Functions use anon key with user's JWT context; service role key used only for system-level operations (cron, webhooks) with explicit role checks |

---

## 3. Authentication & Session Management

### 3.1 Authentication Architecture

```
┌────────┐    1. POST credentials (email, password)    ┌──────────────────┐
│ Client │────────────────────────────────────────────→│ Supabase Auth    │
│        │                                              │                  │
│        │    2. Verify password (bcrypt)               │  - Rate limit    │
│        │       Check password policy                  │    check (10/min) │
│        │       Check account status                   │  - bcrypt verify │
│        │                                              │  - Issue tokens  │
│        │    3. Set HTTP-only cookies                  │                  │
│        │       sb-access-token (JWT, 15 min TTL)      │                  │
│        │       sb-refresh-token (rotating, 7 days)    │                  │
│        │◄─────────────────────────────────────────────│                  │
└────────┘                                              └──────────────────┘
```

### 3.2 JWT Token Strategy

| Token | Purpose | TTL | Storage | Flags |
|---|---|---|---|---|
| `sb-access-token` | API authentication, RLS context | 15 minutes (configurable via System Settings) | HTTP-only cookie | `HttpOnly`, `Secure`, `SameSite=Strict` |
| `sb-refresh-token` | Renew access token without re-login | 7 days (configurable) | HTTP-only cookie | `HttpOnly`, `Secure`, `SameSite=Strict` |

**Token rotation:** Refresh token is single-use — each refresh issues a new refresh token and invalidates the old one. If a refresh token is reused, Supabase Auth invalidates the entire session (detects token theft).

**JWT claims:**
```json
{
  "sub": "<user-uuid>",
  "email": "<user-email>",
  "role": "<admin|reception|dentist>",
  "exp": <unix-timestamp>,
  "iat": <unix-timestamp>,
  "iss": "https://<project>.supabase.co/auth/v1"
}
```

**RLS usage:** Postgres RLS policies use `auth.jwt() ->> 'role'` and `auth.uid()` to enforce row-level authorization.

### 3.3 Password Policy

Configurable via System Settings (PRD §2.20, FR-146):

| Setting | Default | Configurable Range |
|---|---|---|
| Minimum length | 12 characters | 8–32 |
| Require uppercase | Yes | Toggle |
| Require lowercase | Yes | Toggle |
| Require numbers | Yes | Toggle |
| Require special characters | Yes | Toggle |
| Password expiration | 90 days | 30–365 days, or never |
| Password history | Last 5 passwords | 0–20 |
| Max failed attempts before lockout | 5 | 3–10 |
| Lockout duration | 15 minutes | 5–60 minutes |

**Implementation:** Supabase Auth handles password hashing (bcrypt with cost factor 10+). Password policy enforced via custom Supabase Auth hook / Edge Function that validates against `clinic_settings` before accepting a new password.

### 3.4 Session Timeout

| Setting | Default | Mechanism |
|---|---|---|
| Idle session timeout | 30 minutes | Client-side: activity tracker resets timer; on expiry, client calls `supabase.auth.signOut()` |
| Maximum session duration | 8 hours | Server-side: JWT `exp` claim enforced; refresh token max age |
| Grace period for token refresh | 60 seconds | Client refreshes token before expiry; if refresh fails, user redirected to login |

### 3.5 Logout & Session Invalidation

- **User-initiated logout:** Client calls `supabase.auth.signOut()` — clears cookies, invalidates tokens server-side
- **Admin-initiated logout:** Admin can revoke sessions via Supabase Auth admin API (future enhancement)
- **Password change:** All existing sessions for that user are invalidated
- **Role change:** All existing sessions for that user are invalidated (requires re-login to pick up new role in JWT)

---

## 4. Authorization & Access Control (RBAC)

### 4.1 Role Definitions

| Role | ID | Can Access | Cannot Access |
|---|---|---|---|
| `admin` | 1 | Everything: all patients, appointments, billing, settings, audit logs, all dentist data | — |
| `reception` | 2 | Bookings, patient CRUD, check-in, registration, billing, live chat, queue view | System Settings, audit logs, treatment records (write), consent (write) |
| `dentist` | 3 | Own appointments, consultation, treatment documentation, consent generation, queue management, mobile portal, own schedule config | Other dentists' appointments, billing, System Settings, audit logs, all patient data (only patients with own appointments) |

### 4.2 Authorization Enforcement Points

Authorization is enforced at **three layers** (defense-in-depth):

```
Request → ① Route Guard (Next.js middleware)
         → ② Server Action / Edge Function (role check)
         → ③ RLS Policy (Postgres row-level filter)
```

**Layer 1 — Route Guards (Next.js Middleware):**

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSession(request);

  // Public routes: /login, /register/[token]
  if (isPublicRoute(pathname)) return NextResponse.next();

  // Authenticated routes
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role-based route protection
  const requiredRole = getRequiredRole(pathname);
  if (requiredRole && session.role !== requiredRole) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return NextResponse.next();
}
```

| Route Pattern | Required Role |
|---|---|
| `/settings/*` | `admin` |
| `/consultation/*` | `dentist` |
| `/consent/*` | `dentist` |
| `(dentist)/*` | `dentist` |
| All other `(dashboard)/*` | `admin`, `reception`, `dentist` |
| `(public)/*` | None (QR token validation instead) |

**Layer 2 — Server Action / Edge Function Role Checks:**

```typescript
// Example: booking approval Server Action
async function approveBooking(appointmentId: string) {
  const session = await getSession();
  if (!session) throw new AuthError('Not authenticated');
  if (session.role !== 'admin' && session.role !== 'reception') {
    throw new AuthError('Not authorized to approve bookings');
  }
  // ... proceed with approval
}
```

**Layer 3 — RLS Policies (Postgres):**

```sql
-- Example: appointments RLS
CREATE POLICY "appointments_select" ON appointments
  FOR SELECT TO authenticated
  USING (
    CASE
      WHEN auth.jwt() ->> 'role' = 'admin' THEN true
      WHEN auth.jwt() ->> 'role' = 'reception' THEN true
      WHEN auth.jwt() ->> 'role' = 'dentist' THEN
        dentist_id = (
          SELECT id FROM dentists WHERE user_id = auth.uid()
        )
      ELSE false
    END
  );

CREATE POLICY "appointments_update" ON appointments
  FOR UPDATE TO authenticated
  USING (
    CASE
      WHEN auth.jwt() ->> 'role' = 'admin' THEN true
      WHEN auth.jwt() ->> 'role' = 'reception' THEN true
      WHEN auth.jwt() ->> 'role' = 'dentist' THEN
        dentist_id = (
          SELECT id FROM dentists WHERE user_id = auth.uid()
        )
      ELSE false
    END
  );
```

### 4.3 RLS Policy Summary (Full Table)

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `users` | Own row; admin reads all | Admin only | Own row; admin updates all | **DENY ALL** |
| `dentists` | All authenticated | Admin only | Own profile (dentist); admin all | **DENY ALL** |
| `dentist_schedules` | All authenticated | Own (dentist); admin | Own (dentist); admin | Admin only |
| `dentist_blocks` | All authenticated | Own (dentist); admin; reception | Own (dentist); admin; reception | Admin only |
| `clinic_settings` | All authenticated | Admin only | Admin only | **DENY ALL** |
| `clinic_holidays` | All authenticated | Admin only | Admin only | Admin only |
| `patients` | All authenticated (non-archived) | Reception, admin | Reception, dentist, admin | **DENY** (archive instead) |
| `dental_services` | All authenticated | Admin only | Admin only | Admin only |
| `appointments` | All staff; dentist sees own | Reception, admin | Reception, dentist (own), admin | **DENY** (archive instead) |
| `appointment_services` | Via appointment RLS | Reception, admin | Reception, admin | Admin only |
| `appointment_history` | All authenticated | Service role only (trigger) | **DENY ALL** | **DENY ALL** |
| `qr_codes` | Staff; public validates by token | All staff (admin, reception, dentist) | All staff (admin, reception, dentist) (invalidation) | **DENY ALL** |
| `consent_forms` | Dentist (own), admin | Dentist, reception | **DENY ALL** (immutable) | **DENY ALL** |
| `treatment_records` | Dentist (own), admin | Dentist only | Dentist (own), admin | **DENY ALL** |
| `invoices` | All authenticated | Reception, admin | Reception, admin | **DENY** (archive instead) |
| `payments` | All authenticated | Reception, admin | Reception, admin | **DENY ALL** |
| `waitlist_entries` | Reception, admin | Reception, admin | Reception, admin | Admin only |
| `audit_logs` | Admin only | Service role only (trigger) | **DENY ALL** | **DENY ALL** |
| `messenger_conversations` | Reception, admin | Service role, reception | Reception, admin | **DENY ALL** |
| `messenger_messages` | Reception, admin | Service role, reception | **DENY ALL** | **DENY ALL** |
| `reassignment_logs` | All authenticated | Service role, reception, admin | **DENY ALL** | **DENY ALL** |
| `dental_charts` | All staff | Dentist, admin | Dentist, admin | **DENY ALL** |
| `tooth_presence` | All staff | Dentist, admin | Dentist, admin | Dentist, admin |
| `tooth_findings` | All staff | Dentist, admin | Dentist, admin | Dentist, admin |
| `finding_surfaces` | All staff | Dentist, admin | Dentist, admin | Dentist, admin |
| `booking_sessions` | Service role only | Service role only | Service role only | Service role only |
| `medical_conditions` | All authenticated | Admin only | Admin only | Admin only |
| `patient_medical_records` | All staff | Reception, dentist, admin | Reception, dentist, admin | **DENY ALL** |
| `patient_medical_conditions` | All staff | Reception, dentist, admin | Reception, dentist, admin | Reception, dentist, admin |
| `consent_clauses` | All authenticated | Admin only | Admin only | Admin only |
| `consent_form_clauses` | Via consent_forms | Via consent_forms | **DENY ALL** | **DENY ALL** |

**Key RLS rules:**
- **DELETE is denied on most tables** — records are archived (`is_archived = true`) not deleted (FR-137)
- **Audit logs, appointment history, consent forms, messenger messages, reassignment logs** are INSERT-only (immutable)
- **Service role** bypasses RLS — used only by triggers and Edge Functions for system operations

---

## 5. Frontend Security

### 5.1 Input Validation & Sanitization

**Client-side validation (first line of defense):**
- All forms use React Hook Form + Zod schemas
- Zod schemas are shared between client and server (`lib/validations/`)
- Validation runs on every field change (real-time) and on submit

**Server-side validation (authoritative):**
- Server Actions re-validate all inputs using the same Zod schemas
- Edge Functions validate webhook payloads before processing
- No client input is trusted without server validation

```typescript
// lib/validations/patient.schema.ts
export const patientRegistrationSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  contact_no: z.string().regex(/^09\d{9}$/),  // Philippine mobile format
  email: z.string().email().optional(),
  birth_date: z.string().refine(isValidDate),
  medical_history: z.string().max(5000).optional(),
  allergies: z.string().max(1000).optional(),
});

// Server Action re-validates
async function registerPatient(formData: FormData) {
  const parsed = patientRegistrationSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() };
  }
  // ... proceed
}
```

### 5.2 XSS Prevention

| Vector | Mitigation |
|---|---|
| HTML injection in React components | React auto-escapes all interpolated values — `{userInput}` is safe by default |
| `dangerouslySetInnerHTML` usage | **Prohibited** — if rich text is needed, use DOMPurify to sanitize before rendering |
| URL parameter injection | Validate all URL params with Zod before use; reject unexpected values |
| Messenger message content | Messages from patients are stored as plain text; rendered as text nodes (not HTML); DOMPurify if ever rendered as rich text |
| Clinical notes / treatment records | Stored as plain text; rendered as text in textarea/text components |

**DOMPurify usage (if rich text is ever needed):**
```typescript
import DOMPurify from 'dompurify';

function SafeHTML({ content }: { content: string }) {
  const clean = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'li'],
    ALLOWED_ATTR: [],
  });
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

### 5.3 CSRF Protection

| Mechanism | Implementation |
|---|---|
| SameSite cookies | `SameSite=Strict` on all auth cookies — prevents cross-site request forgery |
| Origin header verification | Server Actions verify `Origin` header matches expected domain |
| Custom header for API routes | Route Handlers require `X-Requested-With` header for state-changing requests |

### 5.4 Content Security Policy (CSP)

Configured via `next.config.js` headers:

```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Next.js requires unsafe-inline/eval in dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://*.r2.dev https://*.supabase.co",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://graph.facebook.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
];

module.exports = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
```

### 5.5 Client-Side Data Protection

| Rule | Implementation |
|---|---|
| No sensitive data in localStorage/sessionStorage | Auth tokens in HTTP-only cookies only; no patient data cached client-side beyond React Query in-memory cache |
| No secrets in client bundle | Only `NEXT_PUBLIC_*` env vars are available client-side; service role key, R2 secrets, Messenger tokens are server-only |
| React Query cache cleanup | `queryClient.clear()` on logout; sensitive query data not persisted to disk |
| Console output in production | No `console.log` with sensitive data; `console.error` for error tracking only; production builds strip debug logs |

---

## 6. Backend Security

### 6.1 Server Action Security

All Server Actions follow this pattern:

```typescript
async function serverAction(input: unknown) {
  // 1. Authenticate
  const session = await getSession();
  if (!session) throw new AuthError('Not authenticated');

  // 2. Authorize (role check)
  if (!hasPermission(session.role, 'booking:approve')) {
    throw new AuthError('Not authorized');
  }

  // 3. Validate input (Zod)
  const parsed = bookingApprovalSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() };
  }

  // 4. Execute within transaction
  const result = await supabase.rpc('approve_booking', {
    appointment_id: parsed.data.appointmentId,
    staff_user_id: session.userId,
  });

  // 5. Audit log (via trigger or explicit)
  await auditService.log({
    userId: session.userId,
    action: 'booking.approve',
    entityType: 'appointment',
    entityId: parsed.data.appointmentId,
  });

  // 6. Return typed result
  return { success: true, data: result };
}
```

### 6.2 Edge Function Security

```typescript
// supabase/functions/messenger-webhook/index.ts

// 1. Verify HMAC signature
const signature = request.headers.get('X-Hub-Signature-256');
const expectedSignature = `sha256=${hmacSha256(body, MESSENGER_APP_SECRET)}`;
if (signature !== expectedSignature) {
  return new Response('Invalid signature', { status: 401 });
}

// 2. Verify verify token (for GET verification)
if (request.method === 'GET') {
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  if (mode === 'subscribe' && token === MESSENGER_VERIFY_TOKEN) {
    return new Response(url.searchParams.get('hub.challenge'), { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

// 3. Process with service role (system operation)
// 4. Validate payload structure before processing
// 5. Rate limit check (if not Facebook-managed)
// 6. Log all webhook events to audit_logs
```

### 6.3 SQL Injection Prevention

| Rule | Implementation |
|---|---|
| No raw SQL string concatenation | **Never** use template literals for SQL: `` `SELECT * FROM patients WHERE name = '${input}'` `` |
| Use Supabase client (PostgREST) | `supabase.from('patients').select().eq('last_name', input)` — parameterized automatically |
| Use RPC for complex operations | `supabase.rpc('approve_booking', { appointment_id })` — Postgres function with parameterized inputs |
| Edge Functions use Deno Postgres client | `client.query('SELECT * FROM patients WHERE last_name = $1', [input])` — parameterized queries |
| No dynamic table/column names | Table and column names are hardcoded in application code, never from user input |

### 6.4 Server-Side Input Validation

All inputs are validated server-side regardless of frontend validation:

| Input Source | Validation Method |
|---|---|
| Server Action form data | Zod schema (shared with client) |
| Edge Function webhook payload | Manual structure validation + Zod |
| Route Handler query params | Zod schema for URL parameters |
| Cron job parameters | Hardcoded, no user input |

---

## 7. Database Security

### 7.1 Encryption

| Layer | Mechanism | Provider |
|---|---|---|
| **In transit** | TLS 1.2+ (TLS 1.3 preferred) | Supabase managed — all connections encrypted |
| **At rest** | AES-256 encryption | Supabase managed — Postgres data files, WAL, backups encrypted |
| **Column-level (optional)** | `pgcrypto` extension for specific sensitive columns | Application-managed — if field-level encryption is needed beyond table-level |

**Optional column-level encryption for highly sensitive fields:**
```sql
-- If field-level encryption is required beyond Supabase's at-rest encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Example: encrypt medical_history at column level
-- Application encrypts before insert, decrypts after select
-- Key managed via Supabase Vault (not in application code)
```

### 7.2 Connection Security

- **Connection pooling:** Supabase PgBouncer (Supavisor) — connection pool with max client connections
- **Direct connections:** Only for Edge Functions using Deno Postgres client
- **SSL required:** All connections use SSL (`sslmode=require`)
- **Service role key:** Used only for system operations (triggers, cron, webhooks) — never exposed to end users

### 7.3 Database Hardening

| Control | Implementation |
|---|---|
| RLS enabled on all tables | `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;` |
| No direct table access for users | All access through PostgREST (Supabase client) with RLS |
| Service role isolated | `SUPABASE_SERVICE_ROLE_KEY` used only in Server Actions and Edge Functions |
| Triggers for audit | `audit_log_insert` trigger on all auditable tables — cannot be bypassed |
| Status transition validation | `appointment_status_validate` trigger — database-level enforcement |
| Foreign key constraints | All relationships enforced with `ON DELETE RESTRICT` (prevent orphaned records) |
| Check constraints | Enum-like constraints on status columns |
| Immutable tables | `audit_logs`, `appointment_history`, `consent_forms`, `messenger_messages`, `reassignment_logs` — INSERT-only via RLS |

### 7.4 Backup & Recovery

| Aspect | Strategy |
|---|---|
| **Automated backups** | Supabase managed — daily full backups + continuous WAL archiving |
| **Point-in-time recovery** | Supabase PITR (available on Pro plan) — restore to any point within retention window |
| **Backup retention** | 7 days (daily backups) + 7 weekly snapshots (Supabase default, configurable) |
| **Local dev backups** | `npx supabase db dump` — export local schema + seed data |
| **Backup encryption** | Supabase managed — backups encrypted at rest |
| **Recovery testing** | Periodic restore tests on staging environment to verify backup integrity |

---

## 8. File Storage Security (Cloudflare R2)

### 8.1 Bucket Configuration

| Setting | Value | Reason |
|---|---|---|
| Bucket visibility | **Private** | No public access — files contain PHI (consent signatures, payment proofs) |
| Access method | **Presigned URLs** | Time-limited (15 min) signed URLs generated server-side |
| CORS | Restricted to application domain | Only `https://<app-domain>` can upload |
| Bucket policy | Deny all by default | Explicit allow only for specific IAM credentials |

### 8.2 Upload Flow Security

```
1. Client requests upload → Server Action authenticates + authorizes
2. Server Action generates presigned URL (15 min expiry) using R2 credentials
3. Client uploads file directly to R2 via presigned URL (PUT)
4. Server Action saves R2 object key to database (proof_image_url / signature_image_url)
5. On subsequent access: Server Action generates new presigned URL (read) with 15 min expiry
```

**Security controls:**
- Presigned URLs expire after 15 minutes — cannot be reused
- Object keys use UUIDs + timestamps — not guessable
- File type validation server-side before presigned URL generation (accept only: jpg, png, pdf)
- File size limit enforced (max 10MB for proof of payment, 5MB for consent signatures)
- Upload requires authentication — Server Action checks session before generating presigned URL

### 8.3 File Access Control

| File Type | Who Can Upload | Who Can View | Access Method |
|---|---|---|---|
| Payment proof | Reception staff, admin | Reception, admin, dentist (own appointment) | Presigned URL (15 min) |
| Consent signature | Dentist, reception | Dentist (own), admin | Presigned URL (15 min) |
| Document attachments | Admin | Admin | Presigned URL (15 min) |

---

## 9. Messenger Integration Security

> **Reference:** [Facebook Messenger Platform Documentation](https://developers.facebook.com/docs/messenger-platform/) · [Webhooks for Messenger](https://developers.facebook.com/docs/messenger-platform/webhooks/) · [Send API](https://developers.facebook.com/docs/messenger-platform/send-messages/) · [Messenger Profile API](https://developers.facebook.com/docs/messenger-platform/reference/messenger-profile-api/) · [Message Tags](https://developers.facebook.com/docs/messenger-platform/send-messages/tags) · [Handover Protocol](https://developers.facebook.com/docs/messenger-platform/handover-protocol/)

### 9.1 Webhook Verification

**GET (subscription verification):**
```
GET /api/webhooks/messenger?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<challenge>
```
- Server compares `hub.verify_token` with `MESSENGER_VERIFY_TOKEN` env var
- Returns `hub.challenge` on match; 403 on mismatch

**POST (message webhook):**
```
POST /api/webhooks/messenger
X-Hub-Signature-256: sha256=<hmac>
```
- Server computes `HMAC-SHA256(request_body, MESSENGER_APP_SECRET)`
- Compares with `X-Hub-Signature-256` header
- Rejects with 401 if signature is missing or invalid
- Uses constant-time comparison to prevent timing attacks

```typescript
import { createHmac, timingSafeEqual } from 'crypto';

function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

### 9.2 Outbound Message Security

| Control | Implementation |
|---|---|
| Page Access Token | Stored in `MESSENGER_PAGE_ACCESS_TOKEN` env var — server-only, never in client |
| Token rotation | Facebook Page Access Token can be regenerated; update env var in Vercel |
| API version pinning | Use specific Graph API version (e.g., `v21.0`) — not "latest" |
| Message content | Only appointment-related info sent via Messenger — no medical details, diagnosis, or treatment specifics |
| Patient consent for Messenger | Patient initiates contact via Messenger — implicit consent for booking-related communication |
| Messaging window compliance | System respects 24-hour messaging window; falls back to staff notification if window expired (FR-90/91) |
| `messaging_type` parameter | All Send API calls include `messaging_type`: `RESPONSE` for bot replies, `UPDATE` for proactive notifications, `MESSAGE_TAG` with `HUMAN_AGENT` for staff messages outside 24h window |
| Message tags | Staff messages outside 24h window use `HUMAN_AGENT` tag (7-day window). Bot notifications within 24h use `RESPONSE` or `UPDATE`. No promotional content sent via tags. |
| 24-hour window handling | If Send API returns error 1545041 (messaging window closed), system creates `messenger_notification_failed` audit log entry for staff fallback |
| Rate limiting | System respects Graph API rate limits; cron jobs batch sends with delays to avoid error 613 |

### 9.3 Messenger Profile Configuration

| Property | Purpose | Setup Method |
|---|---|---|
| `get_started` button | First interaction trigger — sends `GET_STARTED` postback payload when user taps it | POST to Messenger Profile API |
| `greeting` text | Welcome message on chat screen: "Welcome to Dental Clinic! Tap Get Started to book an appointment." | POST to Messenger Profile API |
| `persistent_menu` | Always-visible menu: Book Appointment, Clinic Hours, Contact Us, Cancel Appointment | POST to Messenger Profile API |
| `ice_breakers` | Suggested conversation starters for new users | POST to Messenger Profile API |
| `whitelisted_domains` | Domain allowlist for Messenger Extensions (if web views used) | POST to Messenger Profile API |

### 9.4 Handover Protocol (Staff Takeover)

| Control | Implementation |
|---|---|
| Thread control | `pass_thread_control` API transfers conversation from bot to human agent; `take_thread_control` returns to bot |
| Metadata | Handover includes metadata string identifying the staff member |
| Bot pause | On `pass_thread_control`, bot stops automated replies; on `take_thread_control`, bot resumes |
| Fallback | If handover API fails, system falls back to `messenger_conversations.status` database flag |

### 9.5 Live Chat Security

| Control | Implementation |
|---|---|
| Takeover authorization | Only `reception` and `admin` roles can take over a conversation |
| Bot pause on takeover | System sets `messenger_conversations.taken_over_by` — Edge Function checks this before sending automated replies |
| Message content | Staff messages are plain text; no file sharing via Messenger (patients directed to clinic for documents) |
| Conversation history | Accessible only to `reception` and `admin` via RLS |
| Audit trail | All takeover/end events logged to `audit_logs` |

---

## 10. QR Code Security

### 10.1 QR Code Lifecycle

```
Generation ──→ Display ──→ Scan ──→ Validate ──→ Invalidate
    │            │           │          │            │
    │            │           │          │            └── Atomic UPDATE: is_used=true
    │            │           │          └── Server checks: is_used=false AND expires_at > now()
    │            │           └── Patient scans with mobile camera
    │            └── Displayed at reception (5 min default)
    └── Server creates: token=UUID, expires_at=now()+5min, is_used=false
```

### 10.2 Security Controls

| Control | Implementation | PRD Reference |
|---|---|---|
| Single-use | Atomic UPDATE: `SET is_used = true WHERE is_used = false AND token = $1 RETURNING *` — if 0 rows returned, token already used or invalid | FR-30 |
| Time-limited | `expires_at` checked server-side; default 5 minutes, configurable via System Settings | FR-24 |
| Immediate invalidation | `used_at` timestamp set on first successful use; subsequent attempts rejected | FR-30 |
| Token entropy | UUID v4 (122 bits of entropy) — not guessable | — |
| No token reuse | Even if QR image is photographed, token is single-use | FR-31 |
| Server-side validation | Token validation happens in Server Action, not client-side — client only displays form if token is valid | FR-26 |
| Rate limiting | 10 validation attempts/min per IP | Architecture §7.3 |

### 10.3 QR Code Validation Flow

```typescript
async function validateQrToken(token: string) {
  // 1. Rate limit check (Vercel Edge Middleware)
  // 2. Atomic invalidation attempt
  const { data, error } = await supabase
    .from('qr_codes')
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq('token', token)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .select('appointment_id')
    .single();

  // 3. If no row returned → token invalid, used, or expired
  if (error || !data) {
    return { valid: false, reason: 'invalid_or_expired' };
  }

  // 4. Token is valid — return appointment context for registration form
  return { valid: true, appointmentId: data.appointment_id };
}
```

---

## 11. Audit Logging & Immutable Trail

### 11.1 Audit Log Architecture

```
User Action / System Event
        │
        ▼
  Server Action / Edge Function
        │
        ▼
  PostgreSQL Trigger (audit_log_insert)
        │
        ▼
  audit_logs table (INSERT only)
        │
        ├── RLS: SELECT (admin only)
        ├── RLS: INSERT (service role / trigger only)
        ├── RLS: UPDATE → DENY ALL
        └── RLS: DELETE → DENY ALL
```

### 11.2 Audited Events

| Category | Events | PRD Reference |
|---|---|---|
| **Authentication** | Login success, login failure, logout, session timeout, password change, role change | NFR-11 |
| **Booking** | Booking request submitted, approved, declined, expired | FR-130 |
| **Patient** | Registration (self + staff-assisted), record update, archiving | FR-130 |
| **Consent** | Consent form generated, signed, declined | FR-130 |
| **Treatment** | Treatment started, paused, resumed, completed, record updated | FR-130 |
| **Billing** | Invoice generated, payment recorded, partial payment, payment failed | FR-130 |
| **Reassignment** | Dentist unavailability declared, appointment reassigned, rescheduled | FR-164 |
| **Cancellation** | Cancellation requested, confirmed, denied | FR-130 |
| **System events** | Confirmation reminder sent, slot released, follow-up flagged, Messenger notification failed + fallback | FR-131 |
| **Live chat** | Staff takeover, staff end chat | — |
| **QR code** | QR code generated, validated, invalidated | — |

### 11.3 Audit Log Schema

```sql
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),  -- null for system events
  action      VARCHAR(100) NOT NULL,       -- e.g., 'booking.approve'
  entity_type VARCHAR(50) NOT NULL,        -- e.g., 'appointment'
  entity_id   UUID,                        -- ID of affected entity
  metadata    JSONB,                       -- Additional context (old/new values, reason, etc.)
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address  INET,                        -- Request IP (for user actions)
  user_agent  TEXT                          -- Request user agent
);

-- Immutability enforcement
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

-- No UPDATE or DELETE policy → denied by default
```

### 11.4 Audit Log Retention

| Setting | Default | Configurable via |
|---|---|---|
| Retention period | 7 years | System Settings → Security → Audit Log Retention (FR-146) |
| Archival | After retention period, logs are archived (not deleted) | Consistent with FR-137 |
| Access | Admin only | RLS policy |
| Export | Admin can export logs (CSV/JSON) for compliance audits | Future enhancement |

---

## 12. Data Privacy & Compliance

### 12.1 Philippine Data Privacy Act (RA 10173) Compliance

| Requirement | Implementation |
|---|---|
| **Lawful collection** | Patient data collected only for dental care purposes; patient informed of data collection at registration |
| **Data minimization** | Registration form collects only fields necessary for dental treatment (name, contact, birth date, medical history, allergies) |
| **Purpose limitation** | Data used only for dental clinic management — not shared with third parties |
| **Consent** | Patient provides electronic informed consent before treatment (FR-50 to FR-56); registration form includes data privacy notice |
| **Security measures** | Defense-in-depth: TLS, encryption at rest, RLS, RBAC, audit logging |
| **Data subject rights** | |
| — Right to be informed | Privacy notice on registration form |
| — Right to access | Patients can request their records via clinic staff |
| — Right to rectification | Staff can update patient records; changes logged in audit trail |
| — Right to erasure | Fulfilled via archiving (not deletion) — records retained for medical/legal purposes (FR-137) |
| — Right to data portability | Admin can export patient records (future enhancement) |
| **Data retention** | Configurable via System Settings; archived records retained per clinic policy |
| **Breach notification** | Incident response plan (see §17) — NPC notification within 72 hours of breach discovery |

### 12.2 Data Classification

| Classification | Data Elements | Handling |
|---|---|---|
| **Public** | Clinic name, services offered, contact info | No restrictions |
| **Internal** | Staff names, roles, schedules | Authenticated staff only |
| **Confidential** | Appointment details, billing records, Messenger conversations | RBAC + RLS enforced |
| **Restricted (PHI)** | Patient medical history, allergies, dental chart (presence, findings, surfaces), treatment records, consent forms | RBAC + RLS + encryption + audit logging + minimum necessary access |

### 12.3 Data Flows & Cross-Border Transfer

| Data Flow | Direction | Legal Basis |
|---|---|---|
| Patient data → Supabase Cloud (Postgres) | Philippines → Supabase region (configurable: AP Southeast) | RA 10173 — data stored in region with adequate protection |
| File uploads → Cloudflare R2 | Philippines → Cloudflare global network | RA 10173 — data minimization, encrypted in transit |
| Messenger messages → Facebook Platform | Philippines → Meta servers | Patient initiates contact; Facebook's data policy applies |
| Audit logs → Supabase Cloud | Same as primary data | No cross-border transfer beyond Supabase region |

**Region selection:** Supabase project should be provisioned in **AP Southeast (Singapore)** region to minimize data sovereignty concerns and reduce latency from the Philippines.

---

## 13. Secrets Management

### 13.1 Environment Variable Classification

| Variable | Scope | Exposure |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Public — safe to expose (just the URL) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Public — designed for client use, RLS protects data |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | **NEVER** in client bundle — bypasses RLS |
| `R2_ACCESS_KEY_ID` | Server only | **NEVER** in client bundle |
| `R2_SECRET_ACCESS_KEY` | Server only | **NEVER** in client bundle |
| `MESSENGER_PAGE_ACCESS_TOKEN` | Server only | **NEVER** in client bundle |
| `MESSENGER_APP_SECRET` | Server only | **NEVER** in client bundle |
| `MESSENGER_VERIFY_TOKEN` | Server only | **NEVER** in client bundle |
| `CRON_SECRET` | Server only | **NEVER** in client bundle |

### 13.2 Secrets Handling Rules

1. **Never commit secrets to Git** — `.env.local` in `.gitignore`; `.env.example` contains only placeholder values
2. **Never prefix server-only secrets with `NEXT_PUBLIC_`** — Next.js only exposes `NEXT_PUBLIC_*` to client bundle
3. **Vercel environment variables** — Set in Vercel dashboard; marked as "Sensitive" for server-only secrets
4. **Local development** — `.env.local` file; `npx supabase start` generates local keys; never use production keys locally
5. **Secret rotation** — Rotate all secrets on personnel turnover; rotate Messenger tokens if Facebook page admin changes
6. **No secrets in code** — No hardcoded API keys, no hardcoded connection strings, no hardcoded passwords

### 13.3 `.env.example` Template

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<get_from_supabase_status>
SUPABASE_SERVICE_ROLE_KEY=<get_from_supabase_status>

# Cloudflare R2
R2_ACCOUNT_ID=<your_account_id>
R2_ACCESS_KEY_ID=<your_access_key>
R2_SECRET_ACCESS_KEY=<your_secret_key>
R2_BUCKET_NAME=dental-clinic-prod
R2_PUBLIC_URL=https://<r2-domain>.r2.dev

# Facebook Messenger
MESSENGER_PAGE_ACCESS_TOKEN=<page_access_token>
MESSENGER_VERIFY_TOKEN=<custom_verify_token>
MESSENGER_APP_SECRET=<app_secret>

# Cron
CRON_SECRET=<random_string>
```

---

## 14. Security Headers Configuration

All headers applied via `next.config.js` to every response:

| Header | Value | Purpose |
|---|---|---|
| `Content-Security-Policy` | See §5.4 | Prevents XSS, data injection, unauthorized connections |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Forces HTTPS for 1 year |
| `X-Frame-Options` | `DENY` | Prevents clickjacking — no framing allowed |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer information leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Denies access to device capabilities |

---

## 15. Rate Limiting & DDoS Mitigation

### 15.1 Rate Limiting Strategy

| Endpoint | Limit | Layer | Method |
|---|---|---|---|
| `/api/webhooks/messenger` | Facebook-managed | Platform | Facebook rate limits |
| `/login` | 10 attempts/min per IP | Supabase Auth | Built-in rate limiting |
| `/register/[token]` (validation) | 10/min per IP | Vercel Edge Middleware | IP-based counter |
| `/register/[token]` (submission) | 5/min per IP | Vercel Edge Middleware | IP-based counter |
| Server Actions (general) | 30/min per user | Application-level | User session-based counter |
| Supabase Realtime connections | Supabase-managed | Platform | Connection limits per project tier |

### 15.2 Vercel Edge Middleware Rate Limiting

```typescript
// middleware.ts (rate limiting portion)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// Applied to public routes
if (pathname.startsWith('/register/')) {
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown';
  if (!rateLimit(ip, 10, 60_000)) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }
}
```

> **Note:** For production, use Vercel's Edge Config or Upstash Redis for distributed rate limiting instead of in-memory Map.

### 15.3 DDoS Mitigation

| Layer | Protection |
|---|---|
| **Vercel Edge Network** | Built-in DDoS protection, traffic filtering, bot detection |
| **Cloudflare R2** | Cloudflare's global network provides DDoS mitigation for file access |
| **Supabase** | Built-in connection pooling, query limits, platform-level DDoS protection |
| **Application** | Rate limiting on public endpoints; authentication required for all other endpoints |

---

## 16. Secure Development Lifecycle (SDLC)

### 16.1 Development Practices

| Practice | Implementation |
|---|---|
| **TypeScript strict mode** | No `any` types — type safety prevents many injection and type confusion bugs |
| **ESLint security rules** | `eslint-plugin-security` — detects unsafe patterns (eval, child_process, etc.) |
| **Dependency scanning** | `npm audit` in CI; Dependabot for automated vulnerability alerts |
| **Code review** | All PRs require review before merge; security-sensitive changes flagged |
| **Pre-commit hooks** | Husky + lint-staged — runs ESLint, type check, and secret scanning before commit |
| **Secret scanning** | `gitleaks` or GitHub secret scanning — prevents accidental secret commits |
| **No debug code in production** | `console.log` stripped in production builds; no debug endpoints |

### 16.2 CI/CD Security

```
Developer creates PR
    │
    ├── Automated checks:
    │   ├── TypeScript type check (tsc --noEmit)
    │   ├── ESLint (including security rules)
    │   ├── npm audit (dependency vulnerabilities)
    │   ├── Secret scan (gitleaks)
    │   └── Unit tests
    │
    ├── Code review (required)
    │
    ├── Preview deployment (Vercel)
    │   └── Staging Supabase project (separate from production)
    │
    ├── Security audit (Devin — 5 parallel subagent audits)
    │   ├── ① Authentication & session security audit
    │   ├── ② Authorization & RLS policy audit
    │   ├── ③ Input validation & injection prevention audit
    │   ├── ④ Data exposure & privacy compliance audit
    │   └── ⑤ Dependency & configuration security audit
    │
    └── Merge to main → Production deployment
```

### 16.3 Dependency Management

| Rule | Implementation |
|---|---|
| Lockfile | `package-lock.json` committed — ensures reproducible builds |
| Dependency review | Review new dependencies in PRs — check for known vulnerabilities |
| Minimal dependencies | Avoid unnecessary packages — reduce attack surface |
| Update regularly | Monthly dependency updates; critical security patches immediately |
| No unpinned versions | Use exact versions or caret ranges with lockfile |

---

## 17. Incident Response Plan

### 17.1 Incident Severity Levels

| Severity | Definition | Response Time | Example |
|---|---|---|---|
| **Critical (P0)** | Patient data breach, system compromise | Immediate (< 1 hour) | Unauthorized access to patient records, RLS bypass |
| **High (P1)** | Security vulnerability with active exploitation | < 4 hours | XSS vulnerability being exploited, compromised staff account |
| **Medium (P2)** | Security vulnerability without active exploitation | < 24 hours | Rate limiting bypass, missing input validation |
| **Low (P3)** | Security hardening opportunity | < 1 week | Missing security header, verbose error message |

### 17.2 Incident Response Steps

```
1. DETECT — Alert triggered by:
   - Audit log anomaly detection (unusual access patterns)
   - User report (suspicious activity)
   - Automated security scan (Devin audit)
   - Supabase / Vercel security alert

2. CONTAIN — Immediate actions:
   - Revoke compromised user sessions (Supabase Auth admin API)
   - Rotate exposed secrets (env vars in Vercel)
   - Block offending IP (Vercel Edge Middleware)
   - Disable affected Edge Function if needed

3. ASSESS — Determine scope:
   - Review audit_logs for affected records
   - Check which patient data was accessed
   - Identify root cause

4. NOTIFY — Regulatory compliance:
   - NPC (National Privacy Commission) notification within 72 hours (RA 10173)
   - Affected patients notified per regulatory requirements
   - Internal stakeholders notified

5. REMEDIATE — Fix root cause:
   - Deploy fix to production
   - Verify fix with security audit
   - Update documentation

6. POST-MORTEM — Document and learn:
   - Incident report (timeline, root cause, impact, remediation)
   - Update security controls to prevent recurrence
   - Share learnings with team
```

### 17.3 Incident Contact Roles

| Role | Responsibility |
|---|---|
| System Admin | Technical containment, secret rotation, deployment |
| Clinic Manager | Patient notification coordination, regulatory liaison |
| Developer | Root cause analysis, fix implementation, post-mortem |

---

## 18. Security Audit & Review Process

### 18.1 Automated Security Audits

**Auditor:** Devin automated security review — **5 parallel subagent audits** run on every PR and before production deployment.

| Subagent | Audit Scope | Checks |
|---|---|---|
| **① Authentication & Session** | Auth flows, token handling, session management | JWT configuration, cookie flags, token rotation, session timeout, password policy enforcement, logout completeness |
| **② Authorization & RLS** | RBAC enforcement, RLS policies, role checks | Every table has RLS enabled; policies match role matrix; no policy gaps; Server Actions check roles; Edge Functions verify auth context; no service role key in client code |
| **③ Input Validation & Injection** | Zod schemas, SQL injection, XSS, CSRF | All inputs validated server-side; no raw SQL; no `dangerouslySetInnerHTML` without DOMPurify; CSRF protections in place; webhook signature verification |
| **④ Data Exposure & Privacy** | Data classification, PHI handling, privacy compliance | No PHI in client bundles; no sensitive data in localStorage; error messages don't leak internals; R2 files private with signed URLs; RA 10173 compliance checks |
| **⑤ Dependency & Configuration** | Dependencies, env vars, security headers, build config | `npm audit` clean; no secrets in code; CSP headers configured; HSTS enabled; TypeScript strict mode; no `any` types; `.env.local` in `.gitignore` |

### 18.2 Audit Cadence

| Trigger | Audit Type | Blocking? |
|---|---|---|
| Every Pull Request | All 5 subagent audits | Yes — must pass before merge |
| Pre-production deployment | Full security review | Yes — must pass before deploy |
| Monthly | Dependency scan + configuration review | No (advisory) |
| Quarterly | Manual penetration testing | No (advisory) |
| After incident | Full re-audit + targeted review of incident area | Yes |

### 18.3 Audit Output

Each subagent produces a structured report:

```
## Audit Report: [Subagent Name]
- Status: PASS / WARN / FAIL
- Files Reviewed: [count]
- Issues Found: [count by severity]
- Critical: [list]
- High: [list]
- Medium: [list]
- Low: [list]
- Recommendations: [list]
```

**Blocking criteria:** Any CRITICAL or HIGH severity issue blocks merge/deployment. MEDIUM and LOW are advisory but should be addressed within the sprint.

### 18.4 Manual Security Review Checklist

Performed quarterly or after major changes:

- [ ] RLS policies tested with each role (admin, reception, dentist) — verify no cross-role data leakage
- [ ] Webhook signature verification tested with invalid signatures
- [ ] QR code single-use enforcement tested (replay attempt rejected)
- [ ] Audit log immutability tested (attempt UPDATE/DELETE → should fail)
- [ ] Rate limiting tested (exceed limit → 429 response)
- [ ] Security headers verified (curl -I response headers)
- [ ] CSP violations checked (browser console for blocked resources)
- [ ] Session timeout verified (idle session expires correctly)
- [ ] Password policy enforced (weak passwords rejected)
- [ ] File upload validation tested (invalid file types rejected)
- [ ] Error messages don't leak internals (no stack traces in production)
- [ ] No secrets in client bundle (search build output for key patterns)

---

## 19. Security Checklist

### Pre-Deployment Security Checklist

**Authentication & Session:**
- [ ] Supabase Auth configured with email/password
- [ ] JWT access token TTL set (15 min default)
- [ ] Refresh token rotation enabled
- [ ] Cookies set with `HttpOnly`, `Secure`, `SameSite=Strict`
- [ ] Password policy configured in System Settings
- [ ] Session timeout configured (30 min idle, 8 hr max)
- [ ] Account lockout after failed attempts configured

**Authorization:**
- [ ] RLS enabled on ALL tables
- [ ] RLS policies match role matrix (see §4.3)
- [ ] Route guards in Next.js middleware
- [ ] Server Actions check role before executing
- [ ] Edge Functions verify auth context
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never in client code

**Input Validation:**
- [ ] Zod schemas defined for all inputs
- [ ] Server-side validation on all Server Actions
- [ ] Webhook payload validation in Edge Functions
- [ ] No raw SQL — only Supabase client / RPC

**XSS & CSRF:**
- [ ] No `dangerouslySetInnerHTML` without DOMPurify
- [ ] `SameSite=Strict` on all cookies
- [ ] Origin header verification on Server Actions
- [ ] CSP headers configured in `next.config.js`

**Data Protection:**
- [ ] TLS enforced (Vercel + Supabase)
- [ ] No sensitive data in localStorage/sessionStorage
- [ ] R2 bucket set to private
- [ ] R2 access via presigned URLs (15 min expiry)
- [ ] Error messages generic in production (no stack traces)

**Secrets:**
- [ ] All secrets in Vercel environment variables
- [ ] `.env.local` in `.gitignore`
- [ ] `.env.example` has placeholder values only
- [ ] No `NEXT_PUBLIC_` prefix on server-only secrets
- [ ] Secret scanning in CI (gitleaks)

**Audit Logging:**
- [ ] `audit_log_insert` trigger on all auditable tables
- [ ] `audit_logs` RLS: SELECT (admin), INSERT (service role), UPDATE/DELETE (DENY)
- [ ] All auditable events logged (see §11.2)
- [ ] Audit log retention period configured

**Messenger:**
- [ ] Webhook signature verification (HMAC-SHA256)
- [ ] Verify token configured
- [ ] Page Access Token in env var (server-only)
- [ ] Messaging window fallback implemented

**QR Codes:**
- [ ] Single-use enforcement (atomic UPDATE)
- [ ] Time-limited expiry (5 min default)
- [ ] Server-side validation only
- [ ] Rate limiting on validation endpoint

**Headers:**
- [ ] Content-Security-Policy
- [ ] Strict-Transport-Security
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy: strict-origin-when-cross-origin
- [ ] Permissions-Policy: camera=(), microphone=(), geolocation=()

**Compliance:**
- [ ] Privacy notice on patient registration form
- [ ] Data retention policy configured
- [ ] Incident response plan documented
- [ ] NPC contact information available for breach notification

**Audit:**
- [ ] Devin 5-subagent security audit passed (all CRITICAL/HIGH resolved)
- [ ] Manual security checklist completed (see §18.4)

---

## References

- [PRD §8 — Security](./PRD.md)
- [Architecture §7 — Security Architecture](./ARCHITECTURE.md)
- [FR/NFR — NFR-11 to NFR-18, NFR-54 to NFR-58](./fr_nfr.md)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Row-Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Vault (Secrets Management)](https://supabase.com/docs/guides/database/vault)
- [Cloudflare R2 Security](https://developers.cloudflare.com/r2/platform/security/)
- [Facebook Messenger Platform — Security](https://developers.facebook.com/docs/messenger-platform/webhook#security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Philippine Data Privacy Act of 2012 (RA 10173)](https://www.privacy.gov.ph/data-privacy-act/)
- [Electronic Commerce Act (RA 8792)](https://www.gppb.gov.ph/wp-content/uploads/2023/06/Republic-Act-No.-8792.pdf)
- [NPC Implementing Rules and Regulations](https://www.privacy.gov.ph/irr/)
- [PDA Dental Chart (FDI Notation)](https://pda.com.ph/wp-content/uploads/2022/10/PDA-Dental-Chart.pdf)
- [Next.js Security Headers](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Vercel Security — DDoS Protection](https://vercel.com/docs/security/ddos-protection)
