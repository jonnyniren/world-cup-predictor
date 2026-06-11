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
        setActiveTab={setActiveTab}
        user={user}
        onSwitchProfile={handleSwitchProfile}
        onAddProfile={handleAddProfile}
        onUpdateProfile={handleUpdateProfile}
      />
      {activeTab === 'fixtures' && <Fixtures user={user} />}
      {activeTab === 'leaderboard' && <Leaderboard currentUser={user} />}
    </div>
  );
}
