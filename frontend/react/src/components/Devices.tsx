import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Smartphone, Plus, Trash2 } from 'lucide-react';

interface Device {
  id: number;
  device_id: string;
  name: string;
  status: string;
  last_seen: string | null;
}

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await api.get('/admin/devices');
      setDevices(response.data);
    } catch (error) {
      console.error('Failed to fetch devices', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/admin/devices', {
        device_id: newDeviceId,
        name: newDeviceName
      });
      setNewToken(response.data.token);
      setDevices([...devices, response.data.device]);
      setShowAdd(false);
      setNewDeviceId('');
      setNewDeviceName('');
    } catch (error) {
      console.error('Failed to add device', error);
      alert('Failed to add device');
    }
  };

  const handleDeleteDevice = async (id: number) => {
    if (!confirm('Are you sure you want to delete this device?')) return;
    try {
      await api.delete(`/admin/devices/${id}`);
      setDevices(devices.filter(d => d.id !== id));
    } catch (error) {
      console.error('Failed to delete device', error);
      alert('Failed to delete device');
    }
  };

  if (loading) return <div>Loading devices...</div>;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Manajemen Perangkat (ESP32)</h2>
          <p className="text-slate-500 mt-1">Daftar perangkat gate dan token API.</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" /> Tambah Perangkat
        </button>
      </div>

      {newToken && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-green-800 font-bold mb-2">Perangkat Berhasil Ditambahkan!</h3>
          <p className="text-green-700 text-sm mb-2">Ini adalah API Token untuk ESP32 Anda. <strong>Simpan sekarang karena tidak akan ditampilkan lagi!</strong></p>
          <code className="block p-3 bg-white border border-green-200 rounded text-slate-800 font-mono text-sm break-all">
            {newToken}
          </code>
        </div>
      )}

      {showAdd && (
        <div className="mb-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">Tambah Perangkat Baru</h3>
          <form onSubmit={handleAddDevice} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Device ID</label>
              <input 
                type="text" 
                value={newDeviceId}
                onChange={(e) => setNewDeviceId(e.target.value)}
                placeholder="e.g. GATE-01"
                required
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Perangkat</label>
              <input 
                type="text" 
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                placeholder="e.g. Gerbang Depan"
                required
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark h-[42px]">
              Simpan
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map(device => (
          <div key={device.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
            <button 
              onClick={() => handleDeleteDevice(device.id)}
              className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">{device.name}</h3>
                <p className="text-sm text-slate-500 font-mono">{device.device_id}</p>
              </div>
            </div>
            <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Status</span>
                <span className={`font-medium ${device.status === 'active' ? 'text-green-600' : 'text-slate-600'}`}>
                  {device.status === 'active' ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Last Seen</span>
                <span className="text-slate-700">{device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never'}</span>
              </div>
            </div>
          </div>
        ))}
        {devices.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200 border-dashed">
            Belum ada perangkat terdaftar.
          </div>
        )}
      </div>
    </div>
  );
}
