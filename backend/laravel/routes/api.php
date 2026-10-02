<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\CardController;
use App\Http\Controllers\Admin\AttendanceController as AdminAttendanceController;
use App\Http\Controllers\Worker\AttendanceController as WorkerAttendanceController;
use App\Http\Controllers\Api\TapController;

use App\Http\Controllers\Admin\DeviceController as AdminDeviceController;
use App\Http\Controllers\Api\DeviceController as ApiDeviceController;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Device API routes (authenticated via Device token)
    Route::post('/attendance/tap', [TapController::class, 'tap']);
    Route::post('/devices/heartbeat', [ApiDeviceController::class, 'heartbeat']);

    // Admin routes
    Route::middleware(['role:admin'])->prefix('admin')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::apiResource('cards', CardController::class);
        Route::apiResource('devices', AdminDeviceController::class);
        Route::get('attendances', [AdminAttendanceController::class, 'index']);
    });

    // Worker routes
    Route::middleware(['role:worker,admin'])->prefix('worker')->group(function () {
        Route::get('attendances', [WorkerAttendanceController::class, 'myAttendances']);
        Route::get('attendances/summary', [WorkerAttendanceController::class, 'summary']);
    });
});