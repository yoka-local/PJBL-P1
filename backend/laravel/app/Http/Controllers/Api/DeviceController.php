<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class DeviceController extends Controller
{
    public function heartbeat(Request $request)
    {
        // Require the device to be authenticated via Sanctum token
        $device = $request->user();

        if (!$device) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $device->update([
            'status' => 'online',
            'last_seen' => now()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Heartbeat received'
        ]);
    }
}
