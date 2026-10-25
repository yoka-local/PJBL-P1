# 🔌 Hardware Engineering & Wiring Specification — NFCKey System

Dokumentasi lengkap spesifikasi perangkat keras (*Hardware*), diagram skematik, tata letak pin (*pinout*), analisis daya, dan proteksi elektronika untuk sistem **NFCKey (Smart NFC Attendance & Door Access System)**.

---

## 📋 1. Bill of Materials (Daftar Komponen Fisik)

| No | Komponen | Model / Spesifikasi | Fungsi & Peran |
| :-: | :--- | :--- | :--- |
| 1 | **Mikrokontroler Utama** | ESP32 DevKit v4 (30-Pin / 32-Pin) | Otak pemrosesan, Wi-Fi 2.4GHz, dan kendali state machine pintu. |
| 2 | **Modul NFC Utama (Prioritas)** | PN532 V3 (Red Board) SPI/I2C | Pembaca kartu NFC, smart tag, dan e-Money (ISO/IEC 14443A). |
| 3 | **Modul RFID Cadangan (Fallback)**| MFRC522 (13.56 MHz SPI) | Pembaca kartu Mifare Classic 1K dan RFID keyfob. |
| 4 | **Aktuator Kunci Pintu** | Mini Solenoid Door Lock 12V DC | Mekanisme penguncian fisik (*Fail-Secure* — terkunci tanpa daya). |
| 5 | **Driver Saklar Kunci** | Modul Relay 1-Channel 5V Optocoupler | Sakelar isolasi optik untuk daya 12V solenoid dari sinyal GPIO ESP32. |
| 6 | **Dioda Proteksi Back-EMF** | 1N4007 Flyback Diode | Meredam lonjakan tegangan induktif solenoid saat relay terputus. |
| 7 | **Sensor Magnetik Pintu** | Reed Switch Kontak Magnet MC-38 | Mendeteksi posisi fisik daun pintu (terbuka atau tertutup rapat). |
| 8 | **Audio Feedback** | Active Piezo Buzzer 5V (Modul 3-Pin) | Bunyi konfirmasi akses, nada peringatan tolak, dan sirine darurat. |
| 9 | **Indikator Visual (LED)** | 3x LED 5mm (Hijau, Merah, Kuning) | Indikator visual akses diterima, ditolak, dan alarm pintu terbuka. |
| 10 | **Resistor Pembatas Arus** | 3x Resistor 220 $\Omega$ (1/4W) | Melindungi LED dari arus berlebih (*current limiting*). |
| 11 | **Regulator Tegangan** | Modul Step-Down LM2596 DC-DC Buck | Menurunkan tegangan 12V adaptor menjadi 5.0V teregulasi untuk ESP32. |
| 12 | **Catu Daya Utama** | Adaptor DC 12V 2A Switching | Sumber tenaga utama sistem dan solenoid lock. |
| 13 | **Papan Rangkaian & Kabel** | Breadboard Half-Size + Dupont Wires | Interkoneksi prototipe tanpa solder. |

---

## 📌 2. Tabel Pinout ESP32 (32-Pins & 30-Pins)

```text
                 +-------------------+
                 |    ESP32 DEVKIT   |
             3V3 | [ ]           [ ] | GND
              EN | [ ]           [ ] | GPIO 23 (MOSI)
         GPIO 36 | [ ]           [ ] | GPIO 22 (RST / SCL)
         GPIO 39 | [ ]           [ ] | GPIO 1  (TX0)
         GPIO 34 | [ ]           [ ] | GPIO 3  (RX0)
         GPIO 35 | [ ]           [ ] | GPIO 21 (SDA - I2C)
(Green)  GPIO 32 | [ ]           [ ] | GPIO 19 (MISO)
(Red)    GPIO 33 | [ ]           [ ] | GPIO 18 (SCK)
(Yellow) GPIO 25 | [ ]           [ ] | GPIO 5  (SS / CS)
(Relay)  GPIO 26 | [ ]           [ ] | GPIO 17
(Reed)   GPIO 27 | [ ]           [ ] | GPIO 16
(Buzzer) GPIO 14 | [ ]           [ ] | GPIO 4
         GPIO 12 | [ ]           [ ] | GPIO 0
         GPIO 13 | [ ]           [ ] | GPIO 2
             GND | [ ]           [ ] | GND
             VIN | [ ]           [ ] | 3V3
                 +-------------------+
```

### Rincian Sambungan Pinout:

