import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase.js';

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
  // view: 'menu' | 'edit' | 'switch'
  const [view, setView] = useState('menu');

  // Edit profile state
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editError, setEditError] = useState('');

  // Switch player state
  const [searchName, setSearchName] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [verifyProfile, setVerifyProfile] = useState(null);
  const [verifyPin, setVerifyPin] = useState('');
  const [verifyError, setVerifyError] = useState('');

  const modalRef = useRef(null);

  function openModal() {
    setView('menu');
    setSearchName(''); setSearchResults(null); setSearchError(''); setVerifyProfile(null); setVerifyPin(''); setVerifyError('');
    setEditName(''); setEditAvatar(''); setEditError('');
    setShowModal(true);
  }

  useEffect(() => {
    if (!showModal) return;
    function handle(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) setShowModal(false);
    }
    document.addEventListener('mousedown', handle);
    document.addEventListener('touchstart', handle);
    return () => { document.removeEventListener('mousedown', handle); document.removeEventListener('touchstart', handle); };
  }, [showModal]);

  // Edit profile
  function startEdit() {
    setEditName(user?.name || '');
    setEditAvatar(user?.avatar || '⚽');
    setEditError('');
    setView('edit');
  }

  async function submitEdit(e) {
    e.preventDefault();
    const trimmed = editName.trim();
    if (!trimmed) { setEditError('Name cannot be empty'); return; }
    if (trimmed.length < 2) { setEditError('At least 2 characters'); return; }
    if (trimmed.length > 20) { setEditError('20 characters max'); return; }
    await onUpdateProfile({ ...user, name: trimmed, avatar: editAvatar });
    setShowModal(false);
  }

  // Switch player
  async function handleSearch(e) {
    e.preventDefault();
    const trimmed = searchName.trim();
    if (!trimmed) { setSearchError('Please enter a name'); return; }
    setSearchLoading(true); setSearchError(''); setSearchResults(null);
    try {
      const { data, error } = await supabase.from('users').select('*').ilike('name', `%${trimmed}%`);
      if (error) throw error;
      setSearchResults(data || []);
    } catch {
      setSearchError('Something went wrong. Please try again.');
    } finally { setSearchLoading(false); }
  }

  function selectProfile(p) {
    if (p.id === user?.id) return;
    if (p.pin) {
      setVerifyProfile(p); setVerifyPin(''); setVerifyError('');
    } else {
      onSwitchProfile(p); setShowModal(false);
    }
  }

  function handleVerifyPin(e) {
    e.preventDefault();
    if (verifyPin !== verifyProfile.pin) { setVerifyError('Incorrect PIN. Try again!'); return; }
    onSwitchProfile(verifyProfile); setShowModal(false);
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-header">
          <span className="navbar-title">⚽ World Cup 2026 🏆</span>
          {user && (
            <button className="profile-btn" onClick={openModal} aria-label="Profile menu">
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

            {/* ── MENU ── */}
            {view === 'menu' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0 20px' }}>
                  <Avatar value={user?.avatar} style={{ fontSize: '2.5rem', lineHeight: 1 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{user?.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#888' }}>Currently playing</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button className="btn btn-full" style={{ background: '#f0f0f0', color: '#333', fontWeight: 700 }} onClick={startEdit}>
                    ✏️ Edit Profile
                  </button>
                  <button className="btn btn-full" style={{ background: '#f0f0f0', color: '#333', fontWeight: 700 }} onClick={() => setView('switch')}>
                    🔄 Switch Player
                  </button>
                  <button className="btn btn-primary btn-full" onClick={() => { setShowModal(false); onAddProfile(); }}>
                    ➕ Add New Player
                  </button>
                </div>
              </>
            )}

            {/* ── EDIT PROFILE ── */}
            {view === 'edit' && (
              <>
                <button className="back-btn" onClick={() => setView('menu')}>← Back</button>
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
                      <button key={emoji} type="button"
                        className={`avatar-btn${editAvatar === emoji ? ' selected' : ''}`}
                        onClick={() => setEditAvatar(emoji)}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
                    <button type="button" className="btn" style={{ flex: 1, background: '#eee', color: '#333' }}
                      onClick={() => setView('menu')}>Cancel</button>
                  </div>
                </form>
              </>
            )}

            {/* ── SWITCH PLAYER ── */}
            {view === 'switch' && (
              <>
                <button className="back-btn" onClick={() => { setView('menu'); setVerifyProfile(null); }}>← Back</button>
                <h3 className="modal-title">Switch Player</h3>

                {verifyProfile ? (
                  <>
                    <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: 16 }}>
                      Enter the PIN for <strong>{verifyProfile.name}</strong>
                    </p>
                    <form onSubmit={handleVerifyPin}>
                      <input
                        className="welcome-input"
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="••••"
                        value={verifyPin}
                        onChange={e => { setVerifyPin(e.target.value.replace(/\D/g, '')); setVerifyError(''); }}
                        autoFocus
                        style={{ textAlign: 'center', fontSize: '2rem', letterSpacing: '0.3em' }}
                      />
                      {verifyError && <p style={{ color: '#e63946', fontSize: '0.85rem', fontWeight: 600, marginBottom: 12 }}>{verifyError}</p>}
                      <button type="submit" className="btn btn-primary btn-full">Switch to this player</button>
                    </form>
                    <button className="restore-link" style={{ marginTop: 12 }} onClick={() => setVerifyProfile(null)}>
                      ← Back to search results
                    </button>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: 16 }}>
                      Search for the player you want to switch to.
                    </p>
                    <form onSubmit={handleSearch}>
                      <input
                        className="welcome-input"
                        type="text"
                        placeholder="e.g. Sarah Johnson"
                        value={searchName}
                        onChange={e => { setSearchName(e.target.value); setSearchError(''); setSearchResults(null); }}
                        autoFocus
                      />
                      {searchError && <p style={{ color: '#e63946', fontSize: '0.85rem', fontWeight: 600, marginBottom: 12 }}>{searchError}</p>}
                      <button type="submit" className="btn btn-primary btn-full" disabled={searchLoading}>
                        {searchLoading ? 'Searching...' : '🔍 Search'}
                      </button>
                    </form>

                    {searchResults !== null && searchResults.length === 0 && (
                      <p style={{ textAlign: 'center', color: '#888', fontSize: '0.9rem', marginTop: 16 }}>
                        No players found. Try a different spelling.
                      </p>
                    )}

                    {searchResults && searchResults.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#555', marginBottom: 8 }}>Tap a player to switch:</p>
                        <div className="profile-list">
                          {searchResults.map(p => (
                            <button key={p.id} className={`profile-item${p.id === user?.id ? ' active' : ''}`}
                              onClick={() => selectProfile(p)}
                              style={{ cursor: p.id === user?.id ? 'default' : 'pointer' }}>
                              <Avatar value={p.avatar} className="profile-item-avatar" />
                              <span className="profile-item-name">{p.name}</span>
                              {p.id === user?.id && <span className="profile-item-badge">You</span>}
                              {p.id !== user?.id && p.pin && <span style={{ fontSize: '0.8rem' }}>🔒</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
}
