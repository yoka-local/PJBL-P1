<?php
namespace App\Notifications;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Models\Attendance;

class AttendanceLogged extends Notification {
    use Queueable;
    protected $attendance;
    public function __construct(Attendance $attendance) {
        $this->attendance = $attendance;
    }
    public function via(object $notifiable): array {
        return ['database']; // Can add 'mail' here later
    }
    public function toArray(object $notifiable): array {
        return [
            'message' => 'Attendance logged successfully at ' . $this->attendance->timestamp,
            'attendance_id' => $this->attendance->id
        ];
    }
}