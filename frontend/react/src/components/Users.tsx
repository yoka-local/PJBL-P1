import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function Users() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Data Pengguna</h2>
          <p className="text-slate-500 mt-1">Kelola data pengguna/pegawai dan hubungkan dengan kartu NFC/RFID.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
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
                <th className="px-6 py-3 font-medium">Departemen</th>
                <th className="px-6 py-3 font-medium">Kartu Terhubung</th>
                <th className="px-6 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {[
                { name: 'Budi Santoso', dept: 'IT Support' }, 
                { name: 'Siti Aminah', dept: 'Finance' }, 
                { name: 'Andi Wijaya', dept: 'HRD' }, 
                { name: 'Rina Marlina', dept: 'Marketing' }
              ].map((user, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-500">EMP-{100 + i + 1}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">{user.name}</td>
                  <td className="px-6 py-4 text-slate-600">{user.dept}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 text-xs font-mono rounded-full bg-slate-100 text-slate-600">A1:B2:C{i}:D4</span>
                  </td>
                  <td className="px-6 py-4 flex justify-end gap-2">
                    <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
