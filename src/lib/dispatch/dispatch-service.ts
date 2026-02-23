'use client';

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  runTransaction,
  addDoc,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  DispatchDriver,
  RideRequest,
  ActiveRide,
  DispatchMetrics,
  MatchScore,
  ZoneMetrics,
  CandidateDriver,
} from './types';

// ============================================================
// Haversine Distance (km)
// ============================================================
export function haversineDistance(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

// ============================================================
// Scoring Algorithm — Multi-criteria weighted scoring
// Inspired by Uber/Lyft dispatch research
// ============================================================
export function calculateMatchScore(params: {
  etaSeconds: number;
  driverRating: number;
  acceptanceRate: number;
  distanceKm: number;
  languageMatch?: boolean;
  capacityOk?: boolean;
  futureDemand?: number; // Forward-looking factor
}): MatchScore['breakdown'] & { total: number } {
  const {
    etaSeconds,
    driverRating,
    acceptanceRate,
    distanceKm,
    languageMatch = true,
    capacityOk = true,
    futureDemand = 0,
  } = params;

  // Normalize each factor to [0, 1]
  const etaScore = Math.max(0, 1 - etaSeconds / 600); // 10 min max
  const ratingScore = driverRating / 5;
  const acceptanceScore = acceptanceRate;
  const distanceScore = Math.max(0, 1 - distanceKm / 5); // 5 km max

  // Weights (tuned for Canadian urban market)
  const weights = {
    eta: 0.40,
    rating: 0.25,
    acceptance: 0.15,
    distance: 0.15,
    language: 0.05,
  };

  let score =
    weights.eta * etaScore +
    weights.rating * ratingScore +
    weights.acceptance * acceptanceScore +
    weights.distance * distanceScore;

  // Discrete bonuses
  if (languageMatch) score += weights.language;
  if (!capacityOk) score -= 0.3; // Hard penalty

  // Forward-looking: penalize sending a driver from a high-demand zone
  if (futureDemand > 5) score *= 0.85;

  return {
    etaScore,
    ratingScore,
    acceptanceScore,
    distanceScore,
    total: Math.min(1, Math.max(0, score)),
  };
}

// ============================================================
// Surge Pricing — Exponential smoothing (FairRide-Decay inspired)
// ============================================================
const SMOOTHING_FACTOR = 0.7;
const MAX_SURGE = 3.0;
const MIN_SURGE = 1.0;

export function calculateSurge(
  pendingRequests: number,
  availableDrivers: number,
  previousSurge = 1.0
): number {
  const supply = Math.max(availableDrivers, 1);
  const demand = Math.max(pendingRequests, 0);
  const currentRatio = demand / supply;
  const newSmoothed =
    SMOOTHING_FACTOR * currentRatio + (1 - SMOOTHING_FACTOR) * previousSurge;
  return Math.min(MAX_SURGE, Math.max(MIN_SURGE, newSmoothed));
}

// ============================================================
// Fare Calculation
// ============================================================
export function calculateFare(
  distanceKm: number,
  durationMinutes: number,
  surgeMultiplier = 1.0,
  productType: string = 'standard'
): {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeMultiplier: number;
  subtotal: number;
  tax: number;
  total: number;
} {
  const productMultipliers: Record<string, number> = {
    standard: 1.0,
    comfort: 1.3,
    xl: 1.5,
    premium: 1.8,
    electric: 1.2,
  };

  const multiplier = productMultipliers[productType] ?? 1.0;

  const baseFare = 3.5 * multiplier;
  const distanceFare = distanceKm * 1.5 * multiplier;
  const timeFare = durationMinutes * 0.25 * multiplier;
  const subtotal = (baseFare + distanceFare + timeFare) * surgeMultiplier;
  const tax = subtotal * 0.14975; // QC TPS+TVQ
  const total = subtotal + tax;

  return {
    baseFare: +baseFare.toFixed(2),
    distanceFare: +distanceFare.toFixed(2),
    timeFare: +timeFare.toFixed(2),
    surgeMultiplier,
    subtotal: +subtotal.toFixed(2),
    tax: +tax.toFixed(2),
    total: +total.toFixed(2),
  };
}

// ============================================================
// Firestore Real-time Listeners
// ============================================================

export function subscribeToDrivers(
  db: ReturnType<typeof import('firebase/firestore').getFirestore>,
  callback: (drivers: DispatchDriver[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'drivers'),
    where('status', 'in', ['online', 'en-route', 'on-trip', 'busy'])
  );
  return onSnapshot(q, (snapshot) => {
    const drivers: DispatchDriver[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<DispatchDriver, 'id'>),
    }));
    callback(drivers);
  });
}

export function subscribeToRideRequests(
  db: ReturnType<typeof import('firebase/firestore').getFirestore>,
  callback: (requests: RideRequest[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'ride_requests'),
    where('status', 'in', ['pending', 'searching']),
    orderBy('requestedAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snapshot) => {
    const requests: RideRequest[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<RideRequest, 'id'>),
    }));
    callback(requests);
  });
}

export function subscribeToActiveRides(
  db: ReturnType<typeof import('firebase/firestore').getFirestore>,
  callback: (rides: ActiveRide[]) => void
): Unsubscribe {
  // Query sans orderBy pour éviter l'index composite manquant rides(status+assignedAt)
  // Le tri est effectué côté client après réception
  const q = query(
    collection(db, 'rides'),
    where('status', 'in', ['driver-assigned', 'driver-arrived', 'in-progress']),
    limit(100)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const rides: ActiveRide[] = snapshot.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<ActiveRide, 'id'>) }))
        // Tri côté client par assignedAt décroissant
        .sort((a: any, b: any) => {
          const aTime = a.assignedAt?.toMillis?.() ?? 0;
          const bTime = b.assignedAt?.toMillis?.() ?? 0;
          return bTime - aTime;
        });
      callback(rides);
    },
    (err) => {
      // En cas d'erreur Firestore, retourner tableau vide sans bloquer l'UI
      console.warn('subscribeToActiveRides error (ignoré):', err.message);
      callback([]);
    }
  );
}

export function subscribeToZoneMetrics(
  db: ReturnType<typeof import('firebase/firestore').getFirestore>,
  callback: (zones: ZoneMetrics[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'h3_cells_aggregates'),
    where('driversCount', '>', 0)
  );
  return onSnapshot(q, (snapshot) => {
    const zones: ZoneMetrics[] = snapshot.docs.map((d) => ({
      cellId: d.id,
      ...(d.data() as Omit<ZoneMetrics, 'cellId'>),
    }));
    callback(zones);
  });
}

// ============================================================
// Dispatch Actions
// ============================================================

