import { Download, Filter } from 'lucide-react';

export default function Logs() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Log Absensi</h2>
          <p className="text-slate-500 mt-1">Riwayat lengkap akses pintu dan kehadiran.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm">
                <th className="px-6 py-3 font-medium">Event ID</th>
                <th className="px-6 py-3 font-medium">Waktu</th>
                <th className="px-6 py-3 font-medium">Nama / Keterangan</th>
                <th className="px-6 py-3 font-medium">UID Kartu</th>
                <th className="px-6 py-3 font-medium">Device ID</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-slate-400">EVT-{1000 + i}</td>
                  <td className="px-6 py-4 text-slate-500">01 Okt, 07:{10 + i}:{22 + i}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">Siswa {i + 1}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">A1:B2:C{i}:D4</td>
                  <td className="px-6 py-4 text-slate-500">GATE-01</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Diterima</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center text-sm text-slate-500">
          <span>Menampilkan 1-8 dari 1,240 log</span>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50">Sebelumnya</button>
            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 bg-slate-50">1</button>
            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50">2</button>
            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50">Selanjutnya</button>
          </div>
        </div>
      </div>
    </div>
  );
}
