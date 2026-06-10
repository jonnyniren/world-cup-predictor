import React, { useState } from 'react';
import { supabase } from '../supabase.js';

const AVATARS = [
  '&#9917;','&#127942;','&#129409;','&#129423;','&#129413;','&#11088;','&#128081;','&#128293;','&#11088;','&#127919;','&#128170;','&#127914;',
  '&#129418;','&#128058;','&#129419;','&#127752;','&#128640;','&#129412;','&#128009;','&#9889;','&#127754;','&#127912;','&#129464;','&#129354;',
  '&#127881;','&#127926;','&#129351;','&#127995;','&#128007;','&#128062;','&#129436;','&#128048;','&#128047;','&#129429;','&#128034;','&#129430;',
  '&#128038;','&#129415;','&#127944;','&#127936;','&#129303;','&#128150;','&#128525;','&#128640;','&#9917;','&#127919;','&#128171;','&#127975;',
];

export default function Welcome({ onComplete, onCancel }) {
  const [view, setView] = useState('register');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('&#9917;');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  // Sync-code restore
  const [syncCode, setSyncCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);

  // Name-based restore
  const [searchName, setSearchName] = useState('');
  const [nameResults, setNameResults] = useState(null);
  const [nameError, setNameError] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [verifyProfile, setVerifyProfile] = useState(null);
  const [verifyPin, setVerifyPin] = useState('');
  const [verifyError, setVerifyError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('Please enter your name!'); return; }
    if (trimmed.length < 2) { setError('Name must be at least 2 characters'); return; }
    if (trimmed.length > 20) { setError('Name must be 20 characters or fewer'); return; }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { setError('Please enter a 4-digit PIN'); return; }
    setError('');
    onComplete(trimmed, avatar, null, pin);
  }

  async function handleRestoreByCode(e) {
    e.preventDefault();
    const code = syncCode.trim().toUpperCase();
    if (code.length !== 4) { setCodeError('Please enter your 4-character code'); return; }
    setCodeLoading(true); setCodeError('');
    try {
      const { data, error } = await supabase
        .from('users').select('*').ilike('id', `${code.toLowerCase()}%`);
      if (error) throw error;
      if (!data || data.length === 0) {
        setCodeError("No profile found — double-check the code and try again!");
        return;
      }
      onComplete(data[0].name, data[0].avatar, data[0].id);
    } catch {
      setCodeError('Something went wrong. Please try again.');
    } finally { setCodeLoading(false); }
  }

  async function handleSearchByName(e) {
    e.preventDefault();
    const trimmed = searchName.trim();
    if (!trimmed) { setNameError('Please enter a name to search'); return; }
    setNameLoading(true); setNameError(''); setNameResults(null);
    try {
      const { data, error } = await supabase
        .from('users').select('*').ilike('name', `%${trimmed}%`);
      if (error) throw error;
      setNameResults(data || []);
    } catch {
      setNameError('Something went wrong. Please try again.');
    } finally { setNameLoading(false); }
  }

  function handleSelectProfile(p) {
    if (p.pin) {
      setVerifyProfile(p);
      setVerifyPin('');
      setVerifyError('');
    } else {
      onComplete(p.name, p.avatar, p.id);
    }
  }

  function handleVerifyPin(e) {
    e.preventDefault();
    if (verifyPin !== verifyProfile.pin) {
      setVerifyError('Incorrect PIN. Try again!');
      return;
    }
    onComplete(verifyProfile.name, verifyProfile.avatar, verifyProfile.id);
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-hero">
        <span className="welcome-trophy">&#127942;</span>
        <h1 className="welcome-title">World Cup 2026<br />Predictor!</h1>
        <p className="welcome-subtitle">Predict scores, earn points, top the table! &#9917;</p>
      </div>

      <div className="welcome-card">

        {/* PIN verify overlay */}
        {verifyProfile && (
          <>
            <button className="back-btn" onClick={() => setVerifyProfile(null)}>&#8592; Back</button>
            <h2 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 8 }}>
              {verifyProfile.avatar || '&#9917;'} {verifyProfile.name}
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 20, lineHeight: 1.5 }}>
              Enter your 4-digit PIN to restore this profile.
            </p>
            <form onSubmit={handleVerifyPin}>
              <input
                className="welcome-input"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="&#9679;&#9679;&#9679;&#9679;"
                value={verifyPin}
                onChange={e => { setVerifyPin(e.target.value.replace(/\D/g,'')); setVerifyError(''); }}
                autoFocus
                style={{ textAlign: 'center', fontSize: '2rem', letterSpacing: '0.3em' }}
              />
              {verifyError && (
                <p style={{ color: '#e63946', fontSize: '0.85rem', fontWeight: 600, marginBottom: 12 }}>{verifyError}</p>
              )}
              <button type="submit" className="btn btn-primary btn-full">
                Restore My Profile
              </button>
            </form>
          </>
        )}

        {!verifyProfile && (
          <>
            {/* ── REGISTER ─────────────────────────────────────── */}
            {view === 'register' && (
              <>
                {onCancel && (
                  <button className="back-btn" onClick={onCancel}>&#8592; Back to game</button>
                )}
                <form onSubmit={handleSubmit}>
                  <label className="welcome-label" htmlFor="player-name">Your Name</label>
                  <input
                    id="player-name"
                    className="welcome-input"
                    type="text"
                    placeholder="e.g. Sarah Johnson"
                    value={name}
                    onChange={e => { setName(e.target.value); setError(''); }}
                    maxLength={20}
                    autoFocus
                  />
                  <label className="welcome-label" htmlFor="player-pin">
                    4-Digit PIN <span style={{ fontWeight: 400, color: '#888', fontSize: '0.8rem' }}>(to recover your profile later)</span>
                  </label>
                  <input
                    id="player-pin"
                    className="welcome-input"
                    type="password"
                    inputMode="numeric"
                    placeholder="e.g. 1234"
                    value={pin}
                    onChange={e => { setPin(e.target.value.replace(/\D/g,'').slice(0,4)); setError(''); }}
                    maxLength={4}
                    style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.3em' }}
                  />
                  {error && (
                    <p style={{ color: '#e63946', fontSize: '0.85rem', fontWeight: 600, marginTop: -14, marginBottom: 16 }}>
                      {error}
                    </p>
                  )}
                  <label className="welcome-label">Pick Your Avatar</label>
                  <div className="avatar-grid">
                    {AVATARS.map((emoji, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`avatar-btn${avatar === emoji ? ' selected' : ''}`}
                        onClick={() => setAvatar(emoji)}
                        dangerouslySetInnerHTML={{ __html: emoji }}
                      />
                    ))}
                  </div>
                  <button type="submit" className="btn btn-primary btn-full" style={{ fontSize: '1.1rem' }}
                    dangerouslySetInnerHTML={{ __html: `Let's Play! ${avatar}` }}
                  />
                </form>

                <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.78rem', color: '#999', lineHeight: 1.4 }}>
                  3 pts for the exact score &#8226; 1 pt for the correct result
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                  <button className="restore-link" onClick={() => setView('restore-code')}>
                    Have a sync code? Restore your profile
                  </button>
                  <button className="restore-link" onClick={() => setView('restore-name')}>
                    Played before but lost your code? Find by name
                  </button>
                </div>
              </>
            )}

            {/* ── RESTORE BY CODE ──────────────────────────────── */}
            {view === 'restore-code' && (
              <>
                <button className="back-btn" onClick={() => { setView('register'); setCodeError(''); setSyncCode(''); }}>
                  &#8592; Back
                </button>
                <h2 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 8 }}>Restore by sync code</h2>
                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 20, lineHeight: 1.5 }}>
                  Enter the 4-character code shown in the app on your other device. Tap your name in the top corner to find it.
                </p>
                <form onSubmit={handleRestoreByCode}>
                  <input
                    className="welcome-input"
                    type="text"
                    placeholder="e.g. A3F2"
                    value={syncCode}
                    onChange={e => { setSyncCode(e.target.value.toUpperCase()); setCodeError(''); }}
                    maxLength={4}
                    autoFocus
                    style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 900, letterSpacing: '0.3em' }}
                  />
                  {codeError && (
                    <p style={{ color: '#e63946', fontSize: '0.85rem', fontWeight: 600, marginBottom: 12 }}>{codeError}</p>
                  )}
                  <button type="submit" className="btn btn-primary btn-full" disabled={codeLoading}>
                    {codeLoading ? 'Searching...' : 'Restore My Profile'}
                  </button>
                </form>
                <button className="restore-link" style={{ marginTop: 12 }} onClick={() => setView('restore-name')}>
                  Don't have your code? Find by name instead
                </button>
              </>
            )}

            {/* ── RESTORE BY NAME ──────────────────────────────── */}
            {view === 'restore-name' && (
              <>
                <button className="back-btn" onClick={() => { setView('register'); setNameError(''); setSearchName(''); setNameResults(null); }}>
                  &#8592; Back
                </button>
                <h2 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 8 }}>Find your profile by name</h2>
                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 20, lineHeight: 1.5 }}>
                  Search for the name you used when you first signed up. You'll need your PIN to confirm it's you.
                </p>
                <form onSubmit={handleSearchByName}>
                  <input
                    className="welcome-input"
                    type="text"
                    placeholder="e.g. Sarah Johnson"
                    value={searchName}
                    onChange={e => { setSearchName(e.target.value); setNameError(''); setNameResults(null); }}
                    autoFocus
                  />
                  {nameError && (
                    <p style={{ color: '#e63946', fontSize: '0.85rem', fontWeight: 600, marginBottom: 12 }}>{nameError}</p>
                  )}
                  <button type="submit" className="btn btn-primary btn-full" disabled={nameLoading}>
                    {nameLoading ? 'Searching...' : '&#128269; Search'}
                  </button>
                </form>

                {nameResults !== null && nameResults.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#888', fontSize: '0.9rem', marginTop: 16 }}>
                    No profiles found for that name. Try a different spelling.
                  </p>
                )}

                {nameResults && nameResults.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#555', marginBottom: 8 }}>
                      Tap your profile:
                    </p>
                    <div className="profile-list">
                      {nameResults.map(p => (
                        <button
                          key={p.id}
                          className="profile-item"
                          onClick={() => handleSelectProfile(p)}
                        >
                          <span className="profile-item-avatar">{p.avatar || '&#9917;'}</span>
                          <span className="profile-item-name">{p.name}</span>
                          {p.pin && <span style={{ fontSize: '0.7rem', color: '#888' }}>&#128274;</span>}
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
  );
}
