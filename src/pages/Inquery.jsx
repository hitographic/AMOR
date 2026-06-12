import { useState, useEffect } from 'react';
import { Search, Loader2, ArrowLeft, CheckCircle2, Clock, Filter, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const [searchDate, setSearchDate] = useState('');
  const [searchLha, setSearchLha] = useState('');
  const [searchItem, setSearchItem] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
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

  const filteredTransactions = transactions.filter(t => {
    // Quick search
    const matchQuick = searchTerm === '' || 
      (t.id && t.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.item && t.item.toLowerCase().includes(searchTerm.toLowerCase()));

    // Advanced search
    const matchLha = searchLha === '' || (t.id && t.id.toLowerCase().includes(searchLha.toLowerCase()));
    const matchItem = searchItem === '' || (t.item && t.item.toLowerCase().includes(searchItem.toLowerCase()));
    
    let matchDate = true;
    if (searchDate) {
      const lhaDateStr = t.history ? t.history['Pembuatan LHA Reject']?.date : null;
      if (lhaDateStr) {
        const lhaDate = new Date(lhaDateStr);
        // adjust for local timezone matching by formatting YYYY-MM-DD manually
        const year = lhaDate.getFullYear();
        const month = String(lhaDate.getMonth() + 1).padStart(2, '0');
        const day = String(lhaDate.getDate()).padStart(2, '0');
        const localDateStr = `${year}-${month}-${day}`;
        matchDate = localDateStr === searchDate;
      } else {
        matchDate = false;
      }
    }

    return matchQuick && matchLha && matchItem && matchDate;
  });

  const formatTime = (isoString) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleString('id-ID', { 
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute:'2-digit' 
      });
    } catch {
      return '-';
    }
  };

  const exportExcel = () => {
    const wsData = filteredTransactions.map(tx => {
      const row = {
        'Nomor LHA': tx.id,
        'Item': tx.item
      };
      STAGES.forEach(s => {
        row[s] = formatTime(tx.history ? tx.history[s]?.date : null);
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Progress LHA");
    XLSX.writeFile(wb, "Report_Progress_LHA.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF('landscape');
    doc.text("Laporan Progress LHA", 14, 15);
    
    const tableColumn = ["Nomor LHA", "Item", ...STAGES];
    const tableRows = [];

    filteredTransactions.forEach(tx => {
      const rowData = [
        tx.id,
        tx.item,
        ...STAGES.map(s => formatTime(tx.history ? tx.history[s]?.date : null))
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save("Report_Progress_LHA.pdf");
  };

  // If no specific transaction is selected, show the TABLE list view
  if (!transactionId) {
    return (
      <div className="inquery-container">
        <div className="page-header inquery-header">
          <div>
            <h2>Inquery Progress</h2>
            <p>Lacak status retur barang secara keseluruhan</p>
          </div>
          <div className="export-actions">
            <button className="btn-export excel" onClick={exportExcel}>
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button className="btn-export pdf" onClick={exportPDF}>
              <FileText size={16} /> PDF
            </button>
          </div>
        </div>

        <div className="search-section">
          <div className="search-bar glass-panel">
            <Search size={18} color="var(--color-text-muted)" />
            <input 
              type="text" 
              placeholder="Cari Cepat (LHA/Item)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button 
              className={`btn-toggle-adv ${showAdvanced ? 'active' : ''}`} 
              onClick={() => setShowAdvanced(!showAdvanced)}
              title="Advanced Search"
            >
              <Filter size={18} />
            </button>
          </div>
          
          {showAdvanced && (
            <div className="advanced-search glass-panel">
              <div className="form-group">
                <label>Tanggal Pembuatan</label>
                <input type="date" value={searchDate} onChange={e => setSearchDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Kode LHA</label>
                <input type="text" placeholder="Masukkan Kode..." value={searchLha} onChange={e => setSearchLha(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Nama Item</label>
                <input type="text" placeholder="Masukkan Item..." value={searchItem} onChange={e => setSearchItem(e.target.value)} />
              </div>
            </div>
          )}
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
                      <td className="sticky-col">
                        <strong 
                          style={{ cursor: 'pointer', color: 'var(--color-primary)' }}
                          onClick={() => navigate(`/inquery?id=${encodeURIComponent(tx.id)}`)}
                        >
                          {tx.id}
                        </strong>
                      </td>
                      <td>{tx.item}</td>
                      {STAGES.map(s => (
                        <td key={s} className="time-cell">
                          {formatTime(tx.history ? tx.history[s]?.date : null)}
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
