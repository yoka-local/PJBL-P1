<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Card;
use App\Models\Attendance;
use App\Notifications\AttendanceLogged;

class TapController extends Controller {
    public function tap(Request $request) {
        $request->validate([
            'event_id' => 'required|string',
            'card_uid' => 'required|string',
            'timestamp' => 'required|date',
            'device_id' => 'required|string'
        ]);
        
        // Idempotency Check (Duplicate Protection from Retries)
        if (Attendance::where('event_id', $request->event_id)->exists()) {
            return response()->json([
                'success' => true,
                'event_id' => $request->event_id,
                'duplicate' => true,
                'message' => 'Event already processed'
            ]);
        }

        $card = Card::where('uid', $request->card_uid)->first();
        $status = ($card && $card->is_active && $card->user_id) ? 'Diterima' : 'Ditolak';
        
        $attendance = Attendance::create([
            'event_id' => $request->event_id,
            'user_id' => $card ? $card->user_id : null,
            'card_uid' => $request->card_uid,
            'device_id' => $request->device_id,
            'status' => $status,
            'timestamp' => $request->timestamp
        ]);
        
        if ($status === 'Diterima' && $card->user) {
            $card->user->notify(new AttendanceLogged($attendance));
        }
        
        return response()->json([
            'success' => true,
            'event_id' => $request->event_id,
            'message' => 'Attendance recorded'
        ]);
    }
}