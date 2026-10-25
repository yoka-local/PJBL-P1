# 🚀 Production Deployment & Installation Runbook — NFCKey System

Panduan implementasi dan peluncuran (*deployment*) lengkap untuk sistem **NFCKey (Smart NFC Attendance & Door Access System)**, mencakup instalasi lokal (*local development*), server produksi, cloud database, antarmuka web, serta perangkat keras IoT.

---

## 💻 1. Persiapan Lingkungan Lokal (Local Development)

### A. Backend Laravel API
1. Masuk ke direktori backend:
   ```bash
   cd backend/laravel
   ```
2. Pasang dependensi PHP:
   ```bash
   composer install
   ```
3. Konfigurasi environment:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```
4. Jalankan migrasi dan seeder database:
   ```bash
   php artisan migrate --seed
   ```
5. Jalankan unit test untuk memverifikasi keutuhan API:
   ```bash
   php artisan test
   ```
6. Jalankan server lokal:
   ```bash
   php artisan serve --host=0.0.0.0 --port=8000
   ```

---

### B. Frontend React Dashboard
1. Masuk ke direktori frontend:
   ```bash
   cd frontend/react
   ```
2. Pasang dependensi Node / Deno:
   ```bash
   npm install
   # Atau jika menggunakan Deno:
   deno install
   ```
3. Bangun aset produksi (*Production Build*):
   ```bash
   npm run build
   # Atau jika menggunakan Deno:
   deno run -A --node-modules-dir npm:vite build
   ```
4. Jalankan mode pengembangan:
   ```bash
   npm run dev
   ```

---

### C. Firmware ESP32
1. Masuk ke direktori firmware:
   ```bash
   cd firmware/esp32
   ```
2. Hubungkan modul ESP32 melalui kabel USB data.
3. Kompilasi dan upload firmware fisik:
   ```bash
   pio run -e hardware_irl -t upload
   ```
4. Pantau log serial:
   ```bash
   pio device monitor -b 115200
   ```

---

## ☁️ 2. Konfigurasi Cloud Database Supabase

Untuk menjalankan fitur sinkronisasi real-time instan dan visualisasi web tanpa latensi:
1. Buat proyek baru di [Supabase.com](https://supabase.com).
2. Salin skema SQL dari [`docs/DATABASE.md`](./DATABASE.md) ke **SQL Editor** Supabase.
3. Aktifkan **Realtime Replication** pada tabel `attendances` dan `devices` dari panel **Database > Publications**.
4. Salin **Project URL** dan **Anon Public Key** ke file konfigurasi:
   * Frontend: `frontend/react/src/supabase.ts`
   * Firmware: `firmware/esp32/NFCKey_Hardware_IRL/Config.h`

---

## 🏢 3. Prosedur Instalasi Fisik pada Pintu (Field Deployment)

```text
               +---------------------------------------+
               |             KUSEN PINTU               |
               |                                       |
 [Modul NFC]   |  [Reed Switch Sensor Magnetik]        |
 [PN532 Red]   |  [Kabel MC-38 ke Kusen & Daun Pintu]  |
               |                                       |
 [Box Panel]   |  [Solenoid Lock 12V Fail-Secure]      |
 [ESP32+Relay] |  [Plunger Kunci Menancap di Kusen]    |
               |                                       |
               +---------------------------------------+
```

1. **Pemasangan Box Panel Elektronika:**
   * Pasang kotak penutup (*enclosure box*) di sisi dalam ruangan dekat engsel pintu.
   * Masukkan ESP32 DevKit, modul step-down LM2596, modul relay 5V, dan buzzer ke dalam box.
2. **Pemasangan Modul Pembaca NFC PN532:**
   * Pasang modul PN532 di sisi luar pintu pada ketinggian ergonomis (sekitar 120 - 140 cm dari lantai).
   * Gunakan penutup akrilik non-logam untuk menjaga jangkauan medan RF 13.56MHz tetap maksimal (3-5 cm).
3. **Pemasangan Solenoid Lock 12V & Reed Switch:**
   * Tanam braket solenoid pada kusen pintu dengan arah plunger mengunci ke pelat daun pintu.
   * Pasang sensor magnet Reed Switch MC-38 dengan jarak celah (*gap*) maksimal 15 mm saat pintu tertutup rapat.
4. **Pemasangan Dioda Flyback 1N4007:**
   * Wajib pasang dioda 1N4007 paralel terbalik pada terminal solenoid untuk menyerap lonjakan induktif koil.

---

## 🎯 4. Demo-Day & Presentation Checklist

Panduan persiapan demonstrasi langsung di hadapan penguji / audiens:

- [x] **Koneksi Jaringan Venue:** SSID dan Password Wi-Fi venue telah dikonfigurasikan di `Config.h` atau menggunakan hotspot ponsel.
- [x] **Kartu Uji Coba Fisik Tersedia:**
  - Kartu Sah 1: UID `04:A3:92:7F` (Siswa Teladan)
  - Kartu Sah 2: UID `11:22:33:44` / `DE:AD:BE:EF` (Kartu Cadangan)
  - Kartu Asing: UID `AA:BB:CC:DD` (Untuk menguji penolakan akses dan LED Merah)
  - e-Money / Smartphone NFC (Untuk menguji kompatibilitas tag NFC modern)
- [x] **Dashboard Web Aktif di Laptop / Proyektor:** Menampilkan grafik statistik kehadiran dan tabel streaming real-time.
- [x] **Uji Matikan Wi-Fi Langsung (Kill-Switch Test):**
  1. Matikan tethering Wi-Fi saat demonstrasi.
  2. Lakukan tap kartu sah $\rightarrow$ buktikan pintu tetap terbuka secara normal (*Offline-First*).
  3. Nyalakan kembali Wi-Fi $\rightarrow$ buktikan event tap otomatis disinkronkan ke layar dashboard dalam hitungan detik!
- [x] **Uji Alarm Pintu Terbuka (Door Ajar Test):**
  1. Buka daun pintu dan tahan selama >30 detik.
  2. Buktikan LED Kuning berkedip cepat dan buzzer berbunyi peringatan.
  3. Tutup kembali daun pintu $\rightarrow$ buktikan alarm langsung mati seketika.
- [x] **Uji Pembobolan Pintu (Forced Entry Test):**
  1. Tarik magnet MC-38 tanpa menempelkan kartu sah.
  2. Buktikan sirine darurat berbunyi keras dan indikator darurat merah aktif.
