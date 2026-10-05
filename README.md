# 🔐 NFCKey: Smart NFC Attendance & Door Access System

<div align="center">
  <img src="https://img.shields.io/badge/ESP32-Firmware-blue?style=for-the-badge&logo=espressif" alt="ESP32" />
  <img src="https://img.shields.io/badge/Laravel-Backend-red?style=for-the-badge&logo=laravel" alt="Laravel" />
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Status-In%20Progress-yellow?style=for-the-badge" alt="Status" />
</div>

<br />

**Sistem Absensi dan Kontrol Akses Pintu Inovatif Berbasis ESP32**

NFCKey adalah sistem absensi IoT tingkat *enterprise* dan kontrol akses pintu yang dibangun menggunakan ESP32 + modul pembaca NFC/RFID (Prioritas NFC, dengan dukungan backup RFID), backend REST API Laravel, dan dashboard React. Proyek ini disusun sebagai Project Based Learning (PJBL) yang terstruktur sebagai sistem modular dunia nyata, memastikan skalabilitas yang tinggi dan integrasi inovasi IoT modern.

---

## 🌟 Cara Kerjanya

1. **Tap untuk Masuk:** Pengguna menempelkan kartu NFC (seperti smart tag, e-Money) atau kartu RFID pada perangkat pembaca di pintu masuk.
2. **Validasi Lokal:** Mikrokontroler ESP32 memvalidasi kartu secara instan, membuka kunci pintu (*solenoid lock*), dan mencatat event kehadiran.
3. **Sensor Keamanan:** Sensor *reed switch* memantau status pintu (terbuka/tertutup). Sistem otomatis mengunci kembali pintu atau memicu alarm jika pintu ditahan terbuka terlalu lama.
4. **Reliabilitas Offline-First:** Jika koneksi Wi-Fi terputus, data absensi **tidak akan hilang**. Semua rekaman dicadangkan secara aman pada penyimpanan lokal perangkat. Sinkronisasi *idempotent* akan berjalan secara otomatis saat jaringan kembali stabil.
5. **Dashboard Sentral:** Backend Laravel mengelola basis data secara terpusat, sementara staf dan admin dapat memantau log akses, absensi harian, kartu aktif, serta status operasional alat melalui antarmuka web React.

---

## 🚀 Fitur & Inovasi Utama

- **Offline-First Synchronization:** Menjamin reliabilitas 100% tanpa adanya data absensi yang hilang akibat putusnya konektivitas internet atau server *downtime*.
- **Portal Karyawan & Administrator:** Mendukung *multi-role login*. Admin memiliki kontrol penuh (CRUD), sedangkan anggota dapat memantau ringkasan kehadirannya secara mandiri.
- **Sistem Notifikasi Email & In-App:** Laporan akses tidak wajar dikirimkan langsung melalui *Email* dan fitur *In-App Bell* tanpa bergantung pada layanan *messaging* pihak ketiga.
- **Smart Wi-Fi Captive Portal (Rencana):** Koneksi Wi-Fi yang dinamis melalui *Captive Portal* sehingga konfigurasi jaringan dapat diubah menggunakan *smartphone* tanpa perlu menanamkan (*hardcode*) kredensial ke dalam sistem.
- **Anti-Passback & Cooldown:** Logika *idempotent* yang secara cerdas mencegah penyalahgunaan "Titip Absen" dengan penolakan entri ganda (cooldown) dalam kurun waktu 5 menit per kartu.
- **Akses Berbasis Peran & Waktu:** Kartu tamu / staf biasa hanya berfungsi pada jam kerja operasional, sedangkan admin memiliki hak akses 24/7.
- **Pembaruan Over-The-Air (OTA) (Rencana):** Sistem pembaruan perangkat keras (*firmware*) yang bisa dilakukan dari jarak jauh tanpa kabel USB.

---

## 📂 Struktur Repositori

```text
NFCKey/
├── README.md                 ← Dokumentasi Utama
├── PROJECT_BRIEF.md          ← Persyaratan Lengkap Proyek
│
├── docs/                     ← Dokumentasi Teknis Sistem
│   ├── PROPOSAL.md           ← Proposal PJBL Utama
│   ├── IMPLEMENTATION_PLAN.md← Rencana & Checklist Progres
│   ├── RAB.md                ← Rincian Anggaran Biaya
│   ├── ARCHITECTURE.md       ← Desain Sistem & Arsitektur
│   ├── HARDWARE.md           ← Skema Perangkat Keras
│   ├── API.md                ← Kontrak Endpoint REST API
│   └── ...                   
│
├── firmware/esp32/           ← Source Code C/C++ ESP32 (PlatformIO)
├── backend/laravel/          ← Source Code PHP Laravel REST API
└── frontend/react/           ← Source Code React + TypeScript (Vite)
```

---

## 📈 Status Progres Pengembangan

Sistem ini sedang dalam masa pengembangan aktif, dengan fokus *Milestone* sebagai berikut:

- 🟢 **Phase 1-5 (Firmware): Selesai** – Pembacaan NFC/RFID, sistem state mesin pintu (*door logic*), antrian *offline-first* (*Event Queue*), dan sinkronisasi selesai dibangun.
- 🟢 **Phase 6 (Backend Laravel): Selesai** – API absensi terotomatisasi, perlindungan *idempotency* transaksi ganda, tabel *devices*, dsb telah siap digunakan.
- 🟡 **Phase 7 (Frontend React): Sedang Berjalan** – Konteks autentikasi dan halaman *login* selesai dibangun. Penyusunan fitur *Dashboard* (*Students, Cards, Attendance*) sedang diimplementasikan.
- ⚪ **Phase 8 (Integration): Menunggu** – Integrasi sistem secara menyeluruh dan pengujian skala penuh (E2E Testing).

Ikuti detail pembangunannya di [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md).

---

## ⚙️ Prinsip Pengembangan

**Reliabilitas > Keamanan > Kebenaran Fungsi > Skalabilitas > Tampilan UI.**

Fokus utama adalah membangun Produk Layak Jual minimum (MVP) berdasarkan [`docs/MVP.md`](./docs/MVP.md) terlebih dahulu, memverifikasi seluruh komunikasi perangkat secara independen, barulah memoles antarmuka pengguna ke tahap maksimal.
