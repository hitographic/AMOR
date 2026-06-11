import { useState, useEffect } from 'react';
import { Send, Clock } from 'lucide-react';
import { checkTargetTime } from '../utils/timeCheck';
import './InputProgress.css';

const STAGES = [
  "Pembuatan LHA Reject",
  "LHA Reject to PPIC",
  "Input SKR",
  "Harga dari Accounting",
  "Approval Supplier",
  "Pembuatan PO",
  "Muat Return"
];

function InputProgress() {
  const [transactionId, setTransactionId] = useState('');
  const [stage, setStage] = useState(STAGES[0]);
  const [notes, setNotes] = useState('');
  const [notification, setNotification] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Check time target notification logic dummy
    // In a real scenario, fetch the last progress date for this transaction first
    const lastInputDate = new Date(); 
    lastInputDate.setDate(lastInputDate.getDate() - 4); // simulate 4 days ago
    
    const timeWarning = checkTargetTime(stage, lastInputDate, new Date());
    if (timeWarning) {
      setNotification(timeWarning);
    } else {
      setNotification('Progress berhasil diinput.');
    }
    
    // Simulate API call to Google sheets
    console.log("Submitting:", { transactionId, stage, notes });
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
            <input 
              type="text" 
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g. LHA-2023-001"
              required
            />
          </div>

          <div className="form-group">
            <label>Pilih Tahapan Progres</label>
            <select value={stage} onChange={(e) => setStage(e.target.value)}>
              {STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
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

          <button type="submit" className="submit-btn">
            <Send size={18} />
            <span>Konfirmasi Progress</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default InputProgress;
