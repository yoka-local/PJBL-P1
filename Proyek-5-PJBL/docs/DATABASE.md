# Database

MySQL or SQLite (per `PROJECT_BRIEF.md` Section 9). Schema per Section 10.

## Tables

### students

| Column | Notes |
|---|---|
| id | PK |
| student_id | school-assigned ID, e.g. `XI-TKJ-001` |
| name | |
| class | |
| created_at / updated_at | |

### cards

| Column | Notes |
|---|---|
| id | PK |
| student_id | FK → students |
| card_uid | unique per physical card |
| status | active / inactive |
| created_at / updated_at | |

### attendance

| Column | Notes |
|---|---|
| id | PK |
| event_id | **unique constraint — required for idempotency (Section 7)** |
| student_id | FK → students |
| card_uid | denormalized copy at time of event, useful for audit even if card is later reassigned |
| timestamp | event time as reported by the device |
| device_id | which gate/device recorded this |
| status | e.g. `PRESENT` |
| created_at / updated_at | server-side record creation time (distinct from `timestamp`) |

### devices

| Column | Notes |
|---|---|
| id | PK |
| device_id | e.g. `GATE-01` |
| name | |
| status | online/offline (or derived from `last_seen` staleness rather than stored directly — decide and document) |
| last_seen | updated by heartbeat |
| created_at / updated_at | |

## Migration notes

- `attendance.event_id` **must** have a unique index/constraint at the database level — this is
  the real enforcement mechanism for duplicate protection, not just an application-level check.
- Consider an index on `attendance.device_id` and `attendance.timestamp` for dashboard query
  performance once real data volume exists (not a concern for the school demo scale, but cheap to
  add now).
