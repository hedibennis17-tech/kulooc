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
  findBestDriver,
  type LiveDriver,
  type ConnectedClient,
  type LiveRideRequest,
  type LiveActiveRide,
} from './realtime-service';
import {
  doc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  runTransaction,
  getFirestore as getFS,
} from 'firebase/firestore';

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
        await runTransaction(db, async (transaction) => {
          const requestRef = doc(db, 'ride_requests', requestId);
          const driverRef = doc(db, 'drivers', bestDriver.id);

          const [reqSnap, drvSnap] = await Promise.all([
            transaction.get(requestRef),
            transaction.get(driverRef),
          ]);

          if (!reqSnap.exists() || reqSnap.data().status !== 'pending') {
            throw new Error('Demande déjà assignée ou annulée');
          }
          if (!drvSnap.exists() || drvSnap.data().status !== 'online') {
            throw new Error('Chauffeur non disponible');
          }

          const rideRef = doc(collection(db, 'active_rides'));

          transaction.set(rideRef, {
            requestId,
            passengerId: request.passengerId,
            passengerName: request.passengerName,
            driverId: bestDriver.id,
            driverName: bestDriver.name,
            driverLocation: bestDriver.location || null,
            pickup: request.pickup,
            destination: request.destination,
            serviceType: request.serviceType,
            status: 'driver-assigned',
            pricing: {
              subtotal: +(request.estimatedPrice / 1.14975).toFixed(2),
              tax: +(request.estimatedPrice - request.estimatedPrice / 1.14975).toFixed(2),
              total: request.estimatedPrice,
            },
            assignedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          transaction.update(requestRef, {
            status: 'driver-assigned',
            driverId: bestDriver.id,
            driverName: bestDriver.name,
            assignedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          transaction.update(driverRef, {
            status: 'en-route',
            currentRideId: rideRef.id,
            updatedAt: serverTimestamp(),
          });
        });

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
  const manualAssign = useCallback(
    async (requestId: string, driverId: string): Promise<{ success: boolean; error?: string }> => {
      const db = getDb();
      if (!db) return { success: false, error: 'Firebase non disponible' };

      const request = rideRequests.find((r) => r.id === requestId);
      const driver = drivers.find((d) => d.id === driverId);
      if (!request || !driver) return { success: false, error: 'Données introuvables' };

      try {
        await runTransaction(db, async (transaction) => {
          const requestRef = doc(db, 'ride_requests', requestId);
          const driverRef = doc(db, 'drivers', driverId);
          const rideRef = doc(collection(db, 'active_rides'));

          transaction.set(rideRef, {
            requestId,
            passengerId: request.passengerId,
            passengerName: request.passengerName,
            driverId,
            driverName: driver.name,
            driverLocation: driver.location || null,
            pickup: request.pickup,
            destination: request.destination,
            serviceType: request.serviceType,
            status: 'driver-assigned',
            pricing: {
              subtotal: +(request.estimatedPrice / 1.14975).toFixed(2),
              tax: +(request.estimatedPrice - request.estimatedPrice / 1.14975).toFixed(2),
              total: request.estimatedPrice,
            },
            assignedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          transaction.update(requestRef, {
            status: 'driver-assigned',
            driverId,
            driverName: driver.name,
            assignedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          transaction.update(driverRef, {
            status: 'en-route',
            currentRideId: rideRef.id,
            updatedAt: serverTimestamp(),
          });
        });

        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },
    [drivers, rideRequests, getDb]
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
