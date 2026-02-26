/**
 * KULOOC — API Route /api/dispatch
 * ─────────────────────────────────────────────────────────────────────────────
 * Déclenche le traitement d'une ride_request par le Dispatch Engine.
 *
 * Appelé par client/page.tsx après création d'une ride_request :
 *   POST /api/dispatch  { requestId: string }
 *
 * Cette route :
 *   1. Lit la ride_request dans Firestore
 *   2. Démarre le moteur (singleton — idempotent)
 *   3. Appelle engine.processRequest() pour déclencher l'offre au chauffeur
 *   4. Retourne { processed: 1, assigned: false } immédiatement
 *      (l'assignation réelle est asynchrone via onSnapshot)
 *
 * Note : Le Dispatch Engine utilise le SDK client Firebase (pas Admin SDK)
 * car il est partagé avec le code client. Cette route s'exécute dans le
 * runtime Node.js de Next.js (pas Edge).
 */
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyC6KnCmgzrgRjH4Cs5pXOm3P11EYuUwnXM',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'studio-1433254313-1efda.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-1433254313-1efda',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'kulooc-storage-2025',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '25592788712',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:25592788712:web:85a4598385540a7834bb5d',
};

function getDb() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { requestId } = body;

    if (!requestId || typeof requestId !== 'string') {
      return NextResponse.json({ error: 'requestId manquant' }, { status: 400 });
    }

    const db = getDb();

    // 1. Lire la ride_request
    const reqSnap = await getDoc(doc(db, 'ride_requests', requestId));
    if (!reqSnap.exists()) {
      return NextResponse.json({ error: 'ride_request introuvable' }, { status: 404 });
    }

    const reqData = reqSnap.data();

    // Si déjà assignée, ne rien faire
    if (!['pending', 'searching'].includes(reqData.status)) {
      return NextResponse.json({ processed: 0, status: reqData.status, message: 'Déjà traitée' });
    }

    // 2. Chercher les chauffeurs disponibles
    const driversSnap = await getDocs(
      query(collection(db, 'drivers'), where('status', '==', 'online'))
    );

    const drivers = driversSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Array<{
      id: string;
      status: string;
      location?: { latitude: number; longitude: number };
      currentRideId?: string | null;
      onlineSince?: any;
      averageRating?: number;
    }>;

    const available = drivers.filter(d => d.status === 'online' && d.location && !d.currentRideId);

    if (available.length === 0) {
      // Marquer comme "searching" pour que le dashboard le voit clairement
      await updateDoc(doc(db, 'ride_requests', requestId), {
        status: 'searching',
        searchStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        noDriversAvailable: true,
      }).catch(() => {});
      return NextResponse.json({
        processed: 1,
        assigned: false,
        message: 'Aucun chauffeur disponible — moteur en attente',
        driversChecked: drivers.length,
      });
    }

    // 3. Sélectionner le meilleur chauffeur
    const pickupLat = reqData.pickup?.latitude ?? 45.5631;
    const pickupLng = reqData.pickup?.longitude ?? -73.7124;

    const scored = available.map(d => {
      const distKm = haversineKm(
        d.location!.latitude, d.location!.longitude,
        pickupLat, pickupLng
      );
      const waitSeconds = d.onlineSince?.seconds
        ? (Date.now() / 1000) - d.onlineSince.seconds
        : 0;
      const distScore = Math.max(0, 1 - distKm / 15);
      const waitScore = Math.min(1, waitSeconds / 3600);
      const ratingScore = (d.averageRating || 4.5) / 5;
      const score = 0.50 * waitScore + 0.30 * distScore + 0.20 * ratingScore;
      return { driver: d, distKm, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0].driver;

    // 4. Créer l'offre dans Firestore
    const { Timestamp, setDoc } = await import('firebase/firestore');
    const offerExpiresAt = new Date(Date.now() + 60000);

    await updateDoc(doc(db, 'ride_requests', requestId), {
      offeredToDriverId: best.id,
      offerExpiresAt: Timestamp.fromDate(offerExpiresAt),
      offerSentAt: serverTimestamp(),
      status: 'offered',
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'driver_offers', `${requestId}_${best.id}`), {
      requestId,
      driverId: best.id,
      passengerId: reqData.passengerId || '',
      passengerName: reqData.passengerName || 'Passager',
      pickup: reqData.pickup,
      destination: reqData.destination,
      serviceType: reqData.serviceType || 'KULOOC X',
      estimatedPrice: reqData.estimatedPrice || 0,
      estimatedDistanceKm: reqData.estimatedDistanceKm || 0,
      estimatedDurationMin: reqData.estimatedDurationMin || 0,
      status: 'pending',
      expiresAt: Timestamp.fromDate(offerExpiresAt),
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({
      processed: 1,
      assigned: false,
      offered: true,
      driverId: best.id,
      message: `Offre envoyée au chauffeur ${best.id}`,
    });

  } catch (err: any) {
    console.error('[api/dispatch] error:', err);
    return NextResponse.json({ error: err.message || 'Erreur interne' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'KULOOC Dispatch API v2 — OK' });
}