| Fungsi Sinyal | Pin ESP32 | Target Modul & Pin | Logika & Catatan Teknis |
| :--- | :---: | :--- | :--- |
| **NFC PN532 SCK** | **GPIO 18** | Modul PN532 `SCK` | SPI Bus Clock (VSPI) |
| **NFC PN532 MISO**| **GPIO 19** | Modul PN532 `MISO` | SPI Master In Slave Out |
| **NFC PN532 MOSI**| **GPIO 23** | Modul PN532 `MOSI` | SPI Master Out Slave In |
| **NFC PN532 SS** | **GPIO 5** | Modul PN532 `SDA / SS` | SPI Chip Select |
| **NFC PN532 RST** | **GPIO 22** | Modul PN532 `RSTPD_N` | Pin Reset modul NFC |
| **Relay Solenoid**| **GPIO 26** | Modul Relay `IN` | **Active LOW** (`LOW` = Buka, `HIGH` = Kunci) |
| **Reed Switch** | **GPIO 27** | MC-38 Kabel 1 (Kabel 2 ke GND) | `INPUT_PULLUP` (`LOW` = Tutup, `HIGH` = Buka) |
| **LED Hijau** | **GPIO 32** | Resistor 220 $\Omega$ $\rightarrow$ Anoda LED Hijau | Akses Diterima |
| **LED Merah** | **GPIO 33** | Resistor 220 $\Omega$ $\rightarrow$ Anoda LED Merah | Akses Ditolak & Alarm Strobe |
| **LED Kuning** | **GPIO 25** | Resistor 220 $\Omega$ $\rightarrow$ Anoda LED Kuning | Status Wi-Fi & Peringatan Door Ajar |
| **Active Buzzer** | **GPIO 14** | Modul Buzzer 3-Pin `I/O` (S) | Nada Audio Akses & Sirine Darurat |
| **VCC Sensor** | **3V3** | VCC PN532 / RC522 | Regulator 3.3V Onboard |
| **VCC Aktuator** | **VIN / 5V**| VCC Relay & Buzzer Modul | Daya 5V dari Step-Down LM2596 |
| **Ground Bersama**| **GND** | Seluruh GND Modul & Sensor | Common Ground |

---

## ⚙️ 3. Konfigurasi DIP Switch Modul PN532 V3 (Red Board)

Modul PN532 Merah dilengkapi dengan 2 sakelar mikro (DIP Switch) pada PCB untuk menentukan mode komunikasi:

```text
       +---------------+
       | DIP SWITCH    |
       |  [1]     [2]  |
       |  OFF     OFF  |  <--- Mode SPI (Rekomendasi Default)
       +---------------+
```

* **Mode SPI (Standard ESP32 - Kecepatan Tinggi):**
  * `Switch 1` = **OFF (Posisi 0 / L)**
  * `Switch 2` = **OFF (Posisi 0 / L)**
* **Mode I2C (Hemat Pin Kabel):**
  * `Switch 1` = **OFF (Posisi 0 / L)**
  * `Switch 2` = **ON (Posisi 1 / H)**
  *(Gunakan GPIO 21 SDA dan GPIO 22 SCL)*

---

## ⚡ 4. Arsitektur Daya & Proteksi Elektronika

```text
[Adaptor 12V 2A]
       │
       ├───(+) 12V ───> [Kontak COM Relay] ──>[Kontak NO]───(+) 12V Solenoid Lock
       │                                                         │ (Katoda ──[>|]── Anoda)
       │                                                         └── Flyback Diode 1N4007
       │
       └───(+) 12V ───> [LM2596 Buck Converter] ───(+) 5V ───> ESP32 VIN
                                                               Relay VCC
                                                               Buzzer VCC
```

### Kaidah Keselamatan Penting:
1. **Dilarang Menghubungkan Solenoid Langsung ke GPIO:**
   * Solenoid 12V mengonsumsi arus sekitar **800mA - 1200mA**, jauh melampaui kemampuan pin GPIO ESP32 (maksimal 12mA - 40mA). Wajib menggunakan **Relay Optocoupler**.
2. **Dioda Flyback 1N4007:**
   * Dipasang paralel terbalik (*reverse-biased*) pada kutub solenoid (+ ke Katoda bergaris perak, - ke Anoda). Mencegah tegangan balik induktif (*back-EMF*) merusak kontak relay dan mikrokontroler saat medan magnet luruh.
3. **Safe Cold-Boot Relay Protection:**
   * Firmware menulis level logika non-aktif (`HIGH` untuk modul active-low) ke register output **sebelum** mengeksekusi `pinMode(PIN_DOOR_RELAY, OUTPUT)`. Hal ini mengeliminasi bunyi *glitch clicking* relay saat mikrokontroler menyala.
4. **Prinsip Fail-Secure:**
   * Kunci pintu solenoid berjenis *Fail-Secure*, yang berarti jika sumber listrik PLN mati total, pintu tetap berada dalam status terkunci demi integritas keamanan ruangan.
