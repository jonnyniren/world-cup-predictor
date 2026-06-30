import React, { useState, useEffect } from 'react';
import { supabase } from './supabase.js';
import Welcome from './components/Welcome.jsx';
import Fixtures from './components/Fixtures.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import Navbar from './components/Navbar.jsx';

const USER_KEY = 'wc2026_user';
const PROFILES_KEY = 'wc2026_profiles';
const UPDATES_DISMISSED_KEY = 'wc2026_updates_v1_dismissed';
const UPDATES_EXPIRY = new Date('2026-07-04T18:00:00Z'); // R16 kickoff

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function getStoredProfiles() {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]'); } catch { return []; }
}

function saveProfiles(profiles) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

function upsertProfile(profile) {
  const profiles = getStoredProfiles();
  const idx = profiles.findIndex(p => p.id === profile.id);
  if (idx >= 0) profiles[idx] = profile; else profiles.push(profile);
  saveProfiles(profiles);
}

function UpdatesPopup({ onDismiss, onDismissPermanently }) {
  return (
    <>
      <div onClick={onDismiss} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 301, width: 'min(92vw, 420px)',
        background: '#0a1f3a', borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        border: '2px solid #FFD700',
      }}>
        {/* Header */}
        <div style={{ background: '#FFD700', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1a1a1a', letterSpacing: 0.3 }}>📢 ATTENTION: Game Updates</span>
          <button onClick={onDismiss} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#333', lineHeight: 1, padding: '0 0 0 8px' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '60vh', overflowY: 'auto' }}>

          <div>
            <div style={{ fontWeight: 700, color: '#FFD700', fontSize: '0.85rem', marginBottom: 4 }}>⏱️ Scoring is on 90 minutes only</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', lineHeight: 1.5 }}>
              All predictions are scored on the full-time result after 90 minutes. Extra time and penalties don't count.
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 14 }}>
            <div style={{ fontWeight: 700, color: '#FFD700', fontSize: '0.85rem', marginBottom: 4 }}>📈 Knockout round points are increasing</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', lineHeight: 1.6 }}>
              As the stakes increase in the World Cup, so will they here. Round of 32 stays the same. From the <strong style={{ color: '#fff' }}>Round of 16 onwards</strong> (starting <strong style={{ color: '#fff' }}>Saturday 4th July, 6pm</strong>):
            </div>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '6px 10px', fontSize: '0.78rem', color: '#fff' }}>
                <span style={{ color: '#FFD700', fontWeight: 700 }}>R16 &amp; Quarters</span> — 4pts exact · 2pts correct result
              </div>
              <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '6px 10px', fontSize: '0.78rem', color: '#fff' }}>
                <span style={{ color: '#FFD700', fontWeight: 700 }}>Semis, 3rd place &amp; Final</span> — 6pts exact · 3pts correct result
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 14 }}>
            <div style={{ fontWeight: 700, color: '#FFD700', fontSize: '0.85rem', marginBottom: 4 }}>👆 New: See each player's correct predictions</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', lineHeight: 1.5 }}>
              Tap a player's name or points on the leaderboard to see the list of predictions they got right.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 8 }}>
          <button onClick={onDismiss} style={{
            flex: 1, padding: '9px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
            background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
          }}>
            Dismiss
          </button>
          <button onClick={onDismissPermanently} style={{
            flex: 2, padding: '9px', borderRadius: 8, border: 'none',
            background: '#FFD700', color: '#1a1a1a', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer',
          }}>
            Got it, don't show again ✓
          </button>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('fixtures');
  const [showWelcome, setShowWelcome] = useState(false);
  const [leaderboardKey, setLeaderboardKey] = useState(0);
  const [showUpdates, setShowUpdates] = useState(false);

  useEffect(() => {
    const permanentlyDismissed = localStorage.getItem(UPDATES_DISMISSED_KEY) === 'true';
    const expired = new Date() >= UPDATES_EXPIRY;
    if (!permanentlyDismissed && !expired) setShowUpdates(true);
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const stored = localStorage.getItem(USER_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Fetch latest data from Supabase so changes on other devices sync back
          const { data } = await supabase.from('users').select('id,name,avatar').eq('id', parsed.id).maybeSingle();
          if (!data) {
            localStorage.removeItem(USER_KEY);
            localStorage.removeItem(PROFILES_KEY);
          } else {
            const synced = { id: data.id, name: data.name, avatar: data.avatar };
            localStorage.setItem(USER_KEY, JSON.stringify(synced));
            upsertProfile(synced);
            setUser(synced);
          }
        }
      } catch { /* ignore — show registration on any error */ }
      setLoading(false);
    }
    init();
  }, []);

  async function handleWelcomeComplete(name, avatar, existingId = null, pin = null) {
    const id = existingId || generateId();
    const newUser = { id, name, avatar };

    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    upsertProfile(newUser);

    setUser(newUser);
    setShowWelcome(false);

    try {
      const record = { id, name, avatar };
      if (pin) record.pin = pin;
      await supabase.from('users').upsert(record);
    } catch (e) {
      console.warn('Could not save user:', e);
    }
  }

  function handleSetActiveTab(tab) {
    if (tab === 'leaderboard') setLeaderboardKey(k => k + 1);
    setActiveTab(tab);
  }

  function handleSwitchProfile(profile) {
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
    setUser(profile);
    setActiveTab('fixtures');
  }

  async function handleUpdateProfile(updatedProfile) {
    try {
      await supabase.from('users').update({ name: updatedProfile.name, avatar: updatedProfile.avatar }).eq('id', updatedProfile.id);
    } catch (e) {
      console.warn('Could not update user:', e);
    }
    localStorage.setItem(USER_KEY, JSON.stringify(updatedProfile));
    upsertProfile(updatedProfile);
    setUser(updatedProfile);
  }

  function handleAddProfile() {
    setShowWelcome(true);
  }

  function handleCancelWelcome() {
    setShowWelcome(false);
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ color: '#FFD700', fontSize: '3rem' }}>⚽</div>
      </div>
    );
  }

  if (!user || showWelcome) {
    return (
      <Welcome
        onComplete={handleWelcomeComplete}
        onCancel={user ? handleCancelWelcome : null}
      />
    );
  }

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        user={user}
        onSwitchProfile={handleSwitchProfile}
        onAddProfile={handleAddProfile}
        onUpdateProfile={handleUpdateProfile}
      />
      {activeTab === 'fixtures' && <Fixtures user={user} />}
      {activeTab === 'leaderboard' && <Leaderboard key={leaderboardKey} currentUser={user} />}
      {showUpdates && (
        <UpdatesPopup
          onDismiss={() => setShowUpdates(false)}
          onDismissPermanently={() => {
            localStorage.setItem(UPDATES_DISMISSED_KEY, 'true');
            setShowUpdates(false);
          }}
        />
      )}
    </div>
  );
}
