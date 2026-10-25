# 🌐 Laravel Backend REST API — NFCKey System

Pusat data terpusat (*Source of Truth*) untuk sistem **NFCKey (Smart NFC Attendance & Door Access System)**. Dibangun menggunakan **Laravel 11/12/13**, **Laravel Sanctum**, dan arsitektur database relasional yang mendukung SQLite, MySQL, dan PostgreSQL.

---

## 🚀 Fitur Utama Backend

- 🔐 **Autentikasi Multi-Role (Sanctum):** Pemisahan hak akses antara `admin` (kontrol penuh perangkat, kartu, dan pengguna) dan `worker` (akses riwayat mandiri).
- 🔄 **Idempotent Tap API (`/api/attendance/tap`):** Penanganan transmisi ulang dari ESP32 dengan garansi anti-duplikasi melalui database constraint `UNIQUE(event_id)`.
- 💓 **Device Heartbeat Monitoring (`/api/devices/heartbeat`):** Pelacakan status online/offline gerbang IoT secara real-time.
- 👥 **Manajemen Lengkap (CRUD):**
  - **Cards Management:** Pendaftaran UID hardware, relasi pemilik, dan status aktif/non-aktif.
  - **Users Management:** Pengelolaan akun staf, siswa, dan kredensial akses.
  - **Devices Management:** Pengelolaan gerbang fisik (`GATE-01`), alamat IP lokal, dan riwayat liveness.
  - **Attendances Report:** Riwayat absensi lengkap dengan filter pencarian, status diterima/ditolak, dan pagination.

---

## 🛠️ Panduan Instalasi & Menjalankan

### 1. Persyaratan Sistem
- PHP >= 8.2 (dengan ekstensi `pdo`, `sqlite3` atau `mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`)
- Composer >= 2.0

### 2. Langkah Setup
1. Masuk ke direktori backend:
   ```bash
   cd backend/laravel
   ```
2. Pasang dependensi Composer:
   ```bash
   composer install
   ```
3. Buat file environment:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```
4. Jalankan migrasi dan seeder awal:
   ```bash
   # Menggunakan SQLite lokal (default & cepat):
   touch database/database.sqlite
   php artisan migrate --seed
   ```

### 3. Menjalankan Server Lokal
```bash
php artisan serve --host=0.0.0.0 --port=8000
```
Server REST API akan aktif di `http://127.0.0.1:8000`.

---

## 🧪 Menjalankan Automated Test Suite

Backend dilengkapi dengan pengujian unit dan integrasi otomatis:
```bash
php artisan test
```

Semua pengujian memverifikasi alur otentikasi, enkripsi password, dan keutuhan response payload.

---

## 📡 Contoh Pengujian Endpoint API dengan cURL

### 1. Login Administrator
```bash
curl -X POST http://127.0.0.1:8000/api/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email":"admin@nfckey.com", "password":"password123"}'
```

### 2. Simulasi Tap Kartu dari ESP32 (Idempotent)
```bash
curl -X POST http://127.0.0.1:8000/api/attendance/tap \
  -H "Authorization: Bearer <TOKEN_DEVICE>" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "8f31a2c7-d492-4f2a-b731-92b0c41097fa",
    "card_uid": "04:A3:92:7F",
    "device_id": "GATE-01",
    "status": "Diterima",
    "timestamp": "2026-10-25T14:30:00+07:00"
  }'
```

### 3. Simulasi Heartbeat Gerbang
```bash
curl -X POST http://127.0.0.1:8000/api/devices/heartbeat \
  -H "Authorization: Bearer <TOKEN_DEVICE>" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "GATE-01",
    "ip_address": "192.168.1.105"
  }'
```

---

## 🗃️ Akun Default Bawaan (Database Seeder)

* **Super Admin:**
  * Email: `admin@nfckey.com`
  * Password: `password123`
  * Role: `admin`
* **Akun Worker / Siswa Teladan:**
  * Email: `siswa@nfckey.com`
  * Password: `password123`
  * UID Kartu Terhubung: `04:A3:92:7F`
* **Gerbang Fisik Default:**
  * `device_id`: `GATE-01`
  * Nama: `Pintu Masuk Utama Lab`
