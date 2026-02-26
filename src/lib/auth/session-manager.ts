/**
 * KULOOC — Session Manager v2
 * ─────────────────────────────────────────────────────────────────────────────
 * FEATURE 1: Session unique — 2e connexion = déconnexion automatique de la 1re
 *
 * Mécanisme:
 *   - Au login: génère sessionToken → Firestore + localStorage
 *   - onSnapshot drivers/{uid}.sessionToken → token changé → signOut()
 *   - Cross-browser, cross-device, temps réel (<2s)
 *   - Heartbeat lastActive toutes les 60s pour détecter les sessions zombies
 *   - Support multi-collection : 'drivers' et 'clients'
 */
import {
  doc,
  updateDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { signOut, Auth } from 'firebase/auth';
import { db } from '@/firebase';

const SESSION_KEY = 'kulooc_session_token';
const HEARTBEAT_INTERVAL_MS = 60_000; // 60 secondes

function generateToken(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}

export function getLocalToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_KEY);
}

/**
 * Enregistre la session dans Firestore + localStorage + cookie HTTP-only.
 * Appelé après login réussi.
 * @param uid - UID de l'utilisateur
 * @param collection - Collection Firestore ('drivers' ou 'clients')
 * @param role - Rôle de l'utilisateur pour le middleware de protection des routes
 */
export async function registerSession(
  uid: string,
  collection: 'drivers' | 'clients' = 'drivers',
  role?: string
): Promise<void> {
  const token = generateToken();
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, token);
  }
  // Déterminer le rôle à partir de la collection si non fourni
  const sessionRole = role || (collection === 'drivers' ? 'driver' : 'client');
  try {
    // 1. Écrire dans Firestore (session unique cross-device)
    await setDoc(doc(db, collection, uid), {
      sessionToken: token,
      sessionRegisteredAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
      lastActive: serverTimestamp(),
    }, { merge: true });
    // 2. Écrire le cookie HTTP-only via l'API route (middleware de protection)
    if (typeof window !== 'undefined') {
      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, token, role: sessionRole }),
      }).catch(() => {}); // Silently fail — le cookie est optionnel
    }
    console.log(`[session] ✅ Session enregistrée uid:${uid} collection:${collection} role:${sessionRole}`);
  } catch (e) {
    console.warn('[session] Impossible d\'enregistrer session:', e);
  }
}

/**
 * Surveille la session. Si token Firestore ≠ token local → déconnexion forcée.
 * Démarre aussi un heartbeat lastActive toutes les 60s.
 * Retourne unsubscribe (arrête la surveillance + le heartbeat).
 *
 * @param uid - UID de l'utilisateur
 * @param auth - Instance Firebase Auth
 * @param onKicked - Callback appelé quand la session est expulsée
 * @param collection - Collection Firestore ('drivers' ou 'clients')
 */
export function watchSession(
  uid: string,
  auth: Auth,
  onKicked: () => void,
  collection: 'drivers' | 'clients' = 'drivers'
): () => void {
  const localToken = getLocalToken();
  if (!localToken) return () => {};

  // Surveillance du token en temps réel
  const unsub = onSnapshot(doc(db, collection, uid), (snap) => {
    if (!snap.exists()) return;
    const fsToken = snap.data()?.sessionToken;
    if (fsToken && fsToken !== localToken) {
      console.warn('[session] 🚫 Session expulsée — autre connexion détectée');
      localStorage.removeItem(SESSION_KEY);
      // Arrêter le heartbeat avant de déconnecter
      clearInterval(heartbeatTimer);
      signOut(auth)
        .catch(() => {})
        .finally(() => onKicked());
    }
  });

  // Heartbeat : met à jour lastActive toutes les 60s
  const heartbeatTimer = setInterval(async () => {
    try {
      const currentToken = getLocalToken();
      if (!currentToken) {
        clearInterval(heartbeatTimer);
        return;
      }
      await updateDoc(doc(db, collection, uid), {
        lastActive: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
      });
    } catch {
      // Silently fail — réseau indisponible
    }
  }, HEARTBEAT_INTERVAL_MS);

  return () => {
    unsub();
    clearInterval(heartbeatTimer);
  };
}

/**
 * Invalide la session locale (sans déconnecter Firebase Auth).
 * Utile pour nettoyer lors d'un logout explicite.
 */
export function clearLocalSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}
