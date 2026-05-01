import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../utils/api';
import './DashboardPage.css';

const LEVEL_MAP = {
  'Beginner': { color: '#94a3b8', icon: '🌱', next: 100 },
  'Eco Warrior': { color: '#4ade80', icon: '⚔️', next: 500 },
  'Green Champion': { color: '#10b981', icon: '🏅', next: 1000 },
  'Earth Guardian': { color: '#f59e0b', icon: '🛡️', next: 2500 },
  'Planet Hero': { color: '#8b5cf6', icon: '🦸', next: Infinity },
};

const LEVEL_THRESHOLDS = [0, 100, 500, 1000, 2500];
const LEVEL_NAMES = ['Beginner', 'Eco Warrior', 'Green Champion', 'Earth Guardian', 'Planet Hero'];

const getProgress = (points) => {
  const levelIdx = LEVEL_THRESHOLDS.findLastIndex(t => points >= t);
  const current = LEVEL_THRESHOLDS[levelIdx];
  const next = LEVEL_THRESHOLDS[levelIdx + 1] || points;
  const progress = next === points ? 100 : ((points - current) / (next - current)) * 100;
  return { levelName: LEVEL_NAMES[levelIdx], progress: Math.round(progress), pointsToNext: Math.max(0, next - points) };
};

const DashboardPage = () => {
  const { user, refreshUser } = useAuthStore();
  const [uploads, setUploads] = useState([]);
  const [rank, setRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshUser();
    Promise.all([
      api.get('/uploads/me?limit=6'),
      api.get('/leaderboard/my-rank'),
    ]).then(([uploadsRes, rankRes]) => {
      setUploads(uploadsRes.data.uploads || []);
      setRank(rankRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  const levelInfo = getProgress(user.points || 0);
  const levelMeta = LEVEL_MAP[levelInfo.levelName] || LEVEL_MAP['Beginner'];

  return (
    <div className="dashboard-page page">
      <div className="container">
        {/* Welcome Banner */}
        <div className="welcome-banner">
          <div className="welcome-left">
            <div className="welcome-avatar">
              {user.profilePicture
                ? <img src={user.profilePicture} alt={user.username} />
                : <span>{user.username?.[0]?.toUpperCase()}</span>}
            </div>
            <div>
              <h1>Welcome back, <span className="text-green">{user.username}</span> 👋</h1>
              <p className="text-secondary">{levelMeta.icon} {levelInfo.levelName} • {user.city || 'Add your city'}</p>
            </div>
          </div>
          <Link to="/upload" className="btn btn-primary upload-cta-btn">
            + Upload Proof
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="dashboard-stats">
          {[
            { label: 'Total Points', value: (user.points || 0).toLocaleString(), icon: '⭐', color: 'gold' },
            { label: 'Approved Uploads', value: user.approvedUploads || 0, icon: '✅', color: 'green' },
            { label: 'Current Streak', value: `${user.currentStreak || 0} days`, icon: '🔥', color: 'orange' },
            { label: 'Global Rank', value: rank?.globalRank ? `#${rank.globalRank}` : '—', icon: '🏆', color: 'purple' },
          ].map(({ label, value, icon, color }) => (
            <div className={`stat-card stat-${color}`} key={label}>
              <div className="stat-icon-circle">{icon}</div>
              <div className="stat-value">{value}</div>
              <div className="stat-label-text">{label}</div>
            </div>
          ))}
        </div>

        {/* Level Progress */}
        <div className="level-card card">
          <div className="level-header">
            <div>
              <h3>{levelMeta.icon} {levelInfo.levelName}</h3>
              {levelInfo.pointsToNext > 0 && (
                <p className="text-secondary text-sm">{levelInfo.pointsToNext} points to next level</p>
              )}
            </div>
            <div className="level-points">{(user.points || 0).toLocaleString()} pts</div>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${levelInfo.progress}%` }}></div>
          </div>
          <div className="level-labels">
            {LEVEL_NAMES.map((name, i) => (
              <span key={name} className={`level-dot ${LEVEL_NAMES.indexOf(levelInfo.levelName) >= i ? 'active' : ''}`}
                title={name}>
                {LEVEL_MAP[name].icon}
              </span>
            ))}
          </div>
        </div>

        <div className="dashboard-lower">
          {/* Badges */}
          <div className="badges-section card">
            <h3 className="section-heading">Your Badges</h3>
            {user.badges && user.badges.length > 0 ? (
              <div className="badges-grid">
                {user.badges.map((badge) => (
                  <div className="badge-item" key={badge.id} title={badge.description}>
                    <span className="badge-icon-large">{badge.icon}</span>
                    <span className="badge-name">{badge.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No badges yet. Keep uploading! 🌱</p>
              </div>
            )}
          </div>

          {/* Streak & Referral */}
          <div className="side-cards">
            <div className="streak-card card">
              <h3 className="section-heading">🔥 Streak</h3>
              <div className="streak-display">
                <div className="streak-main">{user.currentStreak || 0}</div>
                <div className="text-secondary text-sm">day streak</div>
              </div>
              <div className="streak-meta">
                <div>
                  <div className="text-xs text-muted">Longest</div>
                  <div className="font-bold">{user.longestStreak || 0} days</div>
                </div>
                <div>
                  <div className="text-xs text-muted">City Rank</div>
                  <div className="font-bold">{rank?.cityRank ? `#${rank.cityRank}` : '—'}</div>
                </div>
              </div>
            </div>

            <div className="referral-card card">
              <h3 className="section-heading">👥 Refer Friends</h3>
              <p className="text-secondary text-sm mb-2">Share your code and earn 25 bonus points per referral</p>
              <div className="referral-code">
                <code>{user.referralCode}</code>
                <button onClick={() => { navigator.clipboard.writeText(user.referralCode); }} className="copy-btn">Copy</button>
              </div>
              <p className="text-xs text-muted mt-1">{user.referralCount || 0} friends referred</p>
            </div>
          </div>
        </div>

        {/* Recent Uploads */}
        <div className="recent-uploads card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="section-heading" style={{ marginBottom: 0 }}>Recent Uploads</h3>
            <Link to="/profile" className="text-sm text-green">View all →</Link>
          </div>
          {loading ? (
            <div className="uploads-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="upload-thumb loading-shimmer" style={{ height: 140, borderRadius: 12 }}></div>
              ))}
            </div>
          ) : uploads.length === 0 ? (
            <div className="empty-state">
              <p>No uploads yet. <Link to="/upload" className="text-green">Upload your first proof!</Link></p>
            </div>
          ) : (
            <div className="uploads-grid">
              {uploads.map((upload) => (
                <div className="upload-thumb" key={upload._id}>
                  <img src={upload.mediaUrl} alt="upload" />
                  <div className={`upload-status-badge badge ${upload.status === 'approved' ? 'badge-green' : upload.status === 'rejected' ? 'badge-red' : 'badge-gold'}`}>
                    {upload.status}
                  </div>
                  {upload.pointsAwarded > 0 && (
                    <div className="upload-points">+{upload.pointsAwarded}pts</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
