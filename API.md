# Smurbók API Reference

Base URL: `https://your-domain/v1` (except where noted)

All authenticated endpoints require a valid session cookie (`access_token`) obtained via `POST /v1/auth/login`.

**Common response codes on every authenticated endpoint:**
- `401` — missing or expired token
- `403` — insufficient role or membership
- `404` — resource not found
- `400` — validation error
- `429` — rate limit exceeded (`Retry-After` header included)

---

## Auth

| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| POST | `/v1/auth/login` | Public | Exchange Firebase ID token for a server-issued JWT (httpOnly cookie). **10 req/min** |
| POST | `/v1/auth/logout` | Required | Clears the session cookie |
| GET | `/v1/auth/me` | Required | Current user profile |
| PATCH | `/v1/auth/me/language` | Required | Set preferred language (`is` / `en`) |
| PATCH | `/v1/auth/me/notifications` | Required | Toggle email notifications on/off |

---

## Vehicles

| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| GET | `/v1/vehicles` | Required | List own vehicles (paginated) |
| POST | `/v1/vehicles` | Required | Create a vehicle |
| GET | `/v1/vehicles/lookup?licensePlate=&vin=` | Required | Lookup by plate or VIN — workshop members and admins only. **30 req/min** |
| GET | `/v1/vehicles/:id` | Required | Get a vehicle |
| PATCH | `/v1/vehicles/:id` | Required | Update a vehicle |
| DELETE | `/v1/vehicles/:id` | Required | Soft delete — recoverable within 7 days |
| POST | `/v1/vehicles/:id/archive` | Required | Archive — hides from list, retains all history |
| POST | `/v1/vehicles/:id/restore` | Required | Restore an archived vehicle |
| POST | `/v1/vehicles/:id/undelete` | Required | Recover a soft-deleted vehicle within 7 days |
| GET | `/v1/vehicles/:id/overview` | Required | Latest mileage, estimated mileage, last service, upcoming reminders, counts |
| GET | `/v1/vehicles/:id/timeline` | Required | Chronological feed of all service records, expenses, and mileage logs |

---

## Service Records

| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| GET | `/v1/vehicles/:vehicleId/service-records` | Required | List service records (paginated) |
| POST | `/v1/vehicles/:vehicleId/service-records` | Required | Create a service record (auto-syncs mileage log if mileage is a new high) |
| PATCH | `/v1/service-records/:id` | Required | Update a service record |
| DELETE | `/v1/service-records/:id` | Required | Soft delete |
| POST | `/v1/service-records/:id/undelete` | Required | Recover within 7 days |

---

## Expenses

| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| GET | `/v1/vehicles/:vehicleId/expenses` | Required | List expenses (paginated) |
| POST | `/v1/vehicles/:vehicleId/expenses` | Required | Create an expense |
| PATCH | `/v1/expenses/:id` | Required | Update an expense |
| DELETE | `/v1/expenses/:id` | Required | Soft delete |
| POST | `/v1/expenses/:id/undelete` | Required | Recover within 7 days |

---

## Mileage Logs

| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| GET | `/v1/vehicles/:vehicleId/mileage-logs` | Required | List mileage logs (paginated) |
| POST | `/v1/vehicles/:vehicleId/mileage-logs` | Required | Create a mileage log entry |
| DELETE | `/v1/mileage-logs/:id` | Required | Soft delete |
| POST | `/v1/mileage-logs/:id/undelete` | Required | Recover within 7 days |

---

## Reminders

| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| GET | `/v1/vehicles/:vehicleId/reminders` | Required | List reminders (paginated) |
| POST | `/v1/vehicles/:vehicleId/reminders` | Required | Create a reminder |
| PATCH | `/v1/reminders/:id` | Required | Update a reminder |
| DELETE | `/v1/reminders/:id` | Required | Soft delete |
| POST | `/v1/reminders/:id/snooze` | Required | Snooze — updates due date, resets notification flags so emails re-send |
| POST | `/v1/reminders/:id/undelete` | Required | Recover within 7 days |

---

## Documents

| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| GET | `/v1/vehicles/:vehicleId/documents` | Required | List documents (paginated) |
| POST | `/v1/vehicles/:vehicleId/documents` | Required | Upload a file (multipart/form-data, max 10 MB, accepted: jpg / png / webp / pdf) |
| GET | `/v1/documents/:id/link` | Required | Issue a short-lived signed token for file access. **30 req/min** |
| GET | `/v1/documents/file?token=&download=` | Public | Serve file via signed token. `download=1` forces attachment download |
| DELETE | `/v1/documents/:id` | Required | Soft delete |

---

## Trip Logs

| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| GET | `/v1/vehicles/:vehicleId/trip-logs` | Required | List trip logs (paginated) |
| POST | `/v1/vehicles/:vehicleId/trip-logs` | Required | Start a trip — driver is set to the calling user |
| PATCH | `/v1/trip-logs/:id` | Required | Update / close a trip (set `endMileage`) |
| DELETE | `/v1/trip-logs/:id` | Required | Soft delete |

---

## Work Orders

| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| POST | `/v1/work-orders` | Required | Create a work order (workshop TECHNICIAN+) |
| GET | `/v1/work-orders?workshopOrgId=` | Required | List work orders for a workshop |
| GET | `/v1/work-orders?vehicleId=` | Required | List work orders for a vehicle (owner view) |
| GET | `/v1/work-orders/:id` | Required | Get a work order |
| PATCH | `/v1/work-orders/:id` | Required | Update a work order (not yet signed, workshop TECHNICIAN+) |
| DELETE | `/v1/work-orders/:id` | Required | Cancel a work order (workshop MANAGER+, not yet signed) |
| POST | `/v1/work-orders/:id/complete` | Required | Mark a work order as completed (workshop TECHNICIAN+) |
| POST | `/v1/work-orders/:id/sign` | Required | Digitally sign a completed work order (workshop TECHNICIAN+) |

---

## Organizations

| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| POST | `/v1/organizations` | Required | Create an organization — caller becomes OWNER |
| GET | `/v1/organizations` | Required | List organizations I am a member of |
| GET | `/v1/organizations/:id` | Required | Get an organization |
| PATCH | `/v1/organizations/:id` | Required | Update org details (MANAGER+) |
| DELETE | `/v1/organizations/:id` | Required | Delete org and all its data (OWNER only) |
| GET | `/v1/organizations/:id/members` | Required | List members |
| POST | `/v1/organizations/:id/members` | Required | Add a member by email (MANAGER+) |
| PATCH | `/v1/organizations/:id/members/:userId` | Required | Change a member's role (OWNER only) |
| DELETE | `/v1/organizations/:id/members/:userId` | Required | Remove a member (MANAGER+) |
| GET | `/v1/organizations/:id/vehicles` | Required | List org vehicles |
| POST | `/v1/organizations/:id/vehicles` | Required | Add a vehicle to the org (MANAGER+) |
| PATCH | `/v1/organizations/:id/vehicles/:vehicleId` | Required | Update an org vehicle (MANAGER+) |
| DELETE | `/v1/organizations/:id/vehicles/:vehicleId` | Required | Remove an org vehicle from the org (MANAGER+) |
| GET | `/v1/organizations/:id/dashboard` | Required | Fleet dashboard — vehicles, open trips, upcoming reminders, month costs |
| GET | `/v1/organizations/:id/costs` | Required | Cost report, filterable by vehicle / category / date range |
| POST | `/v1/organizations/:id/reminders/bulk` | Required | Create the same reminder on multiple (or all) org vehicles (MANAGER+) |
| GET | `/v1/organizations/:id/export/costs.csv` | Required | Download cost report as CSV |
| GET | `/v1/organizations/:id/export/costs.pdf` | Required | Download cost report as PDF |

---

## Dashboard

| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| GET | `/v1/dashboard` | Required | Personal summary across all own vehicles |

---

## Admin — Users

> All endpoints in this section require the `ADMIN` role.

| Method | Route | Notes |
|--------|-------|-------|
| GET | `/v1/users` | List all users (paginated) |
| GET | `/v1/users/:id` | Get a user by ID |
| PATCH | `/v1/users/:id` | Update role, language, or display name |
| DELETE | `/v1/users/:id` | Delete a user and all their data |

---

## Admin — Storage

| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| GET | `/v1/storage` | Required | Own storage usage |
| GET | `/v1/storage/admin/all` | Admin | Platform-wide storage usage across all users |
| GET | `/v1/storage/admin/user/:userId` | Admin | Storage usage for a specific user |

---

## Reference Data

| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| GET | `/v1/ref/makes` | Public | List all car makes |
| GET | `/v1/ref/makes/:makeId/models` | Public | List models for a make |
| POST | `/v1/ref/makes` | Admin | Add a car make |
| DELETE | `/v1/ref/makes/:makeId` | Admin | Delete a make and all its models |
| POST | `/v1/ref/makes/:makeId/models` | Admin | Add a model to a make |
| DELETE | `/v1/ref/models/:modelId` | Admin | Delete a model |

---

## Health

| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| GET | `/health` | Public | Liveness check — no `/v1` prefix |

---

## Pagination

All list endpoints accept `?page=1&limit=20` query parameters and return:

```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

## Rate Limits

| Scope | Limit |
|-------|-------|
| Global (all routes) | 600 req/min per user (IP fallback) |
| `POST /v1/auth/login` | 10 req/min |
| `GET /v1/vehicles/lookup` | 30 req/min |
| `GET /v1/documents/:id/link` | 30 req/min |

When a limit is exceeded the response is `429 Too Many Requests` with a `Retry-After: N` header (seconds).

## Soft Deletes

Deleted records are not immediately removed from the database. They are recoverable for **7 days** via the `POST …/:id/undelete` endpoint on the same resource. After 7 days a nightly purge job permanently removes them.

Resources with soft delete: vehicles, service records, expenses, mileage logs, reminders, documents, work orders, trip logs.

## Organization Roles

| Role | Vehicles | Members | Costs | Trip Logs | Work Orders |
|------|----------|---------|-------|-----------|-------------|
| OWNER | Full | Full | View | View | View |
| MANAGER | Full | Add/remove | View | View | View |
| DRIVER | View | — | — | Own trips | View |
| TECHNICIAN | View | — | — | — | Create/complete/sign |
| VIEWER | View | — | — | — | View |
