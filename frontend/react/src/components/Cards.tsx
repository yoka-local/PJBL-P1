import { Plus, CreditCard, PowerOff } from 'lucide-react';

export default function Cards() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Manajemen Kartu</h2>
          <p className="text-slate-500 mt-1">Registrasi kartu NFC baru dan atur status aktif/blokir.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
          <Plus className="w-4 h-4" /> Daftarkan Kartu
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sample Card UI for demonstration */}
        {[
          { uid: 'A1:B2:C3:D4', owner: 'Budi Santoso', role: 'Pegawai (Shift Pagi)', active: true },
          { uid: 'E5:F6:G7:H8', owner: 'Pak Manajer', role: 'Admin (24/7)', active: true },
          { uid: 'X9:Y8:Z7:W6', owner: '-', role: 'Unassigned', active: false },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                <CreditCard className={`w-6 h-6 ${card.active ? 'text-primary' : 'text-slate-400'}`} />
              </div>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${card.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {card.active ? 'Aktif' : 'Diblokir'}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">UID Kartu</p>
              <p className="text-lg font-mono text-slate-800 mb-4">{card.uid}</p>
              
              <div className="flex justify-between items-end pt-4 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-400">Pemilik</p>
                  <p className="font-medium text-slate-700">{card.owner}</p>
                  <p className="text-xs text-slate-500">{card.role}</p>
                </div>
                <button className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Nonaktifkan Kartu">
                  <PowerOff className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
