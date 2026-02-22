/**
 * KULOOC — API Route pour le seed Firestore
 * Côté serveur — contourne les règles de sécurité Firestore client
 * POST /api/admin/seed
 */

import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ─── Initialisation Firebase Admin ───────────────────────────────────────────

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Sur Vercel, utiliser les variables d'environnement publiques Firebase
  // Firebase Admin peut s'initialiser avec juste le projectId pour les opérations
  // qui ne nécessitent pas de service account (via Application Default Credentials)
  // Sinon, on utilise les credentials de service account si disponibles
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }

  // Fallback: initialiser avec juste le projectId (pour Firebase Emulator ou App Hosting)
  return initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

// ─── Données de démonstration ─────────────────────────────────────────────────

const DEMO_DRIVERS = [
  {
    id: 'driver_001',
    name: 'Jean-Pierre Tremblay',
    email: 'jp.tremblay@kulooc.ca',
    phone: '+1-514-555-0101',
    status: 'online',
    language: 'fr',
    averageRating: 4.9,
    totalRatings: 312,
    acceptanceRate: 0.94,
    completionRate: 0.97,
    totalRidesToday: 3,
    totalRidesAllTime: 1247,
    location: { latitude: 45.5088, longitude: -73.554 },
    vehicle: { type: 'electric', make: 'Tesla', model: 'Model 3', year: 2023, color: 'Blanc', licensePlate: 'KULOOC-01', seats: 4 },
    isVerified: true,
    earningsToday: 87.50,
    earningsWeek: 623.00,
  },
  {
    id: 'driver_002',
    name: 'Emily Chen',
    email: 'emily.chen@kulooc.ca',
    phone: '+1-514-555-0102',
    status: 'online',
    language: 'en',
    averageRating: 4.8,
    totalRatings: 208,
    acceptanceRate: 0.91,
    completionRate: 0.95,
    totalRidesToday: 2,
    totalRidesAllTime: 834,
    location: { latitude: 45.515, longitude: -73.56 },
    vehicle: { type: 'gas', make: 'Honda', model: 'Civic', year: 2022, color: 'Gris', licensePlate: 'KULOOC-02', seats: 4 },
    isVerified: true,
    earningsToday: 54.25,
    earningsWeek: 412.00,
  },
  {
    id: 'driver_003',
    name: 'Mathieu Gagnon',
    email: 'mathieu.gagnon@kulooc.ca',
    phone: '+1-514-555-0103',
    status: 'online',
    language: 'both',
    averageRating: 5.0,
    totalRatings: 156,
    acceptanceRate: 0.98,
    completionRate: 0.99,
    totalRidesToday: 4,
    totalRidesAllTime: 562,
    location: { latitude: 45.495, longitude: -73.57 },
    vehicle: { type: 'electric', make: 'Chevrolet', model: 'Bolt EV', year: 2023, color: 'Bleu', licensePlate: 'KULOOC-03', seats: 4 },
    isVerified: true,
    earningsToday: 112.00,
    earningsWeek: 745.50,
  },
  {
    id: 'driver_004',
    name: 'Sarah Okonkwo',
    email: 'sarah.okonkwo@kulooc.ca',
    phone: '+1-514-555-0104',
    status: 'offline',
    language: 'both',
    averageRating: 4.7,
    totalRatings: 89,
    acceptanceRate: 0.88,
    completionRate: 0.93,
    totalRidesToday: 0,
    totalRidesAllTime: 289,
    location: { latitude: 45.52, longitude: -73.58 },
    vehicle: { type: 'gas', make: 'Toyota', model: 'Camry', year: 2021, color: 'Noir', licensePlate: 'KULOOC-04', seats: 4 },
    isVerified: true,
    earningsToday: 0,
    earningsWeek: 198.00,
  },
  {
    id: 'driver_005',
    name: 'David Nguyen',
    email: 'david.nguyen@kulooc.ca',
    phone: '+1-514-555-0105',
    status: 'online',
    language: 'en',
    averageRating: 4.9,
    totalRatings: 445,
    acceptanceRate: 0.96,
    completionRate: 0.98,
    totalRidesToday: 5,
    totalRidesAllTime: 1893,
    location: { latitude: 45.50, longitude: -73.59 },
    vehicle: { type: 'electric', make: 'Hyundai', model: 'IONIQ 5', year: 2024, color: 'Vert Forêt', licensePlate: 'KULOOC-05', seats: 5 },
    isVerified: true,
    earningsToday: 143.75,
    earningsWeek: 891.25,
  },
  {
    id: 'driver_006',
    name: 'Chloé Beaumont',
    email: 'chloe.beaumont@kulooc.ca',
    phone: '+1-514-555-0106',
    status: 'online',
    language: 'fr',
    averageRating: 4.6,
    totalRatings: 67,
    acceptanceRate: 0.85,
    completionRate: 0.91,
    totalRidesToday: 1,
    totalRidesAllTime: 178,
    location: { latitude: 45.48, longitude: -73.565 },
    vehicle: { type: 'gas', make: 'Mazda', model: '3', year: 2022, color: 'Rouge', licensePlate: 'KULOOC-06', seats: 4 },
    isVerified: true,
    earningsToday: 28.50,
    earningsWeek: 267.00,
  },
];

