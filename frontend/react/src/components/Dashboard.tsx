import { useState, useEffect } from 'react';
import { DoorOpen, Activity, RefreshCw, CreditCard } from 'lucide-react';
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
  const [isDeviceOnline, setIsDeviceOnline] = useState<boolean>(true);
  const [deviceName, setDeviceName] = useState<string>('GATE-01');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchDashboardData();

    // 1. Setup Supabase Realtime Subscription for Attendances
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

          if (formattedLog.status === 'Diterima') {
            setTotalHadir((prev) => prev + 1);
            setDoorStatus('Terbuka');
            setTimeout(() => setDoorStatus('Terkunci'), 4000);
          } else {
            setKartuDitolak((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    // 2. Setup Supabase Realtime Subscription for Devices
    const deviceChannel = supabase
      .channel('public:devices_dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'devices' },
        (payload: any) => {
          if (payload.new) {
            setIsDeviceOnline(payload.new.status === 'online');
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
      // 1. Fetch recent attendances from Supabase
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
      }

      // 2. Query exact counts from Supabase
      const [hadirRes, ditolakRes, cardsRes] = await Promise.all([
        supabase.from('attendances').select('*', { count: 'exact', head: true }).eq('status', 'Diterima'),
        supabase.from('attendances').select('*', { count: 'exact', head: true }).eq('status', 'Ditolak'),
        supabase.from('cards').select('*', { count: 'exact', head: true }),
      ]);

      if (hadirRes.count !== null && hadirRes.count !== undefined) {
        setTotalHadir(hadirRes.count);
      }
      if (ditolakRes.count !== null && ditolakRes.count !== undefined) {
        setKartuDitolak(ditolakRes.count);
      }
      if (cardsRes.count !== null && cardsRes.count !== undefined) {
        setTotalCards(cardsRes.count);
      }

      // 3. Fetch Device Status
      const { data: deviceData } = await supabase
        .from('devices')
        .select('*')
        .limit(1);

      if (deviceData && deviceData.length > 0) {
        setIsDeviceOnline(deviceData[0].status === 'online');
        setDeviceName(deviceData[0].device_id || 'GATE-01');
      }
    } catch (err) {
      console.warn('Dashboard fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Overview Hari Ini</h2>
          <p className="text-slate-500 mt-1">Pantau status akses pintu dan kehadiran pengguna secara real-time via Supabase.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={fetchDashboardData} 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition cursor-pointer"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <div className="text-right">
            <p className="text-xs text-slate-500">Status Gateway ESP32</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isDeviceOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
              <span className="text-sm font-medium text-slate-700">
                {isDeviceOnline ? `Online (${deviceName})` : `Offline (${deviceName})`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Hadir" value={totalHadir.toString()} subtitle="Tap Diterima" color="text-green-600" bg="bg-green-100" />
        <StatCard 
          title="Kartu Terdaftar" 
          value={totalCards.toString()} 
          subtitle="Kartu Aktif" 
          color="text-blue-600" 
          bg="bg-blue-100" 
          icon={<CreditCard className="w-6 h-6 text-blue-600" />} 
        />
        <StatCard title="Kartu Ditolak" value={kartuDitolak.toString()} subtitle="Percobaan Ilegal" color="text-red-600" bg="bg-red-100" />
        <StatCard 
          title="Status Solenoid" 
          value={doorStatus} 
          subtitle={doorStatus === 'Terkunci' ? 'Aman (Fail-Secure)' : 'Terbuka (Akses Diberikan)'} 
          icon={<DoorOpen className={`w-6 h-6 ${doorStatus === 'Terbuka' ? 'text-green-600' : 'text-primary'}`} />} 
          color="text-primary" 
          bg={doorStatus === 'Terbuka' ? 'bg-green-100' : 'bg-primary/10'} 
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">Aktivitas Akses Terbaru (Live Stream)</h3>
          <span className="text-xs bg-green-50 text-green-700 font-medium px-2.5 py-0.5 rounded-full border border-green-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span> Realtime Active
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm">
                <th className="px-6 py-3 font-medium">Waktu</th>
                <th className="px-6 py-3 font-medium">Nama Siswa / Staf</th>
                <th className="px-6 py-3 font-medium">Kelas / Departemen</th>
                <th className="px-6 py-3 font-medium">UID Kartu NFC</th>
                <th className="px-6 py-3 font-medium">Status Akses</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Belum ada rekaman presensi di database Supabase. Tap kartu NFC pada ESP32 untuk mencatat presensi real-time.
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <TableRow 
                    key={log.id || index}
                    time={log.time} 
                    name={log.name} 
                    class_={log.class_} 
                    uid={log.uid} 
                    status={log.status} 
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, color, bg, icon }: any) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <div className="flex items-baseline gap-2 mt-2">
          <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
          <span className="text-sm font-medium text-slate-500">{subtitle}</span>
        </div>
      </div>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${bg}`}>
        {icon || <Activity className={`w-6 h-6 ${color}`} />}
      </div>
    </div>
  );
}

function TableRow({ time, name, class_, uid, status }: any) {
  const isDenied = status === 'Ditolak';
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-6 py-4 text-slate-500 font-mono text-xs">{time}</td>
      <td className="px-6 py-4 font-medium text-slate-800">{name}</td>
      <td className="px-6 py-4 text-slate-600">{class_}</td>
      <td className="px-6 py-4 font-mono text-xs text-slate-500">{uid}</td>
      <td className="px-6 py-4">
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
          isDenied ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {status}
        </span>
      </td>
    </tr>
  );
}
