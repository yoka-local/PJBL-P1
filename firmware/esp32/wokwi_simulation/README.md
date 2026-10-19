# NFCKey ESP32 Wokwi Simulator Setup

This directory contains everything needed to run a 100% interactive, hardware-accurate simulation of the NFCKey ESP32 firmware on **[Wokwi](https://wokwi.com)**.

## Components Simulated

| Component | Pin | Purpose |
|---|---|---|
| **ESP32 DevKit v4** | - | Main controller |
| **MFRC522 RFID** | SS=5, SCK=18, MOSI=23, MISO=19, RST=22 | Card / Badge Reader (SPI) |
| **Relay Module** | GPIO 26 | Electronic Door Solenoid / Lock |
| **Slide Switch** | GPIO 27 (Input Pull-up) | Reed Switch (Door Contact Sensor) |
| **Piezo Buzzer** | GPIO 14 | Sound effects (Success, Denied, Alarm) |
| **Green LED** | GPIO 32 | Access Granted Indicator |
| **Red LED** | GPIO 33 | Access Denied / Tamper Indicator |
| **Yellow LED** | GPIO 25 | Door Ajar Warning Indicator |

---

## Method 1: Web Simulator (Zero Installation)

1. Open your browser and navigate to **[wokwi.com](https://wokwi.com)**.
2. Select **ESP32** (or "Start from Scratch" -> ESP32).
3. **Libraries**:
   - Click the **Library Manager** tab (or the little library icon).
   - Add `MFRC522` and `ArduinoJson`.
4. **Hardware Wiring (`diagram.json`)**:
   - Click the `diagram.json` tab.
   - Paste the contents of [`diagram.json`](diagram.json).
5. **Firmware Code (`sketch.ino`)**:
   - Click the `sketch.ino` tab.
   - Paste the entire code from [`wokwi_sketch.ino`](wokwi_sketch.ino).
6. **Run**:
   - Click the green **Play / Start Simulation** button.

---

## Method 2: VS Code Extension

1. Install the **Wokwi Simulator** extension in VS Code.
2. Ensure `firmware/esp32/wokwi.toml` and `firmware/esp32/diagram.json` are present in your workspace.
3. Open `diagram.json` in VS Code and press `F1` -> `Wokwi: Start Simulator`.

---

## Testing & Interacting with the Simulator

### 1. Valid Card (Access Granted)
- Click on the **MFRC522 module** in the simulator preview.
- By default, the **Blue Card** is configured with UID `04:A3:92:7F` (or select the **Green Card** with UID `11:22:33:44`).
- **Result:**
  - Relay clicks ON.
  - Green LED lights up.
  - Success chirp sounds on buzzer.
  - Event is created and uploaded to the API endpoint over virtual Wi-Fi (`Wokwi-GUEST`).

### 2. Invalid Card (Access Denied)
- Click on the MFRC522 and choose the **Red Card** (UID `AA:BB:CC:DD`).
- **Result:**
  - Red LED illuminates.
  - Low angry error beep sounds.
  - Relay remains locked.

### 3. Door Open & Close Cycle
- After a valid card tap, flip the **Slide Switch** (Reed Switch on GPIO 27) away from GND to simulate opening the door.
- Flip the switch back to simulate the door closing.
- **Result:** The relay immediately locks and status returns to `LOCKED`.

### 4. Auto-Relock Timeout (Door Never Opened)
- Tap a valid card, but do NOT flip the slide switch.
- Wait **10 seconds**.
- **Result:** The system automatically locks the door and logs `Timeout: Door was never opened. Auto-relocking.`

### 5. Door Ajar Alarm (Left Open Too Long)
- Tap a valid card and flip the slide switch to OPEN.
- Leave it open for **30 seconds**.
- **Result:** Yellow LED turns ON, and buzzer beeps continuously with an alarm tone until the switch is flipped back to CLOSED.
