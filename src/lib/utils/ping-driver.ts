/**
 * KULOOC — Ping Chauffeur Online
 * Remet un chauffeur en ligne de manière fiable après chaque course.
 * Utilise un retry exponentiel pour garantir l'écriture Firestore.
 */
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

/**
 * Force le statut du chauffeur à 'online' avec currentRideId=null.
 * Appelé automatiquement après la validation du rating (étape 6).
 * Retry jusqu'à 5 fois avec backoff exponentiel.
 */
export async function pingDriverOnline(driverId: string): Promise<void> {
  const MAX_RETRIES = 5;
  const BASE_DELAY_MS = 800;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await updateDoc(doc(db, 'drivers', driverId), {
        status: 'online',
        currentRideId: null,
        isOnline: true,
        lastPingAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log(`[ping] ✅ Chauffeur ${driverId} remis online (tentative ${attempt})`);
      return; // Succès
    } catch (err: any) {
      console.warn(`[ping] ⚠️ Tentative ${attempt}/${MAX_RETRIES} échouée: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, BASE_DELAY_MS * attempt));
      }
    }
  }
  console.error(`[ping] ❌ Impossible de remettre ${driverId} online après ${MAX_RETRIES} tentatives`);
}

/**
 * Appelé aussi via API serveur comme filet de sécurité
 */
export async function triggerServerPing(driverId: string): Promise<void> {
  try {
    await fetch('/api/driver-ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId }),
    });
  } catch { /* silencieux — le ping client suffit */ }
}
