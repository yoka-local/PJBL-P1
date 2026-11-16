import { useState, useEffect } from 'react';
import { 
  Save, Bell, ShieldCheck, Cpu, Sliders, Check, Radio, AlertCircle, RefreshCw, 
  Clock, Zap, CheckCircle2, Send 
} from 'lucide-react';
import { supabase } from '../supabase';

interface SystemSettings {
  doorUnlockDuration: number;
  doorAjarTimeout: number;
  tapCooldown: number;
  telegramBotToken: string;
  telegramChatId: string;
  alertOnDenied: boolean;
  alertOnDoorAjar: boolean;
  supabaseEndpoint: string;
  autoSyncInterval: number;
}

const DEFAULT_SETTINGS: SystemSettings = {
  doorUnlockDuration: 5,
  doorAjarTimeout: 15,
  tapCooldown: 3,
  telegramBotToken: '',
  telegramChatId: '',
  alertOnDenied: true,
  alertOnDoorAjar: true,
  supabaseEndpoint: 'https://zdsmcifmlbwejyihorqs.supabase.co',
  autoSyncInterval: 30,
};

export default function SettingsView() {
  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('nfckey_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved settings:', e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [testingTelegram, setTestingTelegram] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'system_settings')
        .maybeSingle();

      if (!error && data?.value) {
        setSettings((prev) => ({
          ...prev,
          ...data.value,
        }));
        localStorage.setItem('nfckey_settings', JSON.stringify(data.value));
      }
    } catch (err) {
      console.warn('Error fetching settings from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (savedSuccess) {
      const timer = setTimeout(() => setSavedSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [savedSuccess]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      localStorage.setItem('nfckey_settings', JSON.stringify(settings));

      const { error } = await supabase
        .from('settings')
        .upsert(
          {
            key: 'system_settings',
            value: settings,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        );

      if (error) throw error;
      setSavedSuccess(true);
    } catch (err: any) {
      console.error('Error saving settings to Supabase:', err);
      setSaveError(err.message || 'Gagal menyimpan pengaturan ke cloud Supabase');
    } finally {
      setSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!settings.telegramBotToken.trim() || !settings.telegramChatId.trim()) {
      setTestResult('⚠️ Masukkan Bot Token dan Chat ID terlebih dahulu.');
      return;
    }
    setTestingTelegram(true);
    setTestResult(null);
    try {
      const text = encodeURIComponent('🔔 [NFCKey Gate System] Uji coba notifikasi bot Telegram berhasil! Sistem keamanan aktif.');
      const res = await fetch(`https://api.telegram.org/bot${settings.telegramBotToken.trim()}/sendMessage?chat_id=${settings.telegramChatId.trim()}&text=${text}`);
      const data = await res.json();
      if (data.ok) {
        setTestResult('✅ Pesan uji coba berhasil dikirim ke Telegram!');
      } else {
        setTestResult(`❌ Gagal kirim: ${data.description || 'Token/Chat ID salah'}`);
      }
    } catch (err: any) {
      setTestResult(`❌ Gagal koneksi: ${err.message}`);
    } finally {
      setTestingTelegram(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                System & Hardware Settings
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Konfigurasi parameter gerbang ESP32, alarm door ajar, dan cloud sync Supabase.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchSettings}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Cloud</span>
          </button>

          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl font-bold animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Pengaturan tersimpan ke ESP32!</span>
            </div>
          )}
        </div>
      </div>

      {saveError && (
        <div className="flex items-center gap-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-4 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Door Hardware & Timing Parameters */}
        <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
          <div className="bg-slate-50/75 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Parameter Keamanan Pintu & Solenoid</h3>
                <p className="text-[11px] text-slate-500">Nilai disinkronisasi otomatis ke ESP32 setiap 1 menit.</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase">
              Live Hardware Link
            </span>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Unlock Duration */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Durasi Buka Solenoid</label>
                <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {settings.doorUnlockDuration} Detik
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={settings.doorUnlockDuration}
                onChange={(e) => setSettings({ ...settings, doorUnlockDuration: Number(e.target.value) })}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 leading-tight">
                Lama plunger solenoid 12V ditarik masuk setelah tap kartu valid.
              </p>
            </div>

            {/* Door Ajar Alarm Timeout */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Timeout Door Ajar (Alarm)</label>
                <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {settings.doorAjarTimeout} Detik
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={settings.doorAjarTimeout}
                onChange={(e) => setSettings({ ...settings, doorAjarTimeout: Number(e.target.value) })}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 leading-tight">
                Batas waktu pintu dibiarkan terbuka sebelum musik Kasane Teto dan alarm berbunyi.
              </p>
            </div>

            {/* Tap Cooldown */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Tap Cooldown (Anti-Bounce)</label>
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {settings.tapCooldown} Detik
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                value={settings.tapCooldown}
                onChange={(e) => setSettings({ ...settings, tapCooldown: Number(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 leading-tight">
                Jeda sebelum kartu RFID yang sama dapat dibaca kembali untuk mencegah double-tap.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Telegram Bot API Alerts */}
        <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
          <div className="bg-slate-50/75 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Notifikasi Telegram Bot Alert</h3>
                <p className="text-[11px] text-slate-500">Kirim peringatan instan keamanan langsung ke HP administrator.</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Telegram Bot Token
                </label>
                <input
                  type="text"
                  value={settings.telegramBotToken}
                  onChange={(e) => setSettings({ ...settings, telegramBotToken: e.target.value })}
                  placeholder="e.g. 123456789:ABCdefGHIjkl..."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Telegram Chat ID / Channel ID
                </label>
                <input
                  type="text"
                  value={settings.telegramChatId}
                  onChange={(e) => setSettings({ ...settings, telegramChatId: e.target.value })}
                  placeholder="e.g. -100123456789"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.alertOnDenied}
                  onChange={(e) => setSettings({ ...settings, alertOnDenied: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Kirim alert saat kartu ditolak (Akses Ilegal)</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.alertOnDoorAjar}
                  onChange={(e) => setSettings({ ...settings, alertOnDoorAjar: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Kirim alert saat pintu terbuka terlalu lama (Door Ajar)</span>
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={testingTelegram}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 text-blue-600 ${testingTelegram ? 'animate-bounce' : ''}`} />
                <span>{testingTelegram ? 'Mengirim...' : 'Test Kirim Alert Telegram'}</span>
              </button>

              {testResult && (
                <span className="text-xs font-semibold text-slate-600">
                  {testResult}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Supabase Cloud & Offline Sync */}
        <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
          <div className="bg-slate-50/75 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Supabase Cloud & Offline-First Gateway</h3>
                <p className="text-[11px] text-slate-500">Konfigurasi sinkronisasi antrean offline lokal ke cloud database.</p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" /> Fully Connected
            </span>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Supabase Project Endpoint
              </label>
              <input
                type="text"
                value={settings.supabaseEndpoint}
                readOnly
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono bg-slate-50 text-slate-500 cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-400 mt-1">Dikonfigurasi via .env sebagai database relasional utama.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Interval Sync Antrean Offline (Detik)
              </label>
              <input
                type="number"
                min="5"
                max="300"
                value={settings.autoSyncInterval}
                onChange={(e) => setSettings({ ...settings, autoSyncInterval: Number(e.target.value) })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">Jeda proses pengurasan antrean lokal saat Wi-Fi kembali aktif.</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition shadow-md shadow-emerald-600/20 disabled:opacity-60 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyimpan ke Supabase...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Konfigurasi (Save Configuration)</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
