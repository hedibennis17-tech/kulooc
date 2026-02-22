'use client';

/**
 * KULOOC — Hook useDriver
 * Gère l'état complet du chauffeur: statut, position GPS, demandes entrantes, course active
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@/firebase/provider';
import {
  updateDriverStatus,
  updateDriverLocation,
  updateRideStatus,
  subscribeToDriverPendingRequests,
  subscribeToDriverActiveRide,
  type RideRequest,
  type ActiveRide,
  type RideStatus,
} from './ride-service';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/firebase';

export type DriverStatus = 'offline' | 'online' | 'en-route' | 'on-trip' | 'busy';

export type UseDriverReturn = {
  driverStatus: DriverStatus;
  isOnline: boolean;
  pendingRequests: RideRequest[];
  activeRide: ActiveRide | null;
  currentLocation: { latitude: number; longitude: number } | null;
  isLoading: boolean;
  error: string | null;
  onlineDuration: number; // seconds
  earningsToday: number;
  ridesCompleted: number;
  goOnline: () => Promise<void>;
  goOffline: () => Promise<void>;
  acceptRide: (request: RideRequest) => Promise<void>;
  declineRide: (requestId: string) => Promise<void>;
  arrivedAtPickup: () => Promise<void>;
  startRide: () => Promise<void>;
  completeRide: () => Promise<void>;
};

export function useDriver(): UseDriverReturn {
  const { user } = useUser();
  const [driverStatus, setDriverStatus] = useState<DriverStatus>('offline');
  const [pendingRequests, setPendingRequests] = useState<RideRequest[]>([]);
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onlineDuration, setOnlineDuration] = useState(0);
  const [earningsToday, setEarningsToday] = useState(0);
  const [ridesCompleted, setRidesCompleted] = useState(0);
  const onlineTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gpsWatchRef = useRef<number | null>(null);

  const isOnline = driverStatus !== 'offline';

  // ─── Écouter les demandes en attente ─────────────────────────────────────
  useEffect(() => {
    if (!isOnline || !user) return;
    const unsub = subscribeToDriverPendingRequests((requests) => {
      setPendingRequests(requests);
    });
    return unsub;
  }, [isOnline, user]);

  // ─── Écouter la course active ─────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToDriverActiveRide(user.uid, (ride) => {
      setActiveRide(ride);
      if (ride) {
        if (ride.status === 'driver-assigned' || ride.status === 'driver-arrived') {
          setDriverStatus('en-route');
        } else if (ride.status === 'in-progress') {
          setDriverStatus('on-trip');
        } else if (ride.status === 'completed') {
          setDriverStatus('online');
          setEarningsToday(prev => prev + (ride.pricing?.total ?? 0));
          setRidesCompleted(prev => prev + 1);
        }
      }
    });
    return unsub;
  }, [user?.uid]);

  // ─── Timer en ligne ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isOnline) {
      onlineTimerRef.current = setInterval(() => {
        setOnlineDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (onlineTimerRef.current) clearInterval(onlineTimerRef.current);
      setOnlineDuration(0);
    }
    return () => {
      if (onlineTimerRef.current) clearInterval(onlineTimerRef.current);
    };
  }, [isOnline]);

  // ─── GPS tracking ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOnline || !user?.uid || typeof navigator === 'undefined') return;

    if ('geolocation' in navigator) {
      gpsWatchRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setCurrentLocation(loc);
          try {
            await updateDriverLocation(user.uid, loc);
          } catch (e) {
            // Silently fail GPS updates
          }
        },
        (err) => {
          console.warn('GPS error:', err.message);
          // Fallback: simulate Montréal location
          const fallback = { latitude: 45.5088 + (Math.random() - 0.5) * 0.02, longitude: -73.554 + (Math.random() - 0.5) * 0.02 };
          setCurrentLocation(fallback);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }

    return () => {
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
      }
    };
  }, [isOnline, user?.uid]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const goOnline = useCallback(async () => {
    if (!user?.uid) return;
    setIsLoading(true);
    try {
      await updateDriverStatus(user.uid, 'online');
      setDriverStatus('online');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  const goOffline = useCallback(async () => {
    if (!user?.uid) return;
    setIsLoading(true);
    try {
      await updateDriverStatus(user.uid, 'offline');
      setDriverStatus('offline');
      setPendingRequests([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  const acceptRide = useCallback(async (request: RideRequest) => {
    if (!user?.uid || !request.id) return;
    setIsLoading(true);
    try {
      // Mettre à jour la demande
      await updateDoc(doc(db, 'ride_requests', request.id), {
        status: 'driver-assigned',
        driverId: user.uid,
        driverName: user.displayName || user.email || 'Chauffeur',
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Créer la course active
      await addDoc(collection(db, 'active_rides'), {
        requestId: request.id,
        passengerId: request.passengerId,
        passengerName: request.passengerName,
        driverId: user.uid,
        driverName: user.displayName || user.email || 'Chauffeur',
        driverLocation: currentLocation,
        pickup: request.pickup,
        destination: request.destination,
        serviceType: request.serviceType,
        status: 'driver-assigned',
        pricing: {
          base: 3.50,
          perKm: request.estimatedDistanceKm * 1.75,
          perMin: request.estimatedDurationMin * 0.35,
          distanceKm: request.estimatedDistanceKm,
          durationMin: request.estimatedDurationMin,
          surgeMultiplier: request.surgeMultiplier,
          subtotal: +(request.estimatedPrice / 1.14975).toFixed(2),
          tax: +(request.estimatedPrice - request.estimatedPrice / 1.14975).toFixed(2),
          total: request.estimatedPrice,
        },
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setDriverStatus('en-route');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentLocation]);

  const declineRide = useCallback(async (requestId: string) => {
    // Simplement retirer de la liste locale (le dispatcher réassignera)
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
  }, []);

  const arrivedAtPickup = useCallback(async () => {
    if (!activeRide?.id) return;
    await updateRideStatus(activeRide.id, 'driver-arrived');
  }, [activeRide]);

  const startRide = useCallback(async () => {
    if (!activeRide?.id) return;
    await updateRideStatus(activeRide.id, 'in-progress');
    setDriverStatus('on-trip');
  }, [activeRide]);

  const completeRide = useCallback(async () => {
    if (!activeRide?.id || !user?.uid) return;
    setIsLoading(true);
    try {
      await updateRideStatus(activeRide.id, 'completed');

      // Copier dans completed_rides
      await addDoc(collection(db, 'completed_rides'), {
        ...activeRide,
        status: 'completed',
        completedAt: serverTimestamp(),
      });

      setDriverStatus('online');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [activeRide, user?.uid]);

  return {
    driverStatus,
    isOnline,
    pendingRequests,
    activeRide,
    currentLocation,
    isLoading,
    error,
    onlineDuration,
    earningsToday,
    ridesCompleted,
    goOnline,
    goOffline,
    acceptRide,
    declineRide,
    arrivedAtPickup,
    startRide,
    completeRide,
  };
}
