# SMART NFC ATTENDANCE & DOOR ACCESS SYSTEM

### Sistem Absensi dan Kontrol Akses Pintu Berbasis ESP32

A smart IoT access-control and attendance system built around ESP32, NFC/RFID authentication, physical door-state detection, offline data storage, and a centralized web dashboard.

The system is designed to combine attendance recording and physical access control into a single, reliable platform.

---

## Overview

Traditional attendance systems and access-control systems are often implemented separately. This project integrates both functions into one system.

A registered NFC/RFID card can be used to:

1. Identify a student.
2. Record an attendance event.
3. Grant access to the door.
4. Unlock the door.
5. Monitor the physical door state.
6. Automatically lock the door after it is closed.

The system is designed with an **offline-first architecture**, allowing the ESP32 to continue recording attendance even when the network or server is temporarily unavailable.

---

## System Architecture

```text
                         ┌─────────────────────┐
                         │    Web Dashboard    │
                         │   React / TypeScript │
                         └──────────┬──────────┘
                                    │
                                  HTTP
                                    │
                         ┌──────────▼──────────┐
                         │     REST API        │
                         │       Laravel       │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │      Database       │
                         │    MySQL / SQLite   │
                         └─────────────────────┘


 NFC/RFID Card
       │
       ▼
 ┌─────────────┐
 │    RC522    │
 │   Reader    │
 └──────┬──────┘
        │ SPI
        ▼
 ┌───────────────────────────────┐
 │             ESP32             │
 │                               │
 │  Card Validation              │
 │  Attendance Processing        │
 │  Door Controller              │
 │  Door State Monitoring        │
 │  Offline Queue                │
 │  Wi-Fi Manager                │
 │  REST API Client              │
 └───────┬──────────┬────────────┘
         │          │
         ▼          ▼
    Door Lock   Reed Switch
                    │
                    ▼
               Door State
```

---

## Core Workflow

### Access Granted

```text
NFC/RFID Card
      │
      ▼
   RC522
      │
      ▼
   ESP32
      │
      ▼
Validate Card
      │
      ├── Registered
      │
      ▼
Create Attendance Event
      │
      ▼
Unlock Door
      │
      ▼
Door Opens
      │
      ▼
Reed Switch Detects OPEN
      │
      ▼
Door Closes
      │
      ▼
Reed Switch Detects CLOSED
      │
      ▼
Lock Door
```

### Access Denied

```text
NFC/RFID Card
      │
      ▼
   RC522
      │
      ▼
   ESP32
      │
      ▼
Validate Card
      │
      └── Not Registered
              │
              ▼
        Access Denied
              │
              ▼
        Door Remains Locked
```

---

## Offline-First Design

Network availability should not determine whether the physical access system can operate.

When the server is unavailable, the ESP32 continues processing cards locally and stores unsynchronized attendance events.

### Online

```text
Card
 │
 ▼
ESP32
 │
 ▼
Attendance Event
 │
 ▼
Wi-Fi
 │
 ▼
Laravel API
 │
 ▼
Database
```

### Offline

```text
Card
 │
 ▼
ESP32
 │
 ▼
Attendance Event
 │
 ▼
Local Storage
 │
 ▼
Pending Queue
```

### Synchronization

```text
Network Restored
       │
       ▼
Check Pending Queue
       │
       ▼
Send Event
       │
       ▼
Server Confirmation
       │
       ▼
Remove Local Event
```

Local events are only removed after successful server confirmation.

---

## Duplicate Event Protection

Network interruptions can occur after the server has already received an event but before the ESP32 receives the response.

To prevent duplicate attendance records, every event contains a unique `event_id`.

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

The server treats `event_id` as unique.

If the same event is transmitted multiple times:

```text
First request
     │
     ▼
Event stored

Retry
     │
     ▼
Same event_id
     │
     ▼
Existing event detected
     │
     ▼
No duplicate record
```

---

## Door State Management

The system does not rely solely on a fixed delay to determine when the door should be locked.

A magnetic reed switch provides feedback about the actual physical state of the door.

### Door states

