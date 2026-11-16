import { useState, useEffect } from 'react';
import { 
  DoorOpen, Activity, RefreshCw, CreditCard, ShieldCheck, Lock, Unlock, 
  Wifi, CheckCircle2, XCircle, ArrowUpRight, Zap 
} from 'lucide-react';
import { supabase } from '../supabase';

interface AttendanceLog {
  id?: number | string;
  time: string;
  name: string;
  class_: string;
  uid: string;
  status: 'Diterima' | 'Ditolak';
}

export default function Dashboard() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [totalHadir, setTotalHadir] = useState<number>(0);
  const [totalCards, setTotalCards] = useState<number>(0);
  const [kartuDitolak, setKartuDitolak] = useState<number>(0);
  const [doorStatus, setDoorStatus] = useState<'Terkunci' | 'Terbuka'>('Terkunci');
  const [isDeviceOnline, setIsDeviceOnline] = useState<boolean>(false);
  const [deviceName, setDeviceName] = useState<string>('GATE-01');
  const [deviceRaw, setDeviceRaw] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastTapName, setLastTapName] = useState<string>('Menunggu Tap...');

  const checkDeviceLiveness = (dev: any): boolean => {
    if (!dev || !dev.last_seen) return false;
    const dateStr = dev.last_seen.endsWith('Z') ? dev.last_seen : dev.last_seen + 'Z';
    const lastSeenMs = new Date(dateStr).getTime();
    if (isNaN(lastSeenMs)) return false;
    const diffSeconds = (Date.now() - lastSeenMs) / 1000;
    return diffSeconds < 45 && dev.status === 'online';
  };

  useEffect(() => {
    const updateLiveness = () => {
      if (deviceRaw) {
        setIsDeviceOnline(checkDeviceLiveness(deviceRaw));
      } else {
        setIsDeviceOnline(false);
      }
    };
    updateLiveness();
    const timer = setInterval(updateLiveness, 5000);
    return () => clearInterval(timer);
  }, [deviceRaw]);

  useEffect(() => {
    fetchDashboardData();

    // 1. Supabase Realtime Subscription for Attendances
    const attendanceChannel = supabase
      .channel('public:attendances_dashboard')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendances' },
        (payload: any) => {
          const newRow = payload.new;
          const formattedLog: AttendanceLog = {
            id: newRow.id || newRow.event_id,
            time: new Date(newRow.timestamp || Date.now()).toLocaleTimeString('id-ID'),
            name: newRow.user_name || (newRow.status === 'Diterima' ? 'Siswa Terdaftar' : 'Kartu Asing'),
            class_: newRow.department || '-',
            uid: newRow.card_uid || '-',
            status: newRow.status === 'Diterima' ? 'Diterima' : 'Ditolak',
          };

          setLogs((prev) => [formattedLog, ...prev.slice(0, 9)]);
          setLastTapName(formattedLog.name);

          if (formattedLog.status === 'Diterima') {
            setTotalHadir((prev) => prev + 1);
            setDoorStatus('Terbuka');
            setTimeout(() => setDoorStatus('Terkunci'), 5000);
          } else {
            setKartuDitolak((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    // 2. Supabase Realtime Subscription for Devices
    const deviceChannel = supabase
      .channel('public:devices_dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'devices' },
        (payload: any) => {
          if (payload.new) {
            setDeviceRaw(payload.new);
            setIsDeviceOnline(checkDeviceLiveness(payload.new));
            if (payload.new.device_id) {
              setDeviceName(payload.new.device_id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(attendanceChannel);
      supabase.removeChannel(deviceChannel);
    };
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: attendanceData, error } = await supabase
        .from('attendances')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      if (!error && attendanceData) {
        const formatted: AttendanceLog[] = attendanceData.map((row: any) => ({
          id: row.id || row.event_id,
          time: new Date(row.timestamp || Date.now()).toLocaleTimeString('id-ID'),
          name: row.user_name || (row.status === 'Diterima' ? 'Siswa Terdaftar' : 'Kartu Asing'),
          class_: row.department || '-',
          uid: row.card_uid,
          status: row.status === 'Diterima' ? 'Diterima' : 'Ditolak',
        }));
        setLogs(formatted);
        if (formatted.length > 0) {
          setLastTapName(formatted[0].name);
        }
      }

      const [hadirRes, ditolakRes, cardsRes] = await Promise.all([
        supabase.from('attendances').select('*', { count: 'exact', head: true }).eq('status', 'Diterima'),
        supabase.from('attendances').select('*', { count: 'exact', head: true }).eq('status', 'Ditolak'),
        supabase.from('cards').select('*', { count: 'exact', head: true }),
      ]);

      if (hadirRes.count !== null && hadirRes.count !== undefined) setTotalHadir(hadirRes.count);
      if (ditolakRes.count !== null && ditolakRes.count !== undefined) setKartuDitolak(ditolakRes.count);
      if (cardsRes.count !== null && cardsRes.count !== undefined) setTotalCards(cardsRes.count);

      const { data: deviceData } = await supabase
        .from('devices')
        .select('*')
        .limit(1);

      if (deviceData && deviceData.length > 0) {
        setDeviceRaw(deviceData[0]);
        setDeviceName(deviceData[0].device_id || 'GATE-01');
        setIsDeviceOnline(checkDeviceLiveness(deviceData[0]));
      } else {
        setIsDeviceOnline(false);
      }
    } catch (err) {
      console.warn('Dashboard fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Quick Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                Live Overview & Monitoring Gerbang
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring status solenoid pintu, sensor magnetik, dan presensi tap NFC real-time.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchDashboardData} 
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} /> 
            <span>Refresh</span>
          </button>

          <div className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className={`w-2 h-2 rounded-full ${isDeviceOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
            <span className="text-xs font-semibold text-slate-700 font-mono">
              {deviceName}: {isDeviceOnline ? 'ONLINE (20s Ping)' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Hadir */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-white to-emerald-50/30 p-5 border border-emerald-100 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Hadir</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-800 tracking-tight">{totalHadir}</div>
            <p className="text-xs font-medium text-emerald-600 mt-1 flex items-center gap-1">
              <span>Tap akses berhasil diterima</span>
            </p>
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
        </div>

        {/* Kartu Terdaftar */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-white to-indigo-50/30 p-5 border border-indigo-100 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Kartu Terdaftar</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-800 tracking-tight">{totalCards}</div>
            <p className="text-xs font-medium text-indigo-600 mt-1 flex items-center gap-1">
              <span>Kartu NFC/e-Money aktif</span>
            </p>
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
        </div>

        {/* Kartu Ditolak */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-white to-rose-50/30 p-5 border border-rose-100 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Kartu Ditolak</span>
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-800 tracking-tight">{kartuDitolak}</div>
            <p className="text-xs font-medium text-rose-600 mt-1 flex items-center gap-1">
              <span>Percobaan kartu tidak sah</span>
            </p>
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600"></div>
        </div>

        {/* Status Solenoid Door */}
        <div className={`relative overflow-hidden rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all ${
          doorStatus === 'Terbuka' 
            ? 'bg-gradient-to-b from-white to-emerald-50 border-emerald-200' 
            : 'bg-gradient-to-b from-white to-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Solenoid Lock</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              doorStatus === 'Terbuka' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
            }`}>
              {doorStatus === 'Terbuka' ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-extrabold tracking-tight ${
              doorStatus === 'Terbuka' ? 'text-emerald-700' : 'text-slate-800'
            }`}>
              {doorStatus}
            </div>
            <p className="text-xs font-medium text-slate-500 mt-1">
              {doorStatus === 'Terbuka' ? 'Relay ON (Akses Diberikan)' : 'Fail-Secure (Terkunci)'}
            </p>
          </div>
          <div className={`absolute top-0 left-0 right-0 h-1 ${
            doorStatus === 'Terbuka' ? 'bg-emerald-500' : 'bg-slate-400'
          }`}></div>
        </div>
      </div>

      {/* Hardware Gate Visualizer Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                HARDWARE REAL-TIME
              </span>
              <span className="text-xs text-slate-400">NodeMCU ESP32 • PN532 SPI • MC-38 Reed Switch</span>
            </div>
            <h3 className="text-xl font-extrabold tracking-tight text-white">
              Status Operasional Pintu Gerbang Otomatis
            </h3>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Solenoid 12V DC dikendalikan relay optocoupler LOW-Level trigger dengan auto-relock 5 detik dan sensor reed switch magnetik. Terakhir diakses oleh: <strong className="text-emerald-400">{lastTapName}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${
              doorStatus === 'Terbuka' 
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/30' 
                : 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-600/30'
            }`}>
              {doorStatus === 'Terbuka' ? (
                <DoorOpen className="w-8 h-8 animate-bounce" />
              ) : (
                <ShieldCheck className="w-8 h-8" />
              )}
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status Gerbang Fisik</div>
              <div className="text-base font-bold text-white mt-0.5">
                {doorStatus === 'Terbuka' ? 'Pintu Terbuka (5 Detik)' : 'Pintu Terkunci Rapat'}
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Reed Switch Normal (Fail-Secure)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ambient Glow Graphic */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute left-1/3 -top-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* Live Stream Taps Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
            <h3 className="font-bold text-slate-800 text-sm">Aktivitas Akses Terbaru (Live Supabase Stream)</h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
            10 Transaksi Terakhir
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-3.5">Waktu Tap</th>
                <th className="px-6 py-3.5">Nama Siswa / Staf</th>
                <th className="px-6 py-3.5">Kelas / Departemen</th>
                <th className="px-6 py-3.5">UID Kartu NFC</th>
                <th className="px-6 py-3.5">Status Akses</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    Belum ada rekaman presensi di database Supabase. Tap kartu NFC pada ESP32 untuk mencatat presensi real-time.
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={log.id || index} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-600 whitespace-nowrap">
                      {log.time}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          log.status === 'Diterima' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {log.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{log.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[11px]">
                        {log.class_}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-[11px] text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold border border-slate-200">
                        {log.uid}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        log.status === 'Ditolak' 
                          ? 'bg-rose-50 text-rose-700 border border-rose-200/60' 
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'Ditolak' ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                        {log.status === 'Diterima' ? 'Akses Diberikan' : 'Akses Ditolak'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
