'use client';

/**
 * KULOOC — Hook useRealtime
 * Centralise toutes les données temps réel : chauffeurs, clients, demandes, courses
 * Utilisé par : dispatch, dashboard, client
 */

import { useState, useEffect, useCallback } from 'react';
import { getFirestore } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import {
  subscribeToLiveDrivers,
  subscribeToConnectedClients,
  subscribeToLiveRideRequests,
  subscribeToLiveActiveRides,
  type LiveDriver,
  type ConnectedClient,
  type LiveRideRequest,
  type LiveActiveRide,
} from './realtime-service';

export function useRealtime() {
  const [drivers, setDrivers] = useState<LiveDriver[]>([]);
  const [clients, setClients] = useState<ConnectedClient[]>([]);
  const [rideRequests, setRideRequests] = useState<LiveRideRequest[]>([]);
  const [activeRides, setActiveRides] = useState<LiveActiveRide[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getDb = useCallback(() => {
    try {
      return getFirestore(getApp());
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const db = getDb();
    if (!db) {
      setIsLoading(false);
      return;
    }

    const unsubs: (() => void)[] = [];

    unsubs.push(
      subscribeToLiveDrivers(db, (data) => {
        setDrivers(data);
        setIsLoading(false);
      })
    );

    unsubs.push(
      subscribeToConnectedClients(db, (data) => {
        setClients(data);
      })
    );

    unsubs.push(
      subscribeToLiveRideRequests(db, (data) => {
        setRideRequests(data);
      })
    );

    unsubs.push(
      subscribeToLiveActiveRides(db, (data) => {
        setActiveRides(data);
      })
    );

    return () => unsubs.forEach((u) => u());
  }, [getDb]);

  // ─── Métriques calculées ───────────────────────────────────────────────────
  const metrics = {
    onlineDrivers: drivers.filter((d) => d.status === 'online').length,
    activeDrivers: drivers.filter((d) =>
      ['online', 'en-route', 'on-trip', 'busy'].includes(d.status)
    ).length,
    enRouteDrivers: drivers.filter((d) => d.status === 'en-route').length,
    onTripDrivers: drivers.filter((d) => d.status === 'on-trip').length,
    connectedClients: clients.length,
    onlineClients: clients.filter((c) => c.isOnline).length,
    pendingRequests: rideRequests.filter((r) => r.status === 'pending').length,
    activeRides: activeRides.length,
    totalRevenue: activeRides.reduce((sum, r) => sum + (r.pricing?.total || 0), 0),
    avgRating:
      drivers.length > 0
        ? +(
            drivers.reduce((sum, d) => sum + (d.averageRating || 0), 0) /
            drivers.length
          ).toFixed(2)
        : 0,
  };

  // ─── Assignation automatique (delegates to dispatch engine) ──────────────────
  const autoAssign = useCallback(
    async (requestId: string): Promise<{ success: boolean; driverName?: string; error?: string }> => {
      const db = getDb();
      if (!db) return { success: false, error: 'Firebase non disponible' };
      try {
        const { getDispatchEngine } = await import('@/lib/dispatch/dispatch-engine');
        const engine = getDispatchEngine(db);
        engine.start(); // ensure running
        const { getDoc } = await import('firebase/firestore');
        const { doc: docRef } = await import('firebase/firestore');
        const snap = await getDoc(docRef(db, 'ride_requests', requestId));
        if (!snap.exists()) return { success: false, error: 'Demande introuvable' };
        await engine.processRequest({ id: snap.id, ...snap.data() } as any);
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },
    [getDb]
  );

  // ─── Assignation manuelle (delegates to dispatch engine) ───────────────────
  const manualAssign = useCallback(
    async (requestId: string, driverId: string): Promise<{ success: boolean; error?: string }> => {
      const db = getDb();
      if (!db) return { success: false, error: 'Firebase non disponible' };
      const driver = drivers.find((d) => d.id === driverId);
      if (!driver) return { success: false, error: 'Chauffeur introuvable' };
      try {
        const { getDispatchEngine } = await import('@/lib/dispatch/dispatch-engine');
        const engine = getDispatchEngine(db);
        return await engine.directAssign(requestId, driverId, driver.name, driver.location ?? null);
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },
    [drivers, getDb]
  );

  return {
    drivers,
    clients,
    rideRequests,
    activeRides,
    metrics,
    isLoading,
    autoAssign,
    manualAssign,
    autoAssigning: new Set<string>(),
  };
}
