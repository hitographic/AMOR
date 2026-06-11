import { useState, useEffect } from 'react';
import { UserPlus, Search, ChevronLeft, ChevronRight, Loader2, Edit2, Trash2, X } from 'lucide-react';
import { api } from '../services/api';
import './UserManagement.css';

function UserManagement() {
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'add'
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search and Pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Add user form state
  const [newNik, setNewNik] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('qc');
  const [newName, setNewName] = useState('');
  const [addStatus, setAddStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit user state
  const [editingUser, setEditingUser] = useState(null); // stores user object being edited
  const [editPassword, setEditPassword] = useState('');
  const [editStatus, setEditStatus] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

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
        // Refresh user list after adding
        fetchUsers();
      } else {
        setAddStatus({ type: 'error', msg: 'Gagal menambahkan user' });
      }
    } catch (err) {
      setAddStatus({ type: 'error', msg: 'Kesalahan jaringan' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (nik, name) => {
    if (window.confirm(`Yakin ingin menghapus user ${name} (${nik})?`)) {
      setIsLoading(true);
      try {
        const res = await api.deleteUser(nik);
        if (res.success) {
          fetchUsers();
        } else {
          alert('Gagal menghapus user');
          setIsLoading(false);
        }
      } catch (err) {
        alert('Kesalahan jaringan saat menghapus');
        setIsLoading(false);
      }
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setEditStatus(null);
    try {
      const res = await api.updateUser(editingUser.nik, editPassword, editingUser.role, editingUser.name);
      if (res.success) {
        setEditingUser(null);
        fetchUsers();
      } else {
        setEditStatus({ type: 'error', msg: 'Gagal mengupdate user' });
      }
    } catch (err) {
      setEditStatus({ type: 'error', msg: 'Kesalahan jaringan' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pagination and filtering logic
  // Ensure users is an array to prevent crash if API returns an error object
  const safeUsers = Array.isArray(users) ? users : [];
  
  const filteredUsers = safeUsers.filter(u => 
    (u.nik && u.nik.toString().toLowerCase().includes(searchTerm.toLowerCase())) || 
    (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  
  // Reset page to 1 when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="user-management-container">
      <div className="page-header">
        <h2>User Management</h2>
        <p>Kelola akun pengguna aplikasi</p>
      </div>

      <div className="tabs-container glass-panel">
        <button 
          className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          List User
        </button>
        <button 
          className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          <UserPlus size={16} />
          Tambah User
        </button>
      </div>

      {activeTab === 'list' && (
        <div className="list-section">
          <div className="search-bar glass-panel">
            <Search size={18} color="var(--color-text-muted)" />
            <input 
              type="text" 
              placeholder="Cari NIK atau Nama User..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="users-list">
            {isLoading ? (
              <div className="empty-state">
                <Loader2 className="spinning-icon" size={24} style={{ margin: '0 auto', marginBottom: '0.5rem', animation: 'spin 1s linear infinite' }} />
                <p>Memuat data...</p>
                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
              </div>
            ) : currentUsers.length > 0 ? (
              <>
                <div className="table-responsive glass-panel">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>NIK</th>
                        <th>Nama Lengkap</th>
                        <th>Role</th>
                        <th style={{textAlign: 'center'}}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentUsers.map((user, idx) => (
                        <tr key={idx}>
                          <td><strong>{user.nik}</strong></td>
                          <td>{user.name}</td>
                          <td><span className={`role-badge ${user.role}`}>{user.role}</span></td>
                          <td style={{textAlign: 'center'}}>
                            <div className="action-buttons">
                              <button 
                                className="action-btn edit" 
                                onClick={() => {
                                  setEditingUser({...user});
                                  setEditPassword('');
                                  setEditStatus(null);
                                }}
                                title="Edit User"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                className="action-btn delete" 
                                onClick={() => handleDeleteUser(user.nik, user.name)}
                                title="Hapus User"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {totalPages > 1 && (
                  <div className="pagination">
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span>Halaman {currentPage} dari {totalPages}</span>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <p>Tidak ada user ditemukan.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'add' && (
        <div className="add-section glass-panel">
          <h3>Form Penambahan User</h3>
          
          {addStatus && (
            <div className={`notification ${addStatus.type}`}>
              {addStatus.msg}
            </div>
          )}
          
          <form onSubmit={handleAddUser} className="standard-form">
            <div className="form-group">
              <label>NIK</label>
              <input type="text" value={newNik} onChange={e=>setNewNik(e.target.value)} placeholder="Masukkan NIK" required />
            </div>
            <div className="form-group">
              <label>Nama Lengkap</label>
              <input type="text" value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Masukkan Nama" required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="text" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Buat Password" required />
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
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan User Baru'}
            </button>
          </form>
        </div>
      )}

      {/* Modal Edit User */}
      {editingUser && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>Edit User</h3>
              <button className="close-btn" onClick={() => setEditingUser(null)}><X size={20} /></button>
            </div>
            
            {editStatus && (
              <div className={`notification ${editStatus.type}`}>
                {editStatus.msg}
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="standard-form">
              <div className="form-group">
                <label>NIK (Tidak bisa diubah)</label>
                <input type="text" value={editingUser.nik} disabled className="disabled-input" />
              </div>
              <div className="form-group">
                <label>Nama Lengkap</label>
                <input 
                  type="text" 
                  value={editingUser.name} 
                  onChange={e=>setEditingUser({...editingUser, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Password (Kosongi jika tidak diubah)</label>
                <input 
                  type="text" 
                  value={editPassword} 
                  onChange={e=>setEditPassword(e.target.value)} 
                  placeholder="Ketik password baru..." 
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select 
                  value={editingUser.role} 
                  onChange={e=>setEditingUser({...editingUser, role: e.target.value})}
                >
                  <option value="admin">Admin</option>
                  <option value="qc">QC RMFG</option>
                  <option value="ppic">PPIC</option>
                  <option value="wh">Warehouse</option>
                </select>
              </div>
              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Update Data'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
