import React, { useState, useEffect, useRef } from 'react';

const PROFILES_KEY = 'wc2026_profiles';

function getSyncCode(userId) {
  if (!userId) return '';
  return userId.replace(/-/g, '').slice(0, 4).toUpperCase();
}

function getStoredProfiles() {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]'); } catch { return []; }
}

export default function Navbar({ activeTab, setActiveTab, user, onSwitchProfile, onAddProfile }) {
  const [showModal, setShowModal] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [copied, setCopied] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    if (showModal) setProfiles(getStoredProfiles());
  }, [showModal]);

  // Close modal on outside tap
  useEffect(() => {
    if (!showModal) return;
    function handle(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) setShowModal(false);
    }
    document.addEventListener('mousedown', handle);
    document.addEventListener('touchstart', handle);
    return () => { document.removeEventListener('mousedown', handle); document.removeEventListener('touchstart', handle); };
  }, [showModal]);

  function copySyncCode() {
    const code = getSyncCode(user?.id);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    }
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-header">
          <span className="navbar-title">⚽ World Cup 2026 🏆</span>
          {user && (
            <button className="profile-btn" onClick={() => setShowModal(true)} aria-label="Switch profile">
              <span className="navbar-avatar">{user.avatar}</span>
              <span className="profile-btn-name">{user.name}</span>
              <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>▼</span>
            </button>
          )}
        </div>
        <div className="navbar-tabs">
          <button className={`navbar-tab${activeTab === 'fixtures' ? ' active' : ''}`} onClick={() => setActiveTab('fixtures')}>
            📅 Fixtures
          </button>
          <button className={`navbar-tab${activeTab === 'leaderboard' ? ' active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
            🏆 Leaderboard
          </button>
        </div>
      </nav>

      {/* Profile switcher modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-sheet" ref={modalRef}>
            <div className="modal-handle" />
            <h3 className="modal-title">Switch Player</h3>

            <div className="profile-list">
              {profiles.map(p => (
                <button
                  key={p.id}
                  className={`profile-item${user && p.id === user.id ? ' active' : ''}`}
                  onClick={() => { onSwitchProfile(p); setShowModal(false); }}
                >
                  <span className="profile-item-avatar">{p.avatar}</span>
                  <span className="profile-item-name">{p.name}</span>
                  {user && p.id === user.id && <span className="profile-item-badge">Playing</span>}
                </button>
              ))}
            </div>

            <button
              className="btn btn-primary btn-full"
              style={{ marginTop: 8 }}
              onClick={() => { setShowModal(false); onAddProfile(); }}
            >
              ➕ Add New Player
            </button>

            {/* Sync code */}
            <div className="sync-code-box">
              <div className="sync-code-label">Your sync code</div>
              <div className="sync-code-row">
                <span className="sync-code-value">{getSyncCode(user?.id)}</span>
                <button className="sync-copy-btn" onClick={copySyncCode}>
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
              <div className="sync-code-hint">Use this code to restore your profile on another device</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
