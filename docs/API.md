# 🌐 REST API Specification — NFCKey System

Dokumentasi lengkap kontrak REST API untuk sistem **NFCKey (Smart NFC Attendance & Door Access System)**. Backend dibangun di atas **Laravel 11/12/13** dengan autentikasi **Laravel Sanctum** serta mendukung integrasi langsung ke **Supabase PostgREST API**.

---

## 🔐 1. Mekanisme Autentikasi (Authentication)

Sistem menggunakan token berbasis Bearer Token (`auth:sanctum`):

```http
Authorization: Bearer <TOKEN>
Content-Type: application/json
Accept: application/json
```

* **Device Token**: Diterbitkan saat perangkat IoT didaftarkan di sistem. Digunakan oleh mikrokontroler ESP32 untuk memanggil endpoint tap dan heartbeat. Kartu RFID / UID fisik **tidak pernah** dijadikan token otorisasi API.
* **User/Admin Token**: Diterbitkan melalui endpoint `/api/login` saat admin atau anggota masuk ke dashboard web.

---

## 📡 2. Endpoint Perangkat Keras (Hardware & IoT Gateway)

### A. Pencatatan Akses & Presensi (Idempotent Tap)

Mencatat event penempelan kartu dari gerbang masuk. Endpoint ini memiliki proteksi **idempotency** berbasis `event_id`.

* **Method:** `POST`
* **URL:** `/api/attendance/tap`
* **Auth:** Bearer Token (Device)

#### Request Body
```json
{
  "event_id": "c7a810f3-8b71-4a2e-9d21-f92a3451e081",
  "card_uid": "04:A3:92:7F",
  "device_id": "GATE-01",
  "status": "Diterima",
  "timestamp": "2026-10-25T14:32:00+07:00"
}
```

#### Response: Event Baru Berhasil Disimpan (HTTP 201 Created)
```json
{
  "success": true,
  "event_id": "c7a810f3-8b71-4a2e-9d21-f92a3451e081",
  "message": "Presensi berhasil dicatat",
  "data": {
    "id": 142,
    "user_id": 5,
    "user_name": "Siswa Teladan",
    "card_uid": "04:A3:92:7F",
    "device_id": "GATE-01",
    "status": "Diterima",
    "timestamp": "2026-10-25T14:32:00+07:00"
  }
}
```

#### Response: Event Duplikat / Retry Offline (HTTP 200 OK)
Jika ESP32 mencoba mengirim ulang event yang sama karena putus koneksi sesaat, server mendeteksi duplikat pada `event_id` dan merespons sukses tanpa menggandakan rekaman di database:
```json
{
  "success": true,
  "event_id": "c7a810f3-8b71-4a2e-9d21-f92a3451e081",
  "duplicate": true,
  "message": "Event telah diproses sebelumnya (Idempotent)"
}
```

---

### B. Device Heartbeat (Liveness Ping)

ESP32 mengirim sinyal detak jantung secara berkala (tiap 20 detik) untuk memperbarui status online di web dashboard.

* **Method:** `POST`
* **URL:** `/api/devices/heartbeat`
* **Auth:** Bearer Token (Device)

#### Request Body
```json
{
  "device_id": "GATE-01",
  "ip_address": "192.168.1.105",
  "firmware_version": "v1.2.0-NFC",
  "rssi": -58
}
```

#### Response (HTTP 200 OK)
```json
{
  "success": true,
  "message": "Heartbeat updated",
  "device_id": "GATE-01",
  "status": "online",
  "last_seen": "2026-10-25T14:35:10+07:00"
}
```

---

## 🔑 3. Endpoint Autentikasi Pengguna (User Auth)

### A. Login Akun
* **Method:** `POST`
* **URL:** `/api/login`
* **Auth:** Publik

#### Request Body
```json
{
  "email": "admin@nfckey.com",
  "password": "password123"
}
```

#### Response (HTTP 200 OK)
```json
{
  "token": "1|q4k8L7x9...sanctum_token...",
  "user": {
    "id": 1,
    "name": "Super Administrator",
    "email": "admin@nfckey.com",
    "role": "admin",
    "department": "IT Infrastructure"
  }
}
```

### B. Profil Pengguna Sedang Login
* **Method:** `GET`
* **URL:** `/api/user`
* **Auth:** Bearer Token (User)

#### Response (HTTP 200 OK)
```json
{
  "id": 1,
  "name": "Super Administrator",
  "email": "admin@nfckey.com",
  "role": "admin",
  "department": "IT Infrastructure"
}
```

---

## 🛠️ 4. Endpoint Administrator (`/api/admin/*`)

Hanya dapat diakses oleh pengguna dengan role `admin` (dilindungi middleware `role:admin`).

### A. Manajemen Kartu (`/api/admin/cards`)

