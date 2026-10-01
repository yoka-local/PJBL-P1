import { useState } from 'react';
import { LayoutDashboard, Users, CreditCard, Activity, DoorOpen, Settings, Bell, Search, ShieldCheck } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-6 flex items-center gap-3 text-white border-b border-slate-800">
          <ShieldCheck className="w-8 h-8 text-primary" />
          <h1 className="text-xl font-bold tracking-wider">NexusGate</h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <NavItem icon={<LayoutDashboard />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<Activity />} label="Log Absensi" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
          <NavItem icon={<Users />} label="Data Siswa" active={activeTab === 'students'} onClick={() => setActiveTab('students')} />
          <NavItem icon={<CreditCard />} label="Kartu Akses" active={activeTab === 'cards'} onClick={() => setActiveTab('cards')} />
          <NavItem icon={<Settings />} label="Pengaturan" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8">
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
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
            </div>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-700">Admin Sekolah</p>
                <p className="text-xs text-slate-500">Administrator</p>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                A
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Overview Hari Ini</h2>
              <p className="text-slate-500 mt-1">Pantau status akses pintu dan kehadiran siswa secara real-time.</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Status Perangkat</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-medium text-slate-700">Online (Terhubung)</span>
              </div>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard title="Total Hadir" value="342" subtitle="Siswa" color="text-green-600" bg="bg-green-100" />
            <StatCard title="Terlambat" value="12" subtitle="Siswa" color="text-yellow-600" bg="bg-yellow-100" />
            <StatCard title="Kartu Ditolak" value="3" subtitle="Percobaan" color="text-red-600" bg="bg-red-100" />
            <StatCard title="Status Pintu" value="Terkunci" subtitle="Aman" icon={<DoorOpen className="w-6 h-6 text-primary" />} color="text-primary" bg="bg-primary/10" />
          </div>

          {/* Recent Logs Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">Aktivitas Akses Terbaru</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm">
                    <th className="px-6 py-3 font-medium">Waktu</th>
                    <th className="px-6 py-3 font-medium">Nama Siswa</th>
                    <th className="px-6 py-3 font-medium">Kelas</th>
                    <th className="px-6 py-3 font-medium">UID Kartu</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  <TableRow time="07:14:22" name="Budi Santoso" class_="XI-RPL-1" uid="A1:B2:C3:D4" status="Diterima" />
                  <TableRow time="07:15:05" name="Siti Aminah" class_="XI-TKJ-2" uid="E5:F6:G7:H8" status="Diterima" />
                  <TableRow time="07:22:11" name="Tidak Dikenal" class_="-" uid="X9:Y8:Z7:W6" status="Ditolak" />
                  <TableRow time="07:25:30" name="Andi Wijaya" class_="X-RPL-2" uid="12:34:56:78" status="Diterima" />
                </tbody>
              </table>
            </div>
          </div>
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
      <td className="px-6 py-4 text-slate-500">{time}</td>
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

export default App;
