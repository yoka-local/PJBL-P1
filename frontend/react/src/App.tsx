import { useState } from 'react';
import { LayoutDashboard, Users as UsersIcon, CreditCard, Activity, Settings, Bell, ShieldCheck, Smartphone, Book } from 'lucide-react';
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
    return <div className="min-h-screen flex items-center justify-center bg-[#f6f8fa] text-[#57606a]">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f6f8fa]">
        <div className="mb-6 flex flex-col items-center gap-4">
          <ShieldCheck className="w-12 h-12 text-[#24292f]" />
          <h1 className="text-2xl tracking-tight text-[#24292f]">Sign in to NFCKey</h1>
        </div>
        <div className="bg-[#ffffff] p-6 rounded-md shadow-sm border border-[#d0d7de] w-80">
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && <div className="text-[#cf222e] text-sm p-3 bg-[#FFEBE9] border border-[#ff818266] rounded-md">{loginError}</div>}
            <div>
              <label className="block text-sm font-medium text-[#24292f] mb-1">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-3 py-1.5 border border-[#d0d7de] rounded-md focus:ring-2 focus:ring-[#0969da] focus:border-[#0969da] outline-none bg-[#f6f8fa] focus:bg-[#ffffff] text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#24292f] mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-3 py-1.5 border border-[#d0d7de] rounded-md focus:ring-2 focus:ring-[#0969da] focus:border-[#0969da] outline-none bg-[#f6f8fa] focus:bg-[#ffffff] text-sm" />
            </div>
            <button type="submit" className="w-full bg-[#2da44e] text-white py-1.5 rounded-md text-sm font-medium border border-[#2da44e] hover:bg-[#2c974b] transition">Sign in</button>
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
    <div className="min-h-screen bg-[#ffffff] flex flex-col font-[-apple-system,BlinkMacSystemFont,Segoe_UI,Helvetica,Arial,sans-serif]">
      {/* Global Header (Dark) */}
      <header className="h-16 bg-[#24292f] flex items-center justify-between px-6 flex-shrink-0 text-white">
        <div className="flex items-center gap-4">
          <ShieldCheck className="w-8 h-8 text-white" />
          
          <div className="relative w-64 ml-4">
            <input 
              type="text" 
              placeholder="Search or jump to..." 
              className="w-full pl-3 pr-3 py-1 bg-[#24292f] border border-[#57606a] rounded-md text-sm text-white focus:bg-white focus:text-[#24292f] focus:w-80 transition-all outline-none placeholder:text-[#8c959f]"
            />
          </div>

          <nav className="hidden md:flex items-center gap-4 text-sm font-semibold text-white ml-2">
            <a href="#" className="hover:text-[#c6cbd1]">Pull requests</a>
            <a href="#" className="hover:text-[#c6cbd1]">Issues</a>
            <a href="#" className="hover:text-[#c6cbd1]">Marketplace</a>
            <a href="#" className="hover:text-[#c6cbd1]">Explore</a>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Bell className="w-4 h-4 text-white cursor-pointer hover:text-[#c6cbd1] transition-colors" />
          </div>
          <div className="flex items-center gap-2 cursor-pointer relative group">
            <div className="w-5 h-5 bg-[#ffffff] rounded-full flex items-center justify-center text-[#24292f] font-bold text-xs overflow-hidden">
               <img src={`https://avatars.githubusercontent.com/u/1?v=4`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-medium">▼</span>
            
            {/* Dropdown for logout */}
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg border border-[#d0d7de] hidden group-hover:block z-50">
               <div className="px-4 py-2 border-b border-[#d0d7de] text-sm text-[#24292f]">
                 Signed in as <br /> <strong className="font-semibold">{user.name}</strong>
               </div>
               <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-[#24292f] hover:bg-[#0969da] hover:text-white transition-colors">
                 Sign out
               </button>
            </div>
          </div>
        </div>
      </header>

      {/* Repository Header area (Light) */}
      <div className="bg-[#f6f8fa] pt-4 border-b border-[#d0d7de]">
        <div className="px-6 pb-4 flex items-center gap-2 text-xl">
           <Book className="w-5 h-5 text-[#57606a]" />
           <span className="text-[#0969da] font-semibold cursor-pointer hover:underline">nfckey</span>
           <span className="text-[#57606a]">/</span>
           <span className="text-[#0969da] font-semibold cursor-pointer hover:underline">dashboard</span>
           <span className="px-2 py-0.5 border border-[#d0d7de] rounded-full text-xs text-[#57606a] font-medium ml-2">Public</span>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-2 px-6 overflow-x-auto">
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
        <div className="border border-[#d0d7de] rounded-md overflow-hidden bg-white">
          <div className="bg-[#f6f8fa] border-b border-[#d0d7de] px-4 py-3 flex items-center justify-between text-sm text-[#57606a] font-semibold">
             <div className="flex items-center gap-2">
                <img src={`https://avatars.githubusercontent.com/u/1?v=4`} alt="Avatar" className="w-5 h-5 rounded-full" />
                <span className="font-bold text-[#24292f]">{user.name}</span> updated the active view
             </div>
             <div>
                <span className="font-normal text-[#57606a]">Just now</span>
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
      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
        active 
          ? 'border-[#fd8c73] text-[#24292f] font-semibold' 
          : 'border-transparent text-[#57606a] hover:bg-[#d0d7de33] hover:text-[#24292f] rounded-t-md'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default App;
