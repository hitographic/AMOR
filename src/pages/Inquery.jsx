import { useState, useEffect } from 'react';
import { Search, Loader2, ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './Inquery.css';

const STAGES = [
  'Pembuatan LHA Reject',
  'LHA Reject to PPIC',
  'Input SKR',
  'Harga dari Accounting',
  'Approval Supplier',
  'Pembuatan PO',
  'Muat Return'
];

function Inquery() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const transactionId = searchParams.get('id');

  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const data = await api.getTransactions();
        // Since we are not doing date formatting yet, let's just use it
        setTransactions(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTransactions();
  }, []);

  const filteredTransactions = transactions.filter(t => 
    (t.id && t.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t.item && t.item.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatTime = (isoString) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      // Check if valid date
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleString('id-ID', { 
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute:'2-digit' 
      });
    } catch {
      return '-';
    }
  };

  // If no specific transaction is selected, show a message or list
  if (!transactionId) {
    return (
      <div className="inquery-container">
        <div className="page-header">
          <h2>Inquery Progress</h2>
          <p>Pilih salah satu transaksi dari Dashboard untuk melihat detail progres.</p>
        </div>
        <button className="primary-btn" onClick={() => navigate('/')} style={{marginTop: '1rem'}}>
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  const selectedTx = transactions.find(t => t.id === transactionId);

  return (
    <div className="inquery-container">
      <div className="page-header detail-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2>Detail LHA</h2>
          <p>{transactionId}</p>
        </div>
      </div>

      <div className="transaction-detail-box glass-panel">
        <h3><strong>Item:</strong> {selectedTx ? selectedTx.item : '...'}</h3>
      </div>

      <div className="timeline-container glass-panel">
        {isLoading ? (
          <div className="empty-state">
            <Loader2 className="spinning-icon" size={24} style={{ margin: '0 auto', marginBottom: '0.5rem', animation: 'spin 1s linear infinite' }} />
            <p>Memuat detail...</p>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : !selectedTx ? (
          <p className="no-data">Data transaksi tidak ditemukan.</p>
        ) : (
          <div className="vertical-timeline">
            {STAGES.map((stage, index) => {
              const historyData = selectedTx.history ? selectedTx.history[stage] : null;
              const isCompleted = !!historyData;
              // Determine if this is the current active stage
              // It's the active stage if it's completed and the NEXT stage is NOT completed.
              // Or if we just rely on `isCompleted`.
              
              return (
                <div key={stage} className={`timeline-item ${isCompleted ? 'completed' : ''}`}>
                  <div className="timeline-marker">
                    {isCompleted ? <CheckCircle2 size={24} color="#fff" /> : <div className="empty-circle"></div>}
                  </div>
                  <div className="timeline-content">
                    <h3 className="timeline-stage">{stage}</h3>
                    {isCompleted ? (
                      <div className="timeline-meta">
                        <span className="meta-time">
                          <Clock size={14} /> 
                          {formatTime(historyData.date)}
                        </span>
                        {historyData.user && (
                          <span className="meta-user">
                            Oleh: <strong>{historyData.user}</strong>
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="timeline-meta pending">
                        <span>Belum diselesaikan</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Inquery;
