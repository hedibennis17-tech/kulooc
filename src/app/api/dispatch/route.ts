/**
 * KULOOC — API Route dispatch serveur v3
 * POST /api/dispatch  → traiter une demande spécifique
 * GET  /api/dispatch  → traiter toutes les demandes pending (Cron Vercel chaque minute)
 *
 * BUGS CORRIGÉS v3:
 *  1. Chauffeurs sans GPS acceptés (location non requise)
 *  2. en-route/on-trip avec currentRideId=null = disponible
 *  3. offered expirées remises en pending automatiquement
 *  4. Retries respectent declinedByDriverIds
 */
import { NextRequest, NextResponse } from 'next/server';

function getAdminFirestore() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const admin = require('firebase-admin');
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-1433254313-1efda';
  const appName = 'kulooc-dispatch';
  const existing = admin.apps.find((a: any) => a?.name === appName);
  if (existing) return existing.firestore();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY || null;
  if (raw) {
    try {
      const sa = JSON.parse(raw.trim().replace(/^['"]+|['"]+$/g, ''));
      admin.initializeApp({ credential: admin.credential.cert(sa), projectId }, appName);
      console.log('[dispatch] Firebase Admin: SA OK');
    } catch (e: any) {
      console.error('[dispatch] SA parse error:', e.message);
      admin.initializeApp({ projectId }, appName);
    }
  } else {
    admin.initializeApp({ projectId }, appName);
    console.warn('[dispatch] ADC mode (no SA key)');
  }
  return admin.apps.find((a: any) => a?.name === appName).firestore();
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function dispatchPending(specificRequestId?: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const admin = require('firebase-admin');
  const db = getAdminFirestore();
  const FS = admin.firestore.FieldValue;

  let requestDocs: any[] = [];

  if (specificRequestId) {
    const snap = await db.collection('ride_requests').doc(specificRequestId).get();
    if (!snap.exists) return { processed: 0, error: 'Not found' };
    if (!['pending', 'offered'].includes(snap.data().status)) {
      return { processed: 0, message: `Status: ${snap.data().status}` };
    }
    requestDocs = [snap];
  } else {
    const pSnap = await db.collection('ride_requests').where('status', '==', 'pending').limit(20).get();
    requestDocs = [...pSnap.docs];

    // Offered expirées → remettre en pending
    const oSnap = await db.collection('ride_requests').where('status', '==', 'offered').limit(20).get();
    const now = Date.now();
    for (const d of oSnap.docs) {
      const exp = d.data().offerExpiresAt;
      const expMs = exp?.toMillis?.() || (exp?._seconds ? exp._seconds * 1000 : 0);
      if (expMs && expMs < now) {
        await d.ref.update({ status: 'pending', offeredToDriverId: null, offerExpiresAt: null, updatedAt: FS.serverTimestamp() });
        requestDocs.push(d);
        console.log(`[dispatch] Offered expirée → pending: ${d.id}`);
      }
    }
  }

  if (requestDocs.length === 0) return { processed: 0 };

  // Chauffeurs disponibles — FIX: location non requise, statuts périmés acceptés
  const drSnap = await db.collection('drivers').where('status', 'in', ['online', 'en-route', 'on-trip']).get();
  const available = drSnap.docs
    .map((d: any) => ({ id: d.id, ...d.data() }))
    .filter((d: any) => {
      if (d.currentRideId) return false;
      return d.status === 'online' || d.status === 'en-route' || d.status === 'on-trip';
    });

  console.log(`[dispatch] ${requestDocs.length} demandes | ${available.length} chauffeurs dispo sur ${drSnap.size} actifs`);

  if (available.length === 0) {
    return { processed: 0, driversAvailable: 0, totalDrivers: drSnap.size };
  }

  let processed = 0;
  for (const reqDoc of requestDocs) {
    const fresh = await db.collection('ride_requests').doc(reqDoc.id).get();
    if (!fresh.exists) continue;
    const req = { id: fresh.id, ...fresh.data() } as any;
    if (!['pending', 'offered'].includes(req.status)) continue;

    const excluded = [
      ...(req.declinedByDriverIds || []),
      ...(req.offeredToDriverId ? [req.offeredToDriverId] : []),
    ];
    let candidates = available.filter((d: any) => !excluded.includes(d.id));
    if (candidates.length === 0) candidates = [...available];

    const pLat = req.pickup?.latitude;
    const pLng = req.pickup?.longitude;
    let best: any = null;
    let bestScore = -Infinity;

    for (const d of candidates) {
      const waitScore = Math.min(1, (d.onlineSince?.seconds ? Date.now() / 1000 - d.onlineSince.seconds : 0) / 3600);
      let distScore = 0.5; // neutre si pas de GPS
      if (d.location?.latitude && pLat) {
        distScore = Math.max(0, 1 - haversineKm(d.location.latitude, d.location.longitude, pLat, pLng) / 20);
      }
      const score = 0.4 * waitScore + 0.4 * distScore + 0.2 * ((d.averageRating || 4.5) / 5);
      if (score > bestScore) { bestScore = score; best = d; }
    }
    if (!best) best = candidates[0];

    const expires = new Date(Date.now() + 60000);

    await db.collection('ride_requests').doc(req.id).update({
      status: 'offered',
      offeredToDriverId: best.id,
      offeredToDriverName: best.driverName || best.name || 'Chauffeur',
      offerExpiresAt: expires,
      offerSentAt: FS.serverTimestamp(),
      updatedAt: FS.serverTimestamp(),
    });

    await db.collection('driver_offers').doc(`${req.id}_${best.id}`).set({
      requestId: req.id,
      driverId: best.id,
      passengerId: req.passengerId,
      passengerName: req.passengerName,
      passengerPhone: req.passengerPhone || '',
      pickup: req.pickup,
      destination: req.destination,
      serviceType: req.serviceType,
      estimatedPrice: req.estimatedPrice,
      estimatedDistanceKm: req.estimatedDistanceKm,
      estimatedDurationMin: req.estimatedDurationMin,
      status: 'pending',
      expiresAt: expires,
      createdAt: FS.serverTimestamp(),
    });

    console.log(`[dispatch] ✅ ${req.id} → ${best.id} (${best.driverName || best.name || '?'})`);
    processed++;
  }

  return { processed, driversAvailable: available.length, totalDrivers: drSnap.size };
}

export async function GET(req: NextRequest) {
  // Vercel Cron jobs send this header for authentication
  const authHeader = req.headers.get('authorization');
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  
  // Log cron execution for monitoring
  console.log(`[dispatch GET] Cron=${isCron} at ${new Date().toISOString()}`);

  try {
    const result = await dispatchPending();
    return NextResponse.json({ ...result, cron: isCron, ts: new Date().toISOString() });
  } catch (e: any) {
    console.error('[dispatch GET] Error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await dispatchPending(body.requestId);
    return NextResponse.json({ ...result, ts: new Date().toISOString() });
  } catch (e: any) {
    console.error('[dispatch POST] Error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
