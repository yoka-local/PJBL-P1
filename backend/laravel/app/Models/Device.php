<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Laravel\Sanctum\HasApiTokens;

class Device extends Model
{
    use HasApiTokens;
    protected $fillable = ['device_id', 'name', 'status', 'last_seen'];
    
    protected $casts = [
        'last_seen' => 'datetime',
    ];
}
