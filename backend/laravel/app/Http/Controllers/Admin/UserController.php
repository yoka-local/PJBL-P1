<?php
namespace App\Http\Controllers\Admin;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller {
    public function index() { return User::all(); }
    public function store(Request $request) {
        $validated = $request->validate([
            'name' => 'required|string',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:6',
            'role' => 'in:admin,worker',
            'department' => 'nullable|string'
        ]);
        $validated['password'] = Hash::make($validated['password']);
        $user = User::create($validated);
        return response()->json($user, 201);
    }
    public function show(User $user) { return $user; }
    public function update(Request $request, User $user) {
        $validated = $request->validate([
            'name' => 'sometimes|string',
            'email' => 'sometimes|email|unique:users,email,'.$user->id,
            'password' => 'sometimes|string|min:6',
            'role' => 'in:admin,worker',
            'department' => 'nullable|string'
        ]);
        if (isset($validated['password'])) $validated['password'] = Hash::make($validated['password']);
        $user->update($validated);
        return response()->json($user);
    }
    public function destroy(User $user) {
        $user->delete();
        return response()->json(null, 204);
    }
}