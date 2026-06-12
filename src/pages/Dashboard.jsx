import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, X, Loader2, FileText, Clock, Box, ClipboardList, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState('admin');
  const [userName, setUserName] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const filteredTransactions = transactions.filter(t => 
    (t.id && t.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t.item && t.item.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t.stage && t.stage.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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

  return (
    <div className="dashboard-container">
      <div className="dash-header">
        <div className="dash-title">
          <h2>Daftar Transaksi LHA</h2>
          <p>Pantau semua proses retur</p>
        </div>
        {(userRole === 'admin' || userRole === 'qc') && (
          <button className="add-lha-btn" onClick={() => setIsModalOpen(true)}>
            <Plus size={20} />
            <span>Tambah Data</span>
          </button>
        )}
      </div>

      {/* Statistics Grid */}
      <div className="stats-grid">
        <div className="stat-card glass-panel" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <div className="stat-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--color-primary)' }}>
            <ClipboardList size={24} />
          </div>
          <div className="stat-info">
            <h3>Total LHA</h3>
            <p>{stats.total}</p>
          </div>
        </div>
        
        <div className="stat-card glass-panel" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}>
            <AlertCircle size={24} />
          </div>
          <div className="stat-info">
            <h3>Pending QC</h3>
            <p>{stats.pendingQC}</p>
          </div>
        </div>

        <div className="stat-card glass-panel" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <AlertCircle size={24} />
          </div>
          <div className="stat-info">
            <h3>Pending PPIC</h3>
            <p>{stats.pendingPPIC}</p>
          </div>
        </div>

        <div className="stat-card glass-panel" style={{ borderLeft: '4px solid var(--color-success)' }}>
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
              className="lha-card glass-panel"
              onClick={() => navigate(`/inquery?id=${encodeURIComponent(t.id)}`)}
            >
              <div className="lha-card-header">
                <div className="lha-id">
                  <FileText size={18} />
                  <h3>{t.id}</h3>
                </div>
                <span className="lha-status">{t.stage || 'Baru'}</span>
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
    </div>
  );
}

export default Dashboard;