export async function manualAssignDriver(
  db: ReturnType<typeof import('firebase/firestore').getFirestore>,
  requestId: string,
  driverId: string
): Promise<{ success: boolean; rideId?: string; error?: string }> {
  try {
    const requestRef = doc(db, 'ride_requests', requestId);
    const driverRef = doc(db, 'drivers', driverId);

    return await runTransaction(db, async (transaction) => {
      const requestSnap = await transaction.get(requestRef);
      const driverSnap = await transaction.get(driverRef);

      if (!requestSnap.exists()) {
        return { success: false, error: 'Demande introuvable' };
      }
      if (!driverSnap.exists()) {
        return { success: false, error: 'Chauffeur introuvable' };
      }
      if (requestSnap.data().status === 'matched') {
        return { success: false, error: 'Demande déjà assignée' };
      }

      const rideRef = doc(collection(db, 'rides'));
      const requestData = requestSnap.data();
      const driverData = driverSnap.data();

      transaction.set(rideRef, {
        requestId,
        passengerId: requestData.passengerId,
        driverId,
        driverName: driverData.name || 'Chauffeur',
        pickup: requestData.pickup,
        destination: requestData.destination,
        status: 'driver-assigned',
        assignedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        pricing: calculateFare(
          requestData.estimatedDistance || 5,
          requestData.estimatedDuration || 15,
          requestData.surgeMultiplier || 1.0,
          requestData.productType || 'standard'
        ),
      });

      transaction.update(requestRef, {
        status: 'matched',
        assignedDriverId: driverId,
        assignedAt: serverTimestamp(),
      });

      transaction.update(driverRef, {
        status: 'en-route',
        currentRideId: rideRef.id,
      });

      return { success: true, rideId: rideRef.id };
    });
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateRideStatus(
  db: ReturnType<typeof import('firebase/firestore').getFirestore>,
  rideId: string,
  status: ActiveRide['status']
): Promise<void> {
  const rideRef = doc(db, 'rides', rideId);
  const updates: Record<string, unknown> = { status };

  if (status === 'driver-arrived') updates.driverArrivedAt = serverTimestamp();
  if (status === 'in-progress') updates.startedAt = serverTimestamp();
  if (status === 'completed') updates.completedAt = serverTimestamp();

  await updateDoc(rideRef, updates);

  // Update driver status
  const rideSnap = await getDoc(rideRef);
  if (rideSnap.exists()) {
    const driverId = rideSnap.data().driverId;
    if (driverId) {
      const driverRef = doc(db, 'drivers', driverId);
      if (status === 'in-progress') {
        await updateDoc(driverRef, { status: 'on-trip' });
      } else if (status === 'completed' || status === 'cancelled') {
        await updateDoc(driverRef, { status: 'online', currentRideId: null });
      }
    }
  }
}

// ============================================================
// Seed Demo Data (for testing without real drivers)
// ============================================================
export async function seedDemoData(
  db: ReturnType<typeof import('firebase/firestore').getFirestore>
): Promise<void> {
  const demoDrivers = [
    {
      userId: 'demo-1',
      name: 'Jean-Pierre Tremblay',
      status: 'online',
      averageRating: 4.9,
      acceptanceRate: 0.95,
      totalRidesToday: 8,
      currentLocation: { latitude: 45.5088, longitude: -73.554, heading: 90, speed: 0 },
      vehicle: { make: 'Tesla', model: 'Model 3', year: 2023, color: 'Blanc', licensePlate: 'ABC-123', capacity: 4, type: 'electric' },
      preferences: { language: 'fr' },
      onlineSince: new Date(),
      lastSeen: new Date(),
    },
    {
      userId: 'demo-2',
      name: 'Emily Chen',
      status: 'online',
      averageRating: 4.8,
      acceptanceRate: 0.88,
      totalRidesToday: 5,
      currentLocation: { latitude: 45.515, longitude: -73.56, heading: 180, speed: 0 },
      vehicle: { make: 'Honda', model: 'Civic', year: 2022, color: 'Gris', licensePlate: 'DEF-456', capacity: 4, type: 'standard' },
      preferences: { language: 'en' },
      onlineSince: new Date(),
      lastSeen: new Date(),
    },
    {
      userId: 'demo-3',
      name: 'Mathieu Gagnon',
      status: 'en-route',
      averageRating: 5.0,
      acceptanceRate: 0.97,
      totalRidesToday: 12,
      currentLocation: { latitude: 45.495, longitude: -73.57, heading: 270, speed: 35 },
      vehicle: { make: 'Chevrolet', model: 'Bolt EV', year: 2023, color: 'Bleu', licensePlate: 'GHI-789', capacity: 4, type: 'electric' },
      preferences: { language: 'fr' },
      onlineSince: new Date(),
      lastSeen: new Date(),
    },
    {
      userId: 'demo-4',
      name: 'Sarah Lavoie',
      status: 'online',
      averageRating: 4.7,
      acceptanceRate: 0.82,
      totalRidesToday: 3,
      currentLocation: { latitude: 45.52, longitude: -73.58, heading: 45, speed: 0 },
      vehicle: { make: 'Toyota', model: 'Sienna', year: 2021, color: 'Noir', licensePlate: 'JKL-012', capacity: 7, type: 'xl' },
      preferences: { language: 'fr' },
      onlineSince: new Date(),
      lastSeen: new Date(),
    },
    {
      userId: 'demo-5',
      name: 'David Okafor',
      status: 'on-trip',
      averageRating: 4.9,
      acceptanceRate: 0.93,
      totalRidesToday: 10,
      currentLocation: { latitude: 45.50, longitude: -73.59, heading: 135, speed: 42 },
      vehicle: { make: 'Hyundai', model: 'Ioniq 5', year: 2023, color: 'Vert', licensePlate: 'MNO-345', capacity: 4, type: 'electric' },
      preferences: { language: 'en' },
      onlineSince: new Date(),
      lastSeen: new Date(),
    },
    {
      userId: 'demo-6',
      name: 'Chloé Bergeron',
      status: 'online',
      averageRating: 4.6,
      acceptanceRate: 0.79,
      totalRidesToday: 6,
      currentLocation: { latitude: 45.48, longitude: -73.565, heading: 315, speed: 0 },
      vehicle: { make: 'Mercedes', model: 'E-Class', year: 2022, color: 'Noir', licensePlate: 'PQR-678', capacity: 4, type: 'premium' },
      preferences: { language: 'fr' },
      onlineSince: new Date(),
      lastSeen: new Date(),
    },
  ];

  for (const driver of demoDrivers) {
    await setDoc(doc(db, 'drivers', `demo-driver-${driver.userId}`), driver, { merge: true });
  }

  // Seed demo ride requests
  const demoRequests = [
    {
      passengerId: 'passenger-001',
      passengerName: 'Alice Martin',
      pickup: { address: '1455 Rue Peel, Montréal, QC', location: { latitude: 45.4985, longitude: -73.5693 } },
      destination: { address: '3700 Rue McTavish, Montréal, QC', location: { latitude: 45.5048, longitude: -73.5775 } },
      productType: 'standard',
      estimatedFare: 12.50,
      estimatedDistance: 2.8,
      estimatedDuration: 10,
      status: 'pending',
      matchingRadius: 3,
      requestedAt: new Date(),
      surgeMultiplier: 1.0,
    },
    {
      passengerId: 'passenger-002',
      passengerName: 'Bob Tremblay',
      pickup: { address: '800 Rue de la Gauchetière O, Montréal, QC', location: { latitude: 45.4958, longitude: -73.5636 } },
      destination: { address: '5100 Rue Sherbrooke E, Montréal, QC', location: { latitude: 45.5461, longitude: -73.5592 } },
      productType: 'xl',
      estimatedFare: 24.00,
      estimatedDistance: 6.2,
      estimatedDuration: 22,
      status: 'searching',
      matchingRadius: 3,
      requestedAt: new Date(Date.now() - 45000),
      surgeMultiplier: 1.2,
    },
  ];

  for (const req of demoRequests) {
    await addDoc(collection(db, 'ride_requests'), req);
  }

  // Seed active ride
  await addDoc(collection(db, 'rides'), {
    passengerId: 'passenger-003',
    passengerName: 'Carol Dubois',
    driverId: 'demo-driver-demo-3',
    driverName: 'Mathieu Gagnon',
    pickup: { address: '1000 Rue Notre-Dame O, Montréal, QC', location: { latitude: 45.4963, longitude: -73.5539 } },
    destination: { address: '6600 Boul. Saint-Laurent, Montréal, QC', location: { latitude: 45.5282, longitude: -73.6008 } },
    status: 'in-progress',
    assignedAt: new Date(Date.now() - 300000),
    startedAt: new Date(Date.now() - 240000),
    pricing: calculateFare(5.2, 18, 1.0, 'standard'),
  });
}
