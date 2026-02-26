/**
 * KULOOC — Session Manager
 * FEATURE 1: Session unique — 2e connexion = déconnexion automatique de la 1re
 *
 * Mécanisme:
 *   - Au login: génère sessionToken → Firestore + localStorage
 *   - onSnapshot drivers/{uid}.sessionToken → token changé → signOut()
 *   - Cross-browser, cross-device, temps réel (<2s)
 */
import { doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { signOut, Auth } from 'firebase/auth';
import { db } from '@/firebase';

const SESSION_KEY = 'kulooc_session_token';

function generateToken(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}

export function getLocalToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_KEY);
}

/**
 * Enregistre la session dans Firestore + localStorage.
 * Appelé après login réussi.
 */
export async function registerSession(uid: string): Promise<void> {
  const token = generateToken();
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, token);
  }
  try {
    await updateDoc(doc(db, 'drivers', uid), {
      sessionToken: token,
      sessionRegisteredAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    });
    console.log('[session] ✅ Session enregistrée uid:', uid);
  } catch (e) {
    console.warn('[session] Impossible d\'enregistrer session:', e);
  }
}

/**
 * Surveille la session. Si token Firestore ≠ token local → déconnexion forcée.
 * Retourne unsubscribe.
 */
export function watchSession(uid: string, auth: Auth, onKicked: () => void): () => void {
  const localToken = getLocalToken();
  if (!localToken) return () => {};

  const unsub = onSnapshot(doc(db, 'drivers', uid), (snap) => {
    if (!snap.exists()) return;
    const fsToken = snap.data()?.sessionToken;
    if (fsToken && fsToken !== localToken) {
      console.warn('[session] 🚫 Session expulsée — autre connexion détectée');
      localStorage.removeItem(SESSION_KEY);
      signOut(auth)
        .catch(() => {})
        .finally(() => onKicked());
    }
  });

  return unsub;
}
