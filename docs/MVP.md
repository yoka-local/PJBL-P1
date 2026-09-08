# MVP Scope

Source of truth: `PROJECT_BRIEF.md`, Section 17.

## In scope for MVP

- [ ] ESP32 firmware running
- [ ] RC522 card reading
- [ ] Registered card validation
- [ ] Invalid card rejection
- [ ] Door unlocking
- [ ] Reed switch (open/closed detection)
- [ ] Automatic locking after door closes
- [ ] Door timeout (unopened-door timeout + door-left-open warning)
- [ ] Wi-Fi connection with reconnect handling
- [ ] Attendance event creation (with unique `event_id`)
- [ ] REST API (`/api/attendance`, `/api/students`, `/api/cards`, `/api/devices`, heartbeat)
- [ ] Laravel backend
- [ ] Database storage (students, cards, attendance, devices)
- [ ] Offline event storage (persistent local queue)
- [ ] Automatic synchronization when connectivity returns
- [ ] Duplicate event protection (unique `event_id` constraint + idempotent endpoint)
- [ ] Basic dashboard (overview, students, cards, attendance, devices)

## Explicitly out of scope for MVP

Do not implement these until the MVP above is fully working and tested (see `TESTING.md` and
Section 20 Definition of Done):

- Face recognition
- Fingerprint authentication
- Mobile application
- AI features
- Cloud infrastructure
- Multi-factor authentication
- Emergency/manual door release, backup power, fire/exit compliance — real-world safety features
  called out in Section 19 as needed for a *real* deployment, not for this school prototype.

## Status

Track MVP completion here as each phase in `IMPLEMENTATION_PLAN.md` closes out. Update this
checklist directly rather than keeping a separate tracker.
