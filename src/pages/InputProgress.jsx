import { useState, useEffect } from 'react';
import { Send, Clock } from 'lucide-react';
import { checkTargetTime } from '../utils/timeCheck';
import { api } from '../services/api';
import './InputProgress.css';

const STAGES = [
  'LHA Reject to PPIC',
  'Input SKR',
  'Harga dari Accounting',
  'Approval Supplier',
  'Pembuatan PO',
  'Muat Return'
];

const ROLE_STAGES = {
  admin: STAGES,
  qc: ['LHA Reject to PPIC'],
  ppic: ['Input SKR', 'Harga dari Accounting', 'Approval Supplier', 'Pembuatan PO'],
  wh: ['Muat Return']
};

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
    let currentRole = 'admin';
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      currentRole = parsed.role || 'admin';
      setUserRole(currentRole);
      
      // Auto-select first available stage based on role if default is not available
      const availableStages = ROLE_STAGES[currentRole] || STAGES;
      if (!availableStages.includes(stage)) {
        setStage(availableStages[0] || '');
      }
    }

    const fetchLHAs = async () => {
      try {
        const data = await api.getTransactions();
        if (Array.isArray(data)) {
          let filteredData = data;
          
          if (currentRole === 'qc') {
            // QC can only process if it hasn't passed QC's final stage
            filteredData = data.filter(t => !t.history || !t.history['LHA Reject to PPIC']);
          } else if (currentRole === 'ppic') {
            // PPIC can only process if QC is done, but PPIC is not done
            filteredData = data.filter(t => t.history && t.history['LHA Reject to PPIC'] && !t.history['Pembuatan PO']);
          } else if (currentRole === 'wh') {
            // WH can only process if PPIC is done, but WH is not done
            filteredData = data.filter(t => t.history && t.history['Pembuatan PO'] && !t.history['Muat Return']);
          }

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
  }, [stage]);

  // Find the currently selected transaction object
  const selectedTx = existingLHAs.find(t => t.id === transactionId);

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
            <label>Pilih Tahapan Progres</label>
            <select 
              value={stage} 
              onChange={(e) => setStage(e.target.value)}
              required
            >
              <option value="" disabled>Pilih tahapan...</option>
              {(ROLE_STAGES[userRole] || STAGES).map(s => {
                const isCompleted = selectedTx && selectedTx.history && selectedTx.history[s];
                return (
                  <option key={s} value={s} disabled={!!isCompleted}>
                    {isCompleted ? `✓ ${s}` : s}
                  </option>
                );
              })}
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
