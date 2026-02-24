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
} from './ride-service';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { calculateFare } from '@/lib/services/fare-service';

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
  const rideStartTimeRef = useRef<Date | null>(null);

  const isOnline = driverStatus !== 'offline';

  // Ref pour accéder à activeRide dans le callback GPS sans re-créer le watcher
  const activeRideRef = useRef<typeof activeRide>(null);
  useEffect(() => { activeRideRef.current = activeRide; }, [activeRide]);

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
          if (!rideStartTimeRef.current) rideStartTimeRef.current = new Date();
        } else if (ride.status === 'completed') {
          setDriverStatus('online');
          setEarningsToday(prev => prev + (ride.pricing?.total ?? 0));
          setRidesCompleted(prev => prev + 1);
          rideStartTimeRef.current = null;
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
            if (activeRideRef.current?.id) {
              await updateDoc(doc(db, 'active_rides', activeRideRef.current.id), {
                driverLocation: loc,
                updatedAt: serverTimestamp(),
              });
            }
          } catch (_) {
            // Silently fail GPS updates
          }
        },
        (_err) => {
          // Fallback: position simulée dans Laval
          const fallback = {
            latitude: 45.5631 + (Math.random() - 0.5) * 0.02,
            longitude: -73.7124 + (Math.random() - 0.5) * 0.02,
          };
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
      await updateDoc(doc(db, 'ride_requests', request.id), {
        status: 'driver-assigned',
        driverId: user.uid,
        driverName: user.displayName || user.email || 'Chauffeur',
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const fare = calculateFare(
        request.estimatedDistanceKm,
        request.estimatedDurationMin,
        request.surgeMultiplier || 1.0,
        request.serviceType
      );

      await addDoc(collection(db, 'active_rides'), {
        requestId: request.id,
        passengerId: request.passengerId,
        passengerName: request.passengerName,
        passengerPhone: request.passengerPhone || '',
        driverId: user.uid,
        driverName: user.displayName || user.email || 'Chauffeur',
        driverLocation: currentLocation,
        pickup: request.pickup,
        destination: request.destination,
        serviceType: request.serviceType,
        estimatedPrice: fare.total,
        estimatedDistanceKm: request.estimatedDistanceKm,
        estimatedDurationMin: request.estimatedDurationMin,
        status: 'driver-assigned',
        pricing: fare,
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        rideStartedAt: null,
        rideCompletedAt: null,
        finalPrice: null,
        driverRating: null,
        passengerRating: null,
      });

      setDriverStatus('en-route');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentLocation]);

  const declineRide = useCallback(async (requestId: string) => {
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
  }, []);

  const arrivedAtPickup = useCallback(async () => {
    if (!activeRide?.id) return;
    await updateRideStatus(activeRide.id, 'driver-arrived');
    // Notifier le passager
    if (activeRide.passengerId) {
      await addDoc(collection(db, 'notifications'), {
        userId: activeRide.passengerId,
        type: 'driver_arrived',
        title: 'Votre chauffeur est arrivé !',
        body: 'Votre taxi KULOOC est devant vous.',
        rideId: activeRide.id,
        read: false,
        createdAt: serverTimestamp(),
      }).catch(() => {});
    }
  }, [activeRide]);

  const startRide = useCallback(async () => {
    if (!activeRide?.id) return;
    await updateRideStatus(activeRide.id, 'in-progress');
    await updateDoc(doc(db, 'active_rides', activeRide.id), {
      rideStartedAt: serverTimestamp(),
    }).catch(() => {});
    setDriverStatus('on-trip');
    rideStartTimeRef.current = new Date();
  }, [activeRide]);

  const completeRide = useCallback(async () => {
    if (!activeRide?.id || !user?.uid) return;
    setIsLoading(true);
    try {
      const rideSnap = await getDoc(doc(db, 'active_rides', activeRide.id));
      if (!rideSnap.exists()) throw new Error('Course introuvable');
      const rideData = rideSnap.data();

      // Calculer le tarif final (basé sur la durée réelle si disponible)
      const rideStartedAt = rideData.rideStartedAt?.toDate?.() || rideStartTimeRef.current || new Date();
      const actualDurationMin = Math.max(1, Math.round((Date.now() - rideStartedAt.getTime()) / 60000));
      const finalFare = calculateFare(
        rideData.estimatedDistanceKm || rideData.pricing?.distanceKm || 5,
        actualDurationMin,
        rideData.surgeMultiplier || rideData.pricing?.surgeMultiplier || 1.0,
        rideData.serviceType || 'KULOOC X'
      );

      const completedRideData = {
        ...rideData,
        id: activeRide.id,
        status: 'completed',
        finalPricing: finalFare,
        pricing: finalFare,
        finalPrice: finalFare.total,
        actualDurationMin,
        rideCompletedAt: serverTimestamp(),
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Répartition
        driverEarnings: +(finalFare.total * 0.70).toFixed(2),
        platformFee: +(finalFare.total * 0.30).toFixed(2),
      };

      // Mettre à jour active_ride
      await updateDoc(doc(db, 'active_rides', activeRide.id), {
        status: 'completed',
        finalPricing: finalFare,
        pricing: finalFare,
        finalPrice: finalFare.total,
        actualDurationMin,
        rideCompletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        driverEarnings: completedRideData.driverEarnings,
        platformFee: completedRideData.platformFee,
      });

      // Copier dans completed_rides
      await setDoc(doc(db, 'completed_rides', activeRide.id), completedRideData);

      // Mettre à jour ride_request
      if (rideData.requestId) {
        await updateDoc(doc(db, 'ride_requests', rideData.requestId), {
          status: 'completed',
          completedAt: serverTimestamp(),
          finalPrice: finalFare.total,
        }).catch(() => {});
      }

      // Remettre le chauffeur en ligne
      await updateDriverStatus(user.uid, 'online');
      await updateDoc(doc(db, 'drivers', user.uid), {
        currentRideId: null,
        status: 'online',
        updatedAt: serverTimestamp(),
      }).catch(() => {});

      setDriverStatus('online');
      setEarningsToday(prev => prev + (completedRideData.driverEarnings || 0));
      setRidesCompleted(prev => prev + 1);
      rideStartTimeRef.current = null;
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