const DEMO_ZONES = [
  { id: 'zone_plateau', name: 'Plateau-Mont-Royal', city: 'Montréal', province: 'QC', center: { latitude: 45.5217, longitude: -73.5793 }, radiusKm: 2.5, currentDemandLevel: 'medium', surgeMultiplier: 1.0, activeDrivers: 3, pendingRequests: 0 },
  { id: 'zone_downtown', name: 'Centre-Ville', city: 'Montréal', province: 'QC', center: { latitude: 45.5017, longitude: -73.5673 }, radiusKm: 3.0, currentDemandLevel: 'high', surgeMultiplier: 1.3, activeDrivers: 8, pendingRequests: 2 },
  { id: 'zone_rosemont', name: 'Rosemont', city: 'Montréal', province: 'QC', center: { latitude: 45.5430, longitude: -73.5730 }, radiusKm: 2.0, currentDemandLevel: 'low', surgeMultiplier: 1.0, activeDrivers: 2, pendingRequests: 0 },
  { id: 'zone_airport', name: 'Aéroport Trudeau', city: 'Dorval', province: 'QC', center: { latitude: 45.4581, longitude: -73.7481 }, radiusKm: 4.0, currentDemandLevel: 'high', surgeMultiplier: 1.5, activeDrivers: 5, pendingRequests: 3 },
  { id: 'zone_oldport', name: 'Vieux-Port', city: 'Montréal', province: 'QC', center: { latitude: 45.5081, longitude: -73.5481 }, radiusKm: 1.5, currentDemandLevel: 'medium', surgeMultiplier: 1.2, activeDrivers: 4, pendingRequests: 1 },
];

const SYSTEM_CONFIG = {
  version: '1.0.0',
  platform: 'KULOOC',
  country: 'CA',
  province: 'QC',
  currency: 'CAD',
  taxRate: 0.14975,
  pricing: {
    baseFare: 3.50,
    perKm: 1.75,
    perMinute: 0.35,
    minimumFare: 7.00,
    cancellationFee: 5.00,
    surgeMaxMultiplier: 3.0,
    surgeThresholdRatio: 0.7,
  },
  dispatch: {
    maxSearchRadiusKm: 10,
    maxWaitTimeSeconds: 300,
    autoAssignEnabled: true,
    driverResponseTimeoutSeconds: 30,
    maxRetries: 3,
  },
  operatingHours: { start: '00:00', end: '23:59', timezone: 'America/Toronto' },
  supportPhone: '+1-514-KULOOC-1',
  supportEmail: 'support@kulooc.ca',
};

// ─── Handler POST ─────────────────────────────────────────────────────────────

export async function POST() {
  try {
    const app = getAdminApp();
    const db = getFirestore(app);

    const results: Record<string, number> = {};
    const batch = db.batch();

    // Seed drivers
    for (const driver of DEMO_DRIVERS) {
      const { id, ...data } = driver;
      const ref = db.collection('drivers').doc(id);
      batch.set(ref, { ...data, createdAt: new Date(), updatedAt: new Date() });
    }
    results.drivers = DEMO_DRIVERS.length;

    // Seed zones
    for (const zone of DEMO_ZONES) {
      const { id, ...data } = zone;
      const ref = db.collection('zones').doc(id);
      batch.set(ref, { ...data, updatedAt: new Date() });
    }
    results.zones = DEMO_ZONES.length;

    // Seed system config
    const configRef = db.collection('system_config').doc('global');
    batch.set(configRef, { ...SYSTEM_CONFIG, createdAt: new Date(), updatedAt: new Date() });
    results.system_config = 1;

    await batch.commit();

    const total = Object.values(results).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      success: true,
      message: `✅ Firestore initialisé: ${total} documents créés (${results.drivers} chauffeurs, ${results.zones} zones, config système)`,
      details: results,
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { success: false, message: `❌ Erreur: ${error.message}` },
      { status: 500 }
    );
  }
}
