<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model {
    protected $fillable = ['user_id', 'card_uid', 'status', 'timestamp'];
    public function user() { return $this->belongsTo(User::class); }
}