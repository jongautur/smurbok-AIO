# Smurbok — Product Plan

## Vision

A multi-tenant vehicle maintenance platform for Iceland, serving personal users, industrial fleets, and vehicle workshops. Designed for web first, with a mobile-ready API (iOS/Android), and future integration with Icelandic e-ID (Ísland.is) for car info lookup via SSN/kennitala.

---

## Account Types

### 1. Personal Account
Simple but powerful maintenance log for individual vehicle owners.

**Core features:**
- Add vehicles (make, model, year, VIN, license plate, fuel type)
- Service records (oil change, brakes, tires, etc.)
- Expense tracking (fuel, insurance, tax, repairs)
- Mileage logging
- Document storage (insurance cert, registration, inspection cert)
- Reminders (by date or mileage)
- Timeline view of all vehicle history

### 2. Industrial Account (Fleet / Company)
For companies with many vehicles. Day-to-day operational logs, planning, and cost tracking.

**Additional features beyond Personal:**
- Organization/company entity with multiple users (roles: Fleet Manager, Driver, Viewer)
- Fleet dashboard (all vehicles, cost summaries, upcoming reminders across fleet)
- Driver assignments (vehicle ↔ driver tracking)
- Daily usage/trip logs per vehicle
- Fuel consumption tracking and reporting
- Cost center / department tracking
- Bulk reminders and alerts (email/push notifications)
- Scheduled maintenance planning (calendar view)
- Export reports (CSV/PDF): costs, service history, mileage per period
- Vehicle acquisition and disposal tracking

### 3. Workshop Account
Vehicle workshops that perform and log service on vehicles belonging to any customer.

**Additional features beyond Personal:**
- Workshop entity with technician users
- Accept work orders linked to any vehicle (by license plate / VIN)
- Log service records on behalf of vehicle owners
- Records are visible to the vehicle owner in their account
- Digital signature / attestation on completed work orders
- Work order history per workshop
- Invoice generation (future)

### 4. Admin Overview
Internal admin panel for platform operators.

**Features:**
- User and organization management
- Account type management and upgrades
- Storage usage monitoring per user/org
- Platform-wide stats (vehicles, records, active users)
- Audit log for security-relevant events
- Feature flag management (future)

---

## Technical Architecture

### Current Stack
- **API:** NestJS 11, Prisma 5, PostgreSQL
- **Web:** Next.js 16, React 19, Tailwind CSS 4, next-intl (is/en)
- **Auth:** Firebase (Google OAuth) + server-side JWT
- **Storage:** Local filesystem with signed URLs
- **Hosting:** Systemd services on Linux server
- **i18n:** Icelandic (is) and English (en)

### API Design Principles (Mobile-Ready)
- All endpoints are REST/JSON — no server-rendered specifics
- Versioned API paths (`/v1/...`) to allow future breaking changes without disrupting mobile apps
- Swagger docs kept up to date
- JWT-based auth (already done) — stateless and mobile-friendly
- Pagination on all list endpoints (cursor or offset)
- Rate limiting per user/IP (already partially done)
- File upload via multipart or signed upload URLs
- Push notification hooks (FCM/APNs) — future

### Security Requirements
- HTTPS enforced (reverse proxy)
- Helmet + CORS (already done)
- Rate limiting (already done)
- Input validation via class-validator on all DTOs
- Role-based access control (RBAC) — expand for multi-tenant
- Row-level security: users can only access their own data
- Workshop access: scoped to vehicles they have been linked to
- Audit logging for sensitive operations (delete, admin actions)
- Signed URLs for file access (already done)
- No raw SQL — Prisma ORM only
- Environment secrets never committed

---

## What Is Already Built

| Area | Status |
|------|--------|
| Vehicle CRUD | Done |
| Service records | Done |
| Expense tracking | Done |
| Mileage logging | Done |
| Documents / file upload | Done |
| Reminders | Done |
| Dashboard (basic) | Done |
| Firebase + JWT auth | Done |
| Admin user management | Partial |
| Car make/model reference data | Done |
| Rate limiting + Helmet | Done |
| Swagger docs | Done |
| i18n (is/en) | Done |
| Multi-account types | Done |
| Organization/fleet model | Done |
| Workshop model | Done |
| Driver assignment | Done |
| Trip/daily logs | Done |
| Fleet cost reports | Done |
| Work orders | Done |
| Email notifications (is/en i18n) | Done |
| Smart reminder scheduling (3-stage: 14/7/0 days) | Done |
| Mileage-based due date estimation for reminders | Done |
| Admin make/model CRUD (`ref` module) | Done |
| Magic link auth (email login, no Firebase) | Done |
| Push notifications (FCM) | Deferred to mobile app |
| API versioning (`/v1`) | Done |
| Pagination on list endpoints | Done |
| ETag / Last-Modified caching | Done |
| Audit logging | Done |
| CSV/PDF export | Done |
| Soft deletes (7-day recovery window) | Done |
| Recurring reminders | Done |
| Mileage-based reminder triggering | Done |
| Org invite system | Done |
| Fuel efficiency calculations | Done |
| Personal data export (GDPR) | Done |
| Vehicle transfer | Done |
| Work order → service record link | Done |
| Webhook support | Not started |
| S3/R2 storage | Not started |
| Multi-currency | Future |
| Mobile app (iOS/Android) | Future |
| e-ID / Ísland.is integration | Future |

---

## Roadmap

### Phase 1 — Foundation & Security (Backend)
Priority: Get the API solid, secure, and scalable before adding features.

- [x] Add API versioning: prefix all routes with `/v1`
- [x] Add pagination to all list endpoints (offset + limit, return total count)
- [x] Audit logging: log create/update/delete events with userId, timestamp, resource
- [x] Harden RBAC: ensure every endpoint is explicitly guarded (no accidental open endpoints)
- [x] Input sanitization review: ensure all DTOs use `class-validator` correctly
- [x] Structured error responses: consistent `{ error, message, statusCode }` format

### Phase 2 — Multi-Tenant Data Model
Redesign schema to support multiple account types under one platform.

- [x] Add `AccountType` enum: PERSONAL, INDUSTRIAL, WORKSHOP
- [x] Add `Organization` model (company/workshop entity)
  - name, type (FLEET | WORKSHOP), country, registrationNumber, createdAt
- [x] Add `OrganizationMember` model (user ↔ org with role)
  - roles: OWNER, MANAGER, DRIVER, TECHNICIAN, VIEWER
- [x] Update `Vehicle` model: can belong to a User OR an Organization
- [x] Add `WorkOrder` model for workshop service records
  - vehicleId, workshopOrgId, technicianId, description, completedAt, signedAt
- [x] Add `TripLog` model for fleet daily logs
  - vehicleId, driverId, startMileage, endMileage, date, note, purpose
- [x] Add `CostCenter` model for fleet cost tracking
- [x] Migrate existing data (all current vehicles stay as PERSONAL)

### Phase 3 — Industrial / Fleet Features
- [x] Fleet dashboard endpoint: all vehicles + costs + reminders per org
- [x] Driver assignment endpoints (via trip logs — driver is set on trip creation)
- [x] Trip log CRUD
- [x] Cost reporting endpoints (by vehicle, by period, by category)
- [x] Scheduled maintenance planning (via bulk reminder endpoint)
- [x] Bulk reminder management
- [x] Export: CSV and PDF report generation

### Phase 4 — Workshop Features
- [x] Workshop registration and profile
- [x] Work order CRUD (workshop creates, owner can view)
- [x] Link work order to vehicle (by license plate or VIN lookup)
- [x] Digital sign-off on completed work orders
- [x] Workshop history (all work orders created by workshop)

### Phase 5 — Notifications
- [x] Email notifications (reminders due, work order completed, work order signed)
- [x] Gmail OAuth2 transport (Nodemailer + Google Workspace)
- [x] React Email templates (reminder due, work order completed, work order signed)
- [x] Bilingual email templates: Icelandic (`is`) and English (`en`) — language follows `user.language`
- [x] Translation module: `translations.ts` with `copy`, `tr()`, `reminderTypeLabels`, `stageLabels`
- [x] Daily cron at 08:00 for reminder emails (`@nestjs/schedule`)
- [x] Smart 3-stage notification schedule: email at 14 days before, 7 days before, and on due date
- [x] Per-stage flags on `Reminder` model (`notified14Days`, `notified7Days`, `notifiedDueDate`) to prevent duplicate sends
- [x] Mileage-based due date estimation: calculates actual km/day from odometer history (≥30 days of data), falls back to 15,000 km/year default
- [x] If reminder has both `dueDate` and `dueMileage`, sends notification based on whichever comes first
- [x] User opt-out: `PATCH /auth/me/notifications` — `emailNotifications` flag on User model
- [x] Admin make/model reference CRUD: `POST /ref/makes`, `DELETE /ref/makes/:id`, `POST /ref/makes/:makeId/models`, `DELETE /ref/models/:id` (Admin-only)
- [x] Push notification token registration — `POST /v1/auth/me/push-token` stores Expo push token on user; `DELETE /v1/auth/me/push-token` clears it
- [x] Push notifications for reminders and work order events — reminder cron and work order complete/sign events send Expo push alongside email if token is registered
- [x] Magic link auth — passwordless email login alternative to Firebase: `POST /v1/auth/magic-link` (request), `GET /v1/auth/magic-link/verify` (verify token), `GET /v1/auth/magic-link/status` (poll for JWT); token stored hashed in `MagicLinkToken` table, expires after 15 min, single-use

### Personal Phase 1 — Complete Personal Account API
Everything needed to fully support the personal account UI before building the frontend.

- [x] Magic link auth: `POST /v1/auth/magic-link` — request link by email + sessionId; `GET /v1/auth/magic-link/verify?token=` — server verifies token and stores JWT on session; `GET /v1/auth/magic-link/status?sessionId=` — client polls until JWT is ready (already built, documenting here)
- [x] Account deletion: `DELETE /v1/auth/me` — hard-deletes user and all owned data (vehicles, records, documents, expenses, reminders) after a confirmation step; also removes user from all org memberships
- [x] Personal data export (GDPR): `GET /v1/auth/me/export` — returns a ZIP containing all user data as JSON (vehicles, service records, expenses, mileage logs, reminders) plus original uploaded document files
- [x] Recurring reminders: add `recurrenceMonths` field to `Reminder` model; when a reminder is marked `DONE`, auto-create the next one with `dueDate` offset by `recurrenceMonths` and notification flags reset
- [x] Mileage-based reminder triggering: when a `MileageLog` is created, check all `PENDING` reminders on that vehicle where `dueMileage <= newMileage`; mark them due and send notification (email + push if token registered)
- [x] VIN check digit validation (ISO 3779): position-9 mathematical check digit — transliteration + modulo-11 check implemented in `VinCheckDigitConstraint`

### Phase 6 — Admin Panel
- [x] Organization management (suspend, upgrade account type) — `POST /v1/organizations/:id/suspend`, `POST /v1/organizations/:id/unsuspend`; user suspend/unsuspend on `POST /v1/users/:id/suspend|unsuspend`
- [x] Platform-wide analytics dashboard — `GET /v1/users/platform-stats`
- [x] Audit log viewer endpoint — `GET /v1/users/audit-logs?userId=&resource=&action=&page=&limit=`
- [x] Storage monitoring per user/org — `GET /v1/storage`, `GET /v1/storage/admin/all`, `GET /v1/storage/admin/user/:userId`

### Phase 7 — Mobile API Polish
- [x] Review all endpoints for mobile-friendliness
- [x] Ensure consistent pagination across all list endpoints
- [x] Add `ETag` / `Last-Modified` headers for caching
- [x] Document all endpoints in Swagger with examples
- [x] Test suite covering all critical paths (removed — manual testing via api-test module was sufficient)

### Phase 8 — Data Integrity & Validation
Harden the data layer against bad input and accidental loss.

- [x] Icelandic license plate format validation in `CreateVehicleDto` (2-3 letters + 2-3 digits, e.g. `ABC12` or `AB123`)
- [ ] VIN check digit validation (ISO 3779 position-9 check digit) — format (17 chars, no I/O/Q) is validated; mathematical check digit is not yet implemented
- [x] Mileage consistency check: rejects new mileage log entry if lower than the vehicle's current highest recorded mileage
- [x] Soft deletes on `Vehicle` — `archivedAt` (user-initiated archive) + `deletedAt` (trash, 7-day recovery); archived vehicles hide from lists but retain all history
- [x] Soft deletes on `WorkOrder` — cancel sets `cancelledAt`; full soft delete with `deletedAt` also added
- [x] Audit log coverage expansion: `WORK_ORDER`, `ORGANIZATION`, `TRIP_LOG` added to `AuditResource` enum
- [x] Reminder snooze endpoint: `POST /reminders/:id/snooze` — sets status to `SNOOZED`, updates `dueDate`, resets notification flags

### Phase 9 — Smart Automation
Logic that runs automatically based on data events.

- [x] Mileage-based reminder triggering: when a mileage log is created, check if any `PENDING` reminders on that vehicle have `dueMileage <= newMileage` and mark them due (or send a notification hook)
- [x] Recurring reminders: add `recurrenceMonths` field to `Reminder`; when a reminder is marked `DONE`, auto-create the next one offset by `recurrenceMonths`
- [x] Fuel efficiency endpoint: `GET /vehicles/:id/fuel-efficiency` — calculates `km/L` and `L/100km` from FUEL expenses with `litres` set + mileage logs; optional `from`/`to` date filter
- [x] Work order → service record link: `POST /work-orders/:id/sign` now accepts optional `{ mileage, serviceType, cost }` — if `mileage` provided, creates a service record in the same transaction
- [x] Vehicle acquisition/disposal tracking: add `acquiredAt` and `disposedAt` to `Vehicle`; disposed vehicles are fully archived

### Phase 10 — Org Collaboration
Features that make multi-user orgs smoother to operate.

- [x] Org invite system: `POST /organizations/:id/invites` — sends a signed invite token by email; recipient clicks link, signs up or logs in, gets auto-added as a member with the specified role
- [x] Pending invite model: `OrgInvite` — orgId, email, role, token, expiresAt, acceptedAt
- [x] Vehicle transfer: `POST /vehicles/:id/transfer` — transfer ownership from one user to another, or from personal to org (with acceptance flow)
- [x] Cost center assignment on expenses: allow fleet expenses to be tagged to a `CostCenter` for departmental reporting
- [x] Service record export per vehicle: `GET /vehicles/:id/export/service-history.pdf` — PDF of full service history for a single vehicle (useful for resale)

### Phase 11 — Platform & Integrations
Infrastructure for scale and external integrations.

> **ON HOLD** — platform will be self-hosted for the foreseeable future. Revisit when moving to managed infrastructure.

- [ ] Webhook support: `POST /webhooks` — register a URL to receive event payloads (work order completed, reminder due, vehicle added); sign payloads with HMAC
- [ ] S3-compatible storage (Cloudflare R2): replace local filesystem storage with R2; update signed URL generation; keep local as fallback for dev
- [x] Personal data export (GDPR): `GET /auth/me/export` — returns a ZIP of all user data (vehicles, records, documents, expenses) in JSON + original files
- [x] Account deletion: `DELETE /auth/me` — hard deletes user and all owned data after a confirmation step; removes from all org memberships
- [ ] API key support: `POST /auth/api-keys` — generate long-lived API keys for programmatic access (for future mobile apps or integrations); stored as hashed tokens

---

## Security Concerns To Fix

These are the main security and access-control concerns found during backend review. Claude should treat the first section as highest priority.

### Critical

- [x] Remove all committed secrets from the repo and rotate everything exposed in `api/.env`
  - Confirmed: full git history audit found no secrets committed at any point
  - All credentials are read from `.env` which has been gitignored from the initial commit
  - No rotation required (nothing was exposed)
- [x] Make secret configuration fail closed at startup
  - removed fallback secret `dev-secret-change-me`
  - startup exits with clear error if required secrets are missing
  - upgraded to RS256 asymmetric signing — private key signs, public key verifies; stolen public key cannot forge tokens
- [x] Add a documented incident-response checklist for leaked secrets — see below

#### Incident Response: Leaked Secret

**Do this immediately, in order. Do not wait to investigate first.**

1. **Rotate the secret**
   - `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` — generate a new RSA pair: `openssl genrsa 2048` → update `.env` → restart API. All active sessions are invalidated (users re-login once).
   - `FILE_SIGNING_SECRET` — generate a new value: `openssl rand -hex 32` → update `.env` → restart. Outstanding signed document links are invalidated immediately.
   - `DATABASE_URL` password — change the Postgres user password, update `.env`, restart.
   - `FIREBASE_PRIVATE_KEY` — go to Firebase Console → Project Settings → Service Accounts → generate a new key → delete the old one → update `.env`, restart.
   - `GMAIL_CLIENT_SECRET` / `GMAIL_REFRESH_TOKEN` — revoke in Google Cloud Console → re-run OAuth flow → update `.env`, restart.

2. **Revoke the old credential**
   - For Firebase: delete the old service account key in the console (not just generate a new one).
   - For Gmail OAuth: revoke the refresh token at `myaccount.google.com/permissions`.
   - For DB password: `ALTER USER smurbok_user PASSWORD 'new-password'` in psql.

3. **Redeploy**
   - `sudo systemctl restart smurbok-api` after each `.env` change.
   - Confirm startup succeeds: `journalctl -u smurbok-api -n 20`.

4. **Audit what was exposed**
   - Check `AuditLog` table for any unusual `CREATE`/`DELETE` actions in the exposure window.
   - Check Postgres logs for unexpected connections from outside the server.
   - Check Firebase Console → Authentication for unexpected user creation or sign-ins.
   - If `JWT_PRIVATE_KEY` was exposed: assume any userId in the database could have been impersonated. Check audit logs for admin actions.

5. **Document it**
   - Record: what was exposed, when, how it was discovered, what was rotated, and when.
   - Notify affected users if their data was or could have been accessed.

### High Priority

- [x] Rework vehicle authorization so access is based on a single shared helper instead of `vehicle.userId === userId` checks scattered across services
  - `VehicleAuthzService.requireView` — personal owner or any org member
  - `VehicleAuthzService.requireEdit` — personal owner or org OWNER/MANAGER
- [x] Fix org-vehicle access gaps across all modules
  - `vehicles`, `service-records`, `expenses`, `reminders`, `mileage-logs`, `documents`
  - all now go through `VehicleAuthzService`
- [x] Lock down workshop vehicle lookup
  - `GET /vehicles/lookup` now requires the caller to be a workshop member or ADMIN
- [ ] Replace ad hoc row-level authorization with explicit policy methods (partially done)
  - [x] `requireView` / `requireEdit` for vehicles and all sub-resources
  - [ ] `canCreateWorkOrder` — require owner approval or explicit link before workshop can create a work order
  - [ ] `canManageTripLog` — driver-only or driver+manager
  - [ ] `canViewDocument` — explicit org document access rules
- [x] Add real rate limiting on sensitive endpoints
  - global: 600 req/min per user (IP fallback) via `AppThrottlerGuard`
  - `/auth/login`: 10 req/min (brute-force protection)
  - `/vehicles/lookup`: 30 req/min
  - document token issuance: 30 req/min
  - `Retry-After` header included on 429 responses

### Medium Priority

- [x] Tighten trip-log authorization
  - driver can edit their own trip logs; MANAGER/OWNER can edit any trip in their org
- [x] Review work-order visibility rules
  - workshop members of the creating workshop: full read/write
  - personal vehicle owner: view only
  - org members (for org vehicles): view only
  - edit/complete/sign: workshop TECHNICIAN+ only
- [x] Review document access model for org vehicles
  - covered by VehicleAuthzService: view = any org member, edit = OWNER/MANAGER
- [x] Review audit-log correctness and coverage
  - fixed org creation using wrong resource type (`VEHICLE` → `ORGANIZATION`)
  - added audit logging for: org update, org delete, member add, member role change, member remove
- [x] Add validation and normalization for identifiers used in matching and search
  - license plates and VINs uppercased + separators stripped via `@Transform` in create/update DTOs
  - lookup normalizes query params the same way before hitting the DB
  - `@unique` constraint in schema now works correctly since all values are stored normalized

### Hardening / Defense In Depth

- [x] Add CSRF protection for cookie-authenticated write endpoints
  - upgraded cookie from `SameSite=Lax` to `SameSite=Strict`
  - cross-site requests can no longer trigger state-changing endpoints with the session cookie
- [x] Review CORS and cookie settings for production safety
  - multi-origin support via comma-separated `CORS_ORIGIN` env var
  - explicit methods/allowedHeaders allowlist
  - `trust proxy 1` set so `req.ip` reflects real client behind nginx
  - startup warning if `CORS_ORIGIN` is unset or localhost in production
- [x] Add safe file-serving headers on document download endpoint
  - `X-Content-Type-Options: nosniff`
  - `Content-Type` from explicit extension allowlist, never user-supplied
  - `Content-Disposition` always set (inline or attachment based on `?download=1`)
- [x] Review PDF/image processing attack surface
  - ghostscript: added `-dSAFER` (disables filesystem/process access) and 30s timeout
  - sharp: added `limitInputPixels` to block decompression bomb attacks
  - multer already limits input to 10 MB; magic-byte validation already in place
- [x] Add monitoring and alerting for security-sensitive failures
  - `LoggingInterceptor` emits `[SECURITY]` log entries for all 401/403/429 responses with IP and correlation ID
  - `JwtAuthGuard` logs suspended account access attempts with userId and IP
  - rate limiting already covers repeated abuse; logs show the 429 with key
- [ ] Add dependency and supply-chain security process
  - run dependency audit regularly
  - review lockfile changes in PRs
  - track updates for auth, file, image, PDF, and mail dependencies
  - add CI checks for known vulnerabilities where practical
- [ ] Review third-party processing surface for risky dependencies and tools
  - `jsonwebtoken`
  - Firebase Admin SDK
  - Nodemailer / Gmail OAuth
  - `sharp`
  - `pdfkit`
  - Ghostscript (`gs`)
- [ ] Enforce least-privilege runtime and filesystem permissions
  - uploads directory ownership and mode
  - service user permissions
  - document/temp-file handling
  - avoid broader-than-needed read/write access in production
- [ ] Separate dev, staging, and production security configuration clearly
  - separate secrets
  - separate OAuth credentials
  - separate signing keys
  - no production secrets on developer machines unless strictly required

### Testing / Verification

- [ ] Add automated security and authorization tests
  - unauthorized user cannot access another user's personal vehicle
  - org viewer/member/manager permissions are distinct and enforced
  - workshop cannot create work orders for arbitrary vehicles
  - signed document token cannot be forged or reused outside policy
  - admin-only endpoints reject non-admins
- [ ] Add regression tests for every fixed authorization bug before refactoring further
- [ ] Create a repeatable local security test setup
  - disposable Postgres
  - seeded users/orgs/workshops
  - sample vehicles and documents
  - scripted `curl` or e2e checks
- [ ] Reintroduce an actual API test suite
  - current repo has no active backend tests
  - do not rely on manual testing as the only security safety net
- [ ] Add security-focused smoke tests to CI
  - startup fails if required secrets are missing
  - non-admin requests fail on admin routes
  - forged JWTs fail
  - signed document token misuse fails

### Recommended Order

- [x] Step 1: rotate leaked secrets and remove secret material from the repo — confirmed clean, nothing to rotate
- [x] Step 2: remove fallback JWT secret and require startup-time secret validation
- [x] Step 3: unify authorization model for personal, org, and workshop access
- [x] Step 4: fix workshop lookup/work-order access rules
- [ ] Step 5: add regression tests for all access-control fixes

### Operational / Governance

- [ ] Define and document a formal permission matrix for every actor
  - `USER`
  - `ADMIN`
  - org `OWNER`
  - org `MANAGER`
  - org `DRIVER`
  - org `TECHNICIAN`
  - org `VIEWER`
  - workshop access vs fleet access vs personal-owner access
- [x] Add structured security logging with request correlation
  - UUID correlation ID generated per request, attached as `X-Request-Id` header
  - `LoggingInterceptor` logs: method, URL, status code, duration, correlation ID
  - Correlation ID available on `req.correlationId` for downstream use in error filters and services
- [ ] Expand admin audit trail quality
  - actor
  - target resource
  - before/after state for sensitive changes
  - membership and role changes
  - user disable/delete actions
- [ ] Add suspend/disable flows for users and organizations
  - safer than hard delete for abuse handling
  - prevents re-access while preserving evidence and audit history
  - **Schema:** add `suspendedAt DateTime? @map("suspended_at")` to `User` and `Organization`
  - **User suspend:** `PATCH /admin/users/:id/suspend` — sets `suspendedAt = now()`; JWT guard rejects any token where resolved user has `suspendedAt != null` (401 with `account_suspended` error code)
  - **User unsuspend:** `PATCH /admin/users/:id/unsuspend` — clears `suspendedAt`; user can log in again immediately
  - **Org suspend:** `PATCH /admin/organizations/:id/suspend` — sets `Organization.suspendedAt`; all org members get 403 on org-scoped resources until unsuspended
  - **Org unsuspend:** `PATCH /admin/organizations/:id/unsuspend` — clears `suspendedAt`
  - **Guard integration:** `JwtAuthGuard` should call a lightweight user lookup after validating the JWT signature; if `suspendedAt != null`, reject with 401 instead of 403 (so clients distinguish "bad token" from "account action needed")
  - **Org check:** `VehicleAuthzService` should reject org-vehicle access if org is suspended
  - **Audit:** every suspend/unsuspend action must be written to `AuditLog` with `ADMIN` actor and resource type `USER` or `ORGANIZATION`
- [ ] Add backup and restore verification plan
  - Postgres backups
  - uploads/documents backups
  - periodic restore test
  - documented recovery steps
- [ ] Add deployment security checklist
  - reverse proxy HTTPS enforcement
  - trusted proxy config if needed
  - secure cookie behavior in production
  - environment validation on startup
  - log redaction for secrets and tokens

---

## Web — Personal Phase 1

> **Scope:** Personal account UI only. Business and workshop screens come later.
> **Stack:** Next.js 16, React 19, Tailwind CSS 4, next-intl (is/en), React Query, Axios, react-hook-form + Zod.
> **Design:** Modern, clean, minimal. Neutral color palette. Light and dark mode from day one — use CSS variables / Tailwind `dark:` throughout. No gradients or decorative noise. Mobile-responsive (single-column on small screens, max-w-2xl centered on desktop).

---

### Current Demo State

What is already built and working:

- Login page — Firebase email/password + Google OAuth
- Vehicles list page
- Vehicle detail page — 4 tabs: overview, timeline, reminders, documents
- Dashboard page — stat cards, upcoming reminders, recent activity
- Forms — add/edit service record, add/edit expense, add mileage log, add/edit reminder, upload document, create/edit vehicle
- API hooks — dashboard, vehicles, vehicle overview/timeline, reminders, mileage logs, documents, car ref data

What is **missing** from the demo (full gap list):

- No persistent navigation (header/nav bar)
- No dark mode — all colors are hardcoded light values
- No `/user` profile page
- No expenses tab on vehicle detail (hook + form exist, but no list view or tab)
- No magic link login flow in the web UI (API is ready)
- No language switcher in the UI
- No notification preference toggle in the UI
- No snooze reminder action
- No edit reminder action
- No delete actions with confirmation (dialog component exists, not wired up)
- No vehicle archive / restore / undelete flow
- No service record or expense delete/undelete
- No mileage log delete/undelete
- No storage usage view
- Emoji icons instead of a proper icon library
- No empty states on list pages (component exists, not used consistently)
- No error boundaries / 404 handling

---

### W1 — Design System & Layout Foundation

Establish the design tokens and shell that every subsequent screen builds on. Nothing else should be built until this is done.

- [x] Add dark mode support: configure Tailwind `darkMode: 'class'`, add `dark` class to `<html>` on mount based on `prefers-color-scheme`, persist preference to `localStorage`
- [x] Define CSS custom properties for semantic color tokens (`--surface`, `--surface-raised`, `--surface-overlay`, `--border`, `--text-primary`, `--text-muted`, `--accent`, `--danger`) with light and dark values — used throughout via `style={{ color: 'var(--...)' }}` and Tailwind arbitrary values
- [x] Install and configure an icon library (`lucide-react`) — replaced all emoji icons with proper SVG icons throughout the app
- [x] Build a persistent `AppShell` component: top nav bar; includes Smurbók logo/wordmark, nav links (Dashboard, Vehicles), user avatar button that opens a dropdown (Profile, dark mode toggle, Language, Sign out)
- [x] Wire `AppShell` into the `(app)/layout.tsx` — removed per-page `Shell` wrappers from all pages
- [x] Add dark mode toggle button in the nav (sun/moon icon, updates class + localStorage)
- [x] Add language switcher in nav dropdown — calls `PATCH /v1/auth/me/language` then switches `next-intl` locale
- [x] Standardize `Button`, `Input`, `Card`, `Badge` as reusable primitive components using the token system — all pages and forms migrated to these primitives; `Modal`, `ConfirmDialog`, `Skeleton`, `EmptyState`, `Combobox` also updated to use tokens

---

### W2 — Auth Improvements

- [x] Add magic link login tab to the login page: email input → `POST /v1/auth/magic-link` → show "check your email" state → poll `GET /v1/auth/magic-link/status?sessionId=` every 2 s until token arrives → call `POST /v1/auth/login` with the JWT → redirect to dashboard
- [x] Add `/magic-link/success` and `/magic-link/error` pages (API redirects to these after verification)
- [x] Add proper logout: call `POST /v1/auth/logout` → clear React Query cache → redirect to login
- [x] Show a loading spinner while `AuthProvider` is resolving the initial session (currently shows nothing or flashes)
- [x] Handle `401` globally in the Axios instance — intercept, clear session, redirect to `/login`

---

### W3 — Dashboard

The dashboard exists but is sparse. Polish it into a real landing page.

- [x] Add a "Your vehicles" quick-access strip below the stat cards — horizontal scroll on mobile, grid on desktop; each card shows vehicle make/model, plate, and latest mileage
- [x] Make overdue reminder items clickable and link directly to the vehicle reminders tab
- [x] Add a "Log mileage" quick action on each vehicle card in the strip
- [x] Show an empty state with a CTA to add a vehicle when `counts.vehicles === 0`
- [x] Replace hardcoded `'is-IS'` date locale with the user's `language` preference

---

### W4 — Vehicles List

- [x] Add a "New vehicle" button that opens `CreateVehicleForm` inline or as a sheet (currently only accessible from within the page — make it obvious)
- [x] Show fuel type badge and latest mileage on each vehicle card
- [x] Add vehicle archive action (with confirm dialog) — calls `POST /v1/vehicles/:id/archive`
- [x] Add vehicle delete action (with confirm dialog) — calls `DELETE /v1/vehicles/:id`; show "undo" / undelete option for 7 days
- [x] Add an "Archived" toggle/filter to show archived vehicles with restore actions
- [x] Empty state when user has no vehicles

---

### W5 — Vehicle Detail

- [x] **Add Expenses tab** to the vehicle detail page — currently the only missing tab
  - [x] Build `ExpenseList` component: list of expense cards with category badge, amount (ISK), date, edit + delete actions
  - [x] Wire `useExpenses(vehicleId)` hook (hook doesn't exist yet — add it calling `GET /v1/vehicles/:vehicleId/expenses`)
  - [x] Add expense edit (modal with `EditExpenseForm` — form exists, not reachable from a list)
  - [x] Add expense delete with confirm
- [x] **Reminders tab** — add missing actions:
  - [x] Edit reminder (open `EditReminderForm` — form doesn't exist yet, build it)
  - [x] Snooze reminder — date picker modal → `POST /v1/reminders/:id/snooze`
  - [x] Delete reminder with confirm → `DELETE /v1/reminders/:id`
  - [x] Mark reminder as DONE — `PATCH /v1/reminders/:id` `{ status: 'DONE' }`
- [x] **Service records tab** — currently buried in timeline; add a dedicated tab:
  - [x] Build `ServiceRecordList` component with edit + delete actions
  - [x] Wire service record delete → `DELETE /v1/service-records/:id`
- [x] **Mileage tab** — simple log of mileage entries with delete action
  - [x] Build `MileageLogList` component
  - [x] Wire mileage log delete → `DELETE /v1/mileage-logs/:id`
- [x] **Overview tab** — add VIN display if present; add color if color is set
- [x] **Documents tab** — add delete document action with confirm dialog (calls `DELETE /v1/documents/:id`)
- [x] Edit vehicle — accessible from the header edit button (already present), ensure all fields save correctly

---

### W6 — /user — Profile Page

New route: `/(app)/user/page.tsx`

- [x] **Profile section**
  - Display name (display-only — `PATCH /v1/auth/me` not yet added)
  - Email (read-only)
  - Language preference — dropdown (is / en) → `PATCH /v1/auth/me/language`
  - Member since date
- [x] **Notification preferences**
  - Email notifications toggle → `PATCH /v1/auth/me/notifications` `{ emailNotifications: true/false }`
  - Explanatory text: "We send reminders 14, 7, and 0 days before due date"
- [x] **Storage usage**
  - Show used / total storage bar → `GET /v1/storage`
  - List of documents taking up space (sorted by size) — `fileSizeBytes` stored on upload, returned by `GET /v1/storage` as `topDocuments`
- [x] **Danger zone** (section at bottom, visually separated)
  - "Export my data" button → disabled with "Coming soon" tooltip (API not ready)
  - "Delete account" button → disabled with "Coming soon" tooltip (API not ready)

---

### W7 — Polish & Cross-Cutting

- [x] Consistent empty states on every list (use `EmptyState` component) — all list components use `EmptyState` with icon + message
- [x] Add a global toast for undelete: "Deleted. Undo?" with 5 s timer — `useUndelete*` mutations added for service records, expenses, mileage logs, reminders; toast undo wired in all list components
- [x] Skeleton loaders on all data-fetching screens — `ListSkeleton` added to reminders + documents tabs; all other tabs already had it; `OverviewSkeleton` on dashboard and vehicle detail load
- [x] Error boundary at the `(app)` layout level — `error.tsx` exists, "Try again" now translated
- [x] 404 page — `app/[locale]/not-found.tsx` created (locale-aware, translated); root `not-found.tsx` kept as English fallback
- [x] Replace hardcoded locale strings (`'is-IS'`) — `dashboard/page.tsx` migrated to `useDateLocale()`; toast provider "Undo" and error boundary "Try again" now use `t()` 
- [x] Accessibility: interactive list buttons have `aria-label` + `title`; tab buttons are keyboard-accessible with visible active state
- [x] Vehicle transfer accept/decline page: `/transfers/accept?token=` — shows vehicle info, accept/decline buttons (requires login); `?next=` redirect support added to login page so email links work end-to-end
- [x] Org invite accept page: `/invites/accept?token=` — shows org name + role, accept button; same login redirect pattern
- [ ] Responsive pass: visual testing at 375 px / 768 px / 1280 px (must be done manually in browser)

---

### Web — Out of Scope for Personal Phase 1

These belong to later phases:

- Business / fleet UI (organizations, fleet dashboard, trip logs, cost reports, bulk reminders)
- Workshop UI (work orders, technician view)
- Admin panel web UI
- Service record export PDF per vehicle
- Recurring reminder UI (API not done)
- GDPR data export UI (API not done)
- Account deletion UI (API not done)
- Mobile app (separate codebase — see mobile/ directory)

---

---

## Mobile 1 — UI Polish

> **Goal:** Make the existing screens look great before adding new features. Keep the current dark/light theme system — improve the tokens, spacing, and component quality rather than replacing it.
> **Stack:** Expo Router, React Native, custom `ThemeContext` (light/dark), `Ui.tsx` shared components.
> **Scope:** No new API endpoints or screens. Every change is visual or UX.

---

### M1-1 — Theme & Token Improvements

Tighten the design token layer so every screen benefits automatically.

- [x] Audit `theme/index.ts` — add missing semantic tokens: `surfaceRaised`, `borderSubtle`, `borderStrong`, `accentSubtle`, `dangerSubtle`
- [x] Ensure all existing hardcoded colors in screens and `Ui.tsx` are replaced with theme tokens
- [x] Improve shadow/elevation values for cards in both light and dark mode (light: soft drop shadow via `cardShadowColor` token, dark: flat with border)
- [x] Add consistent border-radius constants (`RADIUS.sm/md/lg/xl`) and apply throughout (already existed, now used consistently)

---

### M1-2 — Tab Bar Redesign

- [x] Increase tab bar height and icon size — height bumped to 60, labels visible
- [x] Add a label below each icon (Dashboard, Vehicles, Profile)
- [x] Active tab: accent-colored pill background behind icon via `TabIcon` component
- [x] Add subtle top border on the tab bar using `borderStrong` token
- [x] Haptic feedback on tab press (`expo-haptics`) — `ImpactFeedbackStyle.Light` wired in `TabIcon` via `Pressable`

---

### M1-3 — Vehicle Cards (List Screen)

- [x] Add a color-coded left accent bar derived from vehicle `color` field (fallback to blue)
- [x] Show fuel type as a colored chip pill with a dot indicator
- [x] Show latest mileage with odometer icon
- [x] Improve card spacing — license plate in its own badge, chevron indicator
- [x] Empty state with icon + title + CTA button

---

### M1-4 — Dashboard Screen

- [x] Stat cards: icon in colored chip per type (accent/amber/red), color-coded numbers
- [x] Overdue reminder count: `dangerSubtle` background when `> 0`
- [x] Upcoming reminders: due-in countdown badge ("Today", "3d", "Overdue") colored by urgency
- [x] Recent activity items: accent icon chip per item
- [x] Skeleton loaders on stat row, vehicles strip, and both list sections
- [x] Empty state with check icon when no pending reminders

---

### M1-5 — Vehicle Detail Screen

- [x] Hero section: 4px color accent strip at top derived from vehicle color
- [x] License plate in a styled bordered badge; VIN in a secondary badge
- [x] Fuel type + mileage as styled chips below the plate row
- [x] Stats row: icon + number + label, separated by hairline verticals
- [x] Quick action buttons: each with per-type accent color background
- [x] Section headers with count badges
- [x] Section items: icon chip per type (wrench/card/speedometer), cleaner layout
- [x] "Load more" button with remaining count at bottom of service/expense/mileage sections
- [x] Reminder items: DONE (strikethrough + green badge), SNOOZED (blue badge), Overdue (red background + badge), urgency day countdown badge

---

### M1-6 — Form Screens

- [x] Replace plain `TextInput` date fields with native `DateTimePicker` — `DateField` component in `Ui.tsx`; iOS shows bottom-sheet modal with spinner, Android shows native dialog; all 5 forms updated
- [x] Improve enum pickers — `ChipGroup` component in `Ui.tsx` (wrap or horizontal scroll); used across service type, expense category, reminder type, fuel type, due date toggle
- [x] Form field labels: consistent font size/color/spacing (already in FormField component)
- [x] Inline validation error display below field (already in FormField component)
- [x] Keyboard-aware scroll: all 5 forms wrapped in `KeyboardAvoidingView` (padding on iOS, height on Android)
- [x] Loading state on submit button (already implemented via `loading` prop on Button)
- [x] Haptic feedback on successful submit — `expo-haptics` installed, `NotificationFeedbackType.Success` on all form submits + mark done + snooze confirm

---

### M1-7 — Empty States

- [x] Replace plain text empty states with icon + title + subtext layout (new `EmptyState` with `icon` and `title` props)
- [x] CTA action button in each empty state (accent background, not just a link)
- [x] Applied consistently across vehicles list, vehicle detail sections

---

### M1-8 — Skeleton Loaders

- [x] Add `Skeleton` component with animated shimmer (pulse opacity animation)
- [x] Add `SkeletonCard` helper for card-shaped skeletons
- [x] Vehicle list: 3 skeleton cards while loading
- [x] Dashboard: skeleton stat row + skeleton section items
- [x] `Spinner` color changed from `muted` to `accent` for better visibility

---

### M1-9 — Profile Screen

- [x] Avatar circle: larger (72px), accent-tinted background, shows up to 2 initials
- [x] Visual card groups for Appearance, Preferences, Account
- [x] Toggle rows: icon chip on left, label + subtitle, control on right
- [x] Language row shows current language as subtitle text
- [x] Theme picker buttons include icons (sun / moon / phone)
- [x] Sign Out row has danger icon chip and chevron, inside a card

---

## Mobile 2 — Feature Parity

> **Goal:** Make the mobile app do everything the web app does. Build on the polished foundation from Mobile 1.
> **Prerequisite:** Mobile 1 complete.

---

### M2-1 — Edit Support (Full CRUD) ✅

The mobile app currently has no PATCH calls. Add edit screens for all editable resources.

- [x] **Edit Vehicle** — new screen `edit-vehicle.tsx` (or reuse `add-vehicle.tsx` with pre-filled values): all fields (make, model, year, plate, fuel type, color, VIN) → `PATCH /v1/vehicles/:id`
- [x] **Edit Service Record** — new screen `edit-service.tsx`: type, mileage, date, description, cost, shop → `PATCH /v1/service-records/:id`
- [x] **Edit Expense** — new screen `edit-expense.tsx`: category, amount, date, description → `PATCH /v1/expenses/:id`
- [x] **Edit Reminder** — new screen `edit-reminder.tsx`: type, due date, due mileage, note, recurrence → `PATCH /v1/reminders/:id`
- [x] Wire "Edit" button/action on each item in vehicle detail sections (long-press menu or swipe action)

---

### M2-2 — Snooze & Reminder Status ✅

- [x] Add **Snooze** action to reminder items — opens a date picker; on confirm calls `POST /v1/reminders/:id/snooze` with `{ newDueDate }`
- [x] Display SNOOZED status badge (blue) alongside PENDING (amber) and DONE (green) on reminder items
- [x] Filter reminders by status — All / Pending / Done chip toggle above the reminders list

---

### M2-3 — Soft Delete + Undo Toast ✅

- [x] After every delete action, show a toast at the bottom of the screen: "Deleted. Undo?" with a 5-second dismiss timer
- [x] On "Undo" tap: call the relevant undelete endpoint and refresh the list
  - Service records: `POST /v1/service-records/:id/undelete`
  - Expenses: `POST /v1/expenses/:id/undelete`
  - Mileage logs: `POST /v1/mileage-logs/:id/undelete`
  - Reminders: `POST /v1/reminders/:id/undelete`
  - Vehicles: `POST /v1/vehicles/:id/undelete`
- [x] Build a reusable `useUndoToast(undoFn)` hook that handles the timer and state

---

### M2-4 — Documents Tab ✅

Full document management — currently not implemented at all on mobile.

- [x] Add **Documents** section to the vehicle detail screen (alongside Service, Expenses, Mileage, Reminders)
- [x] `DocumentList` component: show document name, file size, upload date; each row has Download + Delete actions
- [x] **Upload document**: action sheet with two options — "Camera" (`expo-image-picker`) and "Files" (`expo-document-picker`)
  - Construct `multipart/form-data` and call `POST /v1/vehicles/:id/documents`
- [x] **View/Download**: call `GET /v1/documents/:id/link` to get signed URL, then open with `Linking.openURL`
- [x] **Delete document**: optimistic remove → `DELETE /v1/documents/:id` → undo toast
- [x] Show document count badge on the Documents section header

---

### M2-5 — Timeline Tab ✅

- [x] Add **Timeline** section to the vehicle detail screen
- [x] Call `GET /v1/vehicles/:id/timeline` and render a chronological grouped list
- [x] Group items by date (day heading + items below)
- [x] Item row: icon by type (wrench = service, card = expense, gauge = mileage), primary info, amount/mileage, date
- [x] "Load more" at the bottom when there are more timeline entries to fetch (use offset pagination)

---

### M2-6 — Profile — Storage, Export & Delete Account ✅

- [x] **Storage usage section** on profile screen
  - Call `GET /v1/storage` — show used/total as a progress bar
  - Color the bar: green < 70%, amber 70–90%, red > 90%
  - Show document count and vehicle count vs limits
  - List top documents by file size (name, vehicle, size)
- [x] **Export data** button → opens signed export URL via `Linking.openURL`
- [x] **Delete account** button in Danger Zone
  - Show a confirmation modal requiring the user to type "delete"
  - On confirm: `DELETE /v1/auth/me` → sign out and redirect to login

---

### M2-7 — Load More Pagination ✅

- [x] All section lists in vehicle detail (service, expenses, mileage, reminders) use offset pagination
- [x] Initial fetch = 10 items (PAGE_SIZE constant)
- [x] "Load more (N remaining)" button at the bottom of each section; appends next page
- [x] Loading state shown while fetching ("Loading…")
- [x] Button hidden when all items loaded (`total <= shown`)
- [x] Timeline section also paginated with load more

---

## Future / Icelandic e-ID Integration

When the Icelandic e-ID (Ísland.is / Auðkenni) auth provider is available:

- Swap or augment Firebase auth with Ísland.is OIDC
- On first login: query Samgöngustofa (Transport Authority) API by kennitala (SSN) to auto-import registered vehicles
- Auto-fill: make, model, year, license plate, VIN, fuel type from registry
- This removes need for manual vehicle entry for Icelandic users
- The `User.firebaseUid` field can be renamed/extended to `externalAuthId` with a `authProvider` enum (FIREBASE | EIDIS)

---

## Notes

- Keep the API fully stateless — no session state, pure JWT
- All dates stored as UTC in database
- License plates in Iceland: format validation for Icelandic plates (2-3 letters + 2-3 digits)
- Cost amounts stored in ISK (Icelandic krona) as integers (no decimals) or as decimal with currency field for future multi-currency
- File storage: consider moving to S3-compatible storage (e.g. Cloudflare R2) for production scale
