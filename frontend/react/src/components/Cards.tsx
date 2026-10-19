import { useState, useEffect } from 'react';
import { Plus, CreditCard, PowerOff, CheckCircle, Trash2, X } from 'lucide-react';
import { supabase } from '../supabase';

interface CardItem {
  id?: number | string;
  uid: string;
  owner: string;
  role: string;
  active: boolean;
}

export default function Cards() {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [newUid, setNewUid] = useState<string>('');
  const [newOwner, setNewOwner] = useState<string>('');
  const [newRole, setNewRole] = useState<string>('Siswa');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data) {
        setCards(data.map((c: any) => ({
          id: c.id,
          uid: c.uid,
          owner: c.owner_name || 'Pengguna',
          role: c.role || 'Siswa',
          active: c.is_active ?? true,
        })));
      }
    } catch (err) {
      console.warn('Using local cards state:', err);
    }
  };

  const handleRegisterCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUid.trim()) return;

    setLoading(true);
    const newCard: CardItem = {
      id: Date.now(),
      uid: newUid.trim().toUpperCase(),
      owner: newOwner.trim() || 'Siswa Baru',
      role: newRole,
      active: true,
    };

    try {
      await supabase.from('cards').insert([
        {
          uid: newCard.uid,
          owner_name: newCard.owner,
          role: newCard.role,
          is_active: true,
        }
      ]);
    } catch (err) {
      console.warn('Local state fallback:', err);
    }

    setCards([newCard, ...cards]);
    setNewUid('');
    setNewOwner('');
    setShowModal(false);
    setLoading(false);
  };

  const toggleCardStatus = async (id?: number | string) => {
    if (!id) return;
    const target = cards.find((c) => c.id === id);
    if (!target) return;

    const updatedStatus = !target.active;
    setCards(cards.map((c) => (c.id === id ? { ...c, active: updatedStatus } : c)));

    try {
      await supabase.from('cards').update({ is_active: updatedStatus }).eq('id', id);
    } catch (err) {
      console.warn('Error syncing toggle to Supabase:', err);
    }
  };

  const handleDeleteCard = async (id?: number | string) => {
    if (!id || !confirm('Yakin ingin menghapus kartu ini?')) return;
    setCards(cards.filter((c) => c.id !== id));
    try {
      await supabase.from('cards').delete().eq('id', id);
    } catch (err) {
      console.warn('Error deleting card from Supabase:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Manajemen Kartu NFC / RFID</h2>
          <p className="text-slate-500 mt-1">Registrasi kartu smart tag baru dan atur status akses operasional.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="flex items-center gap-2 px-4 py-2 bg-[#2da44e] text-white rounded-lg hover:bg-[#2c974b] transition-colors text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" /> Daftarkan Kartu
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Belum ada kartu NFC terdaftar di database Supabase</p>
            <p className="text-slate-400 text-sm mt-1">Klik tombol "Daftarkan Kartu" di atas untuk menambahkan kartu atau tag RFID baru.</p>
          </div>
        ) : (
          cards.map((card) => (
          <div key={card.id || card.uid} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:border-slate-300 transition">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                <CreditCard className={`w-6 h-6 ${card.active ? 'text-primary' : 'text-slate-400'}`} />
              </div>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                card.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {card.active ? 'Aktif' : 'Diblokir'}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">UID Kartu NFC</p>
              <p className="text-lg font-mono font-semibold text-slate-800 mb-4">{card.uid}</p>
              
              <div className="flex justify-between items-end pt-4 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-400">Pemilik Kartu</p>
                  <p className="font-medium text-slate-700 text-sm">{card.owner}</p>
                  <p className="text-xs text-slate-500">{card.role}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => toggleCardStatus(card.id)} 
                    className={`p-2 rounded hover:bg-slate-100 transition-colors ${
                      card.active ? 'text-slate-400 hover:text-amber-600' : 'text-green-600'
                    }`} 
                    title={card.active ? 'Blokir Kartu' : 'Aktifkan Kartu'}
                  >
                    {card.active ? <PowerOff className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => handleDeleteCard(card.id)} 
                    className="p-2 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors" 
                    title="Hapus Kartu"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )))}
      </div>

      {/* Modal Daftarkan Kartu */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Daftarkan Kartu NFC Baru</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRegisterCard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">UID Kartu (Hex)</label>
                <input 
                  type="text" 
                  value={newUid} 
                  onChange={(e) => setNewUid(e.target.value)} 
                  placeholder="Contoh: 04:A3:92:7F" 
                  required 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm uppercase focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Nama Pemilik / Siswa</label>
                <input 
                  type="text" 
                  value={newOwner} 
                  onChange={(e) => setNewOwner(e.target.value)} 
                  placeholder="Nama Lengkap" 
                  required 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Peran / Keterangan</label>
                <select 
                  value={newRole} 
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                >
                  <option value="Siswa">Siswa</option>
                  <option value="Guru / Staf">Guru / Staf</option>
                  <option value="Admin">Admin (24/7 Access)</option>
                  <option value="Tamu">Tamu</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="px-4 py-2 bg-[#2da44e] text-white text-sm font-medium rounded-lg hover:bg-[#2c974b] transition disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Kartu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
