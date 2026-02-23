/**
 * KULOOC — Service Firestore pour les courses
 * Gère le cycle de vie complet d'une course:
 * Passager → Demande → Matching → Chauffeur accepte → En route → Terminé
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RideStatus =
  | 'pending'           // En attente d'un chauffeur
  | 'searching'         // Recherche en cours
  | 'driver-assigned'   // Chauffeur assigné, en route vers passager
  | 'driver-arrived'    // Chauffeur arrivé au point de prise en charge
  | 'in-progress'       // Course en cours
  | 'completed'         // Course terminée
  | 'cancelled';        // Course annulée

export type GeoPoint = {
  latitude: number;
  longitude: number;
  address: string;
};

export type RideRequest = {
  id?: string;
  passengerId: string;
  passengerName: string;
  passengerPhone?: string;
  pickup: GeoPoint;
  destination: GeoPoint;
  serviceType: string;    // kulooc_x, kulooc_green, etc.
  estimatedPrice: number;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  surgeMultiplier: number;
  status: RideStatus;
  requestedAt?: Timestamp;
  assignedAt?: Timestamp;
  driverId?: string;
  driverName?: string;
  notes?: string;
  paymentMethod?: string;
};

export type ActiveRide = {
  id?: string;
  requestId: string;
  passengerId: string;
  passengerName: string;
  driverId: string;
  driverName: string;
  driverLocation?: { latitude: number; longitude: number };
  pickup: GeoPoint;
  destination: GeoPoint;
  serviceType: string;
  status: RideStatus;
  pricing: {
    base: number;
    perKm: number;
    perMin: number;
    distanceKm: number;
    durationMin: number;
    surgeMultiplier: number;
    subtotal: number;
    tax: number;
    total: number;
  };
  assignedAt?: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  polyline?: string;
};

// ─── Créer une demande de course (Passager) ───────────────────────────────────

export async function createRideRequest(data: Omit<RideRequest, 'id' | 'requestedAt' | 'status'>): Promise<string> {
  const ref = await addDoc(collection(db, 'ride_requests'), {
    ...data,
    status: 'pending',
    requestedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// ─── Annuler une demande (Passager) ───────────────────────────────────────────

export async function cancelRideRequest(requestId: string, passengerId: string): Promise<void> {
  await updateDoc(doc(db, 'ride_requests', requestId), {
    status: 'cancelled',
    cancelledAt: serverTimestamp(),
    cancelledBy: passengerId,
    updatedAt: serverTimestamp(),
  });
}

// ─── Écouter la demande en temps réel (Passager) ─────────────────────────────

export function subscribeToRideRequest(
  requestId: string,
  callback: (request: RideRequest | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'ride_requests', requestId), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() } as RideRequest);
    } else {
      callback(null);
    }
  });
}

// ─── Écouter la course active (Passager + Chauffeur) ─────────────────────────

export function subscribeToActiveRide(
  rideId: string,
  callback: (ride: ActiveRide | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'active_rides', rideId), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() } as ActiveRide);
    } else {
      callback(null);
    }
  });
}

// ─── Écouter les courses actives d'un passager ───────────────────────────────

export function subscribeToPassengerActiveRide(
  passengerId: string,
  callback: (ride: ActiveRide | null) => void
): Unsubscribe {
  const q = query(
    collection(db, 'active_rides'),
    where('passengerId', '==', passengerId),
    where('status', 'in', ['driver-assigned', 'driver-arrived', 'in-progress']),
    limit(1)
  );

  return onSnapshot(q, (snap) => {
    if (!snap.empty) {
      const doc = snap.docs[0];
      callback({ id: doc.id, ...doc.data() } as ActiveRide);
    } else {
      callback(null);
    }
  });
}

// ─── Écouter les demandes en attente pour un chauffeur ───────────────────────

export function subscribeToDriverPendingRequests(
  callback: (requests: RideRequest[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'ride_requests'),
    where('status', '==', 'pending'),
    orderBy('requestedAt', 'asc'),
    limit(10)
  );

  return onSnapshot(q, (snap) => {
    const requests = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RideRequest));
    callback(requests);
  });
}

// ─── Écouter la course active d'un chauffeur ─────────────────────────────────

export function subscribeToDriverActiveRide(
  driverId: string,
  callback: (ride: ActiveRide | null) => void
): Unsubscribe {
  const q = query(
    collection(db, 'active_rides'),
    where('driverId', '==', driverId),
    where('status', 'in', ['driver-assigned', 'driver-arrived', 'in-progress']),
    limit(1)
  );

  return onSnapshot(q, (snap) => {
    if (!snap.empty) {
      const d = snap.docs[0];
      callback({ id: d.id, ...d.data() } as ActiveRide);
    } else {
      callback(null);
    }
  });
}

// ─── Mettre à jour le statut d'une course (Chauffeur/Dispatcher) ─────────────

export async function updateRideStatus(
  rideId: string,
  status: RideStatus,
  extra?: Record<string, unknown>
): Promise<void> {
  const updates: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
    ...extra,
  };

  if (status === 'in-progress') updates.startedAt = serverTimestamp();
  if (status === 'completed') updates.completedAt = serverTimestamp();

  await updateDoc(doc(db, 'active_rides', rideId), updates);
}

// ─── Mettre à jour la position du chauffeur ───────────────────────────────────

export async function updateDriverLocation(
  driverId: string,
  location: { latitude: number; longitude: number }
): Promise<void> {
  await setDoc(doc(db, 'drivers', driverId), {
    location,
    lastLocationUpdate: serverTimestamp(),
  }, { merge: true });
}

// ─── Mettre à jour le statut du chauffeur ─────────────────────────────────────

export async function updateDriverStatus(
  driverId: string,
  status: 'online' | 'offline' | 'en-route' | 'on-trip' | 'busy'
): Promise<void> {
  const updates: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
    isOnline: status !== 'offline',
  };

  if (status === 'online') updates.onlineSince = serverTimestamp();
  if (status === 'offline') {
    updates.onlineSince = null;
    updates.location = null;
  }

  // setDoc avec merge:true crée le document s'il n'existe pas encore
  await setDoc(doc(db, 'drivers', driverId), updates, { merge: true });
}

// ─── Calculer le tarif d'une course ───────────────────────────────────────────

export function calculateRidePrice(params: {
  distanceKm: number;
  durationMin: number;
  serviceMultiplier: number;
  surgeMultiplier: number;
}): {
  base: number;
  perKm: number;
  perMin: number;
  subtotal: number;
  tax: number;
  total: number;
} {
  const BASE_FARE = 3.50;
  const PER_KM = 1.75;
  const PER_MIN = 0.35;
  const MIN_FARE = 7.00;
  const TAX_RATE = 0.14975; // TPS + TVQ Québec

  const { distanceKm, durationMin, serviceMultiplier, surgeMultiplier } = params;

  const distanceCost = distanceKm * PER_KM;
  const timeCost = durationMin * PER_MIN;
  const rawFare = Math.max(MIN_FARE, BASE_FARE + distanceCost + timeCost);
  const subtotal = rawFare * serviceMultiplier * surgeMultiplier;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  return {
    base: BASE_FARE,
    perKm: distanceCost,
    perMin: timeCost,
    subtotal: +subtotal.toFixed(2),
    tax: +tax.toFixed(2),
    total: +total.toFixed(2),
  };
}

// ─── Récupérer l'historique des courses d'un passager ────────────────────────

export async function getPassengerRideHistory(passengerId: string, limitCount = 20): Promise<ActiveRide[]> {
  const q = query(
    collection(db, 'completed_rides'),
    where('passengerId', '==', passengerId),
    orderBy('completedAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ActiveRide));
}
