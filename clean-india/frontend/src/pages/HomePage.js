import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import './HomePage.css';

const STATS_INITIAL = { totalUploads: 0, totalUsers: 0, totalPoints: 0 };

const HomePage = () => {
  const [stats, setStats] = useState(STATS_INITIAL);

  useEffect(() => {
    api.get('/uploads/stats').then(({ data }) => {
      if (data.success) setStats(data.stats);
    }).catch(() => {});
  }, []);

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1"></div>
          <div className="hero-orb hero-orb-2"></div>
          <div className="hero-grid"></div>
        </div>
        <div className="container hero-content">
          <div className="hero-badge">
            <span>🇮🇳</span> Swachh Bharat Initiative
          </div>
          <h1 className="hero-title">
            Make India Clean.<br />
            <span className="gradient-text">Earn Rewards.</span>
          </h1>
          <p className="hero-subtitle">
            Upload proof of proper waste disposal and earn points, badges, and climb the leaderboard.
            Every dustbin drop counts — together we can transform India.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary hero-btn">
              Start Earning Points 🌱
            </Link>
            <Link to="/leaderboard" className="btn btn-secondary hero-btn">
              View Leaderboard
            </Link>
          </div>

          {/* Stats Bar */}
          <div className="stats-bar">
            <div className="stat-item">
              <span className="stat-number">{stats.totalUploads.toLocaleString()}+</span>
              <span className="stat-label">Verified Uploads</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">{stats.totalUsers.toLocaleString()}+</span>
              <span className="stat-label">Active Warriors</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">{stats.totalPoints.toLocaleString()}+</span>
              <span className="stat-label">Points Earned</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works container">
        <div className="section-header">
          <h2 className="section-title">How It Works</h2>
          <p className="section-sub">Three simple steps to make a difference</p>
        </div>
        <div className="steps-grid">
          {[
            { step: '01', icon: '📸', title: 'Capture & Upload', desc: 'Take a photo or video of yourself disposing waste in a dustbin. Include GPS location for bonus points.' },
            { step: '02', icon: '🤖', title: 'AI Verification', desc: 'Our AI instantly checks if your upload shows actual waste disposal. Verified uploads earn points automatically.' },
            { step: '03', icon: '🏆', title: 'Earn & Compete', desc: 'Collect points, build streaks, unlock badges, and compete on local and global leaderboards.' },
          ].map(({ step, icon, title, desc }) => (
            <div className="step-card" key={step}>
              <div className="step-number">{step}</div>
              <div className="step-icon">{icon}</div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Everything You Need</h2>
          </div>
          <div className="features-grid">
            {[
              { icon: '🎯', title: 'Points System', desc: '10 points per valid upload, bonus for streaks' },
              { icon: '🔥', title: 'Daily Streaks', desc: 'Upload every day to multiply your rewards' },
              { icon: '🏅', title: '9+ Badges', desc: 'Unlock achievements as you progress' },
              { icon: '🌍', title: 'City Rankings', desc: 'Compete locally or globally' },
              { icon: '🤖', title: 'AI Verification', desc: 'Instant, fair automated checking' },
              { icon: '📍', title: 'GPS Tracking', desc: 'Location-based impact mapping' },
              { icon: '👥', title: 'Social Sharing', desc: 'Invite friends with referral codes' },
              { icon: '📊', title: 'Admin Panel', desc: 'Full moderation & analytics' },
            ].map(({ icon, title, desc }) => (
              <div className="feature-card" key={title}>
                <span className="feature-icon">{icon}</span>
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section container">
        <div className="cta-card">
          <div className="cta-orb"></div>
          <h2>Ready to Clean India?</h2>
          <p>Join thousands of Eco Warriors already making a difference.</p>
          <Link to="/register" className="btn btn-primary">Create Free Account</Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
