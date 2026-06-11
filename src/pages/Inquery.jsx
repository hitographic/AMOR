import { useState, useEffect } from 'react';
import { Search, ChevronRight, Loader2 } from 'lucide-react';
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
        ) : filteredTransactions.length === 0 ? (
          <p className="no-data">Tidak ada transaksi ditemukan.</p>
        ) : (
          <div className="table-wrapper">
            <table className="progress-table">
              <thead>
                <tr>
                  <th>Nomor LHA</th>
                  <th>Item</th>
                  {STAGES.map(s => <th key={s}>{s}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map(tx => (
                  <tr key={tx.id}>
                    <td className="sticky-col"><strong>{tx.id}</strong></td>
                    <td>{tx.item}</td>
                    {STAGES.map(s => (
                      <td key={s} className="time-cell">
                        {formatTime(tx.history ? tx.history[s] : null)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Inquery;
