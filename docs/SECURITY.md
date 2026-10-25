# 🛡️ Security Architecture & Threat Mitigation — NFCKey System

Dokumentasi rancangan keamanan siber, analisis ancaman (*Threat Modeling*), dan mekanisme proteksi berlapis (*Defense-in-Depth*) untuk sistem **NFCKey (Smart NFC Attendance & Door Access System)**.

---

## 🔒 1. Prinsip Utama Keamanan Sistem

1. **UID Kartu Bukanlah Kredensial Otorisasi API:**
   * UID kartu RFID/NFC bersifat publik dan dapat dibaca oleh pembaca kartu apa pun. UID hanya berfungsi sebagai **identifier identitas**, bukan sebagai kunci kriptografi atau token otorisasi API.
2. **Bearer Token Khusus Gerbang (Device Token):**
   * Setiap mikrokontroler ESP32 dibekali `DEVICE_TOKEN` rahasia berbasis Laravel Sanctum. Hanya request dengan token terdaftar yang dapat memanggil endpoint `/api/attendance/tap` dan `/api/devices/heartbeat`.
3. **Pemisahan Peran Pengguna (Role-Based Access Control - RBAC):**
   * Peran **`admin`**: Memiliki hak akses penuh (CRUD) terhadap seluruh data pengguna, kartu, perangkat, dan konfigurasi sistem.
   * Peran **`worker`** (Siswa/Karyawan): Hanya dapat membaca riwayat presensi mandiri dan ringkasan bulanan miliknya sendiri.
4. **Idempotensi & Anti-Replay:**
   * Setiap transaksi tap menghasilkan `event_id` unik (UUIDv4). Percobaan pengiriman ulang (*replay*) data yang sama tidak akan menghasilkan rekaman presensi ganda di database.

---

## 🎯 2. Analisis Ancaman (STRIDE Threat Model) & Mitigasi

| Ancaman (STRIDE) | Potensi Risiko | Mekanisme Mitigasi pada NFCKey |
| :--- | :--- | :--- |
| **Spoofing (Penyamaran)** | Penyerang meniru gateway ESP32 untuk menyuntikkan absensi palsu. | Verifikasi token Sanctum unik per perangkat dan validasi IP gateway. |
| **Tampering (Manipulasi Data)** | Pengubahan data status presensi di tengah transmisi jaringan. | Transmisi data wajib menggunakan protokol terenkripsi HTTPS / TLS 1.3. Validasi skema ketat menggunakan Form Request Laravel. |
| **Repudiation (Penyangkalan)** | Pengguna menyangkal bahwa kartunya telah di-tap. | Logging ganda: pencatatan waktu hardware di ESP32, waktu terima di server, ID gerbang fisik (`device_id`), dan salinan denormalisasi nama pengguna. |
| **Information Disclosure** | Kredensial Wi-Fi atau kunci database bocor ke publik. | Kredensial sensitif diisolasi dalam file `.env` (gitignored). Repositori hanya menyertakan template `.env.example`. |
| **Denial of Service (DoS)** | Pembaca kartu di-tap berkali-kali secara cepat untuk membanjiri server. | **Anti-Passback & Hardware Debounce**: Penguncian cooldown minimal 2-5 detik pada level mikrokontroler. Rate limiting pada level REST API. |
| **Elevation of Privilege** | Siswa mencoba mengakses endpoint data kartu atau pengguna lain. | Middleware `CheckRole` memblokir seluruh rute `/api/admin/*` bagi pengguna non-admin dengan HTTP 403 Forbidden. |

---

## 🚪 3. Keamanan Fisik & Logika Kunci (*Physical Security*)

### A. Arsitektur Kunci Fail-Secure
Kunci pintu solenoid yang digunakan menerapkan prinsip **Fail-Secure**:
* **Daya Listrik Padam:** Solenoid tetap mengunci daun pintu. Ruangan tetap aman dan tidak dapat dibuka tanpa kunci mekanis manual darurat.
* **Boot Glitch Protection (Condition 2):** Firmware mengatur register pin relay ke status non-aktif sebelum inisialisasi pinout. Menjamin relay tidak membuka sesaat (*clicking*) saat mikrokontroler restart atau dialiri daya.

### B. Proteksi Alarm Pembobolan (Forced Entry)
* Sensor magnetik Reed Switch MC-38 terus-menerus memantau kontinuitas kontak daun pintu.
* Jika pintu dibuka tanpa adanya otorisasi tap kartu sah (status `LOCKED`), sistem secara instan memicu sirine darurat berfrekuensi tinggi pada buzzer piezo dan menyalakan *strobe* LED Merah.
* Notifikasi insiden keamanan dikirimkan secara real-time ke web dashboard.

---

## 🔑 4. Manajemen Rahasia (*Secrets Handling*)

1. **Pemisahan Lingkungan (.gitignore):**
   * File `.env` pada Laravel dan kredensial Wi-Fi / Supabase pada firmware tidak pernah di-commit ke Git.
   * Repositori hanya memuat file `.env.example` sebagai panduan konfigurasi.
2. **Kriptografi Kata Sandi:**
   * Seluruh kata sandi pengguna dienkripsi satu arah menggunakan algoritma **Bcrypt** dengan *work factor* standar (12 rounds).
3. **Database Constraints sebagai Pertahanan Terakhir:**
   * Integritas idempotensi ditegakkan di level mesin basis data melalui `UNIQUE(event_id)`. Bahkan jika terjadi *race-condition* pada request bersamaan, database menjamin tidak ada entri ganda yang berhasil disimpan.