```text
LOCKED
  │
  │ Valid card
  ▼
UNLOCKED
  │
  │ Door opens
  ▼
DOOR_OPEN
  │
  │ Door closes
  ▼
LOCKED
```

### Timeout handling

If access is granted but the door never opens:

```text
Access Granted
      │
      ▼
   Unlock
      │
      ▼
Wait for Door
      │
      ▼
Timeout
      │
      ▼
    Lock
```

If the door remains open for an excessive amount of time, the system can trigger a warning.

The timeout values are configurable during development and testing.

---

## Hardware

The initial hardware design consists of:

| Component      | Purpose                                    |
| -------------- | ------------------------------------------ |
| ESP32          | Main controller and edge-processing device |
| RC522          | NFC/RFID card reader                       |
| NFC/RFID Card  | Student identification                     |
| Door Lock      | Physical access control                    |
| Reed Switch    | Door OPEN/CLOSED detection                 |
| Buzzer         | System and access notifications            |
| LEDs           | System status indication                   |
| Power Supply   | Hardware power source                      |
| Driver Circuit | Interface between ESP32 and door lock      |

The door-lock circuit should use an appropriate relay, MOSFET, or dedicated driver. High-current loads must not be connected directly to ESP32 GPIO pins.

---

## Software Stack

### Firmware

* C/C++
* Arduino Framework or ESP-IDF
* RC522 library
* ESP32 Wi-Fi
* Local non-volatile storage
* REST API client

### Backend

* Laravel
* PHP
* REST API
* MySQL or SQLite

### Frontend

* React
* TypeScript
* Tailwind CSS

### Infrastructure

* Debian Server
* Git
* GitHub

---

## Firmware Architecture

The firmware is divided into separate modules to keep the system maintainable.

```text
firmware/
└── esp32/
    ├── src/
    │   ├── main.cpp
    │   ├── config.h
    │   │
    │   ├── rfid/
    │   │   └── rfid_manager.cpp
    │   │
    │   ├── door/
    │   │   └── door_controller.cpp
    │   │
    │   ├── attendance/
    │   │   └── attendance_manager.cpp
    │   │
    │   ├── storage/
    │   │   └── offline_queue.cpp
    │   │
    │   ├── network/
    │   │   └── wifi_manager.cpp
    │   │
    │   └── api/
    │       └── api_client.cpp
    │
    └── README.md
```

---

## Backend Architecture

The Laravel backend acts as the central system for storing and managing data.

### Main entities

```text
students
    │
    └── cards

students
    │
    └── attendance

devices
```

### Database structure

#### `students`

```text
id
student_id
name
class
created_at
updated_at
```

#### `cards`

```text
id
student_id
card_uid
status
created_at
updated_at
```

#### `attendance`

```text
id
event_id
student_id
card_uid
timestamp
device_id
status
created_at
```

#### `devices`

```text
id
device_id
name
status
last_seen
```

---

## API

Example endpoints:

```text
POST /api/attendance
GET  /api/students
GET  /api/cards
POST /api/cards
GET  /api/devices
POST /api/devices/heartbeat
```

The ESP32 communicates with the backend through HTTP-based REST APIs.

---

## Web Dashboard

The dashboard provides a centralized interface for monitoring the system.

### Dashboard

Displays:

* Total registered students
* Today's attendance
* Device status
* Door status
* Network status
* Synchronization status
* Recent attendance events

### Attendance

Provides:

* Attendance history
* Student filtering
* Class filtering
* Date filtering
* Attendance status

### Students

Provides:

* Student registration
* Student information
* Class management

### Cards

Provides:

* Card registration
* Card assignment
* Card activation/deactivation

### Devices

Provides:

* ESP32 device status
* Last communication time
* Door state
* Network status
* Pending synchronization count

---

## Project Structure

