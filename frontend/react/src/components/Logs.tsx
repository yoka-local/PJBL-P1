import { useState, useEffect } from 'react';
import { Download, Filter, Search, RefreshCw } from 'lucide-react';
import { supabase } from '../supabase';

interface LogItem {
  id?: number | string;
  event_id: string;
  time: string;
  name: string;
  uid: string;
  device: string;
  status: 'Diterima' | 'Ditolak';
}

export default function Logs() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (!error && data) {
        setLogs(data.map((r: any) => ({
          id: r.id,
          event_id: r.event_id || `EVT-${r.id}`,
          time: new Date(r.timestamp).toLocaleString('id-ID'),
          name: r.user_name || (r.status === 'Diterima' ? 'Siswa Terdaftar' : 'Kartu Ditolak'),
          uid: r.card_uid,
          device: r.device_id || 'GATE-01',
          status: r.status === 'Diterima' ? 'Diterima' : 'Ditolak',
        })));
      }
    } catch (err) {
      console.warn('Using local logs state:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Event ID', 'Waktu', 'Nama', 'UID Kartu', 'Device ID', 'Status'];
    const rows = filteredLogs.map((log) => [
      log.event_id,
      `"${log.time}"`,
      `"${log.name}"`,
      log.uid,
      log.device,
      log.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Log_Presensi_NFCKey_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.name.toLowerCase().includes(search.toLowerCase()) || log.uid.toLowerCase().includes(search.toLowerCase()) || log.event_id.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = statusFilter === 'ALL' || log.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Log Presensi & Riwayat Akses</h2>
          <p className="text-slate-500 mt-1">Audit trail lengkap rekaman tap kartu NFC dari seluruh perangkat pintu.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchLogs} 
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button 
            onClick={handleExportCSV} 
            className="flex items-center gap-2 px-4 py-2 bg-[#2da44e] text-white rounded-lg hover:bg-[#2c974b] text-sm font-medium transition shadow-sm"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Cari berdasarkan nama, UID, atau Event ID..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">Semua Status</option>
            <option value="Diterima">Hanya Diterima</option>
            <option value="Ditolak">Hanya Ditolak</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm">
                <th className="px-6 py-3 font-medium">Event ID (Idempotency)</th>
                <th className="px-6 py-3 font-medium">Waktu Transaksi</th>
                <th className="px-6 py-3 font-medium">Nama / Identitas</th>
                <th className="px-6 py-3 font-medium">UID Kartu NFC</th>
                <th className="px-6 py-3 font-medium">Gateway</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Tidak ada rekaman log yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id || log.event_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{log.event_id}</td>
                    <td className="px-6 py-4 text-slate-600 text-xs">{log.time}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{log.name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{log.uid}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs font-mono">{log.device}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        log.status === 'Ditolak' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center text-sm text-slate-500">
          <span>Menampilkan {filteredLogs.length} dari {logs.length} total rekaman log</span>
        </div>
      </div>
    </div>
  );
}
