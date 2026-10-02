# NexusGate: Sistem Absensi & Kontrol Akses Pintar (NFC)

**Sistem Absensi dan Kontrol Akses Pintu Inovatif Berbasis ESP32**

Sistem absensi IoT tingkat enterprise dan kontrol akses pintu yang dibangun dengan ESP32 + modul pembaca NFC/RFID (Prioritas NFC, dengan dukungan backup RFID), backend REST API Laravel, dan dashboard React. Dibangun sebagai proyek PJBL sekolah, terstruktur sebagai sistem modular dunia nyata yang sangat skalabel dan mengintegrasikan inovasi IoT modern.

## Cara Kerjanya

- Siswa melakukan tap kartu NFC (seperti smart tag, e-toll) atau kartu RFID sebagai cadangan pada perangkat di pintu.
- ESP32 memvalidasi kartu, membuka kunci pintu, dan mencatat event absensi.
- Reed switch melacak status pintu terbuka/tertutup dan mengunci kembali secara otomatis.
- Perangkat bekerja secara **offline-first (dengan offline backup)**: data absensi tidak akan pernah hilang karena gangguan Wi-Fi/server. Data akan dicadangkan dengan aman secara lokal (via memori internal/SPIFFS/MicroSD), dan event yang antri akan disinkronkan secara otomatis (tanpa duplikasi) begitu konektivitas kembali.
- Backend Laravel menjadi pusat data utama; dashboard React memberikan visibilitas kepada staf terkait absensi, kartu, siswa, dan status perangkat.

### 🚀 Fitur & Inovasi Utama

- **Portal Karyawan & Administrator**: Sistem login multi-role. Karyawan dapat memantau ringkasan absensi bulanannya (hadir, absen, dll) secara mandiri, sementara Administrator memiliki kontrol penuh (CRUD) atas seluruh data.
- **Sistem Notifikasi Email & In-App**: Menggantikan notifikasi Telegram/WhatsApp dengan pengiriman Email otomatis dan peringatan di dalam Dashboard (In-App Bell) untuk menghindari ketergantungan pada aplikasi pihak ketiga.
- **Smart Wi-Fi Captive Portal**: Tidak perlu hardcode kredensial Wi-Fi. Cukup hubungkan HP ke hotspot ESP32 untuk mengatur Wi-Fi secara dinamis melalui web interface.
- **Anti-Passback & Cooldown**: Logika cerdas di backend untuk mencegah kecurangan "Titip Absen" dengan memberlakukan jeda waktu (cooldown) 5 menit untuk setiap kartu.
- **Akses Berbasis Peran & Waktu**: Kontrol akses terperinci di mana kartu karyawan/shift pagi hanya berfungsi pada jam tertentu, sedangkan kartu admin memiliki akses 24/7.
- **Alarm Pintu Terbuka (Door Ajar)**: Sensor mendeteksi jika pintu sengaja ditahan terbuka terlalu lama dan akan memicu alarm lokal serta peringatan.
- **Pembaruan Over-The-Air (OTA)**: Pembaruan sistem (firmware) nirkabel secara langsung tanpa perlu mencolok kabel USB, meminimalkan pemeliharaan perangkat.

Full requirements: [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md).
Build plan: [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md).
MVP scope: [`docs/MVP.md`](./docs/MVP.md).
RAB & Komponen: [`docs/RAB.md`](./docs/RAB.md).

## Repository structure

```text
Proyek-5-PJBL/
├── README.md
├── PROJECT_BRIEF.md
│
├── docs/
│   ├── IMPLEMENTATION_PLAN.md   ← start here
│   ├── MVP.md
│   ├── RAB.md
│   ├── ARCHITECTURE.md
│   ├── HARDWARE.md
│   ├── FIRMWARE.md
│   ├── API.md
│   ├── DATABASE.md
│   ├── TESTING.md
│   ├── SECURITY.md
│   └── DEPLOYMENT.md
│
├── firmware/esp32/     ← ESP32 firmware (C/C++, Arduino/ESP-IDF)
├── backend/laravel/    ← Laravel REST API
├── frontend/react/     ← React + TypeScript dashboard
└── hardware/
    ├── wiring/
    └── diagrams/
```

## Status

Project scaffolded, not yet implemented. Follow the phases in
[`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md) in order: ESP32 bring-up → RFID →
attendance model → door state machine → offline sync → backend → dashboard → integration.

## Development principle

Reliability > Security > Correctness > Maintainability > UI polish. Build the MVP
([`docs/MVP.md`](./docs/MVP.md)) first, verify each piece independently, then integrate.
