# 🏗️ System Architecture — NFCKey Smart Access & Attendance

Dokumentasi arsitektur sistem lengkap untuk **NFCKey (Smart NFC Attendance & Door Access System)**. Dokumen ini menjelaskan rancangan rekayasa sistem terdistribusi, batas tanggung jawab antarkomponen, protokol aliran data, serta mesin status perangkat keras (*state machine*).

---

## 🌟 1. Gambaran Arsitektur Tingkat Tinggi (High-Level Overview)

Arsitektur NFCKey menggabungkan komputasi komputasi tepi (*Edge Computing*) pada mikrokontroler ESP32 dengan backend terpusat ganda (REST API Laravel & Cloud Database Realtime Supabase) serta antarmuka web modern React.

```mermaid
flowchart TD
    subgraph Edge["Perangkat Keras Edge (ESP32 IoT Node)"]
        User(["Pengguna / Siswa"]) -- "Tap Kartu" --> Reader["NFC PN532 (Prioritas)\n/ RFID RC522 (Cadangan)"]
        Reader --> Controller["ESP32 Core Microcontroller\n(Dual Core 240MHz)"]
        Controller -- "Validasi Cache (<15ms)" --> LocalCache[("RAM Whitelist Cache\n(30 Kartu Cepat)")]
        Controller -- "Buka Relay" --> Relay["Modul Relay 5V + Diode"]
        Relay --> Solenoid["Solenoid Door Lock 12V"]
        Reed["Reed Switch MC-38"] -- "Deteksi Magnet" --> Controller
        Controller --> Buzzer["Piezo Buzzer 5V"]
        Controller --> LEDs["LEDs (Hijau / Merah / Kuning)"]
        Controller -- "Simpan Event" --> QueueBuffer[("Offline FIFO Ring Buffer\n(Penyimpanan Offline)")]
    end

    subgraph Network["Lapisan Jaringan & Transportasi"]
        WiFi["Wi-Fi IEEE 802.11 b/g/n\n(Non-blocking Reconnect)"]
    end

    subgraph Cloud["Backend Terpusat & Basis Data"]
        Supabase["Supabase Cloud Realtime\n(PostgREST + WebSockets)"]
        Laravel["Laravel REST API Server\n(Sanctum Bearer Auth)"]
        Database[("Relational PostgreSQL / MySQL\n(Unique event_id Constraint)")]
        Laravel <--> Database
        Supabase <--> Database
    end

    subgraph Frontend["Antarmuka Pengguna (Web Presentation)"]
        Dashboard["React 19 + TypeScript Dashboard\n(Vite + Tailwind CSS + Lucide)"]
        LiveStream["Realtime Subscriptions\n(WebSocket Channel)"]
        Dashboard <--> LiveStream
        LiveStream <--> Supabase
        Dashboard -- "Admin REST API" --> Laravel
    end

    Controller -- "HTTP REST POST" --> WiFi
    WiFi --> Supabase
    WiFi --> Laravel
```

---

## ⏱️ 2. Alur Transaksi & Protokol Data (Sequence Diagrams)

### A. Skenario Operasi Normal (Online Operation)
```mermaid
sequenceDiagram
    autonumber
    actor Pengguna
    participant Reader as Pembaca NFC/RFID
    participant ESP32 as ESP32 Microcontroller
    participant Lock as Solenoid & Relay
    participant Reed as Sensor Magnet MC-38
    participant Cloud as Supabase / Laravel Backend
    participant Web as Web Dashboard

    Pengguna->>Reader: Menempelkan Kartu (UID 04:A3:92:7F)
    Reader->>ESP32: Mengirimkan Raw UID via SPI/I2C
    ESP32->>ESP32: Validasi UID pada Dynamic Whitelist Cache
    ESP32->>Lock: Aktifkan Relay (Active LOW) -> Kunci Terbuka
    ESP32->>ESP32: Nyalakan LED Hijau & Bunyikan Buzzer 2x
    Pengguna->>Reed: Membuka Pintu (Magnet Terlepas -> Reed HIGH)
    ESP32->>Cloud: POST /api/attendance/tap (event_id, card_uid, GATE-01)
    Cloud->>Web: Broadcast Realtime WebSocket Event
    Web->>Web: Perbarui Counter Dashboard & Tabel Log Real-Time
    Pengguna->>Reed: Menutup Pintu (Magnet Menempel -> Reed LOW)
    Reed->>ESP32: Deteksi CLOSED
    ESP32->>Lock: Nonaktifkan Relay -> Solenoid Mengunci Seketika
    ESP32->>ESP32: Padamkan LED Hijau
```

---

