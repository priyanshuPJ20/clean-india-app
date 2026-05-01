import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import './ProfilePage.css';

const ProfilePage = () => {
  const { id } = useParams();
  const { user: currentUser, refreshUser } = useAuthStore();
  const isOwn = !id || id === currentUser?._id;
  const userId = id || currentUser?._id;

  const [profile, setProfile] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: '', city: '', country: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    const profileReq = isOwn ? api.get('/auth/me') : api.get(`/users/${userId}`);
    Promise.all([
      profileReq,
      api.get(`/uploads/me?limit=20`),
    ]).then(([pRes, uRes]) => {
      const p = pRes.data.user;
      setProfile(p);
      setForm({ username: p.username, city: p.city || '', country: p.country || 'India' });
      if (isOwn) setUploads(uRes.data.uploads || []);
    }).catch(() => toast.error('Could not load profile'))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/auth/profile', form);
      setProfile(data.user);
      setEditing(false);
      refreshUser();
      toast.success('Profile updated!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="profile-page page">
      <div className="container">
        <div className="loading-shimmer" style={{ height: 200, borderRadius: 16, marginBottom: 16 }}></div>
        <div className="loading-shimmer" style={{ height: 400, borderRadius: 16 }}></div>
      </div>
    </div>
  );

  if (!profile) return <div className="profile-page page"><div className="container"><p>User not found.</p></div></div>;

  const levelColors = { 'Beginner': '#94a3b8', 'Eco Warrior': '#4ade80', 'Green Champion': '#10b981', 'Earth Guardian': '#f59e0b', 'Planet Hero': '#8b5cf6' };
  const levelColor = levelColors[profile.level] || '#4ade80';

  return (
    <div className="profile-page page">
      <div className="container">
        {/* Profile Header */}
        <div className="profile-header card">
          <div className="profile-cover" style={{ background: `linear-gradient(135deg, ${levelColor}22, transparent)` }}></div>
          <div className="profile-info">
            <div className="profile-avatar-wrap">
              {profile.profilePicture
                ? <img src={profile.profilePicture} alt={profile.username} className="profile-avatar" />
                : <div className="profile-avatar-placeholder">{profile.username?.[0]?.toUpperCase()}</div>}
            </div>
            <div className="profile-details">
              {editing ? (
                <div className="edit-form">
                  <div className="edit-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Username</label>
                      <input className="form-input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">City</label>
                      <input className="form-input" value={form.city} placeholder="Mumbai" onChange={e => setForm({ ...form, city: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Country</label>
                      <input className="form-input" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
                    </div>
                  </div>
                  <div className="edit-actions">
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                    <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="profile-name-row">
                    <h1 className="profile-username">{profile.username}</h1>
                    <span className="badge" style={{ background: `${levelColor}22`, color: levelColor, border: `1px solid ${levelColor}44` }}>{profile.level}</span>
                    {isOwn && <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit Profile</button>}
                  </div>
                  {(profile.city || profile.country) && (
                    <p className="profile-location text-muted">📍 {[profile.city, profile.country].filter(Boolean).join(', ')}</p>
                  )}
                  <p className="profile-joined text-xs text-muted">Member since {formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true })}</p>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="profile-stats">
            {[
              { label: 'Total Points', value: (profile.points || 0).toLocaleString(), icon: '⭐' },
              { label: 'Approved', value: profile.approvedUploads || 0, icon: '✅' },
              { label: 'Streak', value: `${profile.currentStreak || 0}d`, icon: '🔥' },
              { label: 'Best Streak', value: `${profile.longestStreak || 0}d`, icon: '🏅' },
            ].map(({ label, value, icon }) => (
              <div className="profile-stat" key={label}>
                <span className="profile-stat-icon">{icon}</span>
                <span className="profile-stat-value">{value}</span>
                <span className="profile-stat-label">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        {profile.badges && profile.badges.length > 0 && (
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <h3 className="section-heading">Badges ({profile.badges.length})</h3>
            <div className="profile-badges">
              {profile.badges.map(badge => (
                <div className="profile-badge-item" key={badge.id} title={badge.description}>
                  <span className="badge-big-icon">{badge.icon}</span>
                  <span className="badge-big-name">{badge.name}</span>
                  <span className="badge-big-desc">{badge.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uploads Grid */}
        {isOwn && (
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <h3 className="section-heading">My Uploads ({uploads.length})</h3>
            {uploads.length === 0 ? (
              <div className="empty-state"><p>No uploads yet.</p></div>
            ) : (
              <div className="profile-uploads-grid">
                {uploads.map(upload => (
                  <div className="profile-upload-thumb" key={upload._id}>
                    <img src={upload.mediaUrl} alt="upload" loading="lazy" />
                    <div className={`upload-overlay ${upload.status}`}>
                      <span>{upload.status === 'approved' ? '✅' : upload.status === 'rejected' ? '❌' : '⏳'}</span>
                      {upload.pointsAwarded > 0 && <span className="pts-label">+{upload.pointsAwarded}pts</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
