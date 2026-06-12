import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, X, Loader2, FileText, Clock, Box, ClipboardList, AlertCircle, CheckCircle, Trash2, MessageCircle } from 'lucide-react';
import { api } from '../services/api';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState('admin');
  const [userName, setUserName] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [newLha, setNewLha] = useState('');
  const [newItem, setNewItem] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUserRole(parsed.role || 'admin');
      setUserName(parsed.name || parsed.nik || 'Unknown');
    }
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const data = await api.getTransactions();
      // data might not be an array if there's an error
      if (Array.isArray(data)) {
        setTransactions(data.reverse()); // Show newest first
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLha = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.createTransaction(newLha, newItem, userName);
      if (res.success) {
        setIsModalOpen(false);
        setNewLha('');
        setNewItem('');
        setIsLoading(true);
        fetchTransactions();
      } else {
        alert('Gagal membuat LHA');
      }
    } catch (error) {
      alert('Kesalahan jaringan saat membuat LHA');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBroadcastH1 = async () => {
    try {
      const STAGE_SLA = {
        'LHA Reject to PPIC': { prev: 'Pembuatan LHA Reject', days: 3, role: 'qc' },
        'Input SKR': { prev: 'LHA Reject to PPIC', days: 5, role: 'ppic' },
        'Harga dari Accounting': { prev: 'Input SKR', days: 3, role: 'ppic' },
        'Approval Supplier': { prev: 'Harga dari Accounting', days: 5, role: 'ppic' },
        'Pembuatan PO': { prev: 'Approval Supplier', days: 3, role: 'ppic' },
        'Muat Return': { prev: 'Pembuatan PO', days: 21, role: 'wh' }
      };

      const STAGES = [
        'Pembuatan LHA Reject',
        'LHA Reject to PPIC',
        'Input SKR',
        'Harga dari Accounting',
        'Approval Supplier',
        'Pembuatan PO',
        'Muat Return'
      ];

      const warningTxs = [];
      const rolesNeeded = new Set();
      const now = new Date();
      
      transactions.forEach(t => {
        if (t.history && t.history['Muat Return']) return;
        const nextStage = STAGES.find(s => !t.history || !t.history[s]);
        if (!nextStage) return;

        const slaConfig = STAGE_SLA[nextStage];
        if (slaConfig) {
          const prevStageDateStr = t.history[slaConfig.prev]?.date;
          if (prevStageDateStr) {
            const prevDate = new Date(prevStageDateStr);
            const deadline = new Date(prevDate);
            deadline.setDate(deadline.getDate() + slaConfig.days);
            const daysUntilDeadline = (deadline - now) / (1000 * 60 * 60 * 24);

            // if it's <= 1 day, it means it's H-1 or already late
            if (daysUntilDeadline <= 1) {
              warningTxs.push({ id: t.id, stage: nextStage, role: slaConfig.role });
              rolesNeeded.add(slaConfig.role);
            }
          }
        }
      });

      if (warningTxs.length === 0) {
        alert("Tidak ada LHA yang mendekati batas waktu (H-1 SLA).");
        return;
      }

      // Fetch users to get their phone numbers
      const usersList = await api.getUsers();
      
      let message = `*Notifikasi Sistem AMOR*\nTerdapat ${warningTxs.length} LHA yang mencapai H-1 SLA:\n`;
      warningTxs.forEach((w, index) => {
        message += `${index + 1}. ${w.id} menunggu ${w.role.toUpperCase()} (${w.stage})\n`;
      });
      message += `\nMohon segera diproses!\n\ncc :\n`;

      rolesNeeded.forEach(role => {
        const roleUsers = usersList.filter(u => u.role === role && u.phone);
        roleUsers.forEach(u => {
          let phone = u.phone;
          if (phone.startsWith('0')) phone = '62' + phone.substring(1);
          if (!phone.startsWith('+')) phone = '+' + phone;
          message += `@${phone}\n`;
        });
      });

      const encodedMsg = encodeURIComponent(message);
      window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
      setIsBroadcastModalOpen(false);
      
    } catch (error) {
      console.error(error);
      alert("Gagal memproses Broadcast WA.");
    }
  };

  const handleBroadcastReady = async () => {
    try {
      const STAGE_SLA = {
        'LHA Reject to PPIC': { prev: 'Pembuatan LHA Reject', days: 3, role: 'qc' },
        'Input SKR': { prev: 'LHA Reject to PPIC', days: 5, role: 'ppic' },
        'Harga dari Accounting': { prev: 'Input SKR', days: 3, role: 'ppic' },
        'Approval Supplier': { prev: 'Harga dari Accounting', days: 5, role: 'ppic' },
        'Pembuatan PO': { prev: 'Approval Supplier', days: 3, role: 'ppic' },
        'Muat Return': { prev: 'Pembuatan PO', days: 21, role: 'wh' }
      };

      const STAGES = [
        'Pembuatan LHA Reject',
        'LHA Reject to PPIC',
        'Input SKR',
        'Harga dari Accounting',
        'Approval Supplier',
        'Pembuatan PO',
        'Muat Return'
      ];

      const pendingPPIC = [];
      const pendingWH = [];
      
      transactions.forEach(t => {
        if (t.history && t.history['Muat Return']) return;
        const nextStage = STAGES.find(s => !t.history || !t.history[s]);
        if (!nextStage) return;

        const slaConfig = STAGE_SLA[nextStage];
        if (slaConfig) {
          if (slaConfig.role === 'ppic') pendingPPIC.push({ id: t.id, stage: nextStage });
          if (slaConfig.role === 'wh') pendingWH.push({ id: t.id, stage: nextStage });
        }
      });

      if (pendingPPIC.length === 0 && pendingWH.length === 0) {
        alert("Tidak ada LHA yang sedang menunggu konfirmasi lanjutan.");
        return;
      }

      const usersList = await api.getUsers();
      
      let message = `*Notifikasi Sistem AMOR*\nTerdapat LHA yang menunggu proses lanjutan:\n\n`;
      
      if (pendingPPIC.length > 0) {
        message += `*Menunggu PPIC:*\n`;
        pendingPPIC.forEach((w, index) => {
          message += `${index + 1}. ${w.id} (${w.stage})\n`;
        });
        message += `cc: `;
        const ppicUsers = usersList.filter(u => u.role === 'ppic' && u.phone);
        ppicUsers.forEach(u => {
          let phone = u.phone;
          if (phone.startsWith('0')) phone = '62' + phone.substring(1);
          if (!phone.startsWith('+')) phone = '+' + phone;
          message += `@${phone} `;
        });
        message += `\n\n`;
      }

      if (pendingWH.length > 0) {
        message += `*Menunggu WH:*\n`;
        pendingWH.forEach((w, index) => {
          message += `${index + 1}. ${w.id} (${w.stage})\n`;
        });
        message += `cc: `;
        const whUsers = usersList.filter(u => u.role === 'wh' && u.phone);
        whUsers.forEach(u => {
          let phone = u.phone;
          if (phone.startsWith('0')) phone = '62' + phone.substring(1);
          if (!phone.startsWith('+')) phone = '+' + phone;
          message += `@${phone} `;
        });
        message += `\n\n`;
      }

      message += `Mohon segera diproses!`;

      const encodedMsg = encodeURIComponent(message);
      window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
      setIsBroadcastModalOpen(false);
      
    } catch (error) {
      console.error(error);
      alert("Gagal memproses Broadcast WA.");
    }
  };

  const handleDeleteTransaction = async (e, id) => {
    e.stopPropagation(); // prevent card click
    if (window.confirm(`Apakah Anda yakin ingin menghapus transaksi LHA ${id}?`)) {
      setIsLoading(true);
      try {
        const res = await api.deleteTransaction(id);
        if (res.success) {
          fetchTransactions();
        } else {
          alert('Gagal menghapus LHA');
          setIsLoading(false);
        }
      } catch (error) {
        alert('Kesalahan saat menghapus');
        setIsLoading(false);
      }
    }
  };

  const filteredTransactions = transactions.filter(t => {
    // 1. Search term
    const matchesSearch = 
      (t.id && t.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.item && t.item.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.stage && t.stage.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    // 2. Active filter
    const currentStage = t.stage || 'Pembuatan LHA Reject';
    if (activeFilter === 'PENDING_QC') {
      return currentStage === 'Pembuatan LHA Reject';
    }
    if (activeFilter === 'PENDING_PPIC') {
      return ['LHA Reject to PPIC', 'Input SKR', 'Harga dari Accounting', 'Approval Supplier'].includes(currentStage);
    }
    if (activeFilter === 'PENDING_WH') {
      return currentStage === 'Pembuatan PO';
    }
    return true; // ALL
  });

  // Calculate Statistics
  const stats = useMemo(() => {
    let pendingQC = 0;
    let pendingPPIC = 0;
    let pendingWH = 0;

    transactions.forEach(t => {
      const currentStage = t.stage || 'Pembuatan LHA Reject';
      
      if (currentStage === 'Pembuatan LHA Reject') {
        pendingQC++;
      } else if ([
        'LHA Reject to PPIC', 
        'Input SKR', 
        'Harga dari Accounting', 
        'Approval Supplier'
      ].includes(currentStage)) {
        pendingPPIC++;
      } else if (currentStage === 'Pembuatan PO') {
        pendingWH++;
      }
    });

    return {
      total: transactions.length,
      pendingQC,
      pendingPPIC,
      pendingWH
    };
  }, [transactions]);

  const getBadgeColor = (stage) => {
    const s = stage || 'Pembuatan LHA Reject';
    if (['Pembuatan LHA Reject', 'LHA Reject to PPIC'].includes(s)) return 'var(--color-primary)'; // Biru
    if (['Input SKR', 'Harga dari Accounting', 'Approval Supplier', 'Pembuatan PO'].includes(s)) return '#8b5cf6'; // Ungu
    if (s === 'Muat Return') return 'var(--color-success)'; // Hijau
    return 'var(--color-text-muted)';
  };

  return (
    <div className="dashboard-container">
      <div className="dash-header">
        <div className="dash-title">
          <h2>Daftar Transaksi LHA</h2>
          <p>Pantau semua proses retur</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(userRole === 'admin' || userRole === 'qc') && (
            <button className="add-lha-btn" onClick={() => setIsBroadcastModalOpen(true)} style={{ background: '#25D366' }} title="Kirim Notif via WhatsApp">
              <MessageCircle size={20} />
              <span>Broadcast WA</span>
            </button>
          )}
          {(userRole === 'admin' || userRole === 'qc') && (
            <button className="add-lha-btn" onClick={() => setIsModalOpen(true)}>
              <Plus size={20} />
              <span>Tambah Data</span>
            </button>
          )}
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="stats-grid">
        <div 
          className={`stat-card glass-panel clickable ${activeFilter === 'ALL' ? 'active-filter' : ''}`} 
          style={{ borderLeft: '4px solid var(--color-text-muted)' }}
          onClick={() => setActiveFilter('ALL')}
        >
          <div className="stat-icon" style={{ background: 'rgba(100, 116, 139, 0.1)', color: 'var(--color-text-muted)' }}>
            <ClipboardList size={24} />
          </div>
          <div className="stat-info">
            <h3>Total LHA</h3>
            <p>{stats.total}</p>
          </div>
        </div>
        
        <div 
          className={`stat-card glass-panel clickable ${activeFilter === 'PENDING_QC' ? 'active-filter' : ''}`} 
          style={{ borderLeft: '4px solid var(--color-warning)' }}
          onClick={() => setActiveFilter('PENDING_QC')}
        >
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}>
            <AlertCircle size={24} />
          </div>
          <div className="stat-info">
            <h3>Pending QC</h3>
            <p>{stats.pendingQC}</p>
          </div>
        </div>

        <div 
          className={`stat-card glass-panel clickable ${activeFilter === 'PENDING_PPIC' ? 'active-filter' : ''}`} 
          style={{ borderLeft: '4px solid #8b5cf6' }}
          onClick={() => setActiveFilter('PENDING_PPIC')}
        >
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <AlertCircle size={24} />
          </div>
          <div className="stat-info">
            <h3>Pending PPIC</h3>
            <p>{stats.pendingPPIC}</p>
          </div>
        </div>

        <div 
          className={`stat-card glass-panel clickable ${activeFilter === 'PENDING_WH' ? 'active-filter' : ''}`} 
          style={{ borderLeft: '4px solid var(--color-success)' }}
          onClick={() => setActiveFilter('PENDING_WH')}
        >
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
            <AlertCircle size={24} />
          </div>
          <div className="stat-info">
            <h3>Pending WH</h3>
            <p>{stats.pendingWH}</p>
          </div>
        </div>
      </div>

      <div className="search-bar glass-panel">
        <Search size={18} color="var(--color-text-muted)" />
        <input 
          type="text" 
          placeholder="Cari Nomor LHA, Item, atau Status..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="lha-grid">
        {isLoading ? (
          <div className="empty-state">
            <Loader2 className="spinning-icon" size={24} style={{ margin: '0 auto', marginBottom: '0.5rem', animation: 'spin 1s linear infinite' }} />
            <p>Memuat data...</p>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="no-data-card">
            <p>Tidak ada transaksi ditemukan.</p>
          </div>
        ) : (
          filteredTransactions.map(t => (
            <div 
              key={t.id} 
              className={`lha-card glass-panel ${t.stage === 'Muat Return' ? 'completed-card' : ''}`}
              onClick={() => navigate(`/inquery?id=${encodeURIComponent(t.id)}`)}
            >
              <div className="lha-card-header">
                <div className="lha-id">
                  {t.stage === 'Muat Return' ? <CheckCircle size={18} color="var(--color-success)" /> : <FileText size={18} />}
                  <h3>{t.id}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="lha-status" style={{ backgroundColor: getBadgeColor(t.stage) + '20', color: getBadgeColor(t.stage) }}>
                    {t.stage || 'Baru'}
                  </span>
                  {(userRole === 'admin' || userRole === 'qc') && (
                    <button 
                      className="delete-lha-btn" 
                      onClick={(e) => handleDeleteTransaction(e, t.id)}
                      title="Hapus LHA"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="lha-card-body">
                <div className="info-row">
                  <Box size={16} />
                  <span>{t.item || 'Tidak ada keterangan item'}</span>
                </div>
                <div className="info-row">
                  <Clock size={16} />
                  <span>{t.updated ? new Date(t.updated).toLocaleString('id-ID', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'}) : '-'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>Tambah Data LHA</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateLha} className="standard-form">
              <div className="form-group">
                <label>Nomor LHA</label>
                <input 
                  type="text" 
                  value={newLha}
                  onChange={(e) => setNewLha(e.target.value)}
                  placeholder="e.g. 2808/001P3/200/11062026/IQC-R3"
                  required
                />
              </div>
              <div className="form-group">
                <label>Nama Item (Opsional)</label>
                <input 
                  type="text" 
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder="e.g. Indomie Goreng"
                />
              </div>
              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Memproses...' : 'Buat LHA Baru'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isBroadcastModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Pilih Jenis Broadcast WA</h3>
              <button className="close-btn" onClick={() => setIsBroadcastModalOpen(false)}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <button 
                onClick={handleBroadcastH1} 
                className="submit-btn" 
                style={{ background: 'var(--color-warning)', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
              >
                <AlertCircle size={20} />
                LHA H-1 SLA
              </button>
              <button 
                onClick={handleBroadcastReady} 
                className="submit-btn" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
              >
                <CheckCircle size={20} />
                Data Menunggu Dikonfirmasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
