import { useState, useEffect } from 'react';
import { Plus, Trash2, X, RefreshCw } from 'lucide-react';
import { supabase } from '../supabase';

interface UserItem {
  id?: number | string;
  user_code: string;
  name: string;
  email?: string;
  role?: string;
  dept: string;
  card_uid: string;
}

export default function Users() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [dept, setDept] = useState('');
  const [cardUid, setCardUid] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'operator' | 'admin'>('operator');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();

    // Supabase Realtime Subscription for Users
    const channel = supabase
      .channel('public:users_table')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
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
          email: u.email || '-',
          role: u.role || 'operator',
          dept: u.department || 'Umum',
          card_uid: u.card_uid || '-',
        })));
      }
    } catch (err) {
      console.warn('Users fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const formattedCardUid = cardUid.trim().toUpperCase();
    const formattedEmail = email.trim().toLowerCase();
    const newUser: UserItem = {
      id: Date.now(),
      user_code: `EMP-${100 + users.length + 1}`,
      name: name.trim(),
      email: formattedEmail || '-',
      role: role,
      dept: dept.trim() || 'Umum',
      card_uid: formattedCardUid || 'Belum Terhubung',
    };

    try {
      const { data, error } = await supabase.from('users').insert([
        {
          name: newUser.name,
          department: newUser.dept,
          user_code: newUser.user_code,
          email: formattedEmail || null,
          password: password.trim() || null,
          role: newUser.role,
          card_uid: newUser.card_uid !== 'Belum Terhubung' ? newUser.card_uid : null,
        }
      ]).select();

      if (error) {
        console.error('Error saving user to Supabase:', error);
        alert('Gagal menyimpan user ke Supabase: ' + error.message);
      } else if (data && data.length > 0) {
        newUser.id = data[0].id;

        // Auto sync with cards table if a valid NFC card UID was specified
        if (formattedCardUid && formattedCardUid !== 'BELUM TERHUBUNG' && formattedCardUid !== '-') {
          await supabase.from('cards').upsert(
            {
              uid: formattedCardUid,
              owner_name: newUser.name,
              role: newUser.dept || 'Siswa',
              user_id: data[0].id,
              is_active: true,
            },
            { onConflict: 'uid' }
          );
        }
      }
    } catch (err) {
      console.warn('Error saving user to Supabase:', err);
    }

    setUsers([...users, newUser]);
    setName('');
    setDept('');
    setCardUid('');
    setEmail('');
    setPassword('');
    setRole('operator');
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
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchUsers} 
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition cursor-pointer"
            title="Muat Ulang Pengguna"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button 
            onClick={() => setShowModal(true)} 
            className="flex items-center gap-2 px-4 py-2 bg-[#2da44e] text-white rounded-lg hover:bg-[#2c974b] transition-colors text-sm font-medium shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah Pengguna
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm">
                <th className="px-6 py-3 font-medium">ID Pengguna</th>
                <th className="px-6 py-3 font-medium">Nama Lengkap</th>
                <th className="px-6 py-3 font-medium">Email Login</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Kelas / Departemen</th>
                <th className="px-6 py-3 font-medium">Kartu Terhubung (UID)</th>
                <th className="px-6 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Belum ada data siswa / pengguna terdaftar di database Supabase. Klik "Tambah Pengguna" di atas untuk mendaftarkan.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                <tr key={user.id || user.user_code} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{user.user_code}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">{user.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{user.dept}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 text-xs font-mono rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {user.card_uid}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex justify-end gap-2">
                    <button 
                      onClick={() => handleDeleteUser(user.id)} 
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer" 
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
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Departemen / Kelas</label>
                  <input 
                    type="text" 
                    value={dept} 
                    onChange={(e) => setDept(e.target.value)} 
                    placeholder="Contoh: XII RPL 1" 
                    required 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Role Akun</label>
                  <select 
                    value={role} 
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  >
                    <option value="operator">Operator / Siswa</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
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

              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-700 mb-2">Akses Login Website (Opsional)</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Email Login</label>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="budi@example.com" 
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Password</label>
                    <input 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="Password login..." 
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="px-4 py-2 bg-[#2da44e] text-white text-sm font-medium rounded-lg hover:bg-[#2c974b] transition disabled:opacity-50 cursor-pointer"
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
