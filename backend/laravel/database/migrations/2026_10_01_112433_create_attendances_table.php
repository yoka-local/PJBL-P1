<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->string('event_id')->unique(); // Crucial for duplicate protection
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('card_uid');
            $table->string('device_id')->nullable();
            $table->enum('status', ['Diterima', 'Ditolak']);
            $table->timestamp('timestamp')->useCurrent();
            $table->timestamps();
        });
    }
    public function down(): void {
        Schema::dropIfExists('attendances');
    }
};