import React, { useState } from 'react';

const AVATARS = ['⚽', '🏆', '🦁', '🐯', '🦅', '🌟', '👑', '🔥', '⭐', '🎯', '💪', '🎪'];

export default function Welcome({ onComplete }) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('⚽');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your name!');
      return;
    }
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    if (trimmed.length > 20) {
      setError('Name must be 20 characters or fewer');
      return;
    }
    setError('');
    onComplete(trimmed, avatar);
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-hero">
        <span className="welcome-trophy">🏆</span>
        <h1 className="welcome-title">World Cup 2026<br />Predictor!</h1>
        <p className="welcome-subtitle">Predict scores, earn points, top the table! ⚽</p>
      </div>

      <div className="welcome-card">
        <form onSubmit={handleSubmit}>
          <label className="welcome-label" htmlFor="player-name">
            Your Name
          </label>
          <input
            id="player-name"
            className="welcome-input"
            type="text"
            placeholder="e.g. Super Striker"
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

          <label className="welcome-label">
            Pick Your Avatar
          </label>
          <div className="avatar-grid">
            {AVATARS.map(emoji => (
              <button
                key={emoji}
                type="button"
                className={`avatar-btn${avatar === emoji ? ' selected' : ''}`}
                onClick={() => setAvatar(emoji)}
                aria-label={`Select ${emoji} avatar`}
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
      </div>
    </div>
  );
}
