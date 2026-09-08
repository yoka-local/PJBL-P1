# ESP32 Firmware

Not yet implemented — see [`../../docs/IMPLEMENTATION_PLAN.md`](../../docs/IMPLEMENTATION_PLAN.md)
Phases 1–5 and [`../../docs/FIRMWARE.md`](../../docs/FIRMWARE.md) for the module breakdown and
design decisions (state machine, offline queue, sync manager, event_id generation).

Planned layout (PlatformIO-style):

```text
firmware/esp32/
├── platformio.ini
├── src/
│   ├── main.cpp
│   ├── config.h
│   ├── wifi_manager.*
│   ├── rfid_reader.*
│   ├── card_store.*
│   ├── door_controller.*
│   ├── event_queue.*
│   ├── sync_manager.*
│   └── feedback.*
└── include/
```
