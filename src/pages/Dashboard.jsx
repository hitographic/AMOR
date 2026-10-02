import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, X, Loader2, FileText, Clock, Box, ClipboardList, AlertCircle, CheckCircle, CheckCircle2, Trash2, MessageCircle } from 'lucide-react';
import { api } from '../services/api';
import './Dashboard.css';

// Canonical ordered flow (must match InputProgress & Inquery)
const FULL_STAGES = [
  'Pembuatan LHA Reject',
  'LHA Reject to PPIC',
  'Pembuatan SKR',
  'Approval Supplier',
  'Harga dari Accounting',
  'Pembuatan PO',
  'Muat Return'
];

const normalizeStage = (s) => (s || '').toString().trim().toLowerCase();

const isStageDone = (history, stage) => {
  if (!history) return false;
  const target = normalizeStage(stage);
  return Object.keys(history).some((k) => normalizeStage(k) === target);
};

// Next pending stage of a transaction, derived from history when
// available, otherwise inferred from the stored current stage.
const getNextStage = (t) => {
  if (t.history && Object.keys(t.history).length > 0) {
    const next = FULL_STAGES.find((s) => !isStageDone(t.history, s));
    return next || null; // null = fully completed
  }
  const idx = FULL_STAGES.findIndex((s) => normalizeStage(s) === normalizeStage(t.stage));
  if (idx === -1) return 'LHA Reject to PPIC';
  return FULL_STAGES[idx + 1] || null;
};

// Which role is currently waited on ("pending bucket")
const getPendingBucket = (t) => {
  // Completed is authoritative from the stored current stage too,
  // in case the Progress log row is missing/stale.
  if (normalizeStage(t.stage) === normalizeStage('Muat Return')) return 'SELESAI';
  const next = getNextStage(t);
  if (!next) return 'SELESAI';
  if (next === 'LHA Reject to PPIC') return 'QC';
  if (['Pembuatan SKR', 'Approval Supplier', 'Pembuatan PO'].includes(next)) return 'PPIC';
  if (next === 'Harga dari Accounting') return 'ACCT';
  if (next === 'Muat Return') return 'WH';
  return 'QC';
};

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
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [newLha, setNewLha] = useState('');
  const [newItem, setNewItem] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Cache daftar users (nomor HP untuk cc) agar broadcast instan.
  // api.getUsers() ke Google Apps Script bisa 10-60 detik (cold start),
  // jadi kita preload sekali saat dashboard dibuka, bukan saat tombol diklik.
  const usersCache = useRef([]);
  const usersFetching = useRef(null);

  const refreshUsersInBackground = () => {
    if (usersFetching.current) return usersFetching.current;
    usersFetching.current = api.getUsers()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) usersCache.current = list;
        return usersCache.current;
      })
      .catch((e) => {
        console.warn('preload getUsers gagal:', e);
        return usersCache.current;
      })
      .finally(() => { usersFetching.current = null; });
    return usersFetching.current;
  };

  // Ambil users: instan kalau cache ada, dibatasi timeout kalau harus fetch
  // agar tidak menunggu 1 menit saat GAS lambat — lanjut tanpa cc.
  const getUsersFast = async (timeoutMs = 8000) => {
    if (usersCache.current.length > 0) return usersCache.current;
    if (usersFetching.current) {
      try {
        return await Promise.race([
          usersFetching.current,
          new Promise((resolve) => setTimeout(() => resolve(usersCache.current), timeoutMs)),
        ]);
      } catch {
        return usersCache.current;
      }
    }
    try {
      const result = await Promise.race([
        api.getUsers(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('getUsers timeout')), timeoutMs)),
      ]);
      if (Array.isArray(result) && result.length > 0) usersCache.current = result;
    } catch (e) {
      console.warn('getUsers lambat/gagal, lanjut tanpa cc:', e);
    }
    return usersCache.current;
  };

  const openBroadcastModal = () => {
    setIsBroadcastModalOpen(true);
    // Segarkan cache selagi user memilih jenis broadcast,
    // jadi saat tombol dalam modal diklik, data sudah siap.
    refreshUsersInBackground();
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUserRole(parsed.role || 'admin');
      setUserName(parsed.name || parsed.nik || 'Unknown');
    }
    fetchTransactions();
    refreshUsersInBackground();
  }, []);

  const fetchTransactions = async () => {
    setIsLoading(true);
    setLoadError('');
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
      setTransactions([]);
      setLoadError(error?.message || 'Gagal memuat data dari backend.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLha = async (e) => {
    e.preventDefault();
    
    const duplicateExists = transactions.some(t => t.id === newLha.trim());
    if (duplicateExists) {
      alert('Nomor LHA sudah ada. Silakan gunakan nomor LHA yang berbeda.');
      return;
    }

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
    setIsBroadcasting(true);
    let waWin = null;
    try {
      const STAGE_SLA = {
        'LHA Reject to PPIC': { prev: 'Pembuatan LHA Reject', days: 2, role: 'qc' },
        'Pembuatan SKR': { prev: 'LHA Reject to PPIC', days: 2, role: 'ppic' },
        'Approval Supplier': { prev: 'Pembuatan SKR', days: 5, role: 'ppic' },
        'Harga dari Accounting': { prev: 'Approval Supplier', days: 5, role: 'ac' },
        'Pembuatan PO': { prev: 'Harga dari Accounting', days: 1, role: 'ppic' },
        'Muat Return': { prev: 'Pembuatan PO', days: 6, role: 'wh' }
      };

      const STAGES = [
        'Pembuatan LHA Reject',
        'LHA Reject to PPIC',
        'Pembuatan SKR',
        'Approval Supplier',
        'Harga dari Accounting',
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
            const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

            if (daysUntilDeadline <= 2) {
              const hLabel = daysUntilDeadline <= 0 ? 'Terlambat' : `H-${daysUntilDeadline}`;
              warningTxs.push({ id: t.id, stage: nextStage, role: slaConfig.role, hLabel });
              rolesNeeded.add(slaConfig.role);
            }
          }
        }
      });

      if (warningTxs.length === 0) {
        alert("Tidak ada LHA yang mendekati batas waktu (H-1 SLA).");
        return;
      }

      // Jalur cepat: pakai cache preload (instan, tanpa menunggu jaringan).
      // Hanya buka blank-tab + fetch kalau cache masih kosong.
      let usersList = usersCache.current || [];
      if (usersList.length === 0) {
        // Buka sinkron dulu agar tidak diblokir popup-blocker selama fetch lama.
        waWin = window.open('', '_blank');
        usersList = await getUsersFast();
      } else {
        refreshUsersInBackground();
      }

      const grouped = {};
      warningTxs.forEach(w => {
        if (!grouped[w.role]) grouped[w.role] = [];
        grouped[w.role].push(w);
      });

      const roleOrder = ['qc', 'ppic', 'wh', 'ac'];
      let message = `*Notifikasi Sistem AMOR*\nTerdapat ${warningTxs.length} LHA yang mencapai H-1 SLA:\n`;

      roleOrder.forEach(role => {
        if (grouped[role] && grouped[role].length > 0) {
          message += `\n*${role.toUpperCase()}:*\n`;
          grouped[role].forEach((w, index) => {
            message += `${index + 1}. ${w.id} menunggu ${role.toUpperCase()} (${w.stage}) - ${w.hLabel}\n`;
          });
        }
      });

      message += `\ncc:\n`;

      rolesNeeded.forEach(role => {
        const roleUsers = (usersList || []).filter(u => u.role === role && u.phone);
        roleUsers.forEach(u => {
          let phone = u.phone;
          if (phone.startsWith('0')) phone = '62' + phone.substring(1);
          if (!phone.startsWith('+')) phone = '+' + phone;
          message += `@${phone}\n`;
        });
      });

      message += `\nLink Input: https://hitographic.github.io/AMOR/#/input\n\nMohon segera diproses :)\nTerima kasih`;

      const encodedMsg = encodeURIComponent(message);
      const waUrl = `https://wa.me/?text=${encodedMsg}`;
      if (waWin) {
        waWin.location.href = waUrl;
      } else {
        // Cache-hit: tanpa await lama, masih dalam user-gesture → langsung buka.
        const opened = window.open(waUrl, '_blank');
        if (!opened) window.location.href = waUrl;
      }
      setIsBroadcastModalOpen(false);

    } catch (error) {
      console.error(error);
      if (waWin) waWin.close();
      alert("Gagal memproses Broadcast WA.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleBroadcastReady = async () => {
    setIsBroadcasting(true);
    let waWinReady = null;
    try {
      const STAGE_SLA = {
        'LHA Reject to PPIC': { prev: 'Pembuatan LHA Reject', days: 2, role: 'qc' },
        'Pembuatan SKR': { prev: 'LHA Reject to PPIC', days: 2, role: 'ppic' },
        'Approval Supplier': { prev: 'Pembuatan SKR', days: 5, role: 'ppic' },
        'Harga dari Accounting': { prev: 'Approval Supplier', days: 5, role: 'ac' },
        'Pembuatan PO': { prev: 'Harga dari Accounting', days: 1, role: 'ppic' },
        'Muat Return': { prev: 'Pembuatan PO', days: 6, role: 'wh' }
      };

      const STAGES = [
        'Pembuatan LHA Reject',
        'LHA Reject to PPIC',
        'Pembuatan SKR',
        'Approval Supplier',
        'Harga dari Accounting',
        'Pembuatan PO',
        'Muat Return'
      ];

      const pendingQC = [];
      const pendingPPIC = [];
      const pendingAcct = [];
      const pendingWH = [];

      transactions.forEach(t => {
        if (t.history && t.history['Muat Return']) return;
        const nextStage = STAGES.find(s => !t.history || !t.history[s]);
        if (!nextStage) return;

        const slaConfig = STAGE_SLA[nextStage];
        if (slaConfig) {
          if (slaConfig.role === 'qc') pendingQC.push({ id: t.id, stage: nextStage });
          if (slaConfig.role === 'ppic') pendingPPIC.push({ id: t.id, stage: nextStage });
          if (slaConfig.role === 'ac') pendingAcct.push({ id: t.id, stage: nextStage });
          if (slaConfig.role === 'wh') pendingWH.push({ id: t.id, stage: nextStage });
        }
      });

      if (pendingQC.length === 0 && pendingPPIC.length === 0 && pendingAcct.length === 0 && pendingWH.length === 0) {
        alert("Tidak ada LHA yang sedang menunggu konfirmasi lanjutan.");
        return;
      }

      let usersList = usersCache.current || [];
      if (usersList.length === 0) {
        waWinReady = window.open('', '_blank');
        usersList = await getUsersFast();
      } else {
        refreshUsersInBackground();
      }

      const formatPhones = (role) => {
        const roleUsers = (usersList || []).filter(u => u.role === role && u.phone);
        return roleUsers.map(u => {
          let phone = u.phone;
          if (phone.startsWith('0')) phone = '62' + phone.substring(1);
          if (!phone.startsWith('+')) phone = '+' + phone;
          return `@${phone}`;
        }).join(' ');
      };

      let message = `*Notifikasi Sistem AMOR*\nTerdapat LHA yang menunggu proses lanjutan:\n\n`;

      if (pendingQC.length > 0) {
        message += `*Menunggu QC:*\n`;
        pendingQC.forEach((w, index) => {
          message += `${index + 1}. ${w.id} (${w.stage})\n`;
        });
        message += `cc: ${formatPhones('qc')}\n\n`;
      }

      if (pendingPPIC.length > 0) {
        message += `*Menunggu PPIC:*\n`;
        pendingPPIC.forEach((w, index) => {
          message += `${index + 1}. ${w.id} (${w.stage})\n`;
        });
        message += `cc: ${formatPhones('ppic')}\n\n`;
      }

      if (pendingWH.length > 0) {
        message += `*Menunggu WH:*\n`;
        pendingWH.forEach((w, index) => {
          message += `${index + 1}. ${w.id} (${w.stage})\n`;
        });
        message += `cc: ${formatPhones('wh')}\n\n`;
      }

      if (pendingAcct.length > 0) {
        message += `*Menunggu Accounting:*\n`;
        pendingAcct.forEach((w, index) => {
          message += `${index + 1}. ${w.id} (${w.stage})\n`;
        });
        message += `cc: ${formatPhones('ac')}\n\n`;
      }

      message += `Link Input: https://hitographic.github.io/AMOR/#/input\n\nMohon segera diproses :)\nTerima kasih`;

      const encodedMsg = encodeURIComponent(message);
      const waUrl = `https://wa.me/?text=${encodedMsg}`;
      if (waWinReady) {
        waWinReady.location.href = waUrl;
      } else {
        const opened = window.open(waUrl, '_blank');
        if (!opened) window.location.href = waUrl;
      }
      setIsBroadcastModalOpen(false);

    } catch (error) {
      console.error(error);
      if (waWinReady) waWinReady.close();
      alert("Gagal memproses Broadcast WA.");
    } finally {
      setIsBroadcasting(false);
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

    // 2. Active filter (based on which role is waited on, not last done stage)
    if (activeFilter === 'ALL') return true;
    const bucket = getPendingBucket(t);
    if (activeFilter === 'PENDING_QC') {
      return bucket === 'QC';
    }
    if (activeFilter === 'PENDING_PPIC') {
      return bucket === 'PPIC';
    }
    if (activeFilter === 'PENDING_ACCT') {
      return bucket === 'ACCT';
    }
    if (activeFilter === 'PENDING_WH') {
      return bucket === 'WH';
    }
    if (activeFilter === 'SELESAI') {
      return bucket === 'SELESAI';
    }
    return true; // ALL
  });

  // Calculate Statistics (based on next pending stage per role)
  const stats = useMemo(() => {
    let pendingQC = 0;
    let pendingPPIC = 0;
    let pendingAcct = 0;
    let pendingWH = 0;
    let progresSelesai = 0;

    transactions.forEach(t => {
      const bucket = getPendingBucket(t);

      if (bucket === 'SELESAI') {
        progresSelesai++;
      } else if (bucket === 'QC') {
        pendingQC++;
      } else if (bucket === 'PPIC') {
        pendingPPIC++;
      } else if (bucket === 'ACCT') {
        pendingAcct++;
      } else if (bucket === 'WH') {
        pendingWH++;
      }
    });

    return {
      total: transactions.length,
      pendingQC,
      pendingPPIC,
      pendingAcct,
      pendingWH,
      progresSelesai
    };
  }, [transactions]);

  const getBadgeColor = (stage) => {
    const s = stage || 'Pembuatan LHA Reject';
    if (['Pembuatan LHA Reject', 'LHA Reject to PPIC'].includes(s)) return 'var(--color-primary)'; // Biru
    if (['Pembuatan SKR', 'Approval Supplier', 'Harga dari Accounting', 'Pembuatan PO'].includes(s)) return '#8b5cf6'; // Ungu
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
          <button className="add-lha-btn" onClick={openBroadcastModal} style={{ background: '#25D366' }} title="Kirim Notif via WhatsApp">
            <MessageCircle size={20} />
            <span>Broadcast WA</span>
          </button>
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
          className={`stat-card glass-panel clickable ${activeFilter === 'PENDING_ACCT' ? 'active-filter' : ''}`}
          style={{ borderLeft: '4px solid #f59e0b' }}
          onClick={() => setActiveFilter('PENDING_ACCT')}
        >
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <AlertCircle size={24} />
          </div>
          <div className="stat-info">
            <h3>Pending Acct</h3>
            <p>{stats.pendingAcct}</p>
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

        <div
          className={`stat-card glass-panel clickable ${activeFilter === 'SELESAI' ? 'active-filter' : ''}`}
          style={{ borderLeft: '4px solid #22c55e' }}
          onClick={() => setActiveFilter('SELESAI')}
        >
          <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-info">
            <h3>Progres Selesai</h3>
            <p>{stats.progresSelesai}</p>
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

      {loadError && !isLoading && (
        <div className="notification warning" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={18} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Backend tidak bisa dihubungi</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>{loadError}</div>
          </div>
          <button type="button" className="submit-btn" style={{ width: 'auto', padding: '0.5rem 1rem' }} onClick={fetchTransactions}>
            Coba lagi
          </button>
        </div>
      )}

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
              className={`lha-card glass-panel ${getPendingBucket(t) === 'SELESAI' ? 'completed-card' : ''}`}
              onClick={() => navigate(`/inquery?id=${encodeURIComponent(t.id)}`)}
            >
              <div className="lha-card-header">
                <div className="lha-id">
                  {getPendingBucket(t) === 'SELESAI' ? <CheckCircle size={18} color="var(--color-success)" /> : <FileText size={18} />}
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
                  <span>{t.updated ? new Date(t.updated).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
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
        <div className="modal-overlay" onClick={() => !isBroadcasting && setIsBroadcastModalOpen(false)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Pilih Jenis Broadcast WA</h3>
              <button type="button" className="close-btn" onClick={() => setIsBroadcastModalOpen(false)} disabled={isBroadcasting}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={handleBroadcastH1}
                disabled={isBroadcasting}
                className="submit-btn"
                style={{ background: 'var(--color-warning)', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', opacity: isBroadcasting ? 0.6 : 1 }}
              >
                <AlertCircle size={20} />
                {isBroadcasting ? 'Memproses...' : 'LHA H-1 SLA'}
              </button>
              <button
                type="button"
                onClick={handleBroadcastReady}
                disabled={isBroadcasting}
                className="submit-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', opacity: isBroadcasting ? 0.6 : 1 }}
              >
                <CheckCircle size={20} />
                {isBroadcasting ? 'Memproses...' : 'Data Menunggu Dikonfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
