# 🌐 NFCKey Backend Services

Direktori ini berisi seluruh layanan backend dan REST API untuk sistem **NFCKey (Smart NFC Attendance & Door Access System)**.

---

## 📂 Struktur Direktori

- **[`laravel/`](./laravel/)**: Layanan REST API utama berbasis framework Laravel 11/12/13.
  - Autentikasi multi-role (Sanctum)
  - Penanganan transaksi presensi dengan garansi idempotency
  - Heartbeat gateway IoT
  - Manajemen kartu, pengguna, dan perangkat
  - Database migrations & automated test suite

Untuk panduan instalasi dan dokumentasi endpoint selengkapnya, silakan buka:
- [Panduan Laravel Backend](./laravel/README.md)
- [Spesifikasi Kontrak REST API](../docs/API.md)
- [Desain Skema Basis Data](../docs/DATABASE.md)
