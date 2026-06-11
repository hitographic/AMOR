import { useState, useEffect } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import './Inquery.css';

function Inquery() {
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    // Mock fetch from google sheets
    const mockData = [
      { id: 'LHA-2023-001', item: 'Indomie Goreng', stage: 'Input SKR', updated: '2023-10-01' },
      { id: 'LHA-2023-002', item: 'Bumbu Racik', stage: 'Harga dari Accounting', updated: '2023-10-02' },
      { id: 'LHA-2023-003', item: 'Kecap Manis', stage: 'Approval Supplier', updated: '2023-10-05' },
    ];
    setTransactions(mockData);
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
        {filtered.map(t => (
          <div key={t.id} className="transaction-card glass-panel">
            <div className="t-card-header">
              <h4>{t.id}</h4>
              <span className="t-date">{t.updated}</span>
            </div>
            <div className="t-card-body">
              <p className="t-item">{t.item}</p>
              <div className="t-stage">
                <span className="stage-badge">{t.stage}</span>
              </div>
            </div>
            <button className="view-detail-btn">
              <span>Detail</span>
              <ChevronRight size={16} />
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="empty-state">
            <p>Tidak ada transaksi ditemukan.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Inquery;
