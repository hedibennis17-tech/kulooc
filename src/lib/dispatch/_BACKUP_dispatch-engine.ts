/**
 * ═══════════════════════════════════════════════════════════════════════════
 * KULOOC DISPATCH ENGINE v2 — BACKUP GOLDEN COPY
 * ═══════════════════════════════════════════════════════════════════════════
 * DO NOT MODIFY THIS FILE. This is the working backup of the dispatch system.
 * If the dispatch engine breaks, copy this content back to dispatch-engine.ts
 *
 * This backup includes the 6 critical files:
 * 1. dispatch-engine.ts (this logic)
 * 2. use-driver.ts
 * 3. ride-service.ts
 * 4. realtime-service.ts
 * 5. use-driver-offer.ts
 * 6. transaction-service.ts
 *
 * KEY RULES (never break these):
 * - Client page ONLY creates ride_request. NO client-side auto-assign.
 * - Dispatch Engine is the SINGLE source of truth for assignment.
 * - use-driver.ts acceptRide calls engine.acceptOffer() (NOT addDoc).
 * - completeRide creates a transaction record in 'transactions' collection.
 * - Subscriptions detect recently-completed rides (5-8s window).
 * - Engine uses singleton pattern with 'started' guard to prevent double-start.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * DATE SAVED: 2026-02-24
 */

// ═══════════════════════════════════════════════════════════════════════════
// FILE 1: src/lib/dispatch/dispatch-engine.ts
// ═══════════════════════════════════════════════════════════════════════════
/*
'use client';
import {
  collection, doc, query, where, onSnapshot,
  runTransaction, serverTimestamp, updateDoc,
  getDoc, setDoc, Timestamp, getDocs, limit,
  type Firestore,
} from 'firebase/firestore';
import { calculateFare } from '@/lib/services/fare-service';

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

function selectBestDriver(request, drivers, excludeIds = []) {
  const available = drivers.filter(
    (d) => d.status === 'online' && d.location && !d.currentRideId && !excludeIds.includes(d.id)
  );
  if (available.length === 0) return null;
  const pickupLat = request.pickup.latitude;
  const pickupLng = request.pickup.longitude;
  const scored = available.map((d) => {
    const distKm = haversineKm(d.location.latitude, d.location.longitude, pickupLat, pickupLng);
    if (distKm > 30) return null;
    const waitSeconds = d.onlineSince ? (Date.now() / 1000) - d.onlineSince.seconds : 0;
    const distScore = Math.max(0, 1 - distKm / 15);
    const waitScore = Math.min(1, waitSeconds / 3600);
    const ratingScore = (d.averageRating || 4.5) / 5;
    const total = 0.50 * distScore + 0.30 * waitScore + 0.20 * ratingScore;
    return { driver: d, distKm, score: total };
  }).filter(Boolean);
  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0].driver;
}

KEY PRINCIPLES:
- start() has a 'started' guard to prevent double-start
- processRequest() uses processingIds Set to prevent double-processing
- acceptOffer() uses runTransaction for atomic ride creation
- declineOffer() resets request to pending and tries next driver
- directAssign() delegates to acceptOffer()
- Singleton pattern via getDispatchEngine()
*/

// ═══════════════════════════════════════════════════════════════════════════
// FILE 2: src/lib/firestore/use-driver.ts
// ═══════════════════════════════════════════════════════════════════════════
/*
KEY: acceptRide calls engine.acceptOffer() — NOT addDoc
KEY: completeRide creates transaction in 'transactions' collection
KEY: completeRide has lastCompletedRideRef guard to prevent double-completion
*/

// ═══════════════════════════════════════════════════════════════════════════
// FILE 3: src/lib/firestore/ride-service.ts
// ═══════════════════════════════════════════════════════════════════════════
/*
KEY: subscribeToDriverActiveRide and subscribeToPassengerActiveRide
both detect recently completed rides (within 5s window) so UI sees completion.
*/

// ═══════════════════════════════════════════════════════════════════════════
// FILE 4: src/lib/realtime/realtime-service.ts
// ═══════════════════════════════════════════════════════════════════════════
/*
KEY: subscribeToPassengerRide detects recently completed rides (within 8s).
KEY: findBestDriver is in this file but dispatch engine has its own selectBestDriver.
*/

// ═══════════════════════════════════════════════════════════════════════════
// FILE 5: src/lib/firestore/use-driver-offer.ts
// ═══════════════════════════════════════════════════════════════════════════
/*
KEY: acceptOffer calls engine.acceptOffer()
KEY: declineOffer calls engine.declineOffer()
KEY: Listens to driver_offers collection for pending offers
*/

// ═══════════════════════════════════════════════════════════════════════════
// FILE 6: src/lib/services/transaction-service.ts
// ═══════════════════════════════════════════════════════════════════════════
/*
KEY: getDriverTransactions, getPassengerTransactions, subscribeToRecentTransactions
KEY: calculateTransactionMetrics for dashboard
*/

export const BACKUP_VERSION = 'v2-2026-02-24';
export const BACKUP_NOTE = 'This is the golden backup. Do not import this file. Copy content to restore.';
