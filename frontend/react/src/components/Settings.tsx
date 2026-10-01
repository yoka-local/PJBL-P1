import { Save, Smartphone, Wifi, Bell, ShieldCheck } from 'lucide-react';

export default function Settings() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Pengaturan & Perangkat</h2>
        <p className="text-slate-500 mt-1">Konfigurasi perangkat ESP32 dan notifikasi Telegram.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Device Status */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <Smartphone className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800">Status Perangkat (ESP32)</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Status Koneksi</span>
              <span className="text-green-600 font-medium flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Online</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">IP Address</span>
              <span className="font-mono text-slate-700">192.168.1.45</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Sisa Antrian Offline Sync</span>
              <span className="font-mono text-slate-700">0 Data</span>
            </div>
            <div className="pt-4">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                <Wifi className="w-4 h-4" /> Buka Captive Portal Wi-Fi
              </button>
            </div>
          </div>
        </div>

        {/* Telegram Config */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <Bell className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800">Notifikasi Telegram</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bot Token</label>
              <input type="password" value="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ" readOnly className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-mono text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Chat ID (Grup/Admin)</label>
              <input type="text" defaultValue="-100987654321" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div className="pt-2">
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                <Save className="w-4 h-4" /> Simpan Pengaturan
              </button>
            </div>
          </div>
        </div>

        {/* Security / System */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:col-span-2">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <ShieldCheck className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800">Keamanan & Akses Pintu</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Batas Waktu Tunggu Pintu (Detik)</label>
              <p className="text-xs text-slate-500 mb-2">Berapa lama pintu tetap terbuka sebelum alarm menyala jika tidak ditutup.</p>
              <input type="number" defaultValue="30" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cooldown Anti-Passback (Menit)</label>
              <p className="text-xs text-slate-500 mb-2">Jeda waktu sebelum kartu yang sama bisa digunakan lagi.</p>
              <input type="number" defaultValue="5" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
