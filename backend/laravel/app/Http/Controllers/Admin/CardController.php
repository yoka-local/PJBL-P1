<?php
namespace App\Http\Controllers\Admin;
use App\Http\Controllers\Controller;
use App\Models\Card;
use Illuminate\Http\Request;

class CardController extends Controller {
    public function index() { return Card::with('user')->get(); }
    public function store(Request $request) {
        $validated = $request->validate([
            'uid' => 'required|string|unique:cards',
            'user_id' => 'nullable|exists:users,id',
            'is_active' => 'boolean'
        ]);
        $card = Card::create($validated);
        return response()->json($card, 201);
    }
    public function show(Card $card) { return $card->load('user'); }
    public function update(Request $request, Card $card) {
        $validated = $request->validate([
            'uid' => 'sometimes|string|unique:cards,uid,'.$card->id,
            'user_id' => 'nullable|exists:users,id',
            'is_active' => 'boolean'
        ]);
        $card->update($validated);
        return response()->json($card);
    }
    public function destroy(Card $card) {
        $card->delete();
        return response()->json(null, 204);
    }
}