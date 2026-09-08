# PROJECT BRIEF

## Project

**SMART NFC ATTENDANCE & DOOR ACCESS SYSTEM**

**Subtitle:** Sistem Absensi dan Kontrol Akses Pintu Berbasis ESP32

## 1. Project Overview

Build an IoT-based attendance and door access control system using an ESP32 and NFC/RFID cards.

The system combines:

* NFC/RFID-based student identification
* Automatic door access control
* Attendance recording
* Physical door-state detection
* Offline-first operation
* Automatic synchronization when connectivity returns
* Laravel REST API backend
* Database-backed attendance records
* React dashboard for administration and monitoring

The project is intended as a school PJBL project and should be implemented as a clean, modular, professional system rather than a simple Arduino prototype.

---

## 2. Core Architecture

The system consists of three major components:

### ESP32 Device

Responsible for:

* Reading RFID/NFC cards using RC522
* Validating card authorization
* Controlling the door lock
* Reading the reed switch
* Detecting door state
* Recording attendance events
* Connecting to Wi-Fi
* Storing unsynchronized events locally
* Synchronizing pending events with the server

### Laravel Backend

Responsible for:

* Student management
* Card registration and authorization
* Attendance event storage
* Device management
* Device heartbeat/status
* API authentication
* Duplicate event protection
* Central source of truth for attendance data

### React Dashboard

Responsible for:

* Attendance monitoring
* Access history
* Student management
* RFID/NFC card management
* Device status
* Door status
* Synchronization status
* Pending/offline events
* Basic system administration

---

## 3. Normal Request Flow

```text
Student
   │
   │ Tap RFID/NFC Card
   ▼
RC522
   │
   ▼
ESP32
   │
   ├── Is card registered?
   │        │
   │        ├── NO → Reject Access
   │        │          ├── Red LED
   │        │          └── Buzzer
   │        │
   │        └── YES
   │
   ▼
Create Attendance Event
   │
   ▼
Unlock Door
   │
   ▼
Reed Switch
   │
   ├── OPEN
   │
   └── CLOSED
          │
          ▼
       Lock Door
```

---

## 4. Door State Machine

The firmware should use an explicit state machine instead of scattered delays.

Suggested states:

```text
LOCKED
  │
  │ Valid card
  ▼
UNLOCKED_WAITING
  │
  │ Door opens
  ▼
DOOR_OPEN
  │
  │ Door closes
  ▼
LOCKED
```

Timeout behavior:

### Valid card but door never opens

If the door remains closed for approximately 10 seconds after authorization:

```text
UNLOCKED_WAITING
        │
        │ 10 seconds
        ▼
     LOCKED
```

### Door remains open

If the door remains open for approximately 30 seconds:

* Activate warning buzzer
* Keep monitoring the reed switch
* Lock when the door closes

The exact timings should be configurable constants rather than hard-coded throughout the firmware.

---

## 5. Attendance Event

Every successful authentication should create an event.

Example:

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

### Important

`event_id` must be unique.

The same event must never create duplicate attendance records if the ESP32 retries the request.

The server should enforce uniqueness on `event_id`.

---

## 6. Offline-First Requirement

The system must continue functioning if Wi-Fi or the server becomes unavailable.

### When offline

The ESP32 must:

1. Validate the card locally.
2. Allow/reject access normally.
3. Create the attendance event.
4. Store the event in local persistent storage.
5. Mark it as pending synchronization.

Example:

```text
Attendance Event
      │
      ▼
Local Storage
      │
      └── pending
```

The device must NOT lose attendance data simply because Wi-Fi is unavailable.

### When connectivity returns

```text
Wi-Fi restored
      │
      ▼
Read pending events
      │
      ▼
Send event to Laravel API
      │
      ├── Success → Remove local copy
      │
      └── Failure → Keep local copy and retry
```

The local event must only be deleted **after the server confirms successful processing**.

---

## 7. Duplicate Protection

Synchronization may retry the same event multiple times.

The backend must therefore treat `event_id` as an idempotency key.

Example:

```text
ESP32
  │
  │ event_id = ABC123
  ▼
Laravel
  │
  ├── Event does not exist
  │      → Create
  │
  └── Event already exists
         → Do not create duplicate
         → Return success
```

This prevents duplicate attendance records caused by network retries.

---

## 8. Hardware

Target hardware:

* ESP32
* RC522 RFID/NFC reader
* RFID/NFC cards
* Electronic door lock / solenoid / servo prototype
* Reed switch
* Buzzer
* Green LED
* Red LED
* Yellow LED
* Relay/MOSFET/appropriate lock driver
* Power supply

Optional:

* MicroSD storage
* Backup battery
* Lock-position sensor
* OLED/LCD display

### Important hardware rule

The ESP32 GPIO must **not directly drive a high-current door lock**.

Use an appropriate driver circuit such as:

```text
ESP32 GPIO
    │
    ▼
MOSFET / Relay Driver
    │
    ▼
Door Lock
```

For the school demonstration, a small model/low-voltage lock is preferred.

---

## 9. Software Stack

### Firmware

* C/C++
* Arduino Framework or ESP-IDF
* ESP32
* RC522 library
* Wi-Fi
* HTTP/HTTPS client
* Persistent local storage

### Backend

* Laravel
* PHP
* REST API
* MySQL or SQLite

### Frontend

* React
* TypeScript
* Tailwind CSS

### Development

Use Git and GitHub.

Keep firmware, backend, frontend, hardware documentation, and system documentation separated.

---

## 10. Database

Initial database structure:

### students

```text
id
student_id
name
class
created_at
updated_at
```

### cards

```text
id
student_id
card_uid
status
created_at
updated_at
```

### attendance

```text
id
event_id
student_id
card_uid
timestamp
device_id
status
created_at
updated_at
```

`event_id` must have a unique database constraint.

### devices

```text
id
device_id
name
status
last_seen
created_at
updated_at
```

---

## 11. REST API

Initial endpoints:

```text
POST /api/attendance

GET /api/students

GET /api/cards

POST /api/cards

GET /api/devices

POST /api/devices/heartbeat
```

The API should return clear HTTP status codes and structured JSON responses.

Example successful attendance response:

```json
{
  "success": true,
  "event_id": "8f31a2c7",
  "message": "Attendance recorded"
}
```

If the event already exists:

```json
{
  "success": true,
  "event_id": "8f31a2c7",
  "duplicate": true,
  "message": "Event already processed"
}
```

---

## 12. API Authentication

There are two different authentication concepts.

### Card authentication

The ESP32 determines whether the RFID/NFC card is registered and authorized.

### Device/API authentication

The ESP32 must authenticate itself when communicating with Laravel.

Do NOT use the RFID card UID as an API credential.

Recommended architecture:

```text
ESP32
   │
   │ HTTPS
   │ Authorization: Bearer DEVICE_TOKEN
   ▼
Laravel API
   │
   ├── Validate token
   ├── Identify device
   ├── Verify device authorization
   └── Process request
```

Device credentials should be stored securely.

HTTPS should be used when the system moves beyond a local development environment.

---

## 13. Security Requirements

Implement or design for:

* Device authentication
* API authentication
* HTTPS
* Server-side authorization
* Unique event IDs
* Input validation
* Card activation/deactivation
* Access logging
* Secure credential storage
* Protection against duplicate submissions

Do not expose secrets, API keys, or device credentials in GitHub.

Use environment variables for backend secrets.

---

## 14. Dashboard

The React dashboard should eventually provide:

### Overview

* Today's attendance count
* Recent access events
* Online/offline device status
* Current door state
* Pending synchronization count

### Students

* Student list
* Student ID
* Name
* Class
* Registered card

### Cards

* Card UID
* Assigned student
* Active/inactive status
* Registration

### Attendance

* Date/time
* Student
* Card
* Device
* Status

### Devices

* Device ID
* Online/offline
* Last heartbeat
* Door status
* Pending synchronization

The dashboard should be clean and professional rather than overloaded with unnecessary UI.

---

## 15. Repository Structure

Use this structure:

```text
Proyek-5-PJBL/
├── README.md
├── PROJECT_BRIEF.md
│
├── docs/
│   ├── MVP.md
│   ├── ARCHITECTURE.md
│   ├── HARDWARE.md
│   ├── FIRMWARE.md
│   ├── API.md
│   ├── DATABASE.md
│   ├── TESTING.md
│   ├── SECURITY.md
│   └── DEPLOYMENT.md
│
├── firmware/
│   └── esp32/
│
├── backend/
│   └── laravel/
│
├── frontend/
│   └── react/
│
└── hardware/
    ├── wiring/
    └── diagrams/
```

---

## 16. Development Strategy

Do not attempt to build the entire system at once.

Implement incrementally:

### Phase 1 — ESP32

* ESP32 setup
* Serial debugging
* Wi-Fi connection

### Phase 2 — RFID

* RC522 initialization
* UID reading
* Card validation

### Phase 3 — Attendance

* Student/card data model
* Attendance event
* Timestamp
* Event ID

### Phase 4 — Door

* Lock control
* Reed switch
* Door state machine
* Timeout handling

### Phase 5 — Offline System

* Persistent storage
* Pending queue
* Retry mechanism
* Automatic synchronization

### Phase 6 — Backend

* Laravel project
* Database migrations
* Models
* REST API
* Authentication
* Idempotent event processing

### Phase 7 — Dashboard

* React setup
* Attendance dashboard
* Student management
* Card management
* Device monitoring

### Phase 8 — Integration

Test the entire system together.

---

## 17. Minimum Viable Product

The MVP must support:

* ESP32
* RC522 card reading
* Registered card validation
* Invalid card rejection
* Door unlocking
* Reed switch
* Automatic locking after door closes
* Door timeout
* Wi-Fi connection
* Attendance event creation
* REST API
* Laravel backend
* Database storage
* Offline event storage
* Automatic synchronization
* Duplicate event protection
* Basic dashboard

Do NOT add these to the MVP:

* Face recognition
* Fingerprint authentication
* Mobile application
* AI
* Cloud infrastructure
* Multi-factor authentication

These can be future enhancements.

---

## 18. Testing Requirements

At minimum, test:

### Authentication

* Registered card
* Unregistered card
* Disabled card

### Door

* Door opens after valid card
* Door closes normally
* Door never opens
* Door remains open too long
* Reed switch failure

### Network

* Wi-Fi available
* Wi-Fi disconnected
* Server unavailable
* Wi-Fi restored
* Multiple pending events

### Synchronization

* Successful upload
* Failed upload
* Retry
* Duplicate event submission
* Server already contains event

### Security

* Invalid API credential
* Unauthorized device
* Malformed request
* Duplicate event
* Disabled card

---

## 19. Project Limitations

The RFID card identifies the card, not necessarily the person holding it.

Therefore, the system cannot completely prevent:

* Card sharing
* "Titip absen"
* Someone using another student's card

Biometric authentication could be considered as a future enhancement.

For a real-world physical access system, additional safety requirements would also be necessary, including:

* Emergency/manual door release
* Power-failure behavior
* Backup power
* Appropriate lock selection
* Fire/exit safety compliance

For the school project, use a safe prototype/model door rather than controlling a critical real-world exit.

---

## 20. Definition of Done

The project is considered functional when:

1. A registered card is recognized.
2. An unregistered card is rejected.
3. A valid card creates an attendance event.
4. The door unlocks for an authorized card.
5. The reed switch detects OPEN/CLOSED.
6. The door locks after it closes.
7. The door timeout works.
8. Attendance continues working without Wi-Fi.
9. Offline events survive until synchronization.
10. Pending events automatically synchronize after connectivity returns.
11. Local events are deleted only after server confirmation.
12. Retried events do not create duplicates.
13. The Laravel backend stores attendance correctly.
14. The dashboard displays server-side attendance data.
15. ESP32 device status can be monitored.

---

## 21. Development Principle

Prioritize:

**Reliability > Security > Correctness > Maintainability > UI polish**

The system should be modular and understandable enough for a school project while following real-world software engineering practices.

Avoid unnecessary complexity.

Build the MVP first, verify each component independently, then integrate the complete system.
