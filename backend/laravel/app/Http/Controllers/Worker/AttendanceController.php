<?php
namespace App\Http\Controllers\Worker;
use App\Http\Controllers\Controller;
use App\Models\Attendance;
use Illuminate\Http\Request;

class AttendanceController extends Controller {
    public function myAttendances(Request $request) {
        return Attendance::where('user_id', $request->user()->id)->orderBy('timestamp', 'desc')->get();
    }
    public function summary(Request $request) {
        $user = $request->user();
        $month = date('m');
        $year = date('Y');
        
        $totalPresent = Attendance::where('user_id', $user->id)
            ->where('status', 'Diterima')
            ->whereMonth('timestamp', $month)
            ->whereYear('timestamp', $year)
            ->count();
            
        return response()->json([
            'month' => $month,
            'year' => $year,
            'total_present' => $totalPresent
        ]);
    }
}