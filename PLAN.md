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
| Push notifications (FCM) | Deferred to mobile app |
| API versioning (`/v1`) | Done |
| Pagination on list endpoints | Done |
| ETag / Last-Modified caching | Done |
| Audit logging | Done |
| CSV/PDF export | Done |
| Soft deletes (7-day recovery window) | Done |
| Recurring reminders | Not started |
| Mileage-based reminder triggering | Not started |
| Org invite system | Not started |
| Fuel efficiency calculations | Not started |
| Personal data export (GDPR) | Not started |
| Vehicle transfer | Not started |
| Work order → service record link | Not started |
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
- [ ] Push notification registration (FCM device tokens) — defer to mobile app
- [ ] Push notifications for reminders and work order updates — defer to mobile app

### Phase 6 — Admin Panel
- [ ] Organization management (create, suspend, upgrade account type)
- [ ] Platform-wide analytics dashboard
- [ ] Audit log viewer
- [ ] Storage monitoring per user/org

### Phase 7 — Mobile API Polish
- [x] Review all endpoints for mobile-friendliness
- [x] Ensure consistent pagination across all list endpoints
- [x] Add `ETag` / `Last-Modified` headers for caching
- [x] Document all endpoints in Swagger with examples
- [x] Test suite covering all critical paths (removed — manual testing via api-test module was sufficient)

### Phase 8 — Data Integrity & Validation
Harden the data layer against bad input and accidental loss.

- [ ] Icelandic license plate format validation in `CreateVehicleDto` (2-3 letters + 2-3 digits, e.g. `ABC12` or `AB123`)
- [ ] VIN checksum validation (17-char ISO 3779 check digit) in `CreateVehicleDto`
- [ ] Mileage consistency check: warn (or reject) if a new mileage log entry is lower than the vehicle's current highest recorded mileage
- [ ] Soft deletes on `Vehicle` — add `archivedAt` field; archived vehicles hide from lists but retain all history
- [ ] Soft deletes on `WorkOrder` — mark cancelled rather than hard delete
- [ ] Audit log coverage expansion: add `WORK_ORDER`, `ORGANIZATION`, `TRIP_LOG` to `AuditResource` enum
- [ ] Reminder snooze endpoint: `POST /reminders/:id/snooze` — sets status to `SNOOZED` and updates `dueDate` to a new date

### Phase 9 — Smart Automation
Logic that runs automatically based on data events.

- [ ] Mileage-based reminder triggering: when a mileage log is created, check if any `PENDING` reminders on that vehicle have `dueMileage <= newMileage` and mark them due (or send a notification hook)
- [ ] Recurring reminders: add `recurrenceMonths` field to `Reminder`; when a reminder is marked `DONE`, auto-create the next one offset by `recurrenceMonths`
- [ ] Fuel efficiency endpoint: `GET /vehicles/:id/fuel-efficiency` — calculate avg `km/L` and `L/100km` from trip logs (distance) and `FUEL` expenses (amount in litres, requires a `litres` field on expense or a new fuel log model)
- [ ] Work order → service record link: when a work order is completed/signed, optionally create a `ServiceRecord` on the vehicle (type, mileage, description, cost from work order)
- [ ] Vehicle acquisition/disposal tracking: add `acquiredAt` and `disposedAt` to `Vehicle`; disposed vehicles are fully archived

### Phase 10 — Org Collaboration
Features that make multi-user orgs smoother to operate.

- [ ] Org invite system: `POST /organizations/:id/invites` — sends a signed invite token by email; recipient clicks link, signs up or logs in, gets auto-added as a member with the specified role
- [ ] Pending invite model: `OrgInvite` — orgId, email, role, token, expiresAt, acceptedAt
- [ ] Vehicle transfer: `POST /vehicles/:id/transfer` — transfer ownership from one user to another, or from personal to org (with acceptance flow)
- [ ] Cost center assignment on expenses: allow fleet expenses to be tagged to a `CostCenter` for departmental reporting
- [ ] Service record export per vehicle: `GET /vehicles/:id/export/service-history.pdf` — PDF of full service history for a single vehicle (useful for resale)

### Phase 11 — Platform & Integrations
Infrastructure for scale and external integrations.

- [ ] Webhook support: `POST /webhooks` — register a URL to receive event payloads (work order completed, reminder due, vehicle added); sign payloads with HMAC
- [ ] S3-compatible storage (Cloudflare R2): replace local filesystem storage with R2; update signed URL generation; keep local as fallback for dev
- [ ] Personal data export (GDPR): `GET /auth/me/export` — returns a ZIP of all user data (vehicles, records, documents, expenses) in JSON + original files
- [ ] Account deletion: `DELETE /auth/me` — hard deletes user and all owned data after a confirmation step; removes from all org memberships
- [ ] API key support: `POST /auth/api-keys` — generate long-lived API keys for programmatic access (for future mobile apps or integrations); stored as hashed tokens

---

## Security Concerns To Fix

These are the main security and access-control concerns found during backend review. Claude should treat the first section as highest priority.

### Critical

- [ ] Remove all committed secrets from the repo and rotate everything exposed in `api/.env`
  - Firebase private key
  - database credentials
  - `FILE_SIGNING_SECRET`
  - Gmail OAuth client secret + refresh token
  - any other production or staging secrets that may have been copied from this file
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
  - global: 120 req/min via `ThrottlerGuard` on all routes
  - `/auth/login`: 10 req/min (brute-force protection)
  - `/vehicles/lookup`: 30 req/min
  - document token issuance: 30 req/min

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
- [ ] Review CORS and cookie settings for production safety
  - confirm exact allowed origins
  - confirm `secure` cookie behavior behind reverse proxy
  - document local/dev behavior separately
- [x] Add safe file-serving headers on document download endpoint
  - `X-Content-Type-Options: nosniff`
  - `Content-Type` from explicit extension allowlist, never user-supplied
  - `Content-Disposition` always set (inline or attachment based on `?download=1`)
- [ ] Review PDF/image processing attack surface
  - ghostscript invocation
  - image transformation limits
  - oversized/decompression-bomb handling
  - timeouts and failure behavior
- [ ] Add monitoring and alerting for security-sensitive failures
  - repeated auth failures
  - repeated lookup abuse
  - excessive signed-link requests
  - admin endpoint access
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

- [ ] Step 1: rotate leaked secrets and remove secret material from the repo
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
