/**
 * KULOOC — Service de Dispatch Automatique
 * Ce service écoute les nouvelles demandes de course et les assigne automatiquement
 * au chauffeur disponible le plus proche.
 * 
 * USAGE: ts-node scripts/dispatch-service.ts
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// Initialiser Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, 'firebase-credentials.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://studio-1433254313-1efda.firebaseio.com`
});

const db = admin.firestore();

// Types
type RideStatus =
  | 'pending'
  | 'searching'
  | 'driver-assigned'
  | 'driver-arrived'
  | 'in-progress'
  | 'completed'
  | 'cancelled';

type GeoPoint = {
  latitude: number;
  longitude: number;
  address: string;
};

type RideRequest = {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone?: string;
  pickup: GeoPoint;
  destination: GeoPoint;
  serviceType: string;
  estimatedPrice: number;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  surgeMultiplier: number;
  status: RideStatus;
  requestedAt: admin.firestore.Timestamp;
  paymentMethod?: string;
  notes?: string;
};

type Driver = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'online' | 'offline' | 'en-route' | 'on-trip' | 'busy';
  location?: {
    latitude: number;
    longitude: number;
  };
  vehicle: {
    make: string;
    model: string;
    year: number;
    color: string;
    licensePlate: string;
  };
  rating: number;
  totalTrips: number;
  onlineSince?: admin.firestore.Timestamp;
};

// Calculer la distance entre deux points (formule de Haversine)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Calculer le tarif d'une course
function calculateRidePrice(params: {
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

// Trouver le chauffeur disponible le plus proche
async function findNearestAvailableDriver(
  pickupLat: number,
  pickupLng: number
): Promise<Driver | null> {
  try {
    const driversSnapshot = await db
      .collection('drivers')
      .where('status', '==', 'online')
      .get();

    if (driversSnapshot.empty) {
      console.log('❌ Aucun chauffeur disponible');
      return null;
    }

    const drivers: Driver[] = [];
    driversSnapshot.forEach((doc) => {
      const driver = { id: doc.id, ...doc.data() } as Driver;
      if (driver.location) {
        drivers.push(driver);
      }
    });

    if (drivers.length === 0) {
      console.log('❌ Aucun chauffeur avec localisation disponible');
      return null;
    }

    let nearestDriver = drivers[0];
    let minDistance = calculateDistance(
      pickupLat,
      pickupLng,
      nearestDriver.location!.latitude,
      nearestDriver.location!.longitude
    );

    for (let i = 1; i < drivers.length; i++) {
      const driver = drivers[i];
      const distance = calculateDistance(
        pickupLat,
        pickupLng,
        driver.location!.latitude,
        driver.location!.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestDriver = driver;
      }
    }

    console.log(`✅ Chauffeur trouvé: ${nearestDriver.name} (${minDistance.toFixed(2)} km)`);
    return nearestDriver;
  } catch (error) {
    console.error('Erreur lors de la recherche de chauffeur:', error);
    return null;
  }
}

// Assigner une course à un chauffeur
async function assignRideToDriver(
  request: RideRequest,
  driver: Driver
): Promise<void> {
  try {
    const batch = db.batch();

    // 1. Mettre à jour le statut de la demande
    const requestRef = db.collection('ride_requests').doc(request.id);
    batch.update(requestRef, {
      status: 'driver-assigned',
      driverId: driver.id,
      driverName: driver.name,
      assignedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Créer une course active
    const serviceMultipliers: Record<string, number> = {
      'kulooc_x': 1.0,
      'kulooc_green': 1.2,
      'kulooc_xl': 1.5,
      'kulooc_black': 2.0,
      'kulooc_comfort': 1.3,
    };

    const serviceMultiplier = serviceMultipliers[request.serviceType] || 1.0;

    const pricing = calculateRidePrice({
      distanceKm: request.estimatedDistanceKm,
      durationMin: request.estimatedDurationMin,
      serviceMultiplier,
      surgeMultiplier: request.surgeMultiplier,
    });

    const activeRideRef = db.collection('active_rides').doc();
    batch.set(activeRideRef, {
      requestId: request.id,
      passengerId: request.passengerId,
      passengerName: request.passengerName,
      passengerPhone: request.passengerPhone || null,
      driverId: driver.id,
      driverName: driver.name,
      driverLocation: driver.location || null,
      pickup: request.pickup,
      destination: request.destination,
      serviceType: request.serviceType,
      status: 'driver-assigned',
      pricing: {
        base: pricing.base,
        perKm: pricing.perKm,
        perMin: pricing.perMin,
        distanceKm: request.estimatedDistanceKm,
        durationMin: request.estimatedDurationMin,
        surgeMultiplier: request.surgeMultiplier,
        subtotal: pricing.subtotal,
        tax: pricing.tax,
        total: pricing.total,
      },
      assignedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3. Mettre à jour le statut du chauffeur
    const driverRef = db.collection('drivers').doc(driver.id);
    batch.update(driverRef, {
      status: 'en-route',
      currentRideId: activeRideRef.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    console.log(`✅ Course assignée: ${request.passengerName} → ${driver.name}`);
    console.log(`   Pickup: ${request.pickup.address}`);
    console.log(`   Destination: ${request.destination.address}`);
    console.log(`   Prix estimé: $${pricing.total.toFixed(2)}`);
  } catch (error) {
    console.error('Erreur lors de l\'assignation de la course:', error);
    throw error;
  }
}

// Écouter les nouvelles demandes de course
function startDispatchListener() {
  console.log('🚀 Service de dispatch KULOOC démarré...');
  console.log('👀 Écoute des nouvelles demandes de course...\n');

  const query = db
    .collection('ride_requests')
    .where('status', '==', 'pending');

  query.onSnapshot(async (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'added') {
        const request = {
          id: change.doc.id,
          ...change.doc.data(),
        } as RideRequest;

        console.log(`\n📢 Nouvelle demande de course reçue:`);
        console.log(`   Passager: ${request.passengerName}`);
        console.log(`   Pickup: ${request.pickup.address}`);
        console.log(`   Destination: ${request.destination.address}`);
        console.log(`   Service: ${request.serviceType}`);

        // Mettre à jour le statut en "searching"
        await db.collection('ride_requests').doc(request.id).update({
          status: 'searching',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Trouver un chauffeur disponible
        const driver = await findNearestAvailableDriver(
          request.pickup.latitude,
          request.pickup.longitude
        );

        if (driver) {
          // Assigner la course au chauffeur
          await assignRideToDriver(request, driver);
        } else {
          console.log('❌ Aucun chauffeur disponible pour cette course');
          await db.collection('ride_requests').doc(request.id).update({
            status: 'pending',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    });
  }, (error) => {
    console.error('Erreur lors de l\'écoute des demandes:', error);
  });
}

// Démarrer le service
startDispatchListener();

// Garder le processus en vie
process.on('SIGINT', () => {
  console.log('\n\n🛑 Arrêt du service de dispatch...');
  process.exit(0);
});
