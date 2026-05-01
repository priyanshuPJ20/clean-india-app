import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import './Navbar.css';

const Navbar = () => {
  const { user, token, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">♻️</span>
          <span className="logo-text">Clean<span className="logo-accent">India</span></span>
        </Link>

        <div className="navbar-links">
          <Link to="/feed" className={`nav-link ${isActive('/feed') ? 'active' : ''}`}>Feed</Link>
          <Link to="/leaderboard" className={`nav-link ${isActive('/leaderboard') ? 'active' : ''}`}>Leaderboard</Link>
          {token && (
            <>
              <Link to="/upload" className={`nav-link ${isActive('/upload') ? 'active' : ''}`}>Upload</Link>
              <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>Dashboard</Link>
            </>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin" className={`nav-link admin-link ${isActive('/admin') ? 'active' : ''}`}>Admin</Link>
          )}
        </div>

        <div className="navbar-actions">
          {token && user ? (
            <div className="user-menu">
              <Link to="/profile" className="user-avatar-btn">
                {user.profilePicture ? (
                  <img src={user.profilePicture} alt={user.username} className="nav-avatar" />
                ) : (
                  <div className="nav-avatar-placeholder">{user.username?.[0]?.toUpperCase()}</div>
                )}
                <div className="user-info">
                  <span className="user-name">{user.username}</span>
                  <span className="user-points">⭐ {user.points?.toLocaleString()}</span>
                </div>
              </Link>
              <button onClick={handleLogout} className="btn-logout">Logout</button>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-secondary btn-sm">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
            </div>
          )}

          <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="mobile-menu">
          <Link to="/feed" onClick={() => setMenuOpen(false)}>📸 Feed</Link>
          <Link to="/leaderboard" onClick={() => setMenuOpen(false)}>🏆 Leaderboard</Link>
          {token ? (
            <>
              <Link to="/upload" onClick={() => setMenuOpen(false)}>⬆️ Upload</Link>
              <Link to="/dashboard" onClick={() => setMenuOpen(false)}>📊 Dashboard</Link>
              <Link to="/profile" onClick={() => setMenuOpen(false)}>👤 Profile</Link>
              {user?.role === 'admin' && (
                <Link to="/admin" onClick={() => setMenuOpen(false)}>⚙️ Admin</Link>
              )}
              <button onClick={handleLogout}>🚪 Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)}>Register</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
