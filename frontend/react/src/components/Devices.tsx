import { useState, useEffect } from 'react';
import { Smartphone, Plus, Trash2, Copy, Check, X, ShieldAlert } from 'lucide-react';
import { supabase } from '../supabase';

interface Device {
  id: number | string;
  device_id: string;
  name: string;
  status: string;
  last_seen: string | null;
}

const DEFAULT_DEVICES: Device[] = [
  { id: 1, device_id: 'GATE-01', name: 'Pintu Gerbang Utama / Lab', status: 'online', last_seen: new Date().toISOString() },
  { id: 2, device_id: 'GATE-02', name: 'Pintu Ruang Guru', status: 'offline', last_seen: null },
];

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>(DEFAULT_DEVICES);
  const [showAdd, setShowAdd] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        setDevices(data);
      }
    } catch (error) {
      console.warn('Using local devices state:', error);
    }
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceId.trim()) return;

    setLoading(true);
    const newDevice: Device = {
      id: Date.now(),
      device_id: newDeviceId.trim().toUpperCase(),
      name: newDeviceName.trim() || 'Gateway Baru',
      status: 'offline',
      last_seen: null,
    };

    try {
      await supabase.from('devices').insert([
        {
          device_id: newDevice.device_id,
          name: newDevice.name,
          status: 'offline',
        }
      ]);
    } catch (err) {
      console.warn('Error inserting device to Supabase:', err);
    }

    setDevices([...devices, newDevice]);
    setShowAdd(false);
    setNewDeviceId('');
    setNewDeviceName('');
    setLoading(false);
  };

  const handleDeleteDevice = async (id: number | string) => {
    if (!confirm('Yakin ingin menghapus perangkat ini?')) return;
    setDevices(devices.filter(d => d.id !== id));
    try {
      await supabase.from('devices').delete().eq('id', id);
    } catch (error) {
      console.warn('Error deleting device:', error);
    }
  };

  const copyConfigCode = () => {
    const code = `// Konfigurasi Supabase untuk firmware/esp32/src/config.h\n#define DEVICE_ID "GATE-01"\n#define API_URL "https://zdsmcifmlbwejyihorqs.supabase.co/rest/v1/attendances"\n#define API_TOKEN "${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGci...'}"`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Manajemen Perangkat Gateway</h2>
          <p className="text-slate-500 mt-1">Daftarkan dan pantau status konektivitas mikrokontroler ESP32.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={copyConfigCode} 
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Tersalin!' : 'Salin Kode Konfigurasi ESP32'}
          </button>
          <button 
            onClick={() => setShowAdd(true)} 
            className="flex items-center gap-2 px-4 py-2 bg-[#2da44e] text-white rounded-lg hover:bg-[#2c974b] text-sm font-medium transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Tambah Gateway
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {devices.map((device) => {
          const isOnline = device.status === 'online';
          return (
            <div key={device.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-100 rounded-lg">
                      <Smartphone className="w-6 h-6 text-slate-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{device.name}</h3>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">{device.device_id}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    isOnline ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 my-4 py-3 border-y border-slate-100">
                  <div className="flex justify-between">
                    <span>Terakhir Terlihat:</span>
                    <span className="font-medium text-slate-700">
                      {device.last_seen ? new Date(device.last_seen).toLocaleTimeString('id-ID') : 'Belum Pernah'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Protokol Komunikasi:</span>
                    <span className="font-mono text-slate-700">Supabase PostgREST (HTTPS)</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={() => handleDeleteDevice(device.id)} 
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition" 
                  title="Hapus Gateway"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Tambah Device */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Tambah Gateway ESP32 Baru</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddDevice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Device ID (Hardware Identifier)</label>
                <input 
                  type="text" 
                  value={newDeviceId} 
                  onChange={(e) => setNewDeviceId(e.target.value)} 
                  placeholder="Contoh: GATE-02" 
                  required 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm uppercase focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Nama Lokasi Pintu</label>
                <input 
                  type="text" 
                  value={newDeviceName} 
                  onChange={(e) => setNewDeviceName(e.target.value)} 
                  placeholder="Contoh: Pintu Lab Komputer" 
                  required 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowAdd(false)} 
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="px-4 py-2 bg-[#2da44e] text-white text-sm font-medium rounded-lg hover:bg-[#2c974b] transition disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Gateway'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
