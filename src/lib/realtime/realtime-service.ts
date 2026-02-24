/**
 * KULOOC — Service de synchronisation temps réel centralisé
 * Synchronise : positions GPS chauffeurs, clients connectés, demandes, courses actives
 * Utilisé par : /client, /dispatch, /driver, /dashboard
 */

import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  serverTimestamp,
  type Unsubscribe,
  Firestore,
} from 'firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DriverLiveStatus = 'online' | 'en-route' | 'on-trip' | 'busy' | 'offline';

export type LiveDriver = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  status: DriverLiveStatus;
  location?: { latitude: number; longitude: number };
  lastLocationUpdate?: any;
  vehicle?: {
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    color: string;
    type?: 'car' | 'suv' | 'truck' | 'van' | 'electric';
  };
  averageRating?: number;
  totalRides?: number;
  onlineSince?: any;
  currentRideId?: string;
};

export type ConnectedClient = {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  photoURL?: string;
  lastSeen?: any;
  isOnline?: boolean;
  totalRides?: number;
  rating?: number;
  tier?: 'regular' | 'gold' | 'premium' | 'subscription';
  activeRideId?: string;
};

export type LiveRideRequest = {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone?: string;
  pickup: { latitude: number; longitude: number; address: string };
  destination: { latitude: number; longitude: number; address: string };
  serviceType: string;
  estimatedPrice: number;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  surgeMultiplier: number;
  status: string;
  requestedAt?: any;
  driverId?: string;
  driverName?: string;
};

export type LiveActiveRide = {
  id: string;
  requestId?: string;
  passengerId: string;
  passengerName: string;
  passengerPhone?: string;
  driverId: string;
  driverName: string;
  driverLocation?: { latitude: number; longitude: number };
  pickup: { latitude: number; longitude: number; address: string };
  destination: { latitude: number; longitude: number; address: string };
  serviceType: string;
  status: string;
  estimatedPrice?: number;
  estimatedDistanceKm?: number;
  estimatedDurationMin?: number;
  finalPrice?: number;
  actualDurationMin?: number;
  driverEarnings?: number;
  pricing?: {
    base?: number;
    perKmCharge?: number;
    perMinCharge?: number;
    subtotalWithSurge?: number;
    tps?: number;
    tvq?: number;
    subtotal?: number;
    tax?: number;
    total?: number;
    distanceKm?: number;
    durationMin?: number;
    surgeMultiplier?: number;
    driverEarnings?: number;
  };
  assignedAt?: any;
  startedAt?: any;
  completedAt?: any;
};

// ─── Subscriptions ────────────────────────────────────────────────────────────

/**
 * Écouter tous les chauffeurs actifs (online, en-route, on-trip, busy)
 * Utilisé par : dispatch, client (carte), dashboard
 */
export function subscribeToLiveDrivers(
  db: Firestore,
  callback: (drivers: LiveDriver[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'drivers'),
    where('status', 'in', ['online', 'en-route', 'on-trip', 'busy'])
  );
  return onSnapshot(
    q,
    (snap) => {
      const drivers: LiveDriver[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<LiveDriver, 'id'>),
      }));
      callback(drivers);
    },
    (err) => {
	console.error('[v0] subscribeToLiveDrivers error:', err.message, err.code, err);
	callback([]);
    }
  );
}

/**
 * Écouter tous les clients (users) — triés par lastSeen desc
 * Utilisé par : dispatch, dashboard/clients
 */
export function subscribeToConnectedClients(
  db: Firestore,
  callback: (clients: ConnectedClient[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'users'),
    orderBy('lastSeen', 'desc'),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => {
      const clients: ConnectedClient[] = snap.docs.map((d) => ({
        id: d.id,
        uid: d.id,
        ...(d.data() as Omit<ConnectedClient, 'id' | 'uid'>),
      }));
      callback(clients);
    },
    (err) => {
      console.warn('subscribeToConnectedClients error:', err.message);
      callback([]);
    }
  );
}

/**
 * Écouter les demandes de course en attente
 * Utilisé par : dispatch, chauffeur
 */
export function subscribeToLiveRideRequests(
  db: Firestore,
  callback: (requests: LiveRideRequest[]) => void
): Unsubscribe {
  // Use simple query without orderBy to avoid composite index requirement
  const q = query(
    collection(db, 'ride_requests'),
    where('status', 'in', ['pending', 'searching', 'offered']),
    limit(50)
  );
  return onSnapshot(
    q,
    (snap) => {
      const requests: LiveRideRequest[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<LiveRideRequest, 'id'>),
      }));
      // Sort client-side by requestedAt
      requests.sort((a, b) => {
        const aTime = a.requestedAt?.toMillis?.() || 0;
        const bTime = b.requestedAt?.toMillis?.() || 0;
        return aTime - bTime;
      });
      callback(requests);
    },
    (err) => {
      console.error('[v0] subscribeToLiveRideRequests error:', err.message, err);
      callback([]);
    }
  );
}

/**
 * Écouter les courses actives
 * Utilisé par : dispatch, client (suivi), chauffeur
 */
export function subscribeToLiveActiveRides(
  db: Firestore,
  callback: (rides: LiveActiveRide[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'active_rides'),
    where('status', 'in', ['driver-assigned', 'driver-arrived', 'in-progress']),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => {
      const rides: LiveActiveRide[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<LiveActiveRide, 'id'>),
      }));
      callback(rides);
    },
    (err) => {
      console.warn('subscribeToLiveActiveRides error:', err.message);
      callback([]);
    }
  );
}

/**
 * Écouter la course active d'un passager spécifique
 * Utilisé par : interface client
 */
export function subscribeToPassengerRide(
  db: Firestore,
  passengerId: string,
  callback: (ride: LiveActiveRide | null) => void
): Unsubscribe {
  // Simple single-field query to avoid needing composite index
  const q = query(
    collection(db, 'active_rides'),
    where('passengerId', '==', passengerId),
    limit(5)
  );
  return onSnapshot(
    q,
    (snap) => {
      const activeStatuses = ['driver-assigned', 'driver-arrived', 'in-progress'];
      const activeDoc = snap.docs.find(d => activeStatuses.includes(d.data().status));
      if (activeDoc) {
        callback({ id: activeDoc.id, ...(activeDoc.data() as Omit<LiveActiveRide, 'id'>) });
      } else {
        callback(null);
      }
    },
    (err) => {
      console.error('[v0] subscribeToPassengerRide error:', err.message, err.code, err);
      callback(null);
    }
  );
}

/**
 * Mettre à jour la présence (lastSeen) d'un client
 * Appelé au chargement de l'interface client
 */
export async function updateClientPresence(
  db: Firestore,
  uid: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), {
      lastSeen: serverTimestamp(),
      isOnline: true,
    });
  } catch {
    // Silently fail — le document n'existe peut-être pas encore
  }
}

/**
 * Marquer un client comme hors ligne
 */
export async function setClientOffline(
  db: Firestore,
  uid: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), {
      lastSeen: serverTimestamp(),
      isOnline: false,
    });
  } catch {
    // Silently fail
  }
}

// ─── Algorithme d'assignation automatique ────────────────────────────────────

/**
 * Trouver le meilleur chauffeur disponible pour une demande
 * Critères : distance, note, taux d'acceptation
 */
export function findBestDriver(
  request: LiveRideRequest,
  drivers: LiveDriver[]
): LiveDriver | null {
  const available = drivers.filter((d) => d.status === 'online' && d.location);
  if (available.length === 0) return null;

  let bestDriver: LiveDriver | null = null;
  let bestScore = -1;

  for (const driver of available) {
    if (!driver.location) continue;

    const distKm = haversineKm(
      driver.location.latitude,
      driver.location.longitude,
      request.pickup.latitude,
      request.pickup.longitude
    );

    if (distKm > 15) continue; // Trop loin (>15 km)

    const etaSeconds = (distKm / 30) * 3600; // ~30 km/h en ville
    const etaScore = Math.max(0, 1 - etaSeconds / 600);
    const ratingScore = (driver.averageRating || 4.5) / 5;
    const distScore = Math.max(0, 1 - distKm / 15);

    const score = 0.45 * etaScore + 0.30 * ratingScore + 0.25 * distScore;

    if (score > bestScore) {
      bestScore = score;
      bestDriver = driver;
    }
  }

  return bestDriver;
}

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
