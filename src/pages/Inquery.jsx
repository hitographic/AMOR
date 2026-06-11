import { useState, useEffect } from 'react';
import { Search, ChevronRight, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import './Inquery.css';

function Inquery() {
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

  const filtered = transactions.filter(t => 
    t.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.item.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="inquery-container">
      <div className="page-header">
        <h2>Inquery Progress</h2>
        <p>Lacak status retur barang</p>
      </div>

      <div className="search-bar glass-panel">
        <Search size={18} color="var(--color-text-muted)" />
        <input 
          type="text" 
          placeholder="Cari LHA Number atau Nama Item..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="transaction-list">
        {isLoading ? (
          <div className="empty-state">
            <Loader2 className="spinning-icon" size={24} style={{ margin: '0 auto', marginBottom: '0.5rem', animation: 'spin 1s linear infinite' }} />
            <p>Memuat data...</p>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtered.length > 0 ? (
          filtered.map(t => (
            <div key={t.id} className="transaction-card glass-panel">
              <div className="t-card-header">
                <h4>{t.id}</h4>
                <span className="t-date">{t.updated ? new Date(t.updated).toLocaleDateString('id-ID') : '-'}</span>
              </div>
              <div className="t-card-body">
                <p className="t-item">{t.item || 'N/A'}</p>
                <div className="t-stage">
                  <span className="stage-badge">{t.stage || 'Baru'}</span>
                </div>
              </div>
              <button className="view-detail-btn">
                <span>Detail</span>
                <ChevronRight size={16} />
              </button>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>Tidak ada transaksi ditemukan.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Inquery;
