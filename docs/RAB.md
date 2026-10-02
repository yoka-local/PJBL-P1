# Rencana Anggaran Biaya (RAB) - NexusGate

Berikut adalah estimasi Rencana Anggaran Biaya (RAB) untuk pembuatan prototipe *smart door* NexusGate dengan target anggaran di bawah Rp 200.000. Komponen difokuskan pada penggunaan teknologi NFC sebagai prioritas utama.

| No | Nama Komponen | Spesifikasi / Keterangan | Estimasi Harga (Rp) | Check List |
|---|---|---|---|---|
| 1 | ESP32 Development Board | NodeMCU WROOM-32 (Disediakan oleh sekolah) | 45.000 - 50.000 | [ ] |
| 2 | Modul NFC RFID PN532 V3 | Membaca kartu NFC (e-Money, smart tag) & RFID | 55.000 - 65.000 | [ ] | 
| 3 | Mini Solenoid Door Lock | Versi 5V (Dapat diaktifkan via charger HP biasa) | 30.000 - 35.000 | [ ] |
| 4 | Relay Module 1 Channel | 5V DC (Untuk mengontrol arus ke solenoid) | 6.000 - 8.000 | [ ] |
| 5 | Magnetic Reed Switch (MC-38) | Sensor magnet pendeteksi status pintu (Buka/Tutup)| 8.000 - 12.000 | [ ] |
| 6 | Active Buzzer | 5V DC (Indikator audio/alarm) | 2.000 - 3.000 | [ ] |
| 7 | Kabel Jumper (Dupont) | 1 Set Female-Female & Male-Female (20/40 pcs) | 10.000 - 15.000 | [ ] |
| 8 | Breadboard Half-Size | 400 Lubang (Untuk merangkai tanpa solder) | 10.000 - 15.000 | [ ] | 
| 9 | Komponen Pasif | LED (Merah & Hijau) + Resistor (220 Ohm) secukupnya| 3.000 - 5.000 | [ ] |

### 🧮 Total Estimasi Biaya (Normal)
**Rp 169.000 — Rp 208.000**
*(Dikarenakan ESP32 disediakan oleh sekolah, pengeluaran aktual yang dibutuhkan hanya sekitar **Rp 124.000 — Rp 158.000**)*

*Catatan: Harga dapat bervariasi bergantung pada toko di marketplace online. Untuk menekan biaya, daya akan diambil menggunakan charger smartphone 5V (minimal 2A) dan kabel USB bekas, sehingga tidak perlu membeli power supply 12V khusus.*
