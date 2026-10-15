# Rencana & Realisasi Anggaran Biaya (RAB) - NFCKey

Dokumen ini memuat rincian **Rencana dan Realisasi Anggaran Biaya (RAB)** aktual untuk pengadaan komponen prototipe *smart door* **NFCKey**. Seluruh komponen perangkat keras saat ini berstatus **100% Acquired (Telah Selesai Diperoleh/Dibeli)** dengan setup daya tunggal berbasis **Solenoid 12V** dan **Step-Down LM2596**.

---

## 📊 Tabel Realisasi Anggaran Biaya Komponen

| No | Nama Komponen | Spesifikasi / Keterangan | Estimasi Awal (Rp) | Harga Realisasi (Rp) | Status Pengadaan |
|:---:|---|---|:---:|:---:|:---:|
| 1 | **ESP32 Development Board** | NodeMCU WROOM-32 38-Pin (Disediakan sekolah) | 45.000 – 50.000 | **Rp 0** *(Inventaris Sekolah)* | [x] Acquired |
| 2 | **Modul NFC RFID PN532 V3** | Pembaca NFC (e-Money, Smart Tag, HP) & RFID 13.56 MHz | 55.000 – 65.000 | **Rp 58.000** | [x] Acquired |
| 3 | **Mini Solenoid Door Lock** | **Versi 12V** (Fail-Secure, lidah kunci elektromagnetik) | 35.000 – 45.000 | **Rp 38.000** | [x] Acquired |
| 4 | **Adaptor DC 12V 2A** | Catu daya utama 12V untuk Solenoid & Rangkaian | 25.000 – 35.000 | **Rp 28.000** | [x] Acquired |
| 5 | **Step-Down Module LM2596** | Penurun 12V ke 5.0V stabil untuk ESP32 & Relay | 12.000 – 15.000 | **Rp 13.000** | [x] Acquired |
| 6 | **Relay Module 1-Channel** | 5V DC Optocoupler Isolation (Driver Solenoid) | 6.000 – 8.000 | **Rp 7.000** | [x] Acquired |
| 7 | **Jack DC Female 5.5x2.1mm** | Soket adaptor terminal baut tanpa potong kabel | 2.000 – 3.000 | **Rp 2.500** | [x] Acquired |
| 8 | **Magnetic Reed Switch (MC-38)** | Sensor magnetik pendeteksi status buka/tutup pintu | 8.000 – 12.000 | **Rp 9.500** | [x] Acquired |
| 9 | **Active Buzzer 5V** | Indikator audio status akses & sirine alarm | 2.000 – 3.000 | **Rp 2.500** | [x] Acquired |
| 10 | **Kabel Jumper Dupont** | 1 Set Female-Female & Male-Female (40 pcs) | 10.000 – 15.000 | **Rp 12.000** | [x] Acquired |
| 11 | **Breadboard Half-Size** | 400 Titik lubang prototyping tanpa solder | 10.000 – 15.000 | **Rp 12.000** | [x] Acquired |
| 12 | **Komponen Pasif (LED + Resistor)**| 3x LED 5mm (Hijau, Merah, Kuning) + 3x Resistor 220 $\Omega$| 3.000 – 5.000 | **Rp 4.500** | [x] Acquired |
| 13 | **Dioda 1N4007** | Flyback diode proteksi lonjakan tegangan balik solenoid | 1.000 – 2.000 | **Rp 1.000** | [x] Acquired |

---

## 🧮 Rekapitulasi Total Biaya Aktual

* **Total Nilai Riil Hardware (Termasuk Nilai ESP32):** **Rp 236.000**
* **Total Pengeluaran Kas Riil (ESP32 Disediakan Sekolah):** **Rp 188.000**
* **Status Pengadaan Fisik:** **100% Selesai (13 / 13 Item Lengkap)**

### 👥 Pembagian Iuran Kelompok (7 Anggota)
$$\text{Iuran per Anggota} = \frac{\text{Total Pengeluaran Kas}}{\text{Jumlah Anggota}} = \frac{\text{Rp 188.000}}{7} \approx \mathbf{Rp\ 26.850\ \text{(Digenapkan: Rp 27.000)}}$$

---

> [!NOTE]
> Dengan memanfaatkan **Step-Down LM2596**, sistem hanya memerlukan **satu Adaptor 12V 2A** untuk menyuplai daya Solenoid (12V) dan ESP32 (5V) secara simultan, sehingga menghemat biaya tanpa memerlukan adaptor ganda.
