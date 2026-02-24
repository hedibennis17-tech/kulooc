/**
 * KULOOC — Transaction Service
 * Manages financial transactions for completed rides.
 * Transactions are created by the driver's completeRide() flow.
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  type Unsubscribe,
  type Firestore,
} from 'firebase/firestore';
import { db } from '@/firebase';

export interface Transaction {
  id: string;
  rideId: string;
  requestId?: string;
  passengerId: string;
  passengerName: string;
  driverId: string;
  driverName: string;
  serviceType: string;
  pickup: { address: string; latitude: number; longitude: number };
  destination: { address: string; latitude: number; longitude: number };
  fare: {
    base: number;
    perKmCharge: number;
    perMinCharge: number;
    subtotal: number;
    subtotalWithSurge: number;
    surgeMultiplier: number;
    tps: number;
    tvq: number;
    total: number;
    distanceKm: number;
    durationMin: number;
    driverEarnings: number;
    platformFee: number;
  };
  total: number;
  driverEarnings: number;
  platformFee: number;
  surgeMultiplier: number;
  actualDurationMin: number;
  distanceKm: number;
  status: 'completed' | 'refunded' | 'disputed';
  type: 'ride_payment' | 'refund' | 'bonus';
  currency: 'CAD';
  paymentMethod: string;
  rideStartedAt?: any;
  rideCompletedAt?: any;
  createdAt?: any;
}

/**
 * Get transaction history for a specific driver
 */
export async function getDriverTransactions(driverId: string, maxCount = 50): Promise<Transaction[]> {
  try {
    const q = query(
      collection(db, 'transactions'),
      where('driverId', '==', driverId),
      orderBy('createdAt', 'desc'),
      limit(maxCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
  } catch (err: any) {
    console.warn('getDriverTransactions:', err?.message);
    return [];
  }
}

/**
 * Get transaction history for a specific passenger
 */
export async function getPassengerTransactions(passengerId: string, maxCount = 50): Promise<Transaction[]> {
  try {
    const q = query(
      collection(db, 'transactions'),
      where('passengerId', '==', passengerId),
      orderBy('createdAt', 'desc'),
      limit(maxCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
  } catch (err: any) {
    console.warn('getPassengerTransactions:', err?.message);
    return [];
  }
}

/**
 * Subscribe to recent transactions in real-time (for dashboard)
 */
export function subscribeToRecentTransactions(
  callback: (transactions: Transaction[]) => void,
  maxCount = 50
): Unsubscribe {
  const q = query(
    collection(db, 'transactions'),
    orderBy('createdAt', 'desc'),
    limit(maxCount)
  );

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
  }, (err) => {
    console.warn('subscribeToRecentTransactions:', err?.message);
    callback([]);
  });
}

/**
 * Calculate summary metrics from transactions
 */
export function calculateTransactionMetrics(transactions: Transaction[]) {
  const totalRevenue = transactions.reduce((sum, t) => sum + (t.total || 0), 0);
  const totalDriverEarnings = transactions.reduce((sum, t) => sum + (t.driverEarnings || 0), 0);
  const totalPlatformFees = transactions.reduce((sum, t) => sum + (t.platformFee || 0), 0);
  const avgFare = transactions.length > 0 ? totalRevenue / transactions.length : 0;
  const totalDistance = transactions.reduce((sum, t) => sum + (t.distanceKm || 0), 0);
  const totalDuration = transactions.reduce((sum, t) => sum + (t.actualDurationMin || 0), 0);

  return {
    totalRevenue: +totalRevenue.toFixed(2),
    totalDriverEarnings: +totalDriverEarnings.toFixed(2),
    totalPlatformFees: +totalPlatformFees.toFixed(2),
    avgFare: +avgFare.toFixed(2),
    totalRides: transactions.length,
    totalDistance: +totalDistance.toFixed(1),
    totalDuration: Math.round(totalDuration),
  };
}
