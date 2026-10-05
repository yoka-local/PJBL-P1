# 🌐 Laravel Backend (REST API)

Pusat data (Source of Truth) untuk sistem **NFCKey**. Menyediakan REST API, manajemen database, autentikasi perangkat, dan idempotency absensi.

## Setup
1. `composer install`
2. `cp .env.example .env`
3. Sesuaikan koneksi database di `.env` (disarankan SQLite untuk environment dev lokal)
4. `php artisan key:generate`
5. `php artisan migrate`

## Jalankan Server Lokal
```bash
php artisan serve
```

Lihat [API.md](../../docs/API.md) untuk kontrak endpoints.
