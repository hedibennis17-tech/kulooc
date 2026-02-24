'use client';
/**
 * KULOOC — Hook useDispatch
 * Centralise les données et actions du dispatcher :
 * - Chauffeurs actifs, demandes en attente, courses actives
 * - Assignation manuelle, mise à jour de statut
 * - Métriques en temps réel
 */
import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, orderBy, limit,
  onSnapshot, doc, updateDoc, addDoc, setDoc,
  serverTimestamp, getDocs,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { getDispatchEngine } from './dispatch-engine';
import type { DispatchDriver, RideRequest, ActiveRide } from './types';

interface DispatchMetrics {
  pendingRequests: number;
  activeRides: number;
  activeDrivers: number;
  onlineDrivers: number;
  totalEarningsToday: number;
  completedToday: number;
}

interface UseDispatchReturn {
  drivers: DispatchDriver[];
  rideRequests: RideRequest[];
  activeRides: ActiveRide[];
  metrics: DispatchMetrics;
  surgeMultiplier: number;
  isLoading: boolean;
  assignDriver: (requestId: string, driverId: string) => Promise<{ success: boolean; error?: string }>;
  autoAssign: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  autoAssigning: string | null;
  updateStatus: (rideId: string, status: string) => Promise<void>;
  loadDemoData: () => Promise<void>;
}

export function useDispatch(): UseDispatchReturn {
  const [drivers, setDrivers] = useState<DispatchDriver[]>([]);
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [activeRides, setActiveRides] = useState<ActiveRide[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState<string | null>(null);

  // ─── Start the Dispatch Engine (auto-assign pending requests) ────────────
  useEffect(() => {
    const engine = getDispatchEngine(db);
    engine.start();
    console.log('[v0] Dispatch engine started from useDispatch');
    return () => {
      engine.stop();
      console.log('[v0] Dispatch engine stopped');
    };
  }, []);

  // ─── Écouter les chauffeurs actifs ─────────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, 'drivers'),
      where('status', 'in', ['online', 'en-route', 'on-trip', 'busy'])
    );
    const unsub = onSnapshot(q, (snap) => {
      setDrivers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DispatchDriver)));
    }, (err) => {
      console.warn('useDispatch drivers:', err.message);
    });
    return () => unsub();
  }, []);

  // ─── Écouter les demandes en attente ───────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, 'ride_requests'),
      where('status', 'in', ['pending', 'searching', 'offered']),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      const requests = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RideRequest));
      requests.sort((a: any, b: any) => {
        const aTime = a.requestedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
        const bTime = b.requestedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
        return aTime - bTime;
      });
      setRideRequests(requests);
    }, (err) => {
      console.error('[v0] useDispatch requests error:', err.message, err);
    });
    return () => unsub();
  }, []);

  // ─── Écouter les courses actives ───────────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, 'active_rides'),
      where('status', 'in', ['driver-assigned', 'driver-arrived', 'in-progress']),
      limit(100)
    );
    const unsub = onSnapshot(q, (snap) => {
      setActiveRides(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ActiveRide)));
    }, (err) => {
      console.warn('useDispatch activeRides:', err.message);
    });
    return () => unsub();
  }, []);

  // ─── Métriques calculées ───────────────────────────────────────────────────
  const metrics: DispatchMetrics = {
    pendingRequests: rideRequests.length,
    activeRides: activeRides.length,
    activeDrivers: drivers.filter((d) => d.status !== 'offline').length,
    onlineDrivers: drivers.filter((d) => d.status === 'online').length,
    totalEarningsToday: activeRides.reduce((sum, r) => sum + (r.pricing?.total || 0), 0),
    completedToday: 0,
  };

  // ─── Indice de surge ───────────────────────────────────────────────────────
  const surgeMultiplier = (() => {
    const ratio = metrics.onlineDrivers > 0
      ? metrics.pendingRequests / metrics.onlineDrivers
      : 0;
    if (ratio > 3) return 2.0;
    if (ratio > 2) return 1.5;
    if (ratio > 1) return 1.2;
    return 1.0;
  })();

  // ─── Assignation manuelle ──────────────────────────────────────────────────
  const assignDriver = useCallback(async (requestId: string, driverId: string): Promise<{ success: boolean; error?: string }> => {
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver) return { success: false, error: 'Chauffeur introuvable' };
    try {
      const engine = getDispatchEngine(db);
      const result = await engine.acceptOffer(requestId, driverId, driver.name, driver.location ?? null);
      return result;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erreur inconnue' };
    }
  }, [drivers]);

  // ─── Assignation automatique ──────────────────────────────────────────────
  const autoAssign = useCallback(async (requestId: string): Promise<{ success: boolean; error?: string }> => {
    setAutoAssigning(requestId);
    try {
      const engine = getDispatchEngine(db);
      // Charger la demande depuis Firestore puis la traiter
      const { getDoc, doc } = await import('firebase/firestore');
      const snap = await getDoc(doc(db, 'ride_requests', requestId));
      if (!snap.exists()) return { success: false, error: 'Demande introuvable' };
      const request = { id: snap.id, ...snap.data() } as any;
      await engine.processRequest(request);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erreur inconnue' };
    } finally {
      setAutoAssigning(null);
    }
  }, []);

  // ─── Mise à jour de statut ─────────────────────────────────────────────────
  const updateStatus = useCallback(async (rideId: string, status: string) => {
    await updateDoc(doc(db, 'active_rides', rideId), {
      status,
      updatedAt: serverTimestamp(),
    });
  }, []);

  // ─── Charger des données de démo ──────────────────────────────────────────
  const loadDemoData = useCallback(async () => {
    setIsLoading(true);
    try {
      const MONTREAL_CENTER = { lat: 45.5019, lng: -73.5674 };
      const demoDrivers = [
        { name: 'Jean-François Tremblay', status: 'online', averageRating: 4.9, totalRides: 342, acceptanceRate: 0.94, vehicleType: 'car', vehicle: { make: 'Toyota', model: 'Camry', year: 2022, licensePlate: 'ABC-1234', color: 'Blanc', type: 'car' } },
        { name: 'Marie-Claude Gagnon', status: 'online', averageRating: 4.8, totalRides: 218, acceptanceRate: 0.91, vehicleType: 'suv', vehicle: { make: 'Honda', model: 'CR-V', year: 2023, licensePlate: 'DEF-5678', color: 'Gris', type: 'suv' } },
        { name: 'Ahmed Benali', status: 'en-route', averageRating: 4.7, totalRides: 156, acceptanceRate: 0.88, vehicleType: 'car', vehicle: { make: 'Hyundai', model: 'Elantra', year: 2021, licensePlate: 'GHI-9012', color: 'Noir', type: 'car' } },
      ];
      for (const driver of demoDrivers) {
        const driverId = `demo_driver_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        await setDoc(doc(db, 'drivers', driverId), {
          ...driver,
          isOnline: true,
          location: {
            latitude: MONTREAL_CENTER.lat + (Math.random() - 0.5) * 0.05,
            longitude: MONTREAL_CENTER.lng + (Math.random() - 0.5) * 0.05,
          },
          onlineSince: serverTimestamp(),
          lastSeen: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    drivers,
    rideRequests,
    activeRides,
    metrics,
    surgeMultiplier,
    isLoading,
    assignDriver,
    autoAssign,
    autoAssigning,
    updateStatus,
    loadDemoData,
  };
}
