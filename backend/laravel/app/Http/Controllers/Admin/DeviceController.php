<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Device;
use Illuminate\Http\Request;

class DeviceController extends Controller
{
    public function index()
    {
        return response()->json(Device::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'device_id' => 'required|string|unique:devices',
            'name' => 'required|string',
        ]);
        
        $device = Device::create($validated);
        
        // Generate a plain text token for the device
        $token = $device->createToken('device-token')->plainTextToken;
        
        return response()->json([
            'device' => $device,
            'token' => $token
        ], 201);
    }

    public function show(Device $device)
    {
        return response()->json($device);
    }

    public function update(Request $request, Device $device)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string',
            'status' => 'sometimes|string'
        ]);
        
        $device->update($validated);
        return response()->json($device);
    }

    public function destroy(Device $device)
    {
        // Delete all tokens for this device
        $device->tokens()->delete();
        $device->delete();
        
        return response()->json(null, 204);
    }
}