### B. Skenario Keandalan Offline-First (Offline Operation & Sync)
```mermaid
sequenceDiagram
    autonumber
    actor Pengguna
    participant ESP32 as ESP32 Microcontroller
    participant Buffer as Offline FIFO Buffer
    participant Cloud as Supabase / Laravel Backend

    Note over ESP32: Wi-Fi Terputus / Server Downtime
    Pengguna->>ESP32: Tap Kartu Terdaftar
    ESP32->>ESP32: Verifikasi Cache Lokal (Berhasil)
    ESP32->>ESP32: Buka Kunci Pintu (Pengguna Tetap Bisa Masuk)
    ESP32->>Buffer: Simpan event_id, UID, & timestamp ke RAM FIFO
    Note over ESP32: Wi-Fi Pulih Kembali (WL_CONNECTED)
    ESP32->>Cloud: Auto-Drain Queue: POST Event 1
    Cloud-->>ESP32: HTTP 201 Created (Konfirmasi Berhasil)
    ESP32->>Buffer: Hapus Event 1 dari Antrean
    ESP32->>Cloud: POST Event 2 (Retry)
    Cloud-->>ESP32: HTTP 200 OK (duplicate: true)
    ESP32->>Buffer: Hapus Event 2 dari Antrean
    Note over Buffer: Seluruh Antrean Berhasil Disinkronkan (0 Pending)
```

---

## 🔄 3. Mesin Status Pintu (Door State Machine)

Untuk menjamin sistem tidak pernah mengalami *blocking* atau pembekuan (*freeze*) yang menghambat pemindaian NFC, seluruh perilaku pintu dikendalikan oleh **Explicit Finite State Machine**:

```mermaid
stateDiagram-v2
    [*] --> LOCKED: Sistem Dinyalakan (Safe Cold-Boot)

    LOCKED --> UNLOCKED_WAITING: Kartu Sah Ditempelkan (Relay ON, LED Hijau ON)
    LOCKED --> FORCED_ENTRY: Pintu Dibuka Paksa Tanpa Tap Kartu (Reed HIGH)

    UNLOCKED_WAITING --> DOOR_OPEN: Pintu Fisik Didorong Buka (Reed HIGH)
    UNLOCKED_WAITING --> LOCKED: Waktu Habis (5s) Tanpa Pintu Dibuka (Auto-Relock)

    DOOR_OPEN --> LOCKED: Pintu Ditutup Rapat Kembali (Reed LOW -> Relock Instan)
    DOOR_OPEN --> DOOR_AJAR: Pintu Terbuka > 30 Detik (Timeout Door Ajar)

    DOOR_AJAR --> LOCKED: Pintu Akhirnya Ditutup Kembali (Alarm Padam)

    FORCED_ENTRY --> LOCKED: Reset via Kunci Admin / Pintu Ditutup Rapat
```

### Penjelasan Status (States):
1. **`LOCKED`**: Kondisi aman default. Relay solenoid tidak berdaya (*de-energized* / fail-secure), plunger terkunci, seluruh LED padam.
2. **`UNLOCKED_WAITING`**: Kartu valid berhasil dibaca. Relay diaktifkan, LED Hijau menyala. Pengguna diberikan jendela waktu 5 detik (`UNLOCK_HOLD_TIME_MS`) untuk membuka pintu.
3. **`DOOR_OPEN`**: Pengguna membuka pintu secara normal. Sensor reed switch mendeteksi terbukanya daun pintu.
4. **`DOOR_AJAR`**: Pintu dibiarkan terbuka melebihi 30 detik (`TIMEOUT_DOOR_OPEN_MS`). Sistem memicu audio peringatan intermiten pada buzzer dan mengedipkan LED Kuning.
5. **`FORCED_ENTRY`**: Pintu dibuka tanpa ada transaksi tap sah sebelumnya. Sistem mendeteksi pembobolan, mengaktifkan sirine darurat berkecepatan tinggi pada buzzer, dan menyalakan *strobe* LED Merah.

---

## 🛡️ 4. Prinsip Komputasi Tepi & Sumber Kebenaran (Source of Truth)

1. **Otonomi Edge Node (ESP32):**
   * Keputusan membuka pintu dieksekusi 100% secara lokal oleh ESP32 tanpa menunggu balasan dari internet. Latensi buka pintu **<15 milidetik**.
   * Jika server atau jaringan internet mati total, operasional absensi dan buka pintu tetap berjalan normal.

2. **Backend sebagai Single Source of Truth:**
   * Backend Laravel dan Database Supabase adalah satu-satunya otoritas penyimpan riwayat kehadiran permanen, penugasan kartu ke siswa, dan pencatatan kepemilikan perangkat gerbang.

3. **Prinsip Idempotensi Transaksi:**
   * `event_id` dibuat sebagai UUID tunggal pada saat tap pertama kali terjadi di ESP32 dan tidak pernah diubah saat proses retry.
   * Basis data menerapkan `UNIQUE(event_id)` sehingga proses transmisi ulang (*duplicate submission*) tidak akan pernah menghasilkan data ganda.
