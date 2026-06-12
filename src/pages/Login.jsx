import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import './Login.css';
import loginLogo from '../logo/AMOR login.png';

import { api } from '../services/api';

function Login() {
  const [nik, setNik] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (nik && password) {
      setIsLoading(true);
      try {
        const result = await api.login(nik, password);
        if (result.success) {
          localStorage.setItem('user', JSON.stringify({ nik, role: result.role, name: result.name }));
          navigate('/dashboard');
        } else {
          setError(result.message || 'NIK atau Password salah');
        }
      } catch (err) {
        setError('Gagal terhubung ke server');
      } finally {
        setIsLoading(false);
      }
    } else {
      setError('NIK dan Password harus diisi');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass-panel">
        <div className="login-header">
          <h2>Welcome to</h2>
          <img src={loginLogo} alt="AMOR Login" className="login-logo" />
          <p>Aplikasi Monitoring Retur</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>NIK</label>
            <input 
              type="text" 
              value={nik}
              onChange={(e) => setNik(e.target.value)}
              placeholder="Masukkan NIK Anda"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-input-wrapper">
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan Password"
              />
              <button 
                type="button" 
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? 'Memeriksa...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
