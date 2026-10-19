import { useState, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../supabase';

interface UserItem {
  id?: number | string;
  user_code: string;
  name: string;
  dept: string;
  card_uid: string;
}

const DEFAULT_USERS: UserItem[] = [
  { id: 1, user_code: 'EMP-101', name: 'Budi Santoso', dept: 'IT Support', card_uid: '04:A3:92:7F' },
  { id: 2, user_code: 'EMP-102', name: 'Siti Aminah', dept: 'Finance', card_uid: '11:22:33:44' },
  { id: 3, user_code: 'EMP-103', name: 'Andi Wijaya', dept: 'HRD', card_uid: 'DE:AD:BE:EF' },
  { id: 4, user_code: 'EMP-104', name: 'Rina Marlina', dept: 'Marketing', card_uid: 'Belum Terhubung' },
];

export default function Users() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [dept, setDept] = useState('');
  const [cardUid, setCardUid] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data) {
        setUsers(data.map((u: any, i: number) => ({
          id: u.id,
          user_code: u.user_code || `EMP-${100 + (i + 1)}`,
          name: u.name,
          dept: u.department || 'Umum',
          card_uid: u.card_uid || '-',
        })));
      }
    } catch (err) {
      console.warn('Using local users state:', err);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const newUser: UserItem = {
      id: Date.now(),
      user_code: `EMP-${100 + users.length + 1}`,
      name: name.trim(),
      dept: dept.trim() || 'Umum',
      card_uid: cardUid.trim().toUpperCase() || 'Belum Terhubung',
    };

    try {
      await supabase.from('users').insert([
        {
          name: newUser.name,
          department: newUser.dept,
          user_code: newUser.user_code,
          card_uid: newUser.card_uid,
        }
      ]);
    } catch (err) {
      console.warn('Error saving user to Supabase:', err);
    }

    setUsers([...users, newUser]);
    setName('');
    setDept('');
    setCardUid('');
    setShowModal(false);
    setLoading(false);
  };

  const handleDeleteUser = async (id?: number | string) => {
    if (!id || !confirm('Yakin ingin menghapus data pengguna ini?')) return;
    setUsers(users.filter(u => u.id !== id));
    try {
      await supabase.from('users').delete().eq('id', id);
    } catch (err) {
      console.warn('Error deleting user:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Data Pengguna & Siswa</h2>
          <p className="text-slate-500 mt-1">Kelola data identitas dan hubungkan dengan UID kartu NFC/RFID.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="flex items-center gap-2 px-4 py-2 bg-[#2da44e] text-white rounded-lg hover:bg-[#2c974b] transition-colors text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" /> Tambah Pengguna
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm">
                <th className="px-6 py-3 font-medium">ID Pengguna</th>
                <th className="px-6 py-3 font-medium">Nama Lengkap</th>
                <th className="px-6 py-3 font-medium">Kelas / Departemen</th>
                <th className="px-6 py-3 font-medium">Kartu Terhubung (UID)</th>
                <th className="px-6 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Belum ada data siswa / pengguna terdaftar di database Supabase. Klik "Tambah Pengguna" di atas untuk mendaftarkan.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                <tr key={user.id || user.user_code} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{user.user_code}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">{user.name}</td>
                  <td className="px-6 py-4 text-slate-600">{user.dept}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 text-xs font-mono rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {user.card_uid}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex justify-end gap-2">
                    <button 
                      onClick={() => handleDeleteUser(user.id)} 
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" 
                      title="Hapus Pengguna"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Pengguna */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Tambah Pengguna Baru</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Nama Lengkap</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Contoh: Budi Santoso" 
                  required 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Kelas / Departemen</label>
                <input 
                  type="text" 
                  value={dept} 
                  onChange={(e) => setDept(e.target.value)} 
                  placeholder="Contoh: XII RPL 1 / IT Support" 
                  required 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">UID Kartu NFC (Opsional)</label>
                <input 
                  type="text" 
                  value={cardUid} 
                  onChange={(e) => setCardUid(e.target.value)} 
                  placeholder="Contoh: 04:A3:92:7F" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm uppercase focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
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
                  {loading ? 'Menyimpan...' : 'Simpan Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
