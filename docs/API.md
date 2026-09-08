# REST API

Base contract per `PROJECT_BRIEF.md` Sections 5, 11, 12. Treat this file as the frozen contract
between firmware and backend — update it deliberately, not silently, since both sides depend on
it.

## Authentication

All endpoints (except perhaps `GET` endpoints used only by the dashboard, if using a separate
dashboard auth mechanism) require:

```
Authorization: Bearer <DEVICE_TOKEN>
```

The device UID/RFID card is never used as an API credential (Section 12). Devices are issued a
token when registered in the backend.

## Endpoints

### `POST /api/attendance`

Request body:

```json
{
  "event_id": "8f31a2c7",
  "student_id": "XI-TKJ-001",
  "card_uid": "04:A3:92:7F",
  "timestamp": "2026-09-08T07:12:34+07:00",
  "device_id": "GATE-01",
  "status": "PRESENT"
}
```

Response — new event created:

```json
{
  "success": true,
  "event_id": "8f31a2c7",
  "message": "Attendance recorded"
}
```

Response — event already exists (idempotent, still treated as success by the caller):

```json
{
  "success": true,
  "event_id": "8f31a2c7",
  "duplicate": true,
  "message": "Event already processed"
}
```

### `GET /api/students`

Returns the student list (id, student_id, name, class, linked card if any).

### `GET /api/cards`

Returns registered cards (uid, assigned student, active/inactive status).

### `POST /api/cards`

Registers a new card / updates a card's status. Define request/response shape here once
finalized.

### `GET /api/devices`

Returns known devices with status/last_seen.

### `POST /api/devices/heartbeat`

Device liveness ping — updates `last_seen` and `status` for the calling device.

## Status codes

Use standard, meaningful HTTP status codes — 200/201 for success, 401/403 for auth failures,
404 for missing resources, 422 for validation errors. Document any endpoint-specific codes here
as they're added.

## Error response shape

Define a consistent error envelope here once implemented, e.g.:

```json
{
  "success": false,
  "message": "Human-readable error",
  "errors": { "field": ["reason"] }
}
```
