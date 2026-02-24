/**
 * KULOOC — Transaction Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Service pour interroger et écouter la collection `transactions` Firestore.
 * Chaque document `transactions` est créé par use-driver.ts lors de completeRide().
 *
 * Structure d'un document transaction :
 * {
 *   rideId, requestId, passengerId, passengerName,
 *   driverId, driverName, serviceType,
 *   base, perKmCharge, perMinCharge, subtotal,
 *   surgeMultiplier, surgeAmount, subtotalWithSurge,
 *   tps, tvq, total,
 *   driverEarnings, platformFee, driverShare (0.70), platformShare (0.30),
 *   distanceKm, durationMin, estimatedDurationMin,
 *   pickup, destination,
 *   rideStartedAt, completedAt, createdAt,
 *   currency: 'CAD', status: 'completed'
 * }
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Transaction {
  id?: string;
  rideId: string;
  requestId?: string | null;
  passengerId: string;
  passengerName: string;
  driverId: string;
  driverName: string;
  serviceType: string;
  // Tarif
  base: number;
  perKmCharge: number;
  perMinCharge: number;
  subtotal: number;
  surgeMultiplier: number;
  surgeAmount: number;
  subtotalWithSurge: number;
  tps: number;
  tvq: number;
  total: number;
  // Répartition
  driverEarnings: number;
  platformFee: number;
  driverShare: number;
  platformShare: number;
  // Métriques de course
  distanceKm: number;
  durationMin: number;
  estimatedDurationMin: number;
  pickup: { address: string; latitude: number; longitude: number };
  destination: { address: string; latitude: number; longitude: number };
  // Timestamps
  rideStartedAt?: Timestamp | null;
  completedAt?: Timestamp;
  createdAt?: Timestamp;
  currency: 'CAD';
  status: 'completed';
}

export interface TransactionMetrics {
  totalRevenue: number;         // Total brut (TPS + TVQ inclus)
  totalDriverEarnings: number;  // Part chauffeurs (70%)
  totalPlatformFees: number;    // Part plateforme (30%)
  totalTPS: number;
  totalTVQ: number;
  totalRides: number;
  avgFare: number;
  avgDistanceKm: number;
  avgDurationMin: number;
  topServiceType: string;
}

// ─── Récupérer les transactions d'un chauffeur ────────────────────────────────

export async function getDriverTransactions(
  driverId: string,
  limitCount = 50
): Promise<Transaction[]> {
  const q = query(
    collection(db, 'transactions'),
    where('driverId', '==', driverId),
    orderBy('completedAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
}

// ─── Récupérer les transactions d'un passager ─────────────────────────────────

export async function getPassengerTransactions(
  passengerId: string,
  limitCount = 50
): Promise<Transaction[]> {
  const q = query(
    collection(db, 'transactions'),
    where('passengerId', '==', passengerId),
    orderBy('completedAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
}

// ─── Récupérer toutes les transactions (dashboard admin) ──────────────────────

export async function getAllTransactions(
  limitCount = 100,
  startDate?: Date,
  endDate?: Date
): Promise<Transaction[]> {
  const constraints: QueryConstraint[] = [orderBy('completedAt', 'desc')];

  if (startDate) {
    constraints.push(where('completedAt', '>=', Timestamp.fromDate(startDate)));
  }
  if (endDate) {
    constraints.push(where('completedAt', '<=', Timestamp.fromDate(endDate)));
  }

  constraints.push(limit(limitCount));

  const q = query(collection(db, 'transactions'), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
}

// ─── Écouter les transactions en temps réel (dashboard) ───────────────────────

export function subscribeToTransactions(
  callback: (transactions: Transaction[]) => void,
  limitCount = 50
): Unsubscribe {
  const q = query(
    collection(db, 'transactions'),
    orderBy('completedAt', 'desc'),
    limit(limitCount)
  );
  return onSnapshot(q, (snap) => {
    const transactions = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
    callback(transactions);
  });
}

// ─── Écouter les transactions d'un chauffeur en temps réel ───────────────────

export function subscribeToDriverTransactions(
  driverId: string,
  callback: (transactions: Transaction[]) => void,
  limitCount = 30
): Unsubscribe {
  const q = query(
    collection(db, 'transactions'),
    where('driverId', '==', driverId),
    orderBy('completedAt', 'desc'),
    limit(limitCount)
  );
  return onSnapshot(q, (snap) => {
    const transactions = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
    callback(transactions);
  });
}

// ─── Calculer les métriques à partir d'une liste de transactions ──────────────

export function calculateTransactionMetrics(transactions: Transaction[]): TransactionMetrics {
  if (transactions.length === 0) {
    return {
      totalRevenue: 0,
      totalDriverEarnings: 0,
      totalPlatformFees: 0,
      totalTPS: 0,
      totalTVQ: 0,
      totalRides: 0,
      avgFare: 0,
      avgDistanceKm: 0,
      avgDurationMin: 0,
      topServiceType: 'KULOOC X',
    };
  }

  const totalRevenue = transactions.reduce((sum, t) => sum + (t.total || 0), 0);
  const totalDriverEarnings = transactions.reduce((sum, t) => sum + (t.driverEarnings || 0), 0);
  const totalPlatformFees = transactions.reduce((sum, t) => sum + (t.platformFee || 0), 0);
  const totalTPS = transactions.reduce((sum, t) => sum + (t.tps || 0), 0);
  const totalTVQ = transactions.reduce((sum, t) => sum + (t.tvq || 0), 0);
  const avgFare = totalRevenue / transactions.length;
  const avgDistanceKm = transactions.reduce((sum, t) => sum + (t.distanceKm || 0), 0) / transactions.length;
  const avgDurationMin = transactions.reduce((sum, t) => sum + (t.durationMin || 0), 0) / transactions.length;

  // Type de service le plus fréquent
  const serviceTypeCounts: Record<string, number> = {};
  for (const t of transactions) {
    serviceTypeCounts[t.serviceType] = (serviceTypeCounts[t.serviceType] || 0) + 1;
  }
  const topServiceType = Object.entries(serviceTypeCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'KULOOC X';

  return {
    totalRevenue: +totalRevenue.toFixed(2),
    totalDriverEarnings: +totalDriverEarnings.toFixed(2),
    totalPlatformFees: +totalPlatformFees.toFixed(2),
    totalTPS: +totalTPS.toFixed(2),
    totalTVQ: +totalTVQ.toFixed(2),
    totalRides: transactions.length,
    avgFare: +avgFare.toFixed(2),
    avgDistanceKm: +avgDistanceKm.toFixed(1),
    avgDurationMin: +avgDurationMin.toFixed(0),
    topServiceType,
  };
}

// ─── Filtrer les transactions par période ─────────────────────────────────────

export function filterTransactionsByPeriod(
  transactions: Transaction[],
  period: 'today' | 'week' | 'month' | 'all'
): Transaction[] {
  if (period === 'all') return transactions;

  const now = new Date();
  let cutoff: Date;

  if (period === 'today') {
    cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  } else if (period === 'week') {
    cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else {
    cutoff = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  }

  return transactions.filter((t) => {
    const ts = t.completedAt?.toMillis?.() || t.createdAt?.toMillis?.() || 0;
    return ts >= cutoff.getTime();
  });
}
