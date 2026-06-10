import React, { useState } from 'react';
import { supabase } from '../supabase.js';

const AVATARS = [
  '⚽','🏆','🦁','🐯','🦅','🌟','👑','🔥','⭐','🎯','💪','🎪',
  '🦊','🐺','🦋','🌈','🚀','🦄','🐉','⚡','🌊','🎨','🦸','🥊',
];

export default function Welcome({ onComplete }) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('⚽');
  const [error, setError] = useState('');
  const [showRestore, setShowRestore] = useState(false);
  const [syncCode, setSyncCode] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('Please enter your name!'); return; }
    if (trimmed.length < 2) { setError('Name must be at least 2 characters'); return; }
    if (trimmed.length > 20) { setError('Name must be 20 characters or fewer'); return; }
    setError('');
    onComplete(trimmed, avatar);
  }

  async function handleRestore(e) {
    e.preventDefault();
    const code = syncCode.trim().toUpperCase();
    if (code.length !== 4) { setRestoreError('Please enter your 4-character code'); return; }
    setRestoreLoading(true);
    setRestoreError('');
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('id', `${code.toLowerCase()}%`);
      if (error) throw error;
      if (!data || data.length === 0) {
        setRestoreError("No profile found — double-check the code and try again!");
        return;
      }
      const found = data[0];
      onComplete(found.name, found.avatar, found.id);
    } catch {
      setRestoreError('Something went wrong. Please try again.');
    } finally {
      setRestoreLoading(false);
    }
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-hero">
        <span className="welcome-trophy">🏆</span>
        <h1 className="welcome-title">World Cup 2026<br />Predictor!</h1>
        <p className="welcome-subtitle">Predict scores, earn points, top the table! ⚽</p>
      </div>

      <div className="welcome-card">
        {!showRestore ? (
          <>
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
              {error && (
                <p style={{ color: '#e63946', fontSize: '0.85rem', fontWeight: 600, marginTop: -14, marginBottom: 16 }}>
                  {error}
                </p>
              )}

              <label className="welcome-label">Pick Your Avatar</label>
              <div className="avatar-grid">
                {AVATARS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    className={`avatar-btn${avatar === emoji ? ' selected' : ''}`}
                    onClick={() => setAvatar(emoji)}
                    aria-label={`Select ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <button type="submit" className="btn btn-primary btn-full" style={{ fontSize: '1.1rem' }}>
                Let's Play! {avatar}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.78rem', color: '#999', lineHeight: 1.4 }}>
              3 pts for the exact score • 1 pt for the correct result<br />
              Compete with friends on the leaderboard!
            </p>

            <button
              className="restore-link"
              onClick={() => setShowRestore(true)}
            >
              Already playing on another device? Enter your sync code
            </button>
          </>
        ) : (
          <>
            <button className="back-btn" onClick={() => { setShowRestore(false); setRestoreError(''); setSyncCode(''); }}>
              ← Back
            </button>
            <h2 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 8 }}>Restore your profile</h2>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 20, lineHeight: 1.5 }}>
              Enter the 4-character sync code shown in the app on your other device. You'll find it by tapping your name in the top corner.
            </p>
            <form onSubmit={handleRestore}>
              <input
                className="welcome-input sync-code-input"
                type="text"
                placeholder="e.g. A3F2"
                value={syncCode}
                onChange={e => { setSyncCode(e.target.value.toUpperCase()); setRestoreError(''); }}
                maxLength={4}
                autoFocus
                style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 900, letterSpacing: '0.3em' }}
              />
              {restoreError && (
                <p style={{ color: '#e63946', fontSize: '0.85rem', fontWeight: 600, marginBottom: 12 }}>{restoreError}</p>
              )}
              <button type="submit" className="btn btn-primary btn-full" disabled={restoreLoading}>
                {restoreLoading ? 'Searching...' : 'Restore My Profile'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