| Method | URL | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/admin/cards` | Mendapatkan daftar seluruh kartu NFC/RFID terdaftar beserta relasi pemilik. |
| `POST` | `/api/admin/cards` | Mendaftarkan kartu baru (`uid`, `user_id`, `is_active`). |
| `GET` | `/api/admin/cards/{id}` | Menampilkan detail spesifik satu kartu. |
| `PUT` | `/api/admin/cards/{id}` | Memperbarui kepemilikan atau status aktif/nonaktif kartu. |
| `DELETE` | `/api/admin/cards/{id}` | Menghapus kartu dari sistem. |

#### Contoh Payload POST `/api/admin/cards`:
```json
{
  "uid": "04:A3:92:7F",
  "user_id": 5,
  "is_active": true
}
```

---

### B. Manajemen Pengguna / Anggota (`/api/admin/users`)

| Method | URL | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/admin/users` | Menampilkan seluruh pengguna/staf/siswa. |
| `POST` | `/api/admin/users` | Mendaftarkan akun pengguna baru (`name`, `email`, `role`, `password`, `department`). |
| `GET` | `/api/admin/users/{id}` | Menampilkan detail spesifik pengguna beserta riwayat kartu. |
| `PUT` | `/api/admin/users/{id}` | Memperbarui data pengguna. |
| `DELETE` | `/api/admin/users/{id}` | Menghapus pengguna. |

---

### C. Manajemen Perangkat Gateway (`/api/admin/devices`)

| Method | URL | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/admin/devices` | Menampilkan seluruh gerbang pintu/device ESP32 terdaftar, IP, dan status online/offline. |
| `POST` | `/api/admin/devices` | Mendaftarkan perangkat gateway baru (`device_id`, `name`). |
| `PUT` | `/api/admin/devices/{id}` | Mengubah informasi gerbang. |
| `DELETE` | `/api/admin/devices/{id}` | Menghapus gerbang. |

---

### D. Rekap Log Akses & Presensi (`/api/admin/attendances`)

* **Method:** `GET`
* **URL:** `/api/admin/attendances`
* **Query Parameters:** `date`, `status` (`Diterima`/`Ditolak`), `device_id`, `search`, `limit`, `page`.

#### Response (HTTP 200 OK)
```json
{
  "current_page": 1,
  "data": [
    {
      "id": 142,
      "event_id": "c7a810f3-8b71-4a2e-9d21-f92a3451e081",
      "user_name": "Siswa Teladan",
      "card_uid": "04:A3:92:7F",
      "device_id": "GATE-01",
      "status": "Diterima",
      "timestamp": "2026-10-25T14:32:00+07:00"
    }
  ],
  "total": 142
}
```

---

## 👤 5. Endpoint Anggota / Worker (`/api/worker/*`)

Endpoint mandiri bagi karyawan/siswa untuk melihat data kehadirannya sendiri tanpa akses kontrol administratif:

* `GET /api/worker/attendances` : Riwayat presensi pengguna yang sedang login.
* `GET /api/worker/attendances/summary` : Ringkasan bulanan (total kehadiran tepat waktu, terlambat, dan rasio kehadiran).

---

## ⚡ 6. Supabase Realtime & REST Direct API

Untuk instalasi serverless dan latensi rendah pada simulasi Wokwi serta visualisasi web real-time, firmware dan frontend juga terintegrasi langsung dengan Supabase:

| Target Tabel | Endpoint PostgREST | Operasi Utama |
| :--- | :--- | :--- |
| `attendances` | `POST /rest/v1/attendances` | Inserter event langsung dari mikrokontroler ESP32 dengan header `apikey` dan `Prefer: return=representation`. |
| `devices` | `PATCH /rest/v1/devices?device_id=eq.GATE-01` | Pembaruan timestamp `last_seen` dan `status = 'online'` (Heartbeat). |
| `cards` | `GET /rest/v1/cards?select=uid,is_active` | Pengunduhan cache kartu whitelist lokal ke ESP32. |

---

## 🛑 7. Kode Status HTTP & Format Respons Error

Format respons kesalahan selalu mengikuti struktur standar:

```json
{
  "success": false,
  "message": "Format data yang dikirim tidak valid",
  "errors": {
    "card_uid": ["Bidang card uid wajib diisi."]
  }
}
```

| Kode HTTP | Makna | Keterangan |
| :---: | :--- | :--- |
| **200 OK** | Berhasil | Permintaan berhasil diproses (termasuk respons idempotency duplikat). |
| **201 Created** | Dibuat | Rekaman presensi atau entitas baru berhasil dibuat. |
| **401 Unauthorized** | Tidak Terautentikasi | Token tidak disertakan atau telah kedaluwarsa. |
| **403 Forbidden** | Dilarang | Peran pengguna tidak memiliki hak akses ke endpoint ini. |
| **404 Not Found** | Tidak Ditemukan | ID pengguna, kartu, atau rute tidak ditemukan. |
| **422 Unprocessable** | Validasi Gagal | Parameter request body tidak lolos validasi. |
| **500 Internal Error** | Kegagalan Server | Kesalahan internal database atau server backend. |
