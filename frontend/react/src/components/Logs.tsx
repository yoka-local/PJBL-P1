import { useState, useEffect } from 'react';
import { 
  Download, Filter, Search, RefreshCw, Trash2, CheckSquare, Square, 
  AlertTriangle, Sparkles, X, ShieldAlert, CheckCircle2, ChevronDown 
} from 'lucide-react';
import { supabase } from '../supabase';

interface LogItem {
  id?: number | string;
  event_id: string;
  time: string;
  rawTimestamp: string;
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

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  // Modal States
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showCleanupModal, setShowCleanupModal] = useState<boolean>(false);
  const [cleanupAction, setCleanupAction] = useState<'all' | 'rejected' | '7days'>('all');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchLogs();

    // Supabase Realtime Subscription for live taps
    const channel = supabase
      .channel('public:attendances_logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendances' },
        (payload: any) => {
          const r = payload.new;
          const newLog: LogItem = {
            id: r.id,
            event_id: r.event_id || `EVT-${r.id}`,
            time: new Date(r.timestamp || Date.now()).toLocaleString('id-ID'),
            rawTimestamp: r.timestamp || new Date().toISOString(),
            name: r.user_name || (r.status === 'Diterima' ? 'Siswa Terdaftar' : 'Kartu Ditolak'),
            uid: r.card_uid,
            device: r.device_id || 'GATE-01',
            status: r.status === 'Diterima' ? 'Diterima' : 'Ditolak',
          };
          setLogs((prev) => [newLog, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(200);

      if (!error && data) {
        setLogs(data.map((r: any) => ({
          id: r.id,
          event_id: r.event_id || `EVT-${r.id}`,
          time: new Date(r.timestamp).toLocaleString('id-ID'),
          rawTimestamp: r.timestamp,
          name: r.user_name || (r.status === 'Diterima' ? 'Siswa Terdaftar' : 'Kartu Ditolak'),
          uid: r.card_uid,
          device: r.device_id || 'GATE-01',
          status: r.status === 'Diterima' ? 'Diterima' : 'Ditolak',
        })));
      }
    } catch (err) {
      console.warn('Logs fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.name.toLowerCase().includes(search.toLowerCase()) || 
      log.uid.toLowerCase().includes(search.toLowerCase()) || 
      log.event_id.toLowerCase().includes(search.toLowerCase()) ||
      log.device.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = statusFilter === 'ALL' || log.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  // Selection Helpers
  const isAllFilteredSelected = filteredLogs.length > 0 && filteredLogs.every((l) => l.id && selectedIds.has(l.id));

  const toggleSelectAll = () => {
    if (isAllFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      const newSet = new Set(selectedIds);
      filteredLogs.forEach((l) => {
        if (l.id) newSet.add(l.id);
      });
      setSelectedIds(newSet);
    }
  };

  const toggleSelectItem = (id: number | string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Delete Selected Records
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    setActionMessage(null);

    const idsToDelete = Array.from(selectedIds);
    try {
      const { error } = await supabase
        .from('attendances')
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;

      setLogs((prev) => prev.filter((l) => !selectedIds.has(l.id!)));
      setActionMessage({
        text: `Berhasil menghapus ${idsToDelete.length} log presensi.`,
        type: 'success',
      });
      setSelectedIds(new Set());
      setShowDeleteModal(false);
    } catch (err: any) {
      console.error('Delete error:', err);
      setActionMessage({
        text: `Gagal menghapus log: ${err.message || 'Terjadi kesalahan sistem'}`,
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Clean Up Records (Bulk options)
  const handleCleanupHistory = async () => {
    setIsProcessing(true);
    setActionMessage(null);

    try {
      let query = supabase.from('attendances').delete();

      if (cleanupAction === 'all') {
        // Hapus semua data
        query = query.neq('id', 0);
      } else if (cleanupAction === 'rejected') {
        // Hapus hanya yang status Ditolak
        query = query.eq('status', 'Ditolak');
      } else if (cleanupAction === '7days') {
        // Hapus lebih dari 7 hari lalu
        const d = new Date();
        d.setDate(d.getDate() - 7);
        query = query.lt('timestamp', d.toISOString());
      }

      const { error } = await query;
      if (error) throw error;

      setShowCleanupModal(false);
      setSelectedIds(new Set());
      setActionMessage({
        text: cleanupAction === 'all' 
          ? 'Seluruh riwayat presensi berhasil dibersihkan.'
          : cleanupAction === 'rejected'
          ? 'Log akses ditolak berhasil dibersihkan.'
          : 'Log riwayat lebih dari 7 hari berhasil dibersihkan.',
        type: 'success',
      });
      await fetchLogs();
    } catch (err: any) {
      console.error('Cleanup error:', err);
      setActionMessage({
        text: `Gagal membersihkan log: ${err.message || 'Terjadi kesalahan'}`,
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
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

  return (
    <div className="space-y-6">
      {/* Header View */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                Log Presensi & Audit Riwayat Akses
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit trail lengkap rekaman tap NFC real-time terhubung Supabase Cloud.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={fetchLogs} 
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} /> 
            <span>Refresh</span>
          </button>

          {/* Clean Up Button */}
          <button 
            onClick={() => setShowCleanupModal(true)} 
            className="flex items-center gap-2 px-3.5 py-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold hover:bg-rose-100 transition-all shadow-xs cursor-pointer"
            title="Bersihkan riwayat presensi"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-600" />
            <span>Bersihkan Log</span>
          </button>

          <button 
            onClick={handleExportCSV} 
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-sm shadow-emerald-600/20 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> 
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium animate-fadeIn ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter, Search & Batch Selection Bar */}
      <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Cari nama, UID kartu, Event ID, atau Gate..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Status:</span>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-transparent text-slate-700 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua ({logs.length})</option>
              <option value="Diterima">Hanya Diterima</option>
              <option value="Ditolak">Hanya Ditolak</option>
            </select>
          </div>
        </div>
      </div>

      {/* Floating Selected Batch Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-4 animate-slideDown">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">
              {selectedIds.size}
            </span>
            <span className="text-xs font-medium text-slate-200">
              Log riwayat presensi dipilih
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm shadow-rose-600/30 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Logs Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3.5 w-12 text-center">
                  <button 
                    onClick={toggleSelectAll} 
                    className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    title={isAllFilteredSelected ? 'Batal pilih semua' : 'Pilih semua di filter ini'}
                  >
                    {isAllFilteredSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3.5">Event ID</th>
                <th className="px-4 py-3.5">Waktu Transaksi</th>
                <th className="px-4 py-3.5">Identitas Pengguna</th>
                <th className="px-4 py-3.5">UID Kartu NFC</th>
                <th className="px-4 py-3.5">Gateway</th>
                <th className="px-4 py-3.5">Status Akses</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Search className="w-5 h-5" />
                      </div>
                      <p className="font-semibold text-slate-600 text-sm">Tidak ada log presensi ditemukan</p>
                      <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau filter status.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isSelected = !!log.id && selectedIds.has(log.id);
                  return (
                    <tr 
                      key={log.id || log.event_id} 
                      className={`transition-colors ${
                        isSelected 
                          ? 'bg-emerald-50/50 hover:bg-emerald-50/80' 
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => log.id && toggleSelectItem(log.id)}
                          className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                          )}
                        </button>
                      </td>

                      {/* Event ID */}
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500 font-medium">
                        {log.event_id}
                      </td>

                      {/* Timestamp */}
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                        {log.time}
                      </td>

                      {/* Identity */}
                      <td className="px-4 py-3.5 font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            log.status === 'Diterima' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            {log.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{log.name}</span>
                        </div>
                      </td>

                      {/* Card UID */}
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold border border-slate-200">
                          {log.uid}
                        </span>
                      </td>

                      {/* Device Gateway */}
                      <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200">
                          {log.device}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          log.status === 'Ditolak' 
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/60' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'Ditolak' ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                          {log.status === 'Diterima' ? 'Akses Diberikan' : 'Akses Ditolak'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => {
                            if (log.id) {
                              setSelectedIds(new Set([log.id]));
                              setShowDeleteModal(true);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Hapus rekaman ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Stats */}
        <div className="px-6 py-3.5 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-2">
          <span>Menampilkan <strong className="text-slate-700">{filteredLogs.length}</strong> dari total {logs.length} rekaman audit</span>
          <span className="text-[11px] text-slate-400">Database Supabase Cloud • Real-time Sync Active</span>
        </div>
      </div>

      {/* Modal: Delete Selected Confirmation */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-scaleUp">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0 border border-rose-100">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-800">
                  Konfirmasi Hapus Riwayat
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Apakah Anda yakin ingin menghapus <strong className="text-rose-600">{selectedIds.size} rekaman log presensi</strong> yang dipilih? Tindakan ini akan menghapus data permanen dari Supabase Cloud.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm shadow-rose-600/30 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Clean Up History */}
      {showCleanupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-scaleUp">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-rose-500/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-800">
                  Bersihkan Riwayat Presensi (Clean Up)
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Pilih opsi pembersihan database audit log presensi pintu untuk menghemat kapasitas storage Supabase.
                </p>
              </div>
            </div>

            <div className="space-y-2.5 my-4">
              <label 
                onClick={() => setCleanupAction('all')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  cleanupAction === 'all' 
                    ? 'border-rose-500 bg-rose-50/50 ring-1 ring-rose-500/30' 
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input 
                  type="radio" 
                  name="cleanupAction" 
                  checked={cleanupAction === 'all'} 
                  onChange={() => setCleanupAction('all')}
                  className="mt-1 text-rose-600 focus:ring-rose-500" 
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">Hapus Seluruh Riwayat Log (Reset Total)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Menghapus seluruh rekaman presensi tanpa terkecuali ({logs.length} data).</div>
                </div>
              </label>

              <label 
                onClick={() => setCleanupAction('rejected')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  cleanupAction === 'rejected' 
                    ? 'border-rose-500 bg-rose-50/50 ring-1 ring-rose-500/30' 
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input 
                  type="radio" 
                  name="cleanupAction" 
                  checked={cleanupAction === 'rejected'} 
                  onChange={() => setCleanupAction('rejected')}
                  className="mt-1 text-rose-600 focus:ring-rose-500" 
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">Hapus Log Kartu Ditolak Saja (Spam Filter)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Membersihkan percobaan akses ilegal dan kartu tidak dikenal.</div>
                </div>
              </label>

              <label 
                onClick={() => setCleanupAction('7days')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  cleanupAction === '7days' 
                    ? 'border-rose-500 bg-rose-50/50 ring-1 ring-rose-500/30' 
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input 
                  type="radio" 
                  name="cleanupAction" 
                  checked={cleanupAction === '7days'} 
                  onChange={() => setCleanupAction('7days')}
                  className="mt-1 text-rose-600 focus:ring-rose-500" 
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">Hapus Riwayat Lebih Lama dari 7 Hari</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Hanya menyimpan arsip presensi minggu ini.</div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCleanupModal(false)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCleanupHistory}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm shadow-rose-600/30 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Membersihkan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Konfirmasi Bersihkan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
