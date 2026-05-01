import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../utils/api';
import './AdminPage.css';

const TABS = ['Dashboard', 'Pending Reviews', 'Users'];

const AdminPage = () => {
  const [tab, setTab] = useState('Dashboard');
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTabData();
  }, [tab]);

  const fetchTabData = async () => {
    setLoading(true);
    try {
      if (tab === 'Dashboard') {
        const { data } = await api.get('/admin/dashboard');
        setStats(data.stats);
      } else if (tab === 'Pending Reviews') {
        const { data } = await api.get('/admin/uploads/pending?limit=20');
        setPending(data.uploads || []);
      } else if (tab === 'Users') {
        const { data } = await api.get('/admin/users?limit=30');
        setUsers(data.users || []);
      }
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const reviewUpload = async (id, action, reason = '') => {
    try {
      await api.patch(`/admin/uploads/${id}/review`, { action, reason });
      toast.success(`Upload ${action}d`);
      setPending(prev => prev.filter(u => u._id !== id));
    } catch (e) {
      toast.error('Review failed');
    }
  };

  const banUser = async (id, username) => {
    const reason = prompt(`Ban reason for ${username}:`);
    if (!reason) return;
    try {
      await api.patch(`/admin/users/${id}/ban`, { reason });
      toast.success(`${username} banned`);
      setUsers(prev => prev.map(u => u._id === id ? { ...u, isBanned: true, banReason: reason } : u));
    } catch (e) { toast.error('Failed'); }
  };

  const unbanUser = async (id, username) => {
    try {
      await api.patch(`/admin/users/${id}/unban`);
      toast.success(`${username} unbanned`);
      setUsers(prev => prev.map(u => u._id === id ? { ...u, isBanned: false } : u));
    } catch (e) { toast.error('Failed'); }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-page page">
      <div className="container">
        <div className="admin-header">
          <h1 className="page-title">⚙️ Admin Panel</h1>
          <p className="text-secondary">Manage uploads, users and platform health</p>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          {TABS.map(t => (
            <button key={t} className={`admin-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {loading ? (
          <div className="loading-shimmer" style={{ height: 400, borderRadius: 16 }}></div>
        ) : (
          <>
            {/* Dashboard */}
            {tab === 'Dashboard' && stats && (
              <div className="admin-dashboard">
                <div className="admin-stats-grid">
                  {[
                    { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'blue' },
                    { label: 'Total Uploads', value: stats.totalUploads, icon: '📸', color: 'green' },
                    { label: 'Pending Reviews', value: stats.pendingReviews, icon: '⏳', color: 'gold' },
                    { label: 'Approved Today', value: stats.approvedToday, icon: '✅', color: 'green' },
                    { label: 'Total Rejected', value: stats.rejectedTotal, icon: '❌', color: 'red' },
                  ].map(({ label, value, icon, color }) => (
                    <div className={`admin-stat-card stat-${color}`} key={label}>
                      <div className="admin-stat-icon">{icon}</div>
                      <div className="admin-stat-value">{value?.toLocaleString()}</div>
                      <div className="admin-stat-label">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="admin-lower">
                  <div className="card admin-trend">
                    <h3 className="section-heading">📈 Upload Trend (7 days)</h3>
                    <div className="trend-chart">
                      {stats.trend?.map(({ date, count }) => {
                        const max = Math.max(...stats.trend.map(t => t.count), 1);
                        return (
                          <div className="trend-bar-wrap" key={date}>
                            <div className="trend-bar" style={{ height: `${(count / max) * 120}px` }}>
                              <span className="trend-count">{count}</span>
                            </div>
                            <span className="trend-date">{date.slice(5)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="card admin-top-users">
                    <h3 className="section-heading">🏆 Top Users</h3>
                    {stats.topUsers?.map((u, i) => (
                      <div className="admin-user-row" key={u._id}>
                        <span className="admin-rank">#{i + 1}</span>
                        <span className="admin-uname">{u.username}</span>
                        <span className="text-gold">⭐ {u.points?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Pending Reviews */}
            {tab === 'Pending Reviews' && (
              <div className="pending-list">
                {pending.length === 0 ? (
                  <div className="empty-state"><p>🎉 No pending reviews!</p></div>
                ) : (
                  pending.map(upload => (
                    <div className="pending-card card" key={upload._id}>
                      <div className="pending-media">
                        <img src={upload.mediaUrl} alt="upload" />
                      </div>
                      <div className="pending-info">
                        <div className="pending-user">
                          <strong>{upload.user?.username}</strong>
                          <span className="text-muted text-sm">{upload.user?.email}</span>
                        </div>
                        <div className="pending-meta text-sm text-muted">
                          {formatDistanceToNow(new Date(upload.createdAt), { addSuffix: true })}
                          {upload.location?.city && ` · 📍 ${upload.location.city}`}
                        </div>
                        <div className="pending-ai">
                          <span className="text-xs text-muted">AI: </span>
                          <span className={`badge ${upload.aiVerification?.status === 'verified' ? 'badge-green' : upload.aiVerification?.status === 'rejected' ? 'badge-red' : 'badge-gold'}`}>
                            {upload.aiVerification?.status} ({upload.aiVerification?.confidence}%)
                          </span>
                          {upload.aiVerification?.dustbinDetected !== undefined && (
                            <span className="text-xs text-muted">
                              · Dustbin: {upload.aiVerification.dustbinDetected ? '✅' : '❌'}
                              · Garbage: {upload.aiVerification.garbageDetected ? '✅' : '❌'}
                            </span>
                          )}
                        </div>
                        {upload.aiVerification?.aiResponse && (
                          <p className="pending-ai-response text-sm text-muted">{upload.aiVerification.aiResponse}</p>
                        )}
                        {upload.caption && <p className="pending-caption text-sm">"{upload.caption}"</p>}
                        <div className="pending-actions">
                          <button className="btn btn-primary btn-sm" onClick={() => reviewUpload(upload._id, 'approve')}>✅ Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => {
                            const r = prompt('Rejection reason:');
                            if (r !== null) reviewUpload(upload._id, 'reject', r);
                          }}>❌ Reject</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Users */}
            {tab === 'Users' && (
              <div className="users-panel">
                <div className="users-search">
                  <input
                    className="form-input"
                    placeholder="Search by username or email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <div className="users-table">
                  <div className="users-table-header">
                    <span>User</span><span>Points</span><span>Uploads</span><span>Status</span><span>Actions</span>
                  </div>
                  {filteredUsers.map(u => (
                    <div className="users-table-row" key={u._id}>
                      <div className="user-cell">
                        <strong className="font-display">{u.username}</strong>
                        <span className="text-xs text-muted">{u.email}</span>
                        {u.role === 'admin' && <span className="badge badge-gold">admin</span>}
                      </div>
                      <div>⭐ {u.points?.toLocaleString()}</div>
                      <div>✅ {u.approvedUploads} / {u.totalUploads}</div>
                      <div>
                        {u.isBanned
                          ? <span className="badge badge-red">Banned</span>
                          : <span className="badge badge-green">Active</span>}
                      </div>
                      <div>
                        {u.isBanned
                          ? <button className="btn btn-outline btn-sm" onClick={() => unbanUser(u._id, u.username)}>Unban</button>
                          : <button className="btn btn-danger btn-sm" onClick={() => banUser(u._id, u.username)}>Ban</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
