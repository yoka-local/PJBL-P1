<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model {
    protected $fillable = ['event_id', 'user_id', 'card_uid', 'device_id', 'status', 'timestamp'];
    public function user() { return $this->belongsTo(User::class); }
}