# Testing

Checklist derived from `PROJECT_BRIEF.md` Section 18. Track results here — date, tester,
pass/fail, notes — rather than only checking a box.

## Authentication

- [ ] Registered card is accepted
- [ ] Unregistered card is rejected
- [ ] Disabled card is rejected

## Door

- [ ] Door unlocks after a valid card
- [ ] Door locks normally after closing
- [ ] Door never opens → auto-relocks after timeout (~10s)
- [ ] Door remains open too long → warning buzzer, keeps monitoring, locks on close (~30s)
- [ ] Reed switch failure handled without hanging the state machine

## Network

- [ ] Works normally with Wi-Fi available
- [ ] Continues recording attendance with Wi-Fi disconnected
- [ ] Continues recording attendance with server unavailable (Wi-Fi up, backend down)
- [ ] Pending events sync automatically once Wi-Fi is restored
- [ ] Multiple pending events all sync correctly, in order, without loss

## Synchronization

- [ ] Successful upload removes the local pending copy
- [ ] Failed upload keeps the local pending copy and retries
- [ ] Retry of an event the server already has does not duplicate it
- [ ] Server already containing the event returns `duplicate: true` and is treated as success

## Security

- [ ] Request with invalid/missing API credential is rejected
- [ ] Request from an unauthorized/unknown device is rejected
- [ ] Malformed request body is rejected with a clear error, not a crash
- [ ] Duplicate `event_id` never creates a second attendance row
- [ ] Disabled card cannot produce a successful attendance event

## Definition of Done (Section 20)

Use this as the final acceptance pass before calling the MVP complete — see the full list in
`PROJECT_BRIEF.md` Section 20 and `IMPLEMENTATION_PLAN.md` Phase 8.
