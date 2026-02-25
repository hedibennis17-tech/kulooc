'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp: FirebaseApp;
    // On Vercel (non-Firebase App Hosting), we use the firebaseConfig directly.
    // On Firebase App Hosting, initializeApp() without args works automatically.
    try {
      firebaseApp = initializeApp(firebaseConfig);
    } catch (e) {
      console.error('Firebase initialization error:', e);
      firebaseApp = getApp();
    }
    return getSdks(firebaseApp);
  }
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  const auth = getAuth(firebaseApp);
  // Ensure auth state persists across page navigations/reloads
  setPersistence(auth, browserLocalPersistence).catch(() => {});
  return {
    firebaseApp,
    auth,
    firestore: getFirestore(firebaseApp)
  };
}

// Export db singleton for use in services
import { getApps as _getApps, getApp as _getApp } from 'firebase/app';
function _getFirestore() {
  try {
    const app = _getApps().length ? _getApp() : initializeApp(firebaseConfig);
    return getFirestore(app);
  } catch {
    return getFirestore(_getApp());
  }
}
export const db = _getFirestore();

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
