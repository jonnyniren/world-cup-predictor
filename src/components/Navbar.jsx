import React, { useState, useEffect, useRef } from 'react';

const PROFILES_KEY = 'wc2026_profiles';

const AVATARS = [
  '⚽','🏆','🦁','🐯','🦅','🌟','👑','🔥','⭐','🎯','💪','🎪',
  '🦊','🐺','🦋','🌈','🚀','🦄','🐉','⚡','🌊','🎨','🦸','🥊',
  '🎉','🎸','🏄','🤿','🧗','🏋️','🤸','🥋','🎻','🎺','🥁','🎮',
  '🌴','🍕','🍦','🌮','🐬','🦈','🦁','🐘','🦒','🦓','🌺','🍀',
];

function getStoredProfiles() {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]'); } catch { return []; }
}

function Avatar({ value, className, style }) {
  const v = value || '⚽';
  if (v.startsWith('&') || v.startsWith('&#')) {
    return <span className={className} style={style} dangerouslySetInnerHTML={{ __html: v }} />;
  }
  return <span className={className} style={style}>{v}</span>;
}

export default function Navbar({ activeTab, setActiveTab, user, onSwitchProfile, onAddProfile, onUpdateProfile }) {
  const [showModal, setShowModal] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editError, setEditError] = useState('');
  const modalRef = useRef(null);

  useEffect(() => {
    if (showModal) {
      setProfiles(getStoredProfiles());
      setEditing(false);
      setEditError('');
    }
  }, [showModal]);

  useEffect(() => {
    if (!showModal) return;
    function handle(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) setShowModal(false);
    }
    document.addEventListener('mousedown', handle);
    document.addEventListener('touchstart', handle);
    return () => { document.removeEventListener('mousedown', handle); document.removeEventListener('touchstart', handle); };
  }, [showModal]);

  function startEdit() {
    setEditName(user?.name || '');
    setEditAvatar(user?.avatar || '⚽');
    setEditError('');
    setEditing(true);
  }

  async function submitEdit(e) {
    e.preventDefault();
    const trimmed = editName.trim();
    if (!trimmed) { setEditError('Name cannot be empty'); return; }
    if (trimmed.length < 2) { setEditError('At least 2 characters'); return; }
    if (trimmed.length > 20) { setEditError('20 characters max'); return; }
    await onUpdateProfile({ ...user, name: trimmed, avatar: editAvatar });
    setProfiles(getStoredProfiles());
    setEditing(false);
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-header">
          <span className="navbar-title">⚽ World Cup 2026 🏆</span>
          {user && (
            <button className="profile-btn" onClick={() => setShowModal(true)} aria-label="Switch profile">
              <Avatar value={user.avatar} className="navbar-avatar" />
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

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-sheet" ref={modalRef}>
            <div className="modal-handle" />

            {editing ? (
              <>
                <h3 className="modal-title">Edit Profile</h3>
                <form onSubmit={submitEdit}>
                  <label className="welcome-label" style={{ marginTop: 0 }}>Your Name</label>
                  <input
                    className="welcome-input"
                    value={editName}
                    onChange={e => { setEditName(e.target.value); setEditError(''); }}
                    maxLength={20}
                    autoFocus
                    placeholder="Your name"
                  />
                  {editError && (
                    <p style={{ color: '#e63946', fontSize: '0.85rem', fontWeight: 600, marginTop: -12, marginBottom: 12 }}>{editError}</p>
                  )}
                  <label className="welcome-label">Pick Your Avatar</label>
                  <div className="avatar-grid">
                    {AVATARS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        className={`avatar-btn${editAvatar === emoji ? ' selected' : ''}`}
                        onClick={() => setEditAvatar(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
                    <button type="button" className="btn" style={{ flex: 1, background: '#eee', color: '#333' }}
                      onClick={() => setEditing(false)}>Cancel</button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h3 className="modal-title">Switch Player</h3>
                <div className="profile-list">
                  {profiles.map(p => (
                    <button
                      key={p.id}
                      className={`profile-item${user && p.id === user.id ? ' active' : ''}`}
                      onClick={() => { if (!user || p.id !== user.id) { onSwitchProfile(p); setShowModal(false); } }}
                      style={{ cursor: user && p.id === user.id ? 'default' : 'pointer' }}
                    >
                      <Avatar value={p.avatar} className="profile-item-avatar" />
                      <span className="profile-item-name">{p.name}</span>
                      {user && p.id === user.id && <span className="profile-item-badge">Playing</span>}
                    </button>
                  ))}
                </div>

                <button
                  className="btn btn-secondary btn-full"
                  style={{ marginTop: 8, background: '#f0f0f0', color: '#333' }}
                  onClick={startEdit}
                >
                  ✏️ Edit Profile
                </button>

                <button
                  className="btn btn-primary btn-full"
                  style={{ marginTop: 8 }}
                  onClick={() => { setShowModal(false); onAddProfile(); }}
                >
                  ➕ Add New Player
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