```text
PJBL-P1/
│
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

## Development Roadmap

### Phase 1 — Hardware Foundation

* [ ] Set up ESP32
* [ ] Test GPIO
* [ ] Connect RC522
* [ ] Read card UID
* [ ] Implement LED feedback
* [ ] Implement buzzer feedback

### Phase 2 — Access Control

* [ ] Implement card registration
* [ ] Implement card validation
* [ ] Implement door lock controller
* [ ] Implement reed switch
* [ ] Implement access-denied handling

### Phase 3 — Door State Machine

* [ ] Implement LOCKED state
* [ ] Implement UNLOCKED state
* [ ] Implement DOOR_OPEN state
* [ ] Implement automatic locking
* [ ] Implement door-open timeout
* [ ] Implement unlock timeout

### Phase 4 — Attendance

* [ ] Create attendance event
* [ ] Generate unique event IDs
* [ ] Implement timestamp handling
* [ ] Associate cards with students

### Phase 5 — Backend

* [ ] Create Laravel project
* [ ] Create database schema
* [ ] Create models
* [ ] Create migrations
* [ ] Implement attendance API
* [ ] Implement student API
* [ ] Implement card API
* [ ] Implement device heartbeat

### Phase 6 — Offline System

* [ ] Implement local storage
* [ ] Implement pending queue
* [ ] Implement retry mechanism
* [ ] Implement automatic synchronization
* [ ] Implement server confirmation
* [ ] Implement duplicate event protection

### Phase 7 — Dashboard

* [ ] Create React application
* [ ] Create dashboard
* [ ] Create attendance page
* [ ] Create student management
* [ ] Create card management
* [ ] Create device monitoring
* [ ] Create access logs

### Phase 8 — Integration

* [ ] Integrate ESP32 and API
* [ ] Integrate database
* [ ] Integrate dashboard
* [ ] Test online operation
* [ ] Test offline operation
* [ ] Test synchronization
* [ ] Test door-state behavior
* [ ] Perform final system testing
* [ ] Prepare final demonstration

---

## Testing

The system will be tested against several scenarios.

| Test                    | Expected Result                 |
| ----------------------- | ------------------------------- |
| Registered card         | Access granted                  |
| Unregistered card       | Access denied                   |
| Valid card + door opens | Door remains unlocked           |
| Door closes             | Door automatically locks        |
| Door never opens        | Lock after timeout              |
| Door remains open       | Warning triggered               |
| Wi-Fi disconnected      | Attendance stored locally       |
| Wi-Fi restored          | Pending events synchronize      |
| Event retransmitted     | No duplicate attendance         |
| ESP32 restarted         | Pending events remain available |

---

## Security Considerations

The system is designed as a prototype access-control platform.

Potential security measures include:

* Device authentication
* API authentication
* HTTPS
* Server-side authorization
* Unique event identifiers
* Input validation
* Card activation/deactivation
* Access logging

The card UID identifies the card, not necessarily the physical person using it. Therefore, NFC/RFID authentication alone cannot completely prevent card sharing or "titip absen".

---

## Safety Considerations

This project involves physical access control and must be designed with failure conditions in mind.

A production installation should consider:

* Manual emergency release
* Power failure behavior
* Backup power
* Lock failure
* Sensor failure
* Fire and evacuation requirements
* Electrical protection
* Mechanical failure

For development and school demonstrations, a small model door or low-risk prototype is recommended instead of an actual security-critical door.

---

## Limitations

The current system does not provide biometric verification.

A registered card can potentially be given to another person. Therefore, the system should be considered a **card-based identification and access-control system**, rather than a system capable of proving the physical identity of the card holder.

Biometric authentication may be considered for a future version.

---

## Future Development

Potential improvements include:

* Fingerprint authentication
* Face recognition
* Mobile application
* Real-time notifications
* Multi-gate deployment
* Centralized monitoring for multiple ESP32 devices
* Advanced attendance analytics
* Role-based access control
* Strong device authentication
* HTTPS communication
* Remote device configuration

These features are outside the initial MVP scope.

---

## Project Principles

The project follows several core principles:

```text
Local-first
Reliable
Modular
Observable
Maintainable
Secure by design
Fail-aware
```

The ESP32 should remain capable of handling essential physical operations even when external services are unavailable.

---

## Status

**Development**

The project is currently under active development.

The initial priority is to establish a reliable ESP32 hardware prototype before integrating the backend and web dashboard.

---

## License

This project is developed for educational and project-based learning purposes.

License information will be added as the project structure and distribution requirements are finalized.
