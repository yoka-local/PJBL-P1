<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Card extends Model {
    protected $fillable = ['uid', 'user_id', 'is_active'];
    public function user() { return $this->belongsTo(User::class); }
}