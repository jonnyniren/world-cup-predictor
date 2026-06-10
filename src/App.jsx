import React, { useState, useEffect } from 'react';
import { db } from './firebase.js';
import { doc, setDoc } from 'firebase/firestore';
import Welcome from './components/Welcome.jsx';
import Fixtures from './components/Fixtures.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import Navbar from './components/Navbar.jsx';

const USER_KEY = 'wc2026_user';

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('fixtures');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  async function handleWelcomeComplete(name, avatar) {
    const id = generateId();
    const newUser = { id, name, avatar };

    // Save to localStorage
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setUser(newUser);

    // Save to Firestore (best-effort)
    try {
      await setDoc(doc(db, 'users', id), {
        name,
        avatar,
        createdAt: new Date(),
      });
    } catch (e) {
      console.warn('Could not save user to Firestore:', e);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ color: '#FFD700', fontSize: '3rem' }}>⚽</div>
      </div>
    );
  }

  if (!user) {
    return <Welcome onComplete={handleWelcomeComplete} />;
  }

  return (
    <div className="app-container">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
      {activeTab === 'fixtures' && <Fixtures user={user} />}
      {activeTab === 'leaderboard' && <Leaderboard currentUser={user} />}
    </div>
  );
}
