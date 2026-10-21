import { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Users as UsersIcon, CreditCard, Activity, Settings, Bell, ShieldCheck, Smartphone, Check, AlertTriangle, LogOut, Clock } from 'lucide-react';
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f6f8fa] text-[#57606a] gap-3">
        <div className="w-8 h-8 border-3 border-[#0969da] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Memverifikasi sesi NFCKey...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f6f8fa] px-4 font-[-apple-system,BlinkMacSystemFont,Segoe_UI,Helvetica,Arial,sans-serif]">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="w-14 h-14 bg-[#24292f] text-white rounded-2xl flex items-center justify-center shadow-md">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#24292f]">Sign in to NFCKey</h1>
          <p className="text-xs text-[#57606a]">Sistem Keamanan Pintu & Presensi Terpadu</p>
        </div>

        <div className="bg-[#ffffff] p-6 rounded-lg shadow-sm border border-[#d0d7de] w-full max-w-sm">
          {rememberedUser && (
            <div className="mb-4 p-3 bg-[#f6f8fa] border border-[#d0d7de] rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-[#57606a] uppercase tracking-wider">
                  Akun Tersimpan
                </span>
                <button
                  type="button"
                  onClick={forgetRememberedUser}
                  className="text-xs text-[#cf222e] hover:underline cursor-pointer"
                >
                  Lupakan
                </button>
              </div>
              <div 
                onClick={() => setEmail(rememberedUser.email)}
                className="flex items-center gap-2.5 p-1.5 rounded-md hover:bg-[#eaeef2] transition cursor-pointer"
                title="Klik untuk gunakan email ini"
              >
                <div className="w-8 h-8 rounded-full bg-[#0969da] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {rememberedUser.name ? rememberedUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="overflow-hidden">
                  <div className="text-sm font-semibold text-[#24292f] truncate">{rememberedUser.name}</div>
                  <div className="text-xs text-[#57606a] truncate">{rememberedUser.email}</div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="text-[#cf222e] text-xs p-3 bg-[#FFEBE9] border border-[#ff818266] rounded-md flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#24292f] mb-1">Email address</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="gopyl@proton.me"
                required 
                className="w-full px-3 py-1.5 border border-[#d0d7de] rounded-md focus:ring-2 focus:ring-[#0969da] focus:border-[#0969da] outline-none bg-[#f6f8fa] focus:bg-[#ffffff] text-sm" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#24292f] mb-1">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
                required 
                className="w-full px-3 py-1.5 border border-[#d0d7de] rounded-md focus:ring-2 focus:ring-[#0969da] focus:border-[#0969da] outline-none bg-[#f6f8fa] focus:bg-[#ffffff] text-sm" 
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-[#2da44e] hover:bg-[#2c974b] text-white py-2 rounded-md text-sm font-semibold transition disabled:opacity-60 cursor-pointer shadow-sm flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Memverifikasi...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-xs text-[#57606a] mt-6">
          NFCKey Gate System • Supabase PostgreSQL Cloud
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
    <div className="min-h-screen bg-[#ffffff] flex flex-col font-[-apple-system,BlinkMacSystemFont,Segoe_UI,Helvetica,Arial,sans-serif]">
      {/* Global Header */}
      <header className="h-16 bg-[#24292f] flex items-center justify-between px-6 flex-shrink-0 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-white text-base">NFCKey Control Center</span>
            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#2da44e]/30 text-[#4ac26b] border border-[#2da44e]/40">
              Live Gateway
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Supabase Connection Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-[#c6cbd1]">
            <span className="w-2 h-2 rounded-full bg-[#2da44e] animate-pulse"></span>
            <span>Cloud Sync Active</span>
          </div>

          {/* Interactive Notification Bell */}
          <div ref={notifRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifOpen((prev) => !prev);
                setUnreadCount(0);
              }}
              className="relative p-2 rounded-md hover:bg-[#32383f] transition-colors focus:outline-none cursor-pointer text-white"
              title="Notifikasi & Security Alerts"
              aria-label="Security notifications"
            >
              <Bell className="w-4 h-4 text-white hover:text-[#c6cbd1] transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#cf222e] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-2xl border border-[#d0d7de] overflow-hidden z-50 text-[#24292f]">
                <div className="px-4 py-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#24292f] uppercase tracking-wider">
                    Notifikasi & Riwayat Tap
                  </span>
                  <span className="text-[11px] text-[#57606a]">{notifications.length} terbaru</span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-[#d0d7de]/50">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#57606a]">
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
                        className="p-3 hover:bg-[#f6f8fa] transition cursor-pointer flex items-start gap-2.5"
                      >
                        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.isDenied ? 'bg-[#cf222e]' : 'bg-[#1a7f37]'}`}></span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs font-semibold truncate ${n.isDenied ? 'text-[#cf222e]' : 'text-[#1a7f37]'}`}>
                              {n.title}
                            </span>
                            <span className="text-[10px] text-[#57606a] font-mono flex-shrink-0">{n.time}</span>
                          </div>
                          <p className="text-xs text-[#57606a] truncate mt-0.5">{n.desc}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2 bg-[#f6f8fa] border-t border-[#d0d7de] text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('logs');
                      setNotifOpen(false);
                    }}
                    className="w-full text-xs font-semibold text-[#0969da] hover:underline py-1 cursor-pointer"
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
              className="flex items-center gap-2 p-1.5 rounded-md hover:bg-[#32383f] transition-colors focus:outline-none cursor-pointer"
              aria-expanded={userMenuOpen}
              aria-label="User menu"
            >
              <div className="w-7 h-7 bg-[#0969da] text-white rounded-full flex items-center justify-center font-bold text-xs">
                {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <span className="hidden sm:inline-block text-xs font-semibold text-white max-w-[120px] truncate">
                {user.name}
              </span>
              <span className={`text-[10px] text-[#c6cbd1] transition-transform duration-150 ${userMenuOpen ? 'rotate-180 text-white' : ''}`}>
                ▼
              </span>
            </button>
            
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-md shadow-xl border border-[#d0d7de] py-1 z-50 text-[#24292f]">
                <div className="px-4 py-2.5 border-b border-[#d0d7de]">
                  <span className="text-xs text-[#57606a]">Masuk sebagai</span>
                  <strong className="font-semibold block truncate text-sm text-[#24292f] mt-0.5">{user.name}</strong>
                  {user.email && <span className="text-xs text-[#57606a] block truncate">{user.email}</span>}
                  <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#dafbe1] text-[#1a7f37] uppercase">
                    {user.role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-[#cf222e] hover:bg-[#ffebe9] transition-colors font-medium flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Subheader Title & Live Status */}
      <div className="bg-[#f6f8fa] pt-4 border-b border-[#d0d7de]">
        <div className="px-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-[#24292f] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#0969da]" />
              Sistem Keamanan & Presensi Berbasis NFC
            </h1>
            <p className="text-xs text-[#57606a] mt-0.5">
              Monitoring akses solenoid pintu dan absensi kehadiran real-time.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#57606a] bg-white px-3 py-1.5 rounded-md border border-[#d0d7de] self-start sm:self-auto font-mono">
            <Clock className="w-3.5 h-3.5 text-[#0969da]" />
            <span>{currentTime || 'WIB'}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 px-6 overflow-x-auto">
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

      {/* Main Content */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto p-6">
        <div className="border border-[#d0d7de] rounded-lg overflow-hidden bg-white shadow-sm">
          <div className="bg-[#f6f8fa] border-b border-[#d0d7de] px-4 py-2.5 flex items-center justify-between text-xs text-[#57606a]">
             <div className="flex items-center gap-2">
                <span className="font-semibold text-[#24292f] capitalize">{activeTab} View</span>
                <span>•</span>
                <span>NFCKey Cloud Panel</span>
             </div>
             <div className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#2da44e]"></span>
                <span>Aktif ({user.name})</span>
             </div>
          </div>
          <div className="p-6">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}

// Components
function TabItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
        active 
          ? 'border-[#0969da] text-[#0969da] bg-white rounded-t-md shadow-xs' 
          : 'border-transparent text-[#57606a] hover:bg-[#d0d7de]/30 hover:text-[#24292f] rounded-t-md'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default App;

