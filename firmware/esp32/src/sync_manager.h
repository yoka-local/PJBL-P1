#pragma once

// Initialize the sync manager
void sync_init();

// Call frequently to process the queue in the background
void sync_update();
