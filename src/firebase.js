// ============================================================
// FIREBASE CONFIGURATION
// ============================================================
// You need to create a Firebase project at https://console.firebase.google.com
// Then replace ALL values below with your own project's config.
//
// Steps:
// 1. Go to https://console.firebase.google.com
// 2. Click "Add project" and follow the steps
// 3. Once created, click the </> (Web) icon to add a web app
// 4. Copy the firebaseConfig object and paste the values below
// 5. Enable Firestore: Build > Firestore Database > Create database
// 6. Deploy Firestore rules: firebase deploy --only firestore:rules
// ============================================================

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",                          // <-- replace
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",   // <-- replace
  projectId: "YOUR_PROJECT_ID",                    // <-- replace
  storageBucket: "YOUR_PROJECT_ID.appspot.com",    // <-- replace
  messagingSenderId: "YOUR_SENDER_ID",             // <-- replace
  appId: "YOUR_APP_ID",                            // <-- replace
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
