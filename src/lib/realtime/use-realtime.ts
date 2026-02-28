'use client';

/**
 * KULOOC — Hook useRealtime
 * Centralise toutes les données temps réel : chauffeurs, clients, demandes, courses
 * Utilisé par : dispatch, dashboard, client
 *
 * IMPORTANT (rapport v2) :
 *   - autoAssign() et manualAssign() délèguent UNIQUEMENT à engine.directAssign()
 *   - Plus aucun runTransaction ici — le Dispatch Engine est la source unique de vérité
 *   - Cela élimine les conflits Firestore causés par 3 systèmes concurrents
 */

import { useState, useEffect, useCallback } from 'react';
import { getFirestore } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import {
  subscribeToLiveDrivers,
  subscribeToConnectedClients,
  subscribeToLiveRideRequests,
  subscribeToLiveActiveRides,
  findBestDriver,
  type LiveDriver,
  type ConnectedClient,
  type LiveRideRequest,
  type LiveActiveRide,
} from './realtime-service';
import { getDispatchEngine } from '@/lib/dispatch/dispatch-engine';

export function useRealtime() {
  const [drivers, setDrivers] = useState<LiveDriver[]>([]);
  const [clients, setClients] = useState<ConnectedClient[]>([]);
  const [rideRequests, setRideRequests] = useState<LiveRideRequest[]>([]);
  const [activeRides, setActiveRides] = useState<LiveActiveRide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoAssigning, setAutoAssigning] = useState<Set<string>>(new Set());

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

    // Démarrer le moteur de dispatch dès qu'on a accès à Firestore
    // Le moteur est un singleton donc il ne démarrera qu'une seule fois
    const engine = getDispatchEngine(db);
    engine.start();
    console.log('[v0] Dispatch engine started from useRealtime hook');

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

  // ─── Assignation automatique ───────────────────────────────────────────────
  // Délègue au Dispatch Engine v2 (source unique de vérité).
  // Plus de runTransaction direct ici — élimine les conflits Firestore.
  const autoAssign = useCallback(
    async (requestId: string): Promise<{ success: boolean; driverName?: string; error?: string }> => {
      const db = getDb();
      if (!db) return { success: false, error: 'Firebase non disponible' };

      const request = rideRequests.find((r) => r.id === requestId);
      if (!request) return { success: false, error: 'Demande introuvable' };

      const bestDriver = findBestDriver(request, drivers);
      if (!bestDriver) return { success: false, error: 'Aucun chauffeur disponible à proximité' };

      if (autoAssigning.has(requestId)) return { success: false, error: 'Assignation en cours...' };

      setAutoAssigning((prev) => new Set([...prev, requestId]));

      try {
        const engine = getDispatchEngine(db);
        const result = await engine.directAssign(
          requestId,
          bestDriver.id,
          bestDriver.name,
          bestDriver.location
            ? { latitude: bestDriver.location.latitude, longitude: bestDriver.location.longitude }
            : null
        );
        if (!result.success) throw new Error(result.error || 'Échec assignation');
        return { success: true, driverName: bestDriver.name };
      } catch (e: any) {
        return { success: false, error: e.message };
      } finally {
        setAutoAssigning((prev) => {
          const next = new Set(prev);
          next.delete(requestId);
          return next;
        });
      }
    },
    [drivers, rideRequests, getDb, autoAssigning]
  );

  // ─── Assignation manuelle ──────────────────────────────────────────────────
  // Délègue au Dispatch Engine v2 via directAssign (bypass de l'offre).
  const manualAssign = useCallback(
    async (requestId: string, driverId: string): Promise<{ success: boolean; error?: string }> => {
      const db = getDb();
      if (!db) return { success: false, error: 'Firebase non disponible' };

      const driver = drivers.find((d) => d.id === driverId);
      if (!driver) return { success: false, error: 'Chauffeur introuvable' };

      try {
        const engine = getDispatchEngine(db);
        return await engine.directAssign(
          requestId,
          driverId,
          driver.name,
          driver.location
            ? { latitude: driver.location.latitude, longitude: driver.location.longitude }
            : null
        );
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
    autoAssigning,
  };
}
