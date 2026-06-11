import { useState, useEffect } from 'react';
import { Users, FileText, Activity, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const [userRole, setUserRole] = useState('admin');
  const navigate = useNavigate();

  useEffect(() => {
    // Mock user fetching from local storage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUserRole(parsed.role);
    }
  }, []);

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
          <p>Pengaturan dan penambahan user telah dipindahkan ke menu khusus.</p>
          <button className="primary-btn" onClick={() => navigate('/users')} style={{ width: '100%', justifyContent: 'space-between' }}>
            Buka Menu User
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
