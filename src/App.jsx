import React, { useState, useEffect } from 'react';
import { supabase } from './supabase.js';
import Welcome from './components/Welcome.jsx';
import Fixtures from './components/Fixtures.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import Navbar from './components/Navbar.jsx';

const USER_KEY = 'wc2026_user';
const PROFILES_KEY = 'wc2026_profiles';

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

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('fixtures');
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        // Migrate: make sure this profile exists in the profiles list
        // (handles profiles created before the switcher feature existed)
        upsertProfile(parsed);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  async function handleWelcomeComplete(name, avatar, existingId = null) {
    const id = existingId || generateId();
    const newUser = { id, name, avatar };

    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    upsertProfile(newUser);

    setUser(newUser);
    setShowWelcome(false);

    try {
      await supabase.from('users').upsert({ id, name, avatar });
    } catch (e) {
      console.warn('Could not save user:', e);
    }
  }

  function handleSwitchProfile(profile) {
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
    setUser(profile);
    setActiveTab('fixtures');
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
        setActiveTab={setActiveTab}
        user={user}
        onSwitchProfile={handleSwitchProfile}
        onAddProfile={handleAddProfile}
      />
      {activeTab === 'fixtures' && <Fixtures user={user} />}
      {activeTab === 'leaderboard' && <Leaderboard currentUser={user} />}
    </div>
  );
}
