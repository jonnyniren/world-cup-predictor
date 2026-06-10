import React from 'react';

export default function Navbar({ activeTab, setActiveTab, user }) {
  return (
    <nav className="navbar">
      <div className="navbar-header">
        <span className="navbar-title">⚽ World Cup 2026 Predictor 🏆</span>
        {user && (
          <div className="navbar-user">
            <span className="navbar-avatar">{user.avatar}</span>
            <span>{user.name}</span>
          </div>
        )}
      </div>
      <div className="navbar-tabs">
        <button
          className={`navbar-tab${activeTab === 'fixtures' ? ' active' : ''}`}
          onClick={() => setActiveTab('fixtures')}
        >
          📅 Fixtures
        </button>
        <button
          className={`navbar-tab${activeTab === 'leaderboard' ? ' active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 Leaderboard
        </button>
      </div>
    </nav>
  );
}
