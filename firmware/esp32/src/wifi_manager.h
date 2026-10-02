#pragma once

// Initializes the Wi-Fi module in Station mode
void wifi_init();

// Non-blocking loop function to maintain Wi-Fi connection
// Must be called repeatedly in the main loop
void wifi_update();
