import { useState, useEffect } from 'react';
import { Send, Clock } from 'lucide-react';
import { checkTargetTime } from '../utils/timeCheck';
import { api } from '../services/api';
import './InputProgress.css';

const STAGES = [
  'LHA Reject to PPIC',
  'Pembuatan SKR',
  'Approval Supplier',
  'Harga dari Accounting',
  'Pembuatan PO',
  'Muat Return'
];

// Ordered actionable stages + which role owns each of them.
const ROLE_STAGES = {
  admin: STAGES,
  qc: ['LHA Reject to PPIC'],
  ppic: ['Pembuatan SKR', 'Approval Supplier', 'Pembuatan PO'],
  ac: ['Harga dari Accounting'],
  wh: ['Muat Return']
};

// Normalize stage names so minor differences in the Sheet
// (trailing spaces / letter case) don't break the flow.
const normalizeStage = (s) => (s || '').toString().trim().toLowerCase();

const isStageDone = (history, stage) => {
  if (!history) return false;
  const target = normalizeStage(stage);
  return Object.keys(history).some((k) => normalizeStage(k) === target);
};

// First actionable stage (of STAGES) that has no history entry yet.
// Returns null when every stage is completed.
const getNextActionable = (history) =>
  STAGES.find((s) => !isStageDone(history, s)) || null;

function InputProgress() {
  const [transactionId, setTransactionId] = useState('');
  const [stage, setStage] = useState(STAGES[0]);
  const [notes, setNotes] = useState('');
  const [notification, setNotification] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState('admin');
  const [existingLHAs, setExistingLHAs] = useState([]);
  const [isLoadingLHAs, setIsLoadingLHAs] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const currentRole = storedUser ? (JSON.parse(storedUser).role || 'admin') : 'admin';
    setUserRole(currentRole);

    // Auto-select first available stage based on role if default is not available
    const availableStages = ROLE_STAGES[currentRole] || STAGES;
    if (!availableStages.includes(stage)) {
      setStage(availableStages[0] || '');
    }

    const fetchLHAs = async () => {
      try {
        const data = await api.getTransactions();
        if (Array.isArray(data)) {
          // Only list transactions whose NEXT pending stage belongs to
          // the current role. This guarantees every LHA in the dropdown
          // has an actionable "Tahapan Progres Selanjutnya" (fixes WH
          // seeing an LHA but getting "Tidak ada tahapan tersedia").
          const filteredData = data.filter((t) => {
            const next = getNextActionable(t.history);
            if (!next) return false; // already fully completed
            if (currentRole === 'admin') return true;
            return (ROLE_STAGES[currentRole] || STAGES).includes(next);
          });

          // Store full objects instead of just IDs so we can check history later
          setExistingLHAs(filteredData);
        }
      } catch (error) {
        console.error("Failed to load existing LHAs", error);
      } finally {
        setIsLoadingLHAs(false);
      }
    };
    fetchLHAs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Find the currently selected transaction object
  const selectedTx = existingLHAs.find(t => t.id === transactionId);

  // Determine the next stage in the sequence (normalized lookup)
  const nextStageToComplete = selectedTx
    ? getNextActionable(selectedTx.history)
    : null;

  // Auto-select the next stage when transaction changes
  useEffect(() => {
    if (nextStageToComplete && (ROLE_STAGES[userRole] || STAGES).includes(nextStageToComplete)) {
      setStage(nextStageToComplete);
    } else {
      setStage('');
    }
  }, [selectedTx, nextStageToComplete, userRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setNotification(null);
    
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const inputBy = storedUser.name || storedUser.nik || 'Unknown';
      
      const result = await api.addProgress(transactionId, stage, notes, inputBy);
      
      if (result.success) {
        // Check time target notification logic dummy
        // In a real scenario, fetch the last progress date for this transaction first
        const lastInputDate = new Date(); 
        lastInputDate.setDate(lastInputDate.getDate() - 4); // simulate 4 days ago
        
        const timeWarning = checkTargetTime(stage, lastInputDate, new Date());
        if (timeWarning) {
          setNotification(timeWarning);
        } else {
          setNotification('Progress berhasil diinput. Memperbarui data...');
        }
        setTransactionId('');
        setNotes('');
        
        // Refresh to update dropdowns and lists
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setNotification('Gagal menginput progress: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      setNotification('Terjadi kesalahan koneksi server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="input-progress-container">
      <div className="page-header">
        <h2>Input Progress</h2>
        <p>AMOR Menu Transaction</p>
      </div>

      {notification && (
        <div className={`notification ${notification.includes('berhasil') ? 'success' : 'warning'}`}>
          <Clock size={18} />
          <span>{notification}</span>
        </div>
      )}

      <div className="form-card glass-panel">
        <form onSubmit={handleSubmit} className="standard-form">
          <div className="form-group">
            <label>ID Transaksi / LHA Number</label>
            <select
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              required
            >
              <option value="" disabled>
                {isLoadingLHAs ? 'Memuat daftar LHA...' : 'Pilih Nomor LHA yang sudah ada'}
              </option>
              {existingLHAs.map((tx) => (
                <option key={tx.id} value={tx.id}>{tx.id}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Tahapan Progres Selanjutnya</label>
            <select 
              value={stage} 
              onChange={(e) => setStage(e.target.value)}
              required
            >
              {!transactionId ? (
                <option value="" disabled>Pilih LHA terlebih dahulu</option>
              ) : nextStageToComplete && (ROLE_STAGES[userRole] || STAGES).includes(nextStageToComplete) ? (
                <option value={nextStageToComplete}>{nextStageToComplete}</option>
              ) : (
                <option value="" disabled>Tidak ada tahapan tersedia untuk Anda</option>
              )}
            </select>
          </div>

          <div className="form-group">
            <label>Catatan Tambahan (Opsional)</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Masukkan keterangan"
              rows={4}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            <Send size={18} />
            <span>{isLoading ? 'Menyimpan...' : 'Konfirmasi Progress'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default InputProgress;
