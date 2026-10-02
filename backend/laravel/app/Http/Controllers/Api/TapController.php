<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Card;
use App\Models\Attendance;
use App\Notifications\AttendanceLogged;

class TapController extends Controller {
    public function tap(Request $request) {
        $request->validate(['uid' => 'required|string', 'device_id' => 'nullable|string']);
        
        $card = Card::where('uid', $request->uid)->first();
        
        if ($card && $card->is_active && $card->user_id) {
            $attendance = Attendance::create([
                'user_id' => $card->user_id,
                'card_uid' => $request->uid,
                'status' => 'Diterima',
            ]);
            
            if ($card->user) {
                $card->user->notify(new AttendanceLogged($attendance));
            }
            
            return response()->json(['message' => 'Success', 'status' => 'Diterima']);
        } else {
            Attendance::create([
                'user_id' => null,
                'card_uid' => $request->uid,
                'status' => 'Ditolak',
            ]);
            return response()->json(['message' => 'Card denied', 'status' => 'Ditolak'], 403);
        }
    }
}