import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, PlusCircle, Search, LogOut, Users, Bell, Info } from 'lucide-react';
import { api } from '../services/api';
import './Layout.css';
import headerLogo from '../logo/AMOR header.png';

function Layout() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const role = JSON.parse(storedUser).role;
      setUserRole(role);
      fetchNotifications(role);
    }

    // Close notification dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotif(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async (role) => {
    try {
      const data = await api.getTransactions();
      const notifs = [];
      const now = new Date();

      const STAGE_SLA = {
        'LHA Reject to PPIC': { prev: 'Pembuatan LHA Reject', days: 2, role: 'qc' },
        'Pembuatan SKR': { prev: 'LHA Reject to PPIC', days: 2, role: 'ppic' },
        'Approval Supplier': { prev: 'Pembuatan SKR', days: 5, role: 'ppic' },
        'Harga dari Accounting': { prev: 'Approval Supplier', days: 5, role: 'ac' },
        'Pembuatan PO': { prev: 'Harga dari Accounting', days: 1, role: 'ppic' },
        'Muat Return': { prev: 'Pembuatan PO', days: 6, role: 'wh' }
      };

      const STAGES = [
        'Pembuatan LHA Reject',
        'LHA Reject to PPIC',
        'Pembuatan SKR',
        'Approval Supplier',
        'Harga dari Accounting',
        'Pembuatan PO',
        'Muat Return'
      ];

      data.forEach(t => {
        // 1. If completed (Muat Return exists)
        if (t.history && t.history['Muat Return']) {
          const completedDate = new Date(t.history['Muat Return'].date);
          const daysSinceCompleted = (now - completedDate) / (1000 * 60 * 60 * 24);
          if (daysSinceCompleted <= 3) {
            notifs.push({
              id: t.id + '-completed',
              type: 'success',
              message: `LHA ${t.id} telah selesai sepenuhnya (Muat Return).`
            });
          }
          return; // Don't check SLA for completed
        }

        const nextStage = STAGES.find(s => !t.history || !t.history[s]);
        if (!nextStage) return;

        // SLA Warning calculation
        const slaConfig = STAGE_SLA[nextStage];
        if (slaConfig) {
          const prevStageDateStr = t.history[slaConfig.prev]?.date;
          if (prevStageDateStr) {
            const prevDate = new Date(prevStageDateStr);
            const deadline = new Date(prevDate);
            deadline.setDate(deadline.getDate() + slaConfig.days);
            const daysUntilDeadline = (deadline - now) / (1000 * 60 * 60 * 24);

            if (role === 'admin' || role === slaConfig.role) {
              if (daysUntilDeadline <= 1 && daysUntilDeadline >= 0) {
                notifs.push({
                  id: t.id + '-warning',
                  type: 'warning',
                  message: `H-1 SLA: LHA ${t.id} segera membutuhkan proses "${nextStage}".`
                });
              } else if (daysUntilDeadline < 0) {
                notifs.push({
                  id: t.id + '-danger',
                  type: 'danger',
                  message: `Terlambat SLA: LHA ${t.id} melewati batas waktu untuk "${nextStage}".`
                });
              }
            }
          }
        }

        // Action Ready Notifications
        if (nextStage === 'Pembuatan SKR' && (role === 'ppic' || role === 'admin')) {
          notifs.push({
            id: t.id + '-ready-ppic',
            type: 'info',
            message: `LHA ${t.id} menunggu Pembuatan SKR oleh PPIC.`
          });
        }

        if (nextStage === 'Approval Supplier' && (role === 'ac' || role === 'admin')) {
          notifs.push({
            id: t.id + '-ready-ac',
            type: 'info',
            message: `LHA ${t.id} menunggu Approval Supplier oleh Accounting.`
          });
        }

        if (nextStage === 'Muat Return' && (role === 'wh' || role === 'admin')) {
          notifs.push({
            id: t.id + '-ready-wh',
            type: 'info',
            message: `LHA ${t.id} menunggu Muat Return oleh WH.`
          });
        }
      });

      setNotifications(notifs);
    } catch (error) {
      console.error("Failed to load notifications", error);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Apakah Anda yakin ingin keluar?")) {
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  return (
    <div className="layout-container">
      <header className="top-header glass-panel">
        <div className="header-content">
          <img src={headerLogo} alt="AMOR Header" className="header-logo" />
          <div className="header-actions">
            <div className="notif-wrapper" ref={notifRef}>
              <button className="notif-btn" onClick={() => setShowNotif(!showNotif)}>
                <Bell size={20} />
                {notifications.length > 0 && <span className="notif-badge">{notifications.length}</span>}
              </button>
              {showNotif && (
                <div className="notif-dropdown glass-panel">
                  <div className="notif-header">
                    <h4>Notifikasi</h4>
                  </div>
                  <div className="notif-body">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div key={n.id} className={`notif-item notif-${n.type}`}>
                          <Info size={16} />
                          <p>{n.message}</p>
                        </div>
                      ))
                    ) : (
                      <div className="notif-empty">Belum ada notifikasi</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Keluar">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="main-content container">
        <Outlet />
      </main>

      <nav className="bottom-nav glass-panel">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Home size={24} />
          <span>Home</span>
        </NavLink>
        {userRole === 'admin' && (
          <NavLink to="/users" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <Users size={24} />
            <span>User</span>
          </NavLink>
        )}
        <NavLink to="/input" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <PlusCircle size={24} />
          <span>Input</span>
        </NavLink>
        <NavLink to="/inquery" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Search size={24} />
          <span>Inquery</span>
        </NavLink>
      </nav>
    </div>
  );
}

export default Layout;
