import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import './FeedPage.css';

const UploadCard = ({ upload, onLike }) => {
  const { user: currentUser } = useAuthStore();
  const liked = currentUser && upload.likes?.includes(currentUser.id);

  return (
    <div className="feed-card">
      <div className="feed-card-header">
        <Link to={`/profile/${upload.user?._id}`} className="feed-user">
          <div className="feed-avatar">
            {upload.user?.profilePicture
              ? <img src={upload.user.profilePicture} alt={upload.user.username} />
              : <span>{upload.user?.username?.[0]?.toUpperCase()}</span>}
          </div>
          <div>
            <div className="feed-username">{upload.user?.username}</div>
            <div className="feed-meta text-xs text-muted">
              {upload.user?.city && `📍 ${upload.user.city} • `}
              {formatDistanceToNow(new Date(upload.createdAt), { addSuffix: true })}
            </div>
          </div>
        </Link>
        {upload.pointsAwarded > 0 && (
          <span className="feed-points badge badge-gold">+{upload.pointsAwarded} pts</span>
        )}
      </div>

      <div className="feed-media">
        {upload.mediaType === 'video' ? (
          <video src={upload.mediaUrl} controls muted playsInline />
        ) : (
          <img src={upload.mediaUrl} alt="disposal proof" loading="lazy" />
        )}
      </div>

      {upload.caption && (
        <div className="feed-caption">{upload.caption}</div>
      )}

      <div className="feed-card-footer">
        <button
          className={`like-btn ${liked ? 'liked' : ''}`}
          onClick={() => onLike(upload._id)}
          disabled={!currentUser}
        >
          {liked ? '❤️' : '🤍'} {upload.likesCount || upload.likes?.length || 0}
        </button>
        {upload.location?.city && (
          <span className="text-xs text-muted">📍 {upload.location.city}</span>
        )}
      </div>
    </div>
  );
};

const FeedPage = () => {
  const [uploads, setUploads] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/uploads/feed?page=${p}&limit=12`);
      if (p === 1) setUploads(data.uploads);
      else setUploads((prev) => [...prev, ...data.uploads]);
      setHasMore(p < data.pagination.pages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFeed(1); }, [fetchFeed]);

  const handleLike = async (id) => {
    try {
      const { data } = await api.post(`/uploads/${id}/like`);
      setUploads((prev) =>
        prev.map((u) =>
          u._id === id
            ? { ...u, likes: data.liked ? [...(u.likes || []), 'me'] : (u.likes || []).slice(0, -1), likesCount: data.likesCount }
            : u
        )
      );
    } catch (e) { /* ignore auth errors */ }
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchFeed(next);
  };

  return (
    <div className="feed-page page">
      <div className="container">
        <div className="feed-header">
          <h1 className="page-title">🌍 Community Feed</h1>
          <p className="text-secondary">See what Eco Warriors are doing across India</p>
        </div>

        {loading && uploads.length === 0 ? (
          <div className="feed-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="feed-card loading-shimmer" style={{ height: 360 }}></div>
            ))}
          </div>
        ) : uploads.length === 0 ? (
          <div className="feed-empty">
            <div style={{ fontSize: '3rem' }}>🌱</div>
            <h3>No uploads yet</h3>
            <p>Be the first to share your waste disposal proof!</p>
            <Link to="/upload" className="btn btn-primary">Upload Now</Link>
          </div>
        ) : (
          <>
            <div className="feed-grid">
              {uploads.map((upload) => (
                <UploadCard key={upload._id} upload={upload} onLike={handleLike} />
              ))}
            </div>
            {hasMore && (
              <div className="load-more">
                <button className="btn btn-secondary" onClick={loadMore} disabled={loading}>
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FeedPage;
