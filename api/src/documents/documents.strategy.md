# Document / File Upload Strategy

## Storage
- Files land at: `/opt/smurbok/uploads/<userId>/<vehicleId>/<uuid>.<ext>`
- Served via a static route or a dedicated GET endpoint (not from the DB)
- `Document.fileUrl` in Postgres stores the **relative path** (e.g. `uploads/abc/def/uuid.pdf`)
  — never an absolute host path, so the URL stays valid after domain changes

## Upload flow
```
POST /api/vehicles/:id/documents
  multipart/form-data: file + { type, label, serviceRecordId?, expenseId? }
  → validate mime type + size
  → write to disk at uploads/<userId>/<vehicleId>/<uuid>.<ext>
  → INSERT Document row with relative fileUrl
  → return Document record
```

## Constraints
- Max file size: 10 MB
- Allowed mime types: image/jpeg, image/png, image/webp, application/pdf
- Filename stored in DB: `label` field (user-facing), not the original filename
- Storage key is always a UUID — never trust the original filename

## Serving files
- Static route: `GET /uploads/<userId>/<vehicleId>/<uuid>.<ext>`
  served by NestJS `ServeStaticModule` (or Express static middleware)
- Access check: guard verifies the userId prefix matches the requesting user
  (simplest: encode userId in the path, check it in the route handler)

## What goes in Postgres
```
Document {
  id          uuid
  vehicleId   uuid → Vehicle
  serviceRecordId uuid? → ServiceRecord
  expenseId   uuid? → Expense
  type        DocumentType enum
  label       string          ← user-facing name
  fileUrl     string          ← relative storage path
  createdAt   DateTime
  updatedAt   DateTime
}
```

## Not doing (yet)
- Cloud storage (S3/GCS) — local disk is fine for now, easy to swap later
- Virus scanning
- Image resizing / thumbnails
