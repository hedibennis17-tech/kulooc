/**
 * KULOOC — API Route driver-ping
 * POST /api/driver-ping { driverId }
 * Remet TOUJOURS le chauffeur en ligne après la fin de course.
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
      const sa = JSON.parse(raw.trim().replace(/^['\"]+|['\"]+$/g, ''));
      admin.initializeApp({ credential: admin.credential.cert(sa), projectId }, appName);
    } catch {
      admin.initializeApp({ projectId }, appName);
    }
  } else {
    admin.initializeApp({ projectId }, appName);
  }
  return admin.apps.find((a: any) => a?.name === appName).firestore();
}

export async function POST(req: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const admin = require('firebase-admin');
    const { driverId } = await req.json().catch(() => ({}));
    if (!driverId) return NextResponse.json({ error: 'driverId requis' }, { status: 400 });

    const db = getAdminFirestore();
    const FS = admin.firestore.FieldValue;

    const driverRef = db.collection('drivers').doc(driverId);
    const snap = await driverRef.get();
    if (!snap.exists) return NextResponse.json({ error: 'Chauffeur introuvable' }, { status: 404 });

    const data = snap.data();

    await driverRef.update({
      status: 'online',
      currentRideId: null,
      updatedAt: FS.serverTimestamp(),
    });

    console.log(`[driver-ping] ✅ ${driverId} → online (était: ${data.status})`);
    return NextResponse.json({ success: true, was: data.status, now: 'online' });
  } catch (e: any) {
    console.error('[driver-ping] Error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
