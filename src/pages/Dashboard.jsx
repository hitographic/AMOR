import { useState, useEffect } from 'react';
import { Users, FileText, Activity, UserPlus, X } from 'lucide-react';
import { api } from '../services/api';
import './Dashboard.css';

function Dashboard() {
  const [userRole, setUserRole] = useState('admin');
  const [showAddUser, setShowAddUser] = useState(false);
  
  // Add user form state
  const [newNik, setNewNik] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('qc');
  const [newName, setNewName] = useState('');
  const [addStatus, setAddStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Mock user fetching from local storage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUserRole(parsed.role);
    }
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAddStatus(null);
    
    try {
      const res = await api.addUser(newNik, newPassword, newRole, newName);
      if (res.success) {
        setAddStatus({ type: 'success', msg: 'User berhasil ditambahkan!' });
        setNewNik('');
        setNewPassword('');
        setNewName('');
      } else {
        setAddStatus({ type: 'error', msg: 'Gagal menambahkan user' });
      }
    } catch (err) {
      setAddStatus({ type: 'error', msg: 'Kesalahan jaringan' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="welcome-banner glass-panel">
        <h2>Dashboard</h2>
        <p>Welcome back! Here is your quick overview.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-info)' }}>
            <FileText size={24} color="#fff" />
          </div>
          <div className="stat-info">
            <h3>Total Transactions</h3>
            <p>124</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-warning)' }}>
            <Activity size={24} color="#fff" />
          </div>
          <div className="stat-info">
            <h3>Active Progress</h3>
            <p>38</p>
          </div>
        </div>
      </div>

      {userRole === 'admin' && (
        <div className="admin-section glass-panel">
          <div className="section-header">
            <Users size={20} />
            <h3>User Management</h3>
          </div>
          
          {!showAddUser ? (
            <>
              <p>Admin controls to add new accounts.</p>
              <button className="primary-btn" onClick={() => setShowAddUser(true)}>
                <UserPlus size={16} style={{marginRight: '0.5rem', display: 'inline'}}/>
                Add New User
              </button>
            </>
          ) : (
            <div className="add-user-form-container">
              <div className="form-header-row">
                <h4>Tambah User Baru</h4>
                <button className="close-btn" onClick={() => setShowAddUser(false)}><X size={18}/></button>
              </div>
              
              {addStatus && (
                <div className={`notification ${addStatus.type}`}>
                  {addStatus.msg}
                </div>
              )}
              
              <form onSubmit={handleAddUser} className="add-user-form">
                <div className="form-group">
                  <label>NIK</label>
                  <input type="text" value={newNik} onChange={e=>setNewNik(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Nama Lengkap</label>
                  <input type="text" value={newName} onChange={e=>setNewName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="text" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={newRole} onChange={e=>setNewRole(e.target.value)}>
                    <option value="admin">Admin</option>
                    <option value="qc">QC RMFG</option>
                    <option value="ppic">PPIC</option>
                    <option value="wh">Warehouse</option>
                  </select>
                </div>
                <button type="submit" className="primary-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : 'Simpan User'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
