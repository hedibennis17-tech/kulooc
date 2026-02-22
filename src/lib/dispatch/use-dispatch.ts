'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFirestore } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import {
  subscribeToDrivers,
  subscribeToRideRequests,
  subscribeToActiveRides,
  calculateSurge,
  manualAssignDriver,
  updateRideStatus,
  seedDemoData,
} from './dispatch-service';
import type {
  DispatchDriver,
  RideRequest,
  ActiveRide,
  DispatchMetrics,
} from './types';

export function useDispatch() {
  const [drivers, setDrivers] = useState<DispatchDriver[]>([]);
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [activeRides, setActiveRides] = useState<ActiveRide[]>([]);
  const [metrics, setMetrics] = useState<DispatchMetrics>({
    activeDrivers: 0,
    onlineDrivers: 0,
    pendingRequests: 0,
    activeRides: 0,
    completedToday: 0,
    avgWaitTimeSeconds: 0,
    avgRating: 0,
    surgeZones: 0,
    revenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surgeMultiplier, setSurgeMultiplier] = useState(1.0);

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

    // Subscribe to drivers
    unsubs.push(
      subscribeToDrivers(db, (data) => {
        setDrivers(data);
        setIsLoading(false);
      })
    );

    // Subscribe to ride requests
    unsubs.push(
      subscribeToRideRequests(db, (data) => {
        setRideRequests(data);
      })
    );

    // Subscribe to active rides
    unsubs.push(
      subscribeToActiveRides(db, (data) => {
        setActiveRides(data);
      })
    );

    return () => unsubs.forEach((u) => u());
  }, [getDb]);

  // Compute metrics whenever data changes
  useEffect(() => {
    const onlineDrivers = drivers.filter((d) => d.status === 'online').length;
    const activeDrivers = drivers.filter((d) =>
      ['online', 'en-route', 'on-trip', 'busy'].includes(d.status)
    ).length;

    const avgRating =
      drivers.length > 0
        ? drivers.reduce((sum, d) => sum + (d.averageRating || 0), 0) / drivers.length
        : 0;

    const surge = calculateSurge(rideRequests.length, onlineDrivers, surgeMultiplier);
    setSurgeMultiplier(surge);

    const totalRevenue = activeRides.reduce(
      (sum, r) => sum + (r.pricing?.total || 0),
      0
    );

    setMetrics({
      activeDrivers,
      onlineDrivers,
      pendingRequests: rideRequests.filter((r) => r.status === 'pending').length,
      activeRides: activeRides.length,
      completedToday: 0, // Would need a separate query for today's completed rides
      avgWaitTimeSeconds: 0,
      avgRating: +avgRating.toFixed(2),
      surgeZones: surge > 1.1 ? 1 : 0,
      revenue: +totalRevenue.toFixed(2),
    });
  }, [drivers, rideRequests, activeRides]);

  const assignDriver = useCallback(
    async (requestId: string, driverId: string) => {
      const db = getDb();
      if (!db) return { success: false, error: 'Firebase non disponible' };
      return manualAssignDriver(db, requestId, driverId);
    },
    [getDb]
  );

  const updateStatus = useCallback(
    async (rideId: string, status: ActiveRide['status']) => {
      const db = getDb();
      if (!db) return;
      await updateRideStatus(db, rideId, status);
    },
    [getDb]
  );

  const loadDemoData = useCallback(async () => {
    const db = getDb();
    if (!db) return;
    setIsLoading(true);
    try {
      await seedDemoData(db);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [getDb]);

  return {
    drivers,
    rideRequests,
    activeRides,
    metrics,
    surgeMultiplier,
    isLoading,
    error,
    assignDriver,
    updateStatus,
    loadDemoData,
  };
}
