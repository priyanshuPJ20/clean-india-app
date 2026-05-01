import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import './LeaderboardPage.css';

const TABS = [
  { key: 'global', label: '🌍 Global' },
  { key: 'monthly', label: '📅 Monthly' },
  { key: 'city', label: '🏙️ By City' },
];

const FILTERS = [
  { key: 'points', label: 'Points' },
  { key: 'uploads', label: 'Uploads' },
  { key: 'streaks', label: 'Streaks' },
];

const RankBadge = ({ rank }) => {
  if (rank === 1) return <span className="rank-medal">🥇</span>;
  if (rank === 2) return <span className="rank-medal">🥈</span>;
  if (rank === 3) return <span className="rank-medal">🥉</span>;
  return <span className="rank-number">#{rank}</span>;
};

const UserRow = ({ entry, filter }) => (
  <Link to={`/profile/${entry._id}`} className="leaderboard-row">
    <div className="lb-rank"><RankBadge rank={entry.rank} /></div>
    <div className="lb-user">
      <div className="lb-avatar">
        {entry.profilePicture
          ? <img src={entry.profilePicture} alt={entry.username} />
          : <span>{entry.username?.[0]?.toUpperCase()}</span>}
      </div>
      <div className="lb-user-info">
        <span className="lb-username">{entry.username}</span>
        <span className="lb-location text-muted text-xs">{entry.city || 'Unknown city'}</span>
      </div>
    </div>
    <div className="lb-badges">
      {entry.badges?.slice(0, 3).map((b) => (
        <span key={b.id} title={b.name}>{b.icon}</span>
      ))}
    </div>
    <div className="lb-stat">
      {filter === 'points' && <span className="lb-points">⭐ {(entry.points || 0).toLocaleString()}</span>}
      {filter === 'uploads' && <span className="lb-points">✅ {entry.approvedUploads || 0}</span>}
      {filter === 'streaks' && <span className="lb-points">🔥 {entry.longestStreak || 0} days</span>}
      {filter === 'monthly' && <span className="lb-points">⭐ {(entry.monthlyPoints || 0).toLocaleString()}</span>}
    </div>
  </Link>
);

const LeaderboardPage = () => {
  const [tab, setTab] = useState('global');
  const [filter, setFilter] = useState('points');
  const [data, setData] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState(null);
  const { token } = useAuthStore();

  useEffect(() => {
    api.get('/leaderboard/cities').then(({ data }) => setCities(data.cities || []));
    if (token) api.get('/leaderboard/my-rank').then(({ data }) => setMyRank(data)).catch(() => {});
  }, [token]);

  useEffect(() => {
    setLoading(true);
    let endpoint = '';
    if (tab === 'global') endpoint = `/leaderboard/global?filter=${filter}`;
    else if (tab === 'monthly') endpoint = `/leaderboard/monthly`;
    else if (tab === 'city' && selectedCity) endpoint = `/leaderboard/city/${encodeURIComponent(selectedCity)}`;
    else { setLoading(false); return; }

    api.get(endpoint)
      .then(({ data }) => setData(data.leaderboard || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [tab, filter, selectedCity]);

  return (
    <div className="leaderboard-page page">
      <div className="container">
        <div className="lb-header">
          <div>
            <h1 className="page-title">🏆 Leaderboard</h1>
            <p className="text-secondary">Top Eco Warriors making India cleaner</p>
          </div>
          {myRank && (
            <div className="my-rank-card">
              <span className="text-xs text-muted">Your Rank</span>
              <span className="my-rank-num">#{myRank.globalRank}</span>
              {myRank.cityRank && <span className="text-xs text-muted">City: #{myRank.cityRank}</span>}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="lb-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`lb-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        {tab === 'global' && (
          <div className="lb-filters">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`filter-btn ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* City selector */}
        {tab === 'city' && (
          <div className="city-select-wrapper">
            <select
              className="form-input city-select"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
            >
              <option value="">— Select a city —</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        {/* Top 3 Podium */}
        {!loading && data.length >= 3 && tab !== 'city' && (
          <div className="podium">
            {[data[1], data[0], data[2]].map((entry, i) => {
              const pos = [2, 1, 3][i];
              const heights = ['160px', '200px', '140px'];
              return (
                <Link to={`/profile/${entry._id}`} key={entry._id} className={`podium-place podium-${pos}`}>
                  <div className="podium-avatar">
                    {entry.profilePicture
                      ? <img src={entry.profilePicture} alt={entry.username} />
                      : <span>{entry.username?.[0]?.toUpperCase()}</span>}
                  </div>
                  <div className="podium-name">{entry.username}</div>
                  <div className="podium-score">⭐ {(entry.points || 0).toLocaleString()}</div>
                  <div className="podium-bar" style={{ height: heights[i] }}>
                    <span className="podium-medal">{['🥈', '🥇', '🥉'][i]}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* List */}
        <div className="lb-list">
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="leaderboard-row loading-shimmer" style={{ height: 68 }}></div>
            ))
          ) : data.length === 0 ? (
            <div className="lb-empty">
              {tab === 'city' && !selectedCity ? 'Select a city to view rankings' : 'No data available'}
            </div>
          ) : (
            data.map((entry) => (
              <UserRow key={entry._id} entry={entry} filter={tab === 'monthly' ? 'monthly' : filter} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
