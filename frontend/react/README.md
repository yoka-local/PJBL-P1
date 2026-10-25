# 💻 React Frontend Dashboard — NFCKey System

Antarmuka web modern (*Web Dashboard*) untuk sistem **NFCKey (Smart NFC Attendance & Door Access System)**. Dibangun menggunakan **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, dan **Lucide Icons**, terintegrasi penuh dengan **Supabase Realtime WebSockets** serta **Laravel REST API**.

---

## 🌟 Fitur Antarmuka Utama

- 📊 **Real-time Live Dashboard (`Dashboard.tsx`):**
  - Widget metrik: Total Hadir Hari Ini, Total Kartu Terdaftar, Total Kartu Ditolak, dan Status Gateway.
  - Indikator status gerbang (*Liveness Badge*) dengan deteksi dinamis (<45 detik online threshold).
  - Streaming log kehadiran real-time yang memperbarui baris secara instan saat kartu di-tap.
- 📋 **Log Presensi Lengkap (`Logs.tsx`):**
  - Tabel log interaktif dengan pencarian nama / UID kartu.
  - Filter berdasarkan status (`Diterima` / `Ditolak`) dan tanggal.
  - Fitur **Export CSV** untuk pelaporan absensi.
- 💳 **Manajemen Kartu (`Cards.tsx`):**
  - Pendaftaran UID kartu RFID/NFC baru.
  - Relasi pemilik kartu ke akun pengguna.
  - Sakelar aktivasi / penonaktifan kartu (*Revoke / Activate*).
- 🖥️ **Status Gerbang IoT (`Devices.tsx`):**
  - Informasi perangkat terdaftar (`GATE-01`), IP lokal, firmware version, dan last heartbeat timestamp.
  - Tombol manual refresh data dengan indikator spinner.
- 👥 **Manajemen Pengguna (`Users.tsx`):**
  - Pendaftaran pengguna baru (Admin atau Worker).
  - Penautan langsung kartu RFID ke profil pengguna.
  - Pengaturan email dan password untuk portal mandiri.
- ⚙️ **Konfigurasi Sistem (`Settings.tsx`):**
  - Pengaturan durasi buka pintu (`UNLOCK_HOLD_TIME_MS`) dan batas alarm pintu terbuka (`TIMEOUT_DOOR_OPEN_MS`).
  - Tombol uji coba pengiriman alert Telegram / Notifikasi darurat.
- 🔔 **Interactive Notification Bell & Live Clock:**
  - Bel notifikasi interaktif yang menampilkan peringatan penolakan akses kartu ilegal dan akses pintu masuk.
  - Jam digital real-time (WIB) terintegrasi pada navigasi atas.

---

## 🛠️ Panduan Instalasi & Menjalankan

### 1. Persyaratan Sistem
- Node.js >= 18.0 atau Deno >= 2.0
- npm, pnpm, atau yarn

### 2. Langkah Setup
1. Masuk ke folder frontend:
   ```bash
   cd frontend/react
   ```
2. Pasang dependensi:
   ```bash
   npm install
   # Atau jika menggunakan Deno:
   deno install
   ```
3. Konfigurasi kredensial Supabase (opsional, telah dikonfigurasi di `src/supabase.ts`):
   ```env
   VITE_SUPABASE_URL=https://zdsmcifmlbwejyihorqs.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 3. Menjalankan Server Pengembangan
```bash
npm run dev
# Atau jika menggunakan Deno:
deno task dev
```
Buka browser pada `http://localhost:5173`.

### 4. Membangun Aset Produksi (Production Build)
```bash
npm run build
# Atau jika menggunakan Deno:
deno run -A --node-modules-dir npm:vite build
```
File hasil kompilasi yang dioptimasi akan berada di folder `dist/`.

---

## 📂 Struktur Kode Sumber (`src/`)

```text
src/
├── assets/             # Logo, icon, dan hero images
├── components/         # Komponen tampilan utama
│   ├── Dashboard.tsx   # Tampilan ringkasan live stats & liveness
│   ├── Logs.tsx        # Tabel log presensi & export CSV
│   ├── Cards.tsx       # Manajemen kartu RFID/NFC
│   ├── Devices.tsx     # Manajemen gateway IoT
│   ├── Users.tsx       # Manajemen data pengguna & akun
│   └── Settings.tsx    # Konfigurasi sistem & alert test
├── contexts/           # State global
│   └── AuthContext.tsx # Manajemen login, role, & sesi
├── lib/                # Utility & REST API helper
│   └── api.ts          # Client HTTP untuk backend Laravel
├── supabase.ts         # Inisialisasi Supabase client & Realtime
├── App.tsx             # Root layout, navigation bar, & live clock
├── main.tsx            # Entry point React DOM
└── index.css           # Styling Tailwind CSS
```
