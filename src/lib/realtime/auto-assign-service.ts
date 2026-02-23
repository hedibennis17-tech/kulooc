/**
 * KULOOC — Service d'assignation automatique
 * Algorithme : trouver le meilleur chauffeur disponible pour chaque demande en attente
 * Critères pondérés : ETA (45%), Note (30%), Distance (25%)
 *
 * Ce service est appelé côté client (dispatcher) pour déclencher l'assignation.
 * En production, il sera migré vers une Cloud Function Firebase pour l'assignation
 * entièrement automatique sans intervention humaine.
 */

import {
  collection,
  doc,
  query,
  where,
  getDocs,
  runTransaction,
  serverTimestamp,
  Firestore,
  limit,
  orderBy,
} from 'firebase/firestore';
import type { LiveDriver, LiveRideRequest } from './realtime-service';

// ─── Haversine ────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Score d'assignation ──────────────────────────────────────────────────────

export type AssignmentScore = {
  driverId: string;
  driverName: string;
  distanceKm: number;
  etaMinutes: number;
  score: number;
};

export function scoreDriver(
  driver: LiveDriver,
  request: LiveRideRequest
): AssignmentScore | null {
  if (!driver.location || driver.status !== 'online') return null;

  const distKm = haversineKm(
    driver.location.latitude,
    driver.location.longitude,
    request.pickup.latitude,
    request.pickup.longitude
  );

  if (distKm > 20) return null; // Trop loin

  const etaSeconds = (distKm / 30) * 3600; // ~30 km/h en ville
  const etaMinutes = etaSeconds / 60;

  // Scores normalisés [0, 1]
  const etaScore = Math.max(0, 1 - etaSeconds / 600);      // 10 min max
  const ratingScore = (driver.averageRating || 4.5) / 5;
  const distScore = Math.max(0, 1 - distKm / 20);

  // Pondération
  const score = 0.45 * etaScore + 0.30 * ratingScore + 0.25 * distScore;

  return {
    driverId: driver.id,
    driverName: driver.name,
    distanceKm: Math.round(distKm * 10) / 10,
    etaMinutes: Math.round(etaMinutes),
    score: Math.round(score * 100) / 100,
  };
}

export function findBestMatch(
  request: LiveRideRequest,
  drivers: LiveDriver[]
): AssignmentScore | null {
  const scores = drivers
    .map((d) => scoreDriver(d, request))
    .filter((s): s is AssignmentScore => s !== null)
    .sort((a, b) => b.score - a.score);

  return scores[0] || null;
}

// ─── Assignation transactionnelle ─────────────────────────────────────────────

export async function executeAutoAssign(
  db: Firestore,
  requestId: string,
  drivers: LiveDriver[],
  requests: LiveRideRequest[]
): Promise<{ success: boolean; driverName?: string; etaMinutes?: number; error?: string }> {
  const request = requests.find((r) => r.id === requestId);
  if (!request) return { success: false, error: 'Demande introuvable' };

  const best = findBestMatch(request, drivers);
  if (!best) return { success: false, error: 'Aucun chauffeur disponible à moins de 20 km' };

  try {
    await runTransaction(db, async (transaction) => {
      const requestRef = doc(db, 'ride_requests', requestId);
      const driverRef = doc(db, 'drivers', best.driverId);

      const [reqSnap, drvSnap] = await Promise.all([
        transaction.get(requestRef),
        transaction.get(driverRef),
      ]);

      if (!reqSnap.exists()) throw new Error('Demande introuvable dans Firestore');
      if (reqSnap.data().status !== 'pending') throw new Error('Demande déjà assignée ou annulée');
      if (!drvSnap.exists()) throw new Error('Chauffeur introuvable dans Firestore');
      if (drvSnap.data().status !== 'online') throw new Error('Chauffeur non disponible');

      const rideRef = doc(collection(db, 'active_rides'));
      const driver = drivers.find((d) => d.id === best.driverId)!;

      transaction.set(rideRef, {
        requestId,
        passengerId: request.passengerId,
        passengerName: request.passengerName,
        driverId: best.driverId,
        driverName: best.driverName,
        driverLocation: driver.location || null,
        pickup: request.pickup,
        destination: request.destination,
        serviceType: request.serviceType,
        status: 'driver-assigned',
        pricing: {
          subtotal: +(request.estimatedPrice / 1.14975).toFixed(2),
          tax: +(request.estimatedPrice - request.estimatedPrice / 1.14975).toFixed(2),
          total: request.estimatedPrice,
          surgeMultiplier: request.surgeMultiplier,
        },
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Métadonnées d'assignation
        assignmentMethod: 'auto',
        assignmentScore: best.score,
        estimatedEtaMinutes: best.etaMinutes,
        estimatedDistanceKm: best.distanceKm,
      });

      transaction.update(requestRef, {
        status: 'driver-assigned',
        driverId: best.driverId,
        driverName: best.driverName,
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      transaction.update(driverRef, {
        status: 'en-route',
        currentRideId: rideRef.id,
        updatedAt: serverTimestamp(),
      });
    });

    return { success: true, driverName: best.driverName, etaMinutes: best.etaMinutes };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Assignation automatique de toutes les demandes en attente ────────────────

export async function autoAssignAllPending(
  db: Firestore,
  drivers: LiveDriver[],
  requests: LiveRideRequest[]
): Promise<{ assigned: number; failed: number; results: Array<{ requestId: string; success: boolean; driverName?: string }> }> {
  const pending = requests.filter((r) => r.status === 'pending');
  const results: Array<{ requestId: string; success: boolean; driverName?: string }> = [];
  let assigned = 0;
  let failed = 0;

  // Copie locale des chauffeurs disponibles pour éviter double-assignation
  const availableDrivers = [...drivers];

  for (const request of pending) {
    if (!request.id) continue;

    const result = await executeAutoAssign(db, request.id, availableDrivers, requests);

    if (result.success) {
      assigned++;
      // Retirer le chauffeur assigné de la liste locale
      const idx = availableDrivers.findIndex((d) => d.name === result.driverName);
      if (idx !== -1) availableDrivers.splice(idx, 1);
    } else {
      failed++;
    }

    results.push({ requestId: request.id, success: result.success, driverName: result.driverName });
  }

  return { assigned, failed, results };
}
