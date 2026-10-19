import { useState, useEffect } from 'react';
import { Save, Bell, ShieldCheck, Cpu, Sliders, Check, Radio } from 'lucide-react';

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
  doorUnlockDuration: 4,
  doorAjarTimeout: 15,
  tapCooldown: 3,
  telegramBotToken: '739281928:AAH9f2910kd0a...',
  telegramChatId: '-100987654321',
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

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (savedSuccess) {
      const timer = setTimeout(() => setSavedSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [savedSuccess]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('nfckey_settings', JSON.stringify(settings));
    setSavedSuccess(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#d0d7de]">
        <div>
          <h2 className="text-xl font-semibold text-[#24292f] flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#57606a]" />
            System & Device Settings
          </h2>
          <p className="text-sm text-[#57606a] mt-1">
            Configure ESP32 gate timings, Telegram instant alerts, and Supabase cloud sync parameters.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 text-sm text-[#1a7f37] bg-[#dafbe1] border border-[#4ac26b66] px-3 py-1.5 rounded-md font-medium">
            <Check className="w-4 h-4" /> Settings saved successfully
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Door Hardware Timings */}
        <div className="border border-[#d0d7de] rounded-md overflow-hidden bg-white">
          <div className="bg-[#f6f8fa] border-b border-[#d0d7de] px-4 py-3 flex items-center gap-2 text-sm font-semibold text-[#24292f]">
            <ShieldCheck className="w-4 h-4 text-[#0969da]" />
            Door Security & Actuator Parameters
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#24292f] mb-1">
                Unlock Duration (Seconds)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={settings.doorUnlockDuration}
                onChange={(e) => setSettings({ ...settings, doorUnlockDuration: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-[#d0d7de] rounded-md text-sm outline-none focus:border-[#0969da] focus:ring-1 focus:ring-[#0969da]"
                required
              />
              <p className="text-xs text-[#57606a] mt-1">How long the 12V solenoid stays energized.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#24292f] mb-1">
                Door Ajar Alarm Timeout (Seconds)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={settings.doorAjarTimeout}
                onChange={(e) => setSettings({ ...settings, doorAjarTimeout: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-[#d0d7de] rounded-md text-sm outline-none focus:border-[#0969da] focus:ring-1 focus:ring-[#0969da]"
                required
              />
              <p className="text-xs text-[#57606a] mt-1">Trigger buzzer alarm if door stays open past this limit.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#24292f] mb-1">
                Tap Cooldown (Seconds)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.tapCooldown}
                onChange={(e) => setSettings({ ...settings, tapCooldown: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-[#d0d7de] rounded-md text-sm outline-none focus:border-[#0969da] focus:ring-1 focus:ring-[#0969da]"
                required
              />
              <p className="text-xs text-[#57606a] mt-1">Anti-bounce delay before reading the same NFC card again.</p>
            </div>
          </div>
        </div>

        {/* Telegram Alerts */}
        <div className="border border-[#d0d7de] rounded-md overflow-hidden bg-white">
          <div className="bg-[#f6f8fa] border-b border-[#d0d7de] px-4 py-3 flex items-center gap-2 text-sm font-semibold text-[#24292f]">
            <Bell className="w-4 h-4 text-[#0969da]" />
            Telegram Security Alerts (Bot API)
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#24292f] mb-1">
                  Telegram Bot Token
                </label>
                <input
                  type="text"
                  value={settings.telegramBotToken}
                  onChange={(e) => setSettings({ ...settings, telegramBotToken: e.target.value })}
                  placeholder="e.g. 123456789:ABCdefGHIjkl..."
                  className="w-full px-3 py-1.5 border border-[#d0d7de] rounded-md text-sm font-mono outline-none focus:border-[#0969da] focus:ring-1 focus:ring-[#0969da]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#24292f] mb-1">
                  Telegram Chat ID / Channel ID
                </label>
                <input
                  type="text"
                  value={settings.telegramChatId}
                  onChange={(e) => setSettings({ ...settings, telegramChatId: e.target.value })}
                  placeholder="e.g. -100123456789"
                  className="w-full px-3 py-1.5 border border-[#d0d7de] rounded-md text-sm font-mono outline-none focus:border-[#0969da] focus:ring-1 focus:ring-[#0969da]"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-[#24292f]">
                <input
                  type="checkbox"
                  checked={settings.alertOnDenied}
                  onChange={(e) => setSettings({ ...settings, alertOnDenied: e.target.checked })}
                  className="rounded text-[#0969da] focus:ring-[#0969da]"
                />
                Send alert on unauthorized tap (Kartu Ditolak)
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-sm text-[#24292f]">
                <input
                  type="checkbox"
                  checked={settings.alertOnDoorAjar}
                  onChange={(e) => setSettings({ ...settings, alertOnDoorAjar: e.target.checked })}
                  className="rounded text-[#0969da] focus:ring-[#0969da]"
                />
                Send alert when door is held open (Door Ajar Alarm)
              </label>
            </div>
          </div>
        </div>

        {/* Backend & Cloud Synchronization */}
        <div className="border border-[#d0d7de] rounded-md overflow-hidden bg-white">
          <div className="bg-[#f6f8fa] border-b border-[#d0d7de] px-4 py-3 flex items-center justify-between text-sm font-semibold text-[#24292f]">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#0969da]" />
              Cloud Architecture & Backend Settings
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#dafbe1] text-[#1a7f37] font-medium border border-[#4ac26b66] flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse" /> Fully Supabase Connected
            </span>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#24292f] mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  value={settings.supabaseEndpoint}
                  readOnly
                  className="w-full px-3 py-1.5 border border-[#d0d7de] rounded-md text-sm font-mono bg-[#f6f8fa] text-[#57606a] cursor-not-allowed"
                />
                <p className="text-xs text-[#57606a] mt-1">Configured in .env as primary real-time database.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#24292f] mb-1">
                  Offline Sync Retry Interval (Seconds)
                </label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={settings.autoSyncInterval}
                  onChange={(e) => setSettings({ ...settings, autoSyncInterval: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 border border-[#d0d7de] rounded-md text-sm outline-none focus:border-[#0969da] focus:ring-1 focus:ring-[#0969da]"
                  required
                />
                <p className="text-xs text-[#57606a] mt-1">Interval for ESP32 background task to drain SPIFFS offline queue.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 bg-[#2da44e] hover:bg-[#2c974b] text-white px-5 py-2 rounded-md font-medium text-sm transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" /> Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
