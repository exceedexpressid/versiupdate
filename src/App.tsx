import React, { useState, useEffect } from 'react';
import { 
  Package, PlusCircle, Truck, Clock, Wallet, BarChart2, 
  MapPin, Phone, MessageCircle, CheckCircle, Search, 
  ArrowLeft, Send, Lock, User, RefreshCw, AlertTriangle, Camera
} from 'lucide-react';

// HELPER UNTUK LOCAL STORAGE (Menyimpan data di HP)
const loadLocal = (key: string, fallback: any) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
};

const formatTime = (dateObj: Date) => {
  return dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

// HELPER FORMAT NOMOR WA (Ubah 08... jadi 628...)
const formatWaNumber = (phone: string) => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, ''); 
  if (cleaned.startsWith('0')) {
    return '62' + cleaned.substring(1);
  }
  return cleaned;
};

const LiveHeader = ({ kurirName, onLogout }: { kurirName: string, onLogout: () => void }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-white px-5 py-4 shadow-sm z-10 relative flex justify-between items-center">
      <div><h1 className="text-sm text-gray-500">Hello,</h1><p className="text-lg font-black text-green-800">{kurirName}</p></div>
      <div className="text-right flex flex-col items-end">
        <p className="text-xl font-bold text-gray-800 font-mono">{formatTime(currentTime)}</p>
        <button onClick={onLogout} className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded mt-1">Logout</button>
      </div>
    </header>
  );
};

