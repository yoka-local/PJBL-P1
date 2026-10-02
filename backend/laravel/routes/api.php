<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\CardController;
use App\Http\Controllers\Admin\AttendanceController as AdminAttendanceController;
use App\Http\Controllers\Worker\AttendanceController as WorkerAttendanceController;
use App\Http\Controllers\Api\TapController;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/attendance/tap', [TapController::class, 'tap']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Admin routes
    Route::middleware(['role:admin'])->prefix('admin')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::apiResource('cards', CardController::class);
        Route::get('attendances', [AdminAttendanceController::class, 'index']);
    });

    // Worker routes (both worker and admin can access this usually, or just worker)
    Route::middleware(['role:worker,admin'])->prefix('worker')->group(function () {
        Route::get('attendances', [WorkerAttendanceController::class, 'myAttendances']);
        Route::get('attendances/summary', [WorkerAttendanceController::class, 'summary']);
    });
});