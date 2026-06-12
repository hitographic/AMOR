import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, PlusCircle, Search, LogOut, Users } from 'lucide-react';
import './Layout.css';
import headerLogo from '../logo/AMOR header.png';

function Layout() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUserRole(JSON.parse(storedUser).role);
    }
  }, []);

  const handleLogout = () => {
    // Basic logout logic for now
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="layout-container">
      <header className="top-header glass-panel">
        <div className="header-content">
          <img src={headerLogo} alt="AMOR Header" className="header-logo" />
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
          </button>
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
