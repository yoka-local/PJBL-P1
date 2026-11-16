import { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Users as UsersIcon, CreditCard, Activity, Settings, Bell, 
  ShieldCheck, Smartphone, Check, AlertTriangle, LogOut, Clock, Sparkles, ChevronDown 
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import Logs from './components/Logs';
import Users from './components/Users';
import Cards from './components/Cards';
import SettingsView from './components/Settings';
import Devices from './components/Devices';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './supabase';

interface NotificationItem {
  id: string | number;
  title: string;
  desc: string;
  time: string;
  isDenied: boolean;
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, loading, login, logout, rememberedUser, forgetRememberedUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [currentTime, setCurrentTime] = useState('');

  // Live Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB');
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Notifications Listener & Fetch
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const channel = supabase
      .channel('public:attendances_notif')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendances' },
        (payload: any) => {
          const r = payload.new;
          const isDenied = r.status === 'Ditolak';
          const newNotif: NotificationItem = {
            id: r.id || r.event_id || Date.now(),
            title: isDenied ? 'Akses Ditolak (Kartu Ilegal)' : 'Akses Pintu Diberikan',
            desc: `${r.user_name || 'Kartu Asing'} (${r.card_uid}) di ${r.device_id || 'GATE-01'}`,
            time: new Date(r.timestamp || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            isDenied,
          };
          setNotifications((prev) => [newNotif, ...prev.slice(0, 7)]);
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data } = await supabase
        .from('attendances')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(6);

      if (data) {
        setNotifications(data.map((r: any) => ({
          id: r.id || r.event_id,
          title: r.status === 'Diterima' ? 'Akses Pintu Diberikan' : 'Akses Ditolak (Kartu Ilegal)',
          desc: `${r.user_name || 'Kartu Asing'} (${r.card_uid}) di ${r.device_id || 'GATE-01'}`,
          time: new Date(r.timestamp || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          isDenied: r.status === 'Ditolak',
        })));
      }
    } catch (e) {
      console.warn('Notifications fetch error:', e);
    }
  };

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (userMenuOpen || notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen, notifOpen]);

  // Pre-fill email if remembered user exists
  useEffect(() => {
    if (rememberedUser?.email && !email) {
      setEmail(rememberedUser.email);
    }
  }, [rememberedUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);
    try {
      await login({ email, password });
    } catch (err: any) {
      setLoginError(err.message || 'Login gagal. Periksa email dan password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-300 gap-3">
        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Memverifikasi Sesi NFCKey...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/20">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight text-white">NFCKey Control Center</h1>
            <p className="text-xs text-slate-400 mt-1">Sistem Keamanan Pintu & Presensi Terpadu Berbasis IoT</p>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-white/20 w-full max-w-sm">
          {rememberedUser && (
            <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Akun Tersimpan
                </span>
                <button
                  type="button"
                  onClick={forgetRememberedUser}
                  className="text-xs text-rose-600 hover:underline cursor-pointer"
                >
                  Lupakan
                </button>
              </div>
              <div 
                onClick={() => setEmail(rememberedUser.email)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                title="Klik untuk gunakan email ini"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {rememberedUser.name ? rememberedUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-slate-800 truncate">{rememberedUser.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{rememberedUser.email}</div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="text-rose-700 text-xs p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Alamat Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="gopyl@proton.me"
                required 
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none text-xs text-slate-800 bg-slate-50 focus:bg-white transition" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
                required 
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none text-xs text-slate-800 bg-slate-50 focus:bg-white transition" 
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/30 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Memverifikasi...' : 'Sign in to Dashboard'}
            </button>
          </form>
        </div>

        <p className="text-[11px] text-slate-500 mt-8">
          NFCKey Smart Security System • Supabase PostgreSQL Cloud
        </p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'logs': return <Logs />;
      case 'users': return <Users />;
      case 'cards': return <Cards />;
      case 'devices': return <Devices />;
      case 'settings': return <SettingsView />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100/80 via-slate-50 to-slate-100 flex flex-col font-sans">
      {/* Top Glass Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 h-16 flex items-center justify-between px-6 text-white shadow-lg shadow-black/10">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 bg-gradient-to-tr from-emerald-400 to-teal-400 text-slate-950 rounded-xl flex items-center justify-center shadow-md shadow-emerald-400/20">
            <ShieldCheck className="w-5 h-5 font-black" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold tracking-tight text-white text-base">NFCKey</span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Control Center</span>
            <span className="hidden md:inline-flex items-center gap-1.5 ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Gateway
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Supabase Connection Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-medium">Cloud Sync Active</span>
          </div>

          {/* Interactive Notification Bell */}
          <div ref={notifRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifOpen((prev) => !prev);
                setUnreadCount(0);
              }}
              className="relative p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer text-white"
              title="Notifikasi & Security Alerts"
            >
              <Bell className="w-4 h-4 text-slate-200" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center animate-bounce shadow-md shadow-rose-500/40">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {notifOpen && (
              <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 text-slate-800 animate-scaleUp">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Notifikasi & Riwayat Tap
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">{notifications.length} terbaru</span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Belum ada notifikasi tap baru.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div 
                        key={n.id} 
                        onClick={() => {
                          setActiveTab('logs');
                          setNotifOpen(false);
                        }}
                        className="p-3.5 hover:bg-slate-50 transition cursor-pointer flex items-start gap-3"
                      >
                        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.isDenied ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs font-bold truncate ${n.isDenied ? 'text-rose-600' : 'text-emerald-700'}`}>
                              {n.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{n.time}</span>
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{n.desc}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('logs');
                      setNotifOpen(false);
                    }}
                    className="w-full text-xs font-bold text-emerald-700 hover:text-emerald-800 py-1 cursor-pointer"
                  >
                    Buka Log Presensi Lengkap →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div ref={userMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
            >
              <div className="w-7 h-7 bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 rounded-lg flex items-center justify-center font-black text-xs">
                {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <span className="hidden sm:inline-block text-xs font-bold text-slate-200 max-w-[120px] truncate">
                {user.name}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800 animate-scaleUp">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Masuk sebagai</span>
                  <strong className="font-bold block truncate text-xs text-slate-800 mt-0.5">{user.name}</strong>
                  {user.email && <span className="text-[11px] text-slate-500 block truncate">{user.email}</span>}
                  <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 uppercase">
                    {user.role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 transition font-bold flex items-center gap-2 cursor-pointer mt-1"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Subheader Title & Live Time */}
      <div className="bg-white border-b border-slate-200/80 pt-4">
        <div className="max-w-[1400px] mx-auto px-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Sistem Akses Pintu & Presensi Terpadu</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitoring keamanan solenoid gerbang dan rekaman kehadiran real-time via Supabase Cloud.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 self-start sm:self-auto font-mono shadow-xs">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>{currentTime || 'WIB'}</span>
          </div>
        </div>

        {/* Modern Tab Bar */}
        <div className="max-w-[1400px] mx-auto px-6">
          <nav className="flex items-center gap-1.5 overflow-x-auto pb-2">
            <TabItem icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <TabItem icon={<Activity className="w-4 h-4" />} label="Logs" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
            {user.role === 'admin' && (
              <>
                <TabItem icon={<UsersIcon className="w-4 h-4" />} label="Users" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
                <TabItem icon={<CreditCard className="w-4 h-4" />} label="Cards" active={activeTab === 'cards'} onClick={() => setActiveTab('cards')} />
                <TabItem icon={<Smartphone className="w-4 h-4" />} label="Devices" active={activeTab === 'devices'} onClick={() => setActiveTab('devices')} />
                <TabItem icon={<Settings className="w-4 h-4" />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto p-6">
        <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

// Modern Tab Item Component
function TabItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
        active 
          ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20' 
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default App;