export default function App() {
  // --- URL SPREADSHEET ANDA ---
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyOZrrBFvKV_t3lgZssIBmNlCV6nim3RHougyRnUvTPunm05vhFbM3-KLN0aWsMkhQ/exec"; 

  // --- STATE APLIKASI (DISIMPAN DI HP) ---
  const [userProfile, setUserProfile] = useState<any>(() => loadLocal('exceed_userProfile', null));
  const [activeTab, setActiveTab] = useState('jemput');
  const [adminTab, setAdminTab] = useState('dashboard');
  const [isLoadingSync, setIsLoadingSync] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState('');
  
  const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const [adminDateFilter, setAdminDateFilter] = useState(todayStr);

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginMode, setLoginMode] = useState<'kurir' | 'admin'>('kurir'); 

  const [pickups, setPickups] = useState<any[]>(() => loadLocal('exceed_pickups', []));
  const [packages, setPackages] = useState<any[]>(() => loadLocal('exceed_packages', []));
  const [couriers, setCouriers] = useState<any[]>(() => loadLocal('exceed_couriers', [{ id: 'k1', kode: 'K-001', nama: 'Kurir Andi', phone: '08111' }]));
  const [olshops, setOlshops] = useState<any[]>(() => loadLocal('exceed_olshops', []));
  const [zones, setZones] = useState<any[]>(() => loadLocal('exceed_zones', []));
  
  const kurirName = userProfile ? userProfile.name : "";
  const kurirId = userProfile ? userProfile.id : "";

  // --- EFEK PENYIMPANAN OTOMATIS KE HP ---
  useEffect(() => { localStorage.setItem('exceed_userProfile', JSON.stringify(userProfile)); }, [userProfile]);
  useEffect(() => { localStorage.setItem('exceed_pickups', JSON.stringify(pickups)); }, [pickups]);
  useEffect(() => { localStorage.setItem('exceed_packages', JSON.stringify(packages)); }, [packages]);
  useEffect(() => { localStorage.setItem('exceed_couriers', JSON.stringify(couriers)); }, [couriers]);
  useEffect(() => { localStorage.setItem('exceed_olshops', JSON.stringify(olshops)); }, [olshops]);
  useEffect(() => { localStorage.setItem('exceed_zones', JSON.stringify(zones)); }, [zones]);

  // --- FUNGSI TARIK DATA DARI SPREADSHEET (GET) ---
  const tarikDataDariSpreadsheet = async () => {
    setIsLoadingSync(true);
    setLoginError('');
    setSyncSuccessMessage('');
    
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getInitData`, {
        method: 'GET',
        redirect: 'follow'
      });
      
      const textResponse = await response.text();
      
      try {
        const result = JSON.parse(textResponse);
        if (result.status === 'success' && result.data) {
          if (result.data.kurir && result.data.kurir.length > 0) setCouriers(result.data.kurir);
          if (result.data.zona && result.data.zona.length > 0) setZones(result.data.zona);
          if (result.data.olshop && result.data.olshop.length > 0) setOlshops(result.data.olshop);
          
          setSyncSuccessMessage(`Berhasil! Data tersinkronisasi dari Spreadsheet.`);
          setTimeout(() => setSyncSuccessMessage(''), 3000);
        } else if (result.status === 'error') {
          setLoginError(`Google Script Error: ${result.message}`);
        }
      } catch (parseError) {
        console.error("Response bukan JSON.", textResponse);
        setLoginError("Akses ditolak oleh Google. Pastikan setting deployment Google Script: 'Execute as: Me' dan 'Who has access: Anyone'.");
      }
    } catch (error: any) {
      setLoginError(`Gagal terhubung ke jaringan: ${error.message}.`);
    } finally {
      setIsLoadingSync(false);
    }
  };

  useEffect(() => {
    if (couriers.length <= 1) {
      tarikDataDariSpreadsheet();
    }
    // eslint-disable-next-line
  }, []);

  const simpanKeSpreadsheet = async (tipeData: string, data: any) => {
    try {
      fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: tipeData, ...data })
      });
    } catch (error) {
      console.error("Gagal mengirim data", error);
    }
  };

  const handleLogin = (e: any) => {
    e.preventDefault();
    setLoginError('');
    setSyncSuccessMessage('');

    const uname = loginUsername.trim();
    const pass = loginPassword.trim();

    if (loginMode === 'admin') {
      if (uname.toLowerCase() === 'admin' && pass === 'admin123') {
        setUserProfile({ role: 'admin', id: 'ADM-01', name: 'Admin Pusat' });
        setAdminTab('dashboard'); 
        setLoginUsername('');
        setLoginPassword('');
      } else {
        setLoginError('Username atau Password Admin salah!');
      }
    } else {
      const kurirDitemukan = couriers.find(k => 
        String(k.kode).trim().toLowerCase() === uname.toLowerCase() && 
        String(k.phone).trim() === pass
      );
      if (kurirDitemukan) {
        setUserProfile({ role: 'kurir', id: kurirDitemukan.kode, name: kurirDitemukan.nama });
        setActiveTab('jemput'); 
        setLoginUsername('');
        setLoginPassword('');
      } else {
        setLoginError('Kode Kurir atau No WA salah! (Pastikan Anda sudah klik Segarkan Koneksi)');
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
  };
  
  const getTodayDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // --- MENU COMPONENTS (KURIR) ---
  const TugasJemput = () => {
    const [selectedPickup, setSelectedPickup] = useState<any>(null);

    const handleUpdateStatus = (id: string, newStatus: string) => {
      setPickups(prev => prev.map(p => {
        if (p.id === id) {
          const updatedData = { ...p, status: newStatus };
          if (newStatus === 'taken' || newStatus === 'picked_up') updatedData.kurirId = kurirId;
          if (newStatus === 'pending') updatedData.kurirId = null; 
          simpanKeSpreadsheet('UpdateJemput', { id: p.id, status: newStatus, kurirId: updatedData.kurirId });
          return updatedData;
        }
        return p;
      }));
      setSelectedPickup(null);
    };

    const activePickups = pickups.filter(p => p.status !== 'picked_up' && (p.status === 'pending' || p.kurirId === kurirId));

    return (
      <div className="p-4 pb-24">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Tugas Jemput Hari Ini</h2>
        {selectedPickup ? (
          <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100">
            <button onClick={() => setSelectedPickup(null)} className="flex items-center text-green-700 mb-4 font-bold">
              <ArrowLeft size={18} className="mr-2" /> Kembali
            </button>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">{selectedPickup.olshopName}</h3>
            <div className="space-y-3 text-sm text-gray-600 mb-6">
              <p className="flex items-start"><MapPin size={18} className="text-red-500 mr-2 mt-0.5" /> {selectedPickup.address}</p>
              <p className="flex items-center"><Package size={18} className="text-green-600 mr-2" /> {selectedPickup.packageCount} Paket</p>
              <p className="flex items-center"><Phone size={18} className="text-green-500 mr-2" /> {selectedPickup.phone}</p>
            </div>
            {selectedPickup.status === 'pending' ? (
              <button onClick={() => handleUpdateStatus(selectedPickup.id, 'taken')} className="w-full bg-green-700 text-white font-bold py-3 rounded-lg hover:bg-green-800 shadow-md">Ambil Tugas</button>
            ) : selectedPickup.status === 'taken' ? (
              <div className="flex gap-2">
                <button onClick={() => handleUpdateStatus(selectedPickup.id, 'picked_up')} className="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 shadow-md">Sudah Dijemput</button>
                <button onClick={() => handleUpdateStatus(selectedPickup.id, 'pending')} className="flex-1 bg-red-100 text-red-600 font-bold py-3 rounded-lg hover:bg-red-200">Batalkan</button>
              </div>
            ) : (
               <div className="w-full bg-gray-100 text-green-600 font-bold py-3 rounded-lg text-center flex items-center justify-center"><CheckCircle size={18} className="mr-2" /> Selesai Dijemput</div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {activePickups.length === 0 && <p className="text-gray-500 text-center mt-10 font-medium">Belum ada tugas jemput yang terbuka.</p>}
            {activePickups.map(pickup => (
              <div key={pickup.id} onClick={() => setSelectedPickup(pickup)} className={`p-4 rounded-xl shadow-sm border cursor-pointer transition-all ${pickup.status === 'taken' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                <div className="flex justify-between items-center"><h3 className="font-bold text-gray-800 text-lg">{pickup.olshopName}</h3>{pickup.status === 'taken' && <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full font-bold">Tugas Anda</span>}</div>
                <p className="text-sm text-gray-500 mt-1 truncate">{pickup.address}</p>
                <p className="text-sm text-gray-600 mt-2 font-bold bg-gray-100 inline-block px-2 py-1 rounded-lg">{pickup.packageCount} Paket</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const InputPaket = () => {
    const defaultOngkir = zones.length > 0 ? zones[0].harga.toString() : "";
    const [formData, setFormData] = useState({
      olshopName: '', customerName: '', address: '', customerPhone: '',
      hargaPaket: '', ongkir: defaultOngkir, tambahanOngkir: '', adaTambahan: false, fotoPaket: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const totalTagihan = (Number(formData.hargaPaket) || 0) + (Number(formData.ongkir) || 0) + (formData.adaTambahan ? (Number(formData.tambahanOngkir) || 0) : 0);

    const handleSubmit = async (e: any) => {
      e.preventDefault();
      if (!formData.fotoPaket) {
        alert('Mohon ambil foto paket terlebih dahulu sebagai dokumentasi!');
        return;
      }

      setIsSubmitting(true);
      const newId = `EXC${Math.floor(100000 + Math.random() * 900000)}`;
      const newPackage = {
        id: generateId(),
        packageId: newId, olshopName: formData.olshopName, customerName: formData.customerName,
        address: formData.address, customerPhone: formData.customerPhone, hargaPaket: Number(formData.hargaPaket) || 0,
        ongkir: Number(formData.ongkir) || 0, tambahanOngkir: formData.adaTambahan ? (Number(formData.tambahanOngkir) || 0) : 0,
        totalTagihan: totalTagihan, kurirId: kurirId, status: 'siap_antar', timestamp: Date.now(),
        dateString: getTodayDateString(), metodeBayar: '', catatan: '', fotoPaket: formData.fotoPaket
      };

      setPackages(prev => [newPackage, ...prev]);
      simpanKeSpreadsheet('InputPaket', newPackage); 
      
      alert(`Paket ${newId} berhasil diinput!\nData sedang dikirim ke Spreadsheet Anda.`);
      
      setFormData({ olshopName: '', customerName: '', address: '', customerPhone: '', hargaPaket: '', ongkir: defaultOngkir, tambahanOngkir: '', adaTambahan: false, fotoPaket: '' });
      setIsSubmitting(false);
      setActiveTab('antar');
    };

    return (
      <div className="p-4 pb-24">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center"><PlusCircle className="text-green-700 mr-2" size={24} /> Input Paket Baru</h2>
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div><label className="block text-xs font-bold text-gray-500 mb-1">ID PAKET</label><input type="text" value="(Otomatis)" disabled className="w-full p-3 bg-gray-100 rounded-lg text-gray-500 text-sm border border-gray-200" /></div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Nama Olshop</label>
            <input type="text" list="olshops_list" required value={formData.olshopName} onChange={(e) => setFormData({...formData, olshopName: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-700 outline-none" placeholder="Ketik atau pilih olshop" />
            <datalist id="olshops_list">{olshops.map(o => <option key={o.id} value={o.nama} />)}</datalist>
          </div>
          <div><label className="block text-xs font-bold text-gray-500 mb-1">Nama Customer</label><input type="text" required value={formData.customerName} onChange={(e) => setFormData({...formData, customerName: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-700 outline-none" /></div>
          <div><label className="block text-xs font-bold text-gray-500 mb-1">Alamat Lengkap</label><textarea required rows={2} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-700 outline-none"></textarea></div>
          <div><label className="block text-xs font-bold text-gray-500 mb-1">Nomor HP Customer</label><input type="tel" required value={formData.customerPhone} onChange={(e) => setFormData({...formData, customerPhone: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-700 outline-none" placeholder="08..." /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-gray-500 mb-1">Harga Paket (Rp)</label><input type="number" required value={formData.hargaPaket} onChange={(e) => setFormData({...formData, hargaPaket: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-700 outline-none" placeholder="0" /></div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Ongkir Dasar</label>
              <select value={formData.ongkir} onChange={(e) => setFormData({...formData, ongkir: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-700 outline-none bg-white">
                {zones.length === 0 && <option value="">Belum ada Master Zona</option>}
                {zones.map(z => <option key={z.id} value={z.harga}>{z.nama} (Rp {z.harga.toLocaleString('id-ID')})</option>)}
              </select>
            </div>
          </div>
          <div className="border border-gray-200 p-3 rounded-lg">
            <label className="flex items-center text-sm font-bold text-gray-700 mb-2 cursor-pointer">
              <input type="checkbox" className="mr-2 w-4 h-4 text-green-700" checked={formData.adaTambahan} onChange={(e) => setFormData({...formData, adaTambahan: e.target.checked})} /> Ada Tambahan Ongkir / Volume?
            </label>
            {formData.adaTambahan && <input type="number" placeholder="Nominal (Rp)" required={formData.adaTambahan} value={formData.tambahanOngkir} onChange={(e) => setFormData({...formData, tambahanOngkir: e.target.value})} className="w-full p-3 mt-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-700 outline-none" />}
          </div>

          {/* FITUR DOKUMENTASI FOTO */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Foto Paket (Wajib)</label>
            {formData.fotoPaket ? (
              <div className="relative">
                <img src={formData.fotoPaket} alt="Preview Paket" className="w-full h-40 object-cover rounded-lg border border-gray-300 shadow-sm" />
                <label htmlFor="foto-upload" className="absolute bottom-2 right-2 bg-white p-3 rounded-full shadow-lg cursor-pointer hover:bg-gray-100 transition-all border border-gray-200">
                  <Camera size={20} className="text-green-700" />
                </label>
              </div>
            ) : (
              <label htmlFor="foto-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-green-50 hover:border-green-400 transition-all">
                <Camera size={32} className="text-gray-400 mb-2" />
                <span className="text-sm text-gray-500 font-bold">Ambil Foto / Upload Foto</span>
              </label>
            )}
            <input id="foto-upload" type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const file = e.target.files && e.target.files[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setFormData({...formData, fotoPaket: reader.result as string}); reader.readAsDataURL(file); } }} />
          </div>

          <div className="bg-green-50 p-4 rounded-lg flex justify-between items-center"><span className="font-bold text-green-900">Total Tagihan:</span><span className="text-xl font-black text-green-800">{formatCurrency(totalTagihan)}</span></div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-green-700 text-white font-bold py-4 rounded-lg shadow-lg hover:bg-green-800 flex justify-center items-center">{isSubmitting ? 'Menyimpan...' : 'Submit (Siap Antar)'} <Send size={18} className="ml-2" /></button>
        </form>
      </div>
    );
  };

  const ListAntar = () => {
    const [selectedPkg, setSelectedPkg] = useState<any>(null);
    const [updateForm, setUpdateForm] = useState({ status: 'Sukses', metodeBayar: 'Cash', catatan: '' });
    const antaran = packages.filter(p => (p.status === 'siap_antar' || p.status === 'pending') && p.kurirId === kurirId);

    const openModal = (pkg: any) => { setSelectedPkg(pkg); setUpdateForm({ status: 'Sukses', metodeBayar: pkg.metodeBayar || 'Cash', catatan: pkg.catatan || '' }); };

    const handleUpdate = () => {
      const updatedData = { status: updateForm.status.toLowerCase(), metodeBayar: updateForm.metodeBayar, catatan: updateForm.catatan, updatedAt: Date.now() };
      setPackages(prev => prev.map(p => p.id === selectedPkg.id ? { ...p, ...updatedData } : p));
      simpanKeSpreadsheet('UpdateStatus', { packageId: selectedPkg.packageId, ...updatedData }); 
      alert(`Status diupdate!\n(Data dikirim ke Spreadsheet)`);
      setSelectedPkg(null);
    };

    if (selectedPkg) {
      return (
        <div className="p-4 pb-24">
          <button onClick={() => setSelectedPkg(null)} className="flex items-center font-bold text-green-700 mb-4 bg-white px-3 py-2 rounded-lg shadow-sm"><ArrowLeft size={18} className="mr-2" /> Kembali</button>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-800 p-4 text-white flex justify-between items-center"><div><p className="text-xs text-gray-400">ID PAKET</p><p className="font-mono font-bold text-lg">{selectedPkg.packageId}</p></div><div className="text-right"><p className="text-xs text-gray-400">TAGIHAN</p><p className="font-bold text-lg text-green-400">{formatCurrency(selectedPkg.totalTagihan)}</p></div></div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm border-b pb-3 border-gray-100">
                <div><span className="text-gray-500 block text-xs">Olshop</span> <span className="font-semibold">{selectedPkg.olshopName}</span></div>
                <div><span className="text-gray-500 block text-xs">Customer</span> <span className="font-semibold">{selectedPkg.customerName}</span></div>
                <div className="col-span-2"><span className="text-gray-500 block text-xs">Alamat</span> {selectedPkg.address}</div>
              </div>
              <div className="pt-2 space-y-4">
                <h4 className="font-bold text-gray-800 border-l-4 border-green-600 pl-2">Update Status</h4>
                <select value={updateForm.status} onChange={(e) => setUpdateForm({...updateForm, status: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 font-bold outline-none"><option value="Sukses">Sukses Diantar</option><option value="Pending">Pending (Reschedule)</option><option value="Cancel">Cancel (Retur)</option></select>
                {updateForm.status === 'Sukses' && (
                  <div className="grid grid-cols-3 gap-2">{['Cash', 'TF Kantor', 'TF Olshop'].map(m => <button key={m} onClick={() => setUpdateForm({...updateForm, metodeBayar: m})} className={`p-2 text-sm rounded-lg border ${updateForm.metodeBayar === m ? 'bg-green-100 border-green-600 text-green-800 font-bold' : 'bg-white'}`}>{m}</button>)}</div>
                )}
                {(updateForm.status === 'Pending' || updateForm.status === 'Cancel') && <textarea required value={updateForm.catatan} onChange={(e) => setUpdateForm({...updateForm, catatan: e.target.value})} placeholder="Alasan..." className="w-full p-3 border border-red-300 rounded-lg outline-none"></textarea>}
                <button onClick={handleUpdate} className={`w-full font-bold py-4 rounded-lg text-white ${updateForm.status === 'Sukses' ? 'bg-green-600' : 'bg-orange-500'}`}>Submit Status</button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 pb-24">
        <h2 className="text-xl font-bold text-gray-800 flex items-center mb-4"><Truck className="text-green-700 mr-2" size={24} /> List Antar</h2>
        <div className="space-y-4">
          {antaran.length === 0 && <p className="text-center py-10 text-gray-500">Tidak ada paket siap antar.</p>}
          {antaran.map(pkg => (
            <div key={pkg.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 cursor-pointer flex items-start" onClick={() => openModal(pkg)}>
                {pkg.fotoPaket ? (
                  <img src={pkg.fotoPaket} alt="Paket" className="w-14 h-14 object-cover rounded-lg mr-4 border border-gray-200 shadow-sm" />
                ) : (
                  <div className="bg-green-100 p-3 rounded-lg mr-4 flex items-center justify-center w-14 h-14"><Package className="text-green-700" size={24} /></div>
                )}
                <div className="flex-1"><p className="font-mono font-bold text-gray-800 text-sm">{pkg.packageId}</p><h3 className="font-bold text-lg leading-tight mt-1">{pkg.customerName}</h3><p className="text-xs text-gray-500 mt-1 line-clamp-1">{pkg.address}</p><p className="text-sm font-bold text-green-700 mt-2">{formatCurrency(pkg.totalTagihan)}</p></div>
              </div>
              <div className="flex border-t border-gray-100">
                <a href={`https://wa.me/${formatWaNumber(pkg.customerPhone)}`} target="_blank" rel="noreferrer" className="flex-1 py-3 text-center text-green-600 flex justify-center items-center font-bold border-r"><MessageCircle size={18} className="mr-2" /> WhatsApp</a>
                <a href={`tel:${pkg.customerPhone}`} className="flex-1 py-3 text-center text-green-700 flex justify-center items-center font-bold"><Phone size={18} className="mr-2" /> Telepon</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const Riwayat = () => {
    const [filterDate, setFilterDate] = useState(getTodayDateString());
    const riwayatList = packages.filter(p => (p.status === 'sukses' || p.status === 'cancel' || p.status === 'pending') && p.dateString === filterDate && p.kurirId === kurirId);
    return (
      <div className="p-4 pb-24">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center"><Clock className="text-green-700 mr-2" size={24} /> Riwayat Paket</h2>
        <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full bg-white p-3 rounded-lg shadow-sm border border-gray-100 mb-4 font-medium outline-none" />
        <div className="space-y-3">
          {riwayatList.map(pkg => (
            <div key={pkg.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2"><div><p className="font-mono text-xs text-gray-500">{pkg.packageId}</p><p className="font-bold text-gray-800">{pkg.customerName}</p></div><span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${pkg.status==='sukses'?'bg-green-100 text-green-600':pkg.status==='cancel'?'bg-red-100 text-red-600':'bg-orange-100 text-orange-600'}`}>{pkg.status}</span></div>
              <div className="flex justify-between items-end mt-3 text-sm"><div className="text-gray-500 text-xs"><p>{pkg.olshopName}</p></div><p className="font-bold">{formatCurrency(pkg.totalTagihan)}</p></div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const Setoran = () => {
    const todaysPackages = packages.filter(p => p.dateString === getTodayDateString() && p.status === 'sukses' && p.kurirId === kurirId);
    let totalCashCOD = todaysPackages.filter(p => p.metodeBayar === 'Cash').reduce((acc, curr) => acc + curr.totalTagihan, 0);
    return (
      <div className="p-4 pb-24">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center"><Wallet className="text-green-700 mr-2" size={24} /> Setoran Hari Ini</h2>
        <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-6 text-white shadow-lg mb-6"><p className="text-green-100 text-sm mb-1">Total Setoran Tunai (Cash)</p><h1 className="text-4xl font-black mb-4">{formatCurrency(totalCashCOD)}</h1></div>
        <div className="space-y-2">
          {todaysPackages.filter(p => p.metodeBayar === 'Cash').map(pkg => (
            <div key={pkg.id} className="bg-white p-3 rounded-lg border border-gray-100 flex justify-between items-center"><div><p className="font-mono text-xs text-gray-500">{pkg.packageId}</p><p className="text-sm font-bold text-gray-800">{pkg.customerName}</p></div><p className="font-bold text-green-600">{formatCurrency(pkg.totalTagihan)}</p></div>
          ))}
        </div>
      </div>
    );
  };

  const Dashboard = () => {
    const todaysPackages = packages.filter(p => p.dateString === getTodayDateString() && p.kurirId === kurirId);
    const [totalAntar, totalSukses] = [todaysPackages.length, todaysPackages.filter(p => p.status === 'sukses').length];
    return (
      <div className="p-4 pb-24">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center"><BarChart2 className="text-green-700 mr-2" size={24} /> Performa Hari Ini</h2>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-4 text-center">
          <p className="text-gray-500 text-sm font-bold mb-2">Total Paket Dipegang: {totalAntar}</p>
          <p className="text-3xl font-black text-green-700">{totalSukses} Sukses</p>
        </div>
      </div>
    );
  };

  // --- RENDERING TAMPILAN LOGIN ---
  if (!userProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-64 bg-green-800 rounded-b-[40px] shadow-lg"></div>

        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm text-center relative z-10 border border-gray-100 mt-10">
          <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-green-800 shadow-inner">
             <Truck size={40} />
          </div>
          <h1 className="text-3xl font-black text-gray-800 mb-1 tracking-tight">Exceed Express</h1>
          <p className="text-sm text-gray-500 mb-8 font-medium">Portal Operasional Logistik</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="bg-red-50 text-red-600 text-xs py-3 px-3 rounded-xl border border-red-100 font-bold mb-4 flex items-start text-left">
                <AlertTriangle size={16} className="mr-2 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}
            
            {syncSuccessMessage && (
              <div className="bg-green-50 text-green-700 text-xs py-3 px-3 rounded-xl border border-green-100 font-bold mb-4 flex items-center justify-center">
                <CheckCircle size={16} className="mr-2" />
                <span>{syncSuccessMessage}</span>
              </div>
            )}

            <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
              <button type="button" onClick={() => {setLoginMode('kurir'); setLoginError('');}} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${loginMode === 'kurir' ? 'bg-white text-green-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Kurir Lapangan</button>
              <button type="button" onClick={() => {setLoginMode('admin'); setLoginError('');}} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${loginMode === 'admin' ? 'bg-white text-green-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Admin Pusat</button>
            </div>

            <div className="relative">
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" size={20} />
              <input 
                type="text" 
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder={loginMode === 'admin' ? "Username Admin (ex: admin)" : "Kode Kurir (ex: K-001)"} 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-800 focus:bg-white transition-all font-medium" 
                disabled={isLoadingSync}
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" size={20} />
              <input 
                type="password" 
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder={loginMode === 'admin' ? "Password Admin" : "Nomor WA Kurir"} 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-800 focus:bg-white transition-all font-medium" 
                disabled={isLoadingSync}
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoadingSync}
              className={`w-full text-white font-bold py-4 rounded-xl shadow-lg transition-all transform active:scale-95 mt-2 flex justify-center items-center ${isLoadingSync ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-green-800 hover:bg-green-700 shadow-green-800/30 hover:shadow-green-800/40'}`}
            >
              {isLoadingSync ? (
                <><RefreshCw size={18} className="animate-spin mr-2" /> Menghubungkan...</>
              ) : 'Masuk ke Portal'}
            </button>
          </form>
          
          <button onClick={tarikDataDariSpreadsheet} className="mt-6 text-xs text-green-700 hover:text-green-900 font-bold flex items-center justify-center w-full bg-green-50 py-2 rounded-lg">
            <RefreshCw size={12} className={`mr-2 ${isLoadingSync ? 'animate-spin' : ''}`} /> 
            {isLoadingSync ? 'Menarik Data...' : 'Segarkan Koneksi Data'}
          </button>
        </div>
      </div>
    );
  }

  // --- RENDERING TAMPILAN ADMIN ---
  if (userProfile.role === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 font-sans max-w-md mx-auto shadow-2xl relative flex flex-col">
        <header className="bg-gray-800 px-5 py-4 shadow-sm text-white flex justify-between items-center z-10">
          <div><h1 className="text-sm text-gray-400">Portal</h1><p className="text-lg font-black">Admin Pusat</p></div>
          <button onClick={() => setUserProfile(null)} className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg font-bold">Logout</button>
        </header>
        <div className="flex bg-white shadow-sm border-b overflow-x-auto z-10">
          {['dashboard', 'jemput', 'kurir', 'olshop', 'zona'].map(tab => (
            <button key={tab} onClick={() => setAdminTab(tab)} className={`flex-1 px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 ${adminTab === tab ? 'border-green-800 text-green-800' : 'border-transparent text-gray-500'}`}>{tab.toUpperCase()}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4 pb-10">
          {adminTab === 'dashboard' && (() => {
            const filteredPkgs = packages.filter(p => p.dateString === adminDateFilter);
            const totalInput = filteredPkgs.length;
            const totalSukses = filteredPkgs.filter(p => p.status === 'sukses').length;
            const totalCancel = filteredPkgs.filter(p => p.status === 'cancel').length;
            const totalPending = filteredPkgs.filter(p => p.status === 'pending').length;
            const totalOngkir = filteredPkgs.reduce((sum, p) => sum + (p.ongkir || 0) + (p.tambahanOngkir || 0), 0);
            const totalCOD = filteredPkgs.filter(p => p.metodeBayar === 'Cash' && p.status === 'sukses').reduce((sum, p) => sum + p.totalTagihan, 0);

            return (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Data Global Admin</h2>
                  <input type="date" value={adminDateFilter} onChange={(e) => setAdminDateFilter(e.target.value)} className="p-2 border rounded-lg text-sm outline-none font-bold text-green-700 bg-white shadow-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-center"><p className="text-2xl font-black text-gray-700">{totalInput}</p><p className="text-[10px] text-gray-500 font-bold mt-1">TOTAL INPUT</p></div>
                  <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-center"><p className="text-2xl font-black text-green-600">{totalSukses}</p><p className="text-[10px] text-gray-500 font-bold mt-1">TOTAL SUKSES</p></div>
                  <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-center"><p className="text-2xl font-black text-orange-500">{totalPending}</p><p className="text-[10px] text-gray-500 font-bold mt-1">TOTAL PENDING</p></div>
                  <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-center"><p className="text-2xl font-black text-red-600">{totalCancel}</p><p className="text-[10px] text-gray-500 font-bold mt-1">TOTAL CANCEL</p></div>
                  <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200 shadow-sm col-span-2 flex justify-between items-center">
                    <div className="text-left"><p className="text-[10px] text-green-900 font-bold">TOTAL ONGKIR</p><p className="text-lg font-black text-green-900">{formatCurrency(totalOngkir)}</p></div>
                    <div className="text-right"><p className="text-[10px] text-green-700 font-bold">TOTAL NILAI COD</p><p className="text-lg font-black text-green-700">{formatCurrency(totalCOD)}</p></div>
                  </div>
                </div>
                <div className="space-y-3">
                  {filteredPkgs.map(pkg => (
                     <div key={pkg.id} className="bg-white p-4 rounded-xl border flex justify-between items-center shadow-sm">
                       <div><p className="font-bold text-sm">{pkg.packageId}</p><p className="text-xs text-green-600 font-bold">{pkg.kurirId || 'Belum Diantar'}</p></div>
                       <div className="text-right"><p className="text-sm font-bold mb-1">{formatCurrency(pkg.totalTagihan)}</p><span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${pkg.status==='sukses'?'bg-green-100 text-green-600':pkg.status==='cancel'?'bg-red-100 text-red-600':pkg.status==='pending'?'bg-orange-100 text-orange-600':'bg-gray-100 text-gray-600'}`}>{pkg.status.toUpperCase()}</span></div>
                     </div>
                  ))}
                  {filteredPkgs.length === 0 && <p className="text-center py-6 text-gray-500 text-sm border border-dashed rounded-xl bg-gray-50">Tidak ada data paket untuk tanggal ini.</p>}
                </div>
              </div>
            );
          })()}
          {adminTab === 'jemput' && (
            <div>
              <form onSubmit={(e: any) => { e.preventDefault(); const fd = new FormData(e.target); const data = { id: generateId(), olshopName: fd.get('olshopName'), address: fd.get('address'), phone: fd.get('phone'), packageCount: Number(fd.get('packageCount')), status: 'pending', kurirId: null }; setPickups([data, ...pickups]); simpanKeSpreadsheet('TambahJemput', data); e.target.reset(); alert('Tugas Jemput berhasil di-publish ke semua kurir!'); }} className="bg-white p-5 rounded-xl shadow-sm border mb-6 space-y-4">
                <p className="font-bold text-sm text-green-800 bg-green-50 p-2 text-center rounded">Buat Tugas Jemput (Broadcast)</p>
                <input name="olshopName" list="admin_olshops_list" required placeholder="Nama Olshop" className="w-full p-3 border rounded-lg text-sm" onChange={(e: any) => { const found = olshops.find(o => o.nama === e.target.value); if (found) { (document.querySelector('textarea[name="address"]') as any).value = found.alamat; (document.querySelector('input[name="phone"]') as any).value = found.phone; } }} />
                <datalist id="admin_olshops_list">{olshops.map(o => <option key={o.id} value={o.nama} />)}</datalist>
                <textarea name="address" required placeholder="Alamat Penjemputan" className="w-full p-3 border rounded-lg text-sm"></textarea>
                <input name="phone" required placeholder="No. WA Olshop" className="w-full p-3 border rounded-lg text-sm" />
                <input name="packageCount" type="number" required placeholder="Estimasi Jumlah Paket (Angka)" className="w-full p-3 border rounded-lg text-sm" />
                <button type="submit" className="w-full bg-green-800 hover:bg-green-700 text-white font-bold py-3 rounded-lg text-sm flex justify-center items-center"><Send size={16} className="mr-2" /> Publish Tugas</button>
              </form>
              <div className="space-y-3">
                <h3 className="font-bold text-gray-800 text-sm mb-2">Daftar Tugas Jemput Aktif</h3>
                {pickups.filter(p => p.status !== 'picked_up').map(p => (
                  <div key={p.id} className="bg-white p-4 rounded-xl border flex flex-col">
                    <div className="flex justify-between items-center mb-1"><p className="font-bold text-gray-800">{p.olshopName}</p><span className={`text-[10px] font-bold px-2 py-1 rounded-full ${p.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>{p.status === 'pending' ? 'TERBUKA' : 'DIAMBIL'}</span></div>
                    <p className="text-xs text-gray-500 mb-2">{p.address} • <span className="font-bold">{p.packageCount} Paket</span></p>
                    {p.status === 'taken' && <p className="text-xs bg-green-50 text-green-700 p-1.5 rounded font-bold inline-block self-start">Kurir: {p.kurirId}</p>}
                  </div>
                ))}
                {pickups.filter(p => p.status !== 'picked_up').length === 0 && <p className="text-sm text-gray-500 text-center py-4 border rounded-xl border-dashed">Belum ada tugas aktif</p>}
              </div>
            </div>
          )}
          {adminTab === 'kurir' && (
            <div>
              <form onSubmit={(e: any) => { e.preventDefault(); const fd = new FormData(e.target); const data = { id: generateId(), kode: fd.get('kode'), nama: fd.get('nama'), phone: fd.get('phone') }; setCouriers([...couriers, data]); simpanKeSpreadsheet('Kurir', data); e.target.reset(); alert('Kurir baru berhasil dibuat! Data dikirim ke Spreadsheet.'); }} className="bg-white p-5 rounded-xl shadow-sm border mb-6 space-y-4">
                <p className="font-bold text-sm text-green-800 bg-green-50 p-2 text-center rounded">Tambah Kurir</p>
                <input name="kode" required placeholder="Kode Username (contoh: K-003)" className="w-full p-3 border rounded-lg text-sm" />
                <input name="nama" required placeholder="Nama Lengkap Kurir" className="w-full p-3 border rounded-lg text-sm" />
                <input name="phone" required placeholder="No. WA (Gunakan sebagai Password)" className="w-full p-3 border rounded-lg text-sm" />
                <button type="submit" className="w-full bg-gray-800 text-white font-bold py-3 rounded-lg text-sm">Simpan Kurir</button>
              </form>
              <div className="space-y-3">{couriers.map(k => <div key={k.id} className="bg-white p-4 rounded-xl border"><p className="font-bold text-lg">{k.nama}</p><p className="text-xs text-gray-600">User: <span className="font-mono font-bold text-green-600">{k.kode}</span> | Pass: <span className="font-mono font-bold text-gray-800">{k.phone}</span></p></div>)}</div>
            </div>
          )}
          {adminTab === 'olshop' && (
            <div>
              <form onSubmit={(e: any) => { e.preventDefault(); const fd = new FormData(e.target); const data = { id: generateId(), nama: fd.get('nama'), alamat: fd.get('alamat'), phone: fd.get('phone') }; setOlshops([...olshops, data]); simpanKeSpreadsheet('Olshop', data); e.target.reset(); alert('Data Olshop dikirim ke Spreadsheet!'); }} className="bg-white p-5 rounded-xl shadow-sm border mb-6 space-y-4">
                <p className="font-bold text-sm text-green-800 bg-green-50 p-2 text-center rounded">Tambah Olshop</p>
                <input name="nama" required placeholder="Nama" className="w-full p-3 border rounded-lg text-sm" />
                <textarea name="alamat" required placeholder="Alamat" className="w-full p-3 border rounded-lg text-sm"></textarea>
                <input name="phone" required placeholder="No. WA" className="w-full p-3 border rounded-lg text-sm" />
                <button type="submit" className="w-full bg-gray-800 text-white font-bold py-3 rounded-lg text-sm">Simpan</button>
              </form>
              <div className="space-y-3">{olshops.map(o => <div key={o.id} className="bg-white p-4 rounded-xl border"><p className="font-bold">{o.nama}</p><p className="text-xs">{o.alamat}</p></div>)}</div>
            </div>
          )}
          {adminTab === 'zona' && (
            <div>
              <form onSubmit={(e: any) => { e.preventDefault(); const fd = new FormData(e.target); const data = { id: generateId(), nama: fd.get('nama'), harga: Number(fd.get('harga')) }; setZones([...zones, data]); simpanKeSpreadsheet('Zona', data); e.target.reset(); alert('Data Zona dikirim ke Spreadsheet!'); }} className="bg-white p-5 rounded-xl shadow-sm border mb-6 space-y-4">
                <p className="font-bold text-sm text-green-800 bg-green-50 p-2 text-center rounded">Tambah Zona</p>
                <input name="nama" required placeholder="Nama Zona" className="w-full p-3 border rounded-lg text-sm" />
                <input name="harga" type="number" required placeholder="Harga (15000)" className="w-full p-3 border rounded-lg text-sm" />
                <button type="submit" className="w-full bg-gray-800 text-white font-bold py-3 rounded-lg text-sm">Simpan</button>
              </form>
              <div className="space-y-3">{zones.map(z => <div key={z.id} className="bg-white p-4 rounded-xl border flex justify-between"><p className="font-bold">{z.nama}</p><p className="font-black text-green-600">{formatCurrency(z.harga)}</p></div>)}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- RENDERING TAMPILAN KURIR ---
  const tabButtons = [
    { id: 'jemput', icon: <MapPin size={20} />, label: 'Jemput' },
    { id: 'input', icon: <PlusCircle size={20} />, label: 'Input' },
    { id: 'antar', icon: <Truck size={20} />, label: 'Antar', badge: packages.filter(p => (p.status === 'siap_antar' || p.status === 'pending') && p.kurirId === kurirId).length },
    { id: 'riwayat', icon: <Clock size={20} />, label: 'Riwayat' },
    { id: 'setoran', icon: <Wallet size={20} />, label: 'Setoran' },
    { id: 'dashboard', icon: <BarChart2 size={20} />, label: 'Stats' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans max-w-md mx-auto shadow-2xl relative overflow-hidden flex flex-col">
      <LiveHeader kurirName={kurirName} onLogout={() => setUserProfile(null)} />
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'jemput' && <TugasJemput />}
        {activeTab === 'input' && <InputPaket />}
        {activeTab === 'antar' && <ListAntar />}
        {activeTab === 'riwayat' && <Riwayat />}
        {activeTab === 'setoran' && <Setoran />}
        {activeTab === 'dashboard' && <Dashboard />}
      </main>
      <nav className="w-full max-w-md bg-white border-t flex justify-between px-2 py-2 shadow z-50">
        {tabButtons.map(btn => (
          <button key={btn.id} onClick={() => setActiveTab(btn.id)} className={`flex flex-col items-center justify-center w-full py-2 relative rounded-lg ${activeTab === btn.id ? 'text-green-800 bg-green-50' : 'text-gray-400'}`}>
            <div className="relative">{btn.icon}{btn.badge ? <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{btn.badge}</span> : null}</div>
            <span className={`text-[10px] mt-1 ${activeTab === btn.id ? 'font-bold' : 'font-medium'}`}>{btn.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
} 