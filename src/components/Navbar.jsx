import React, { useState, useEffect, useRef } from 'react';

const PROFILES_KEY = 'wc2026_profiles';

function getSyncCode(userId) {
  if (!userId) return '';
  return userId.replace(/-/g, '').slice(0, 4).toUpperCase();
}

function getStoredProfiles() {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]'); } catch { return []; }
}

export default function Navbar({ activeTab, setActiveTab, user, onSwitchProfile, onAddProfile, onUpdateProfile }) {
  const [showModal, setShowModal] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');
  const modalRef = useRef(null);

  useEffect(() => {
    if (showModal) {
      setProfiles(getStoredProfiles());
      setEditingName(false);
      setEditName('');
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

  function copySyncCode() {
    const code = getSyncCode(user?.id);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    }
  }

  function startEdit() {
    setEditName(user?.name || '');
    setEditError('');
    setEditingName(true);
  }

  async function submitEdit(e) {
    e.preventDefault();
    const trimmed = editName.trim();
    if (!trimmed) { setEditError('Name cannot be empty'); return; }
    if (trimmed.length < 2) { setEditError('At least 2 characters'); return; }
    if (trimmed.length > 20) { setEditError('20 characters max'); return; }
    await onUpdateProfile({ ...user, name: trimmed });
    setProfiles(getStoredProfiles());
    setEditingName(false);
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-header">
          <span className="navbar-title">&#9917; World Cup 2026 &#127942;</span>
          {user && (
            <button className="profile-btn" onClick={() => setShowModal(true)} aria-label="Switch profile">
              <span className="navbar-avatar" dangerouslySetInnerHTML={{ __html: user.avatar }} />
              <span className="profile-btn-name">{user.name}</span>
              <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>&#9660;</span>
            </button>
          )}
        </div>
        <div className="navbar-tabs">
          <button className={`navbar-tab${activeTab === 'fixtures' ? ' active' : ''}`} onClick={() => setActiveTab('fixtures')}>
            &#128197; Fixtures
          </button>
          <button className={`navbar-tab${activeTab === 'leaderboard' ? ' active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
            &#127942; Leaderboard
          </button>
        </div>
      </nav>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-sheet" ref={modalRef}>
            <div className="modal-handle" />
            <h3 className="modal-title">Switch Player</h3>

            <div className="profile-list">
              {profiles.map(p => (
                <div key={p.id} className={`profile-item${user && p.id === user.id ? ' active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: user && p.id === user.id ? 'default' : 'pointer' }}
                  onClick={() => { if (!user || p.id !== user.id) { onSwitchProfile(p); setShowModal(false); } }}
                >
                  <span className="profile-item-avatar" dangerouslySetInnerHTML={{ __html: p.avatar }} />
                  {user && p.id === user.id && editingName ? (
                    <form onSubmit={submitEdit} style={{ flex: 1, display: 'flex', gap: 6, flexDirection: 'column' }}
                      onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          className="welcome-input"
                          style={{ margin: 0, padding: '6px 10px', fontSize: '0.95rem', flex: 1 }}
                          value={editName}
                          onChange={e => { setEditName(e.target.value); setEditError(''); }}
                          maxLength={20}
                          autoFocus
                        />
                        <button type="submit" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Save</button>
                        <button type="button" className="btn" style={{ padding: '6px 10px', fontSize: '0.85rem', background: '#eee', color: '#333' }}
                          onClick={() => setEditingName(false)}>&#10005;</button>
                      </div>
                      {editError && <span style={{ color: '#e63946', fontSize: '0.78rem' }}>{editError}</span>}
                    </form>
                  ) : (
                    <>
                      <span className="profile-item-name" style={{ flex: 1 }}>{p.name}</span>
                      {user && p.id === user.id && (
                        <>
                          <span className="profile-item-badge">Playing</span>
                          <button
                            className="btn"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#f0f0f0', color: '#333', marginLeft: 4 }}
                            onClick={e => { e.stopPropagation(); startEdit(); }}
                          >&#9998;</button>
                        </>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <button
              className="btn btn-primary btn-full"
              style={{ marginTop: 8 }}
              onClick={() => { setShowModal(false); onAddProfile(); }}
            >
              &#43; Add New Player
            </button>

            <div className="sync-code-box">
              <div className="sync-code-label">Your sync code</div>
              <div className="sync-code-row">
                <span className="sync-code-value">{getSyncCode(user?.id)}</span>
                <button className="sync-copy-btn" onClick={copySyncCode}>
                  {copied ? '&#10003; Copied!' : '&#128203; Copy'}
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
