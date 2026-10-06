import { useState } from 'react';
import { LayoutDashboard, Users as UsersIcon, CreditCard, Activity, Settings, Bell, Search, ShieldCheck, LogOut, Smartphone } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Logs from './components/Logs';
import Users from './components/Users';
import Cards from './components/Cards';
import SettingsView from './components/Settings';
import Devices from './components/Devices';
import { useAuth } from './contexts/AuthContext';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, loading, login, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await login({ email, password });
    } catch (err: any) {
      setLoginError(err.response?.data?.message || 'Login failed');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-xl shadow-md w-96">
          <div className="flex items-center gap-3 justify-center text-primary mb-8">
            <ShieldCheck className="w-10 h-10" />
            <h1 className="text-2xl font-bold tracking-wider text-slate-800">NFCKey</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && <div className="text-red-500 text-sm p-2 bg-red-50 rounded">{loginError}</div>}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
            <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary/90 transition">Login</button>
          </form>
        </div>
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
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-6 flex items-center gap-3 text-white border-b border-slate-800">
          <ShieldCheck className="w-8 h-8 text-primary" />
          <h1 className="text-xl font-bold tracking-wider">NFCKey</h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <NavItem icon={<LayoutDashboard />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<Activity />} label="Log Absensi" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
          {user.role === 'admin' && (
            <>
              <NavItem icon={<UsersIcon />} label="Data Pengguna" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
              <NavItem icon={<CreditCard />} label="Kartu Akses" active={activeTab === 'cards'} onClick={() => setActiveTab('cards')} />
              <NavItem icon={<Smartphone />} label="Perangkat" active={activeTab === 'devices'} onClick={() => setActiveTab('devices')} />
              <NavItem icon={<Settings />} label="Pengaturan" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
            </>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Cari nama atau nomor kartu..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-lg focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            />
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative">
              <Bell className="w-6 h-6 text-slate-600 cursor-pointer hover:text-primary transition-colors" />
            </div>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-700">{user.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user.role}</p>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <button onClick={logout} className="ml-4 text-slate-400 hover:text-red-500 transition" title="Logout">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

// Components
function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
        active 
          ? 'bg-primary text-white' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default App;
