'use client';

/**
 * KULOOC — Hook useDriver
 * Manages driver state: status, GPS, incoming requests, active ride, and ride lifecycle.
 * Uses the dispatch engine for accepting rides (single source of truth).
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
import { getDispatchEngine } from '@/lib/dispatch/dispatch-engine';

export type DriverStatus = 'offline' | 'online' | 'en-route' | 'on-trip' | 'busy';

export type UseDriverReturn = {
  driverStatus: DriverStatus;
  isOnline: boolean;
  pendingRequests: RideRequest[];
  activeRide: ActiveRide | null;
  currentLocation: { latitude: number; longitude: number } | null;
  isLoading: boolean;
  error: string | null;
  onlineDuration: number;
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
  // Track the last completed ride to avoid double-counting
  const lastCompletedRideRef = useRef<string | null>(null);

  const isOnline = driverStatus !== 'offline';

  // Ref for accessing activeRide in GPS callback
  const activeRideRef = useRef<typeof activeRide>(null);
  useEffect(() => { activeRideRef.current = activeRide; }, [activeRide]);

  // ─── Listen to pending requests ──────────────────────────────────────────
  useEffect(() => {
    if (!isOnline || !user) return;
    const unsub = subscribeToDriverPendingRequests((requests) => {
      setPendingRequests(requests);
    });
    return unsub;
  }, [isOnline, user]);

  // ─── Listen to active ride ───────────────────────────────────────────────
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
        }
      }
    });

    return unsub;
  }, [user?.uid]);

  // ─── Online timer ────────────────────────────────────────────────────────
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

  // ─── GPS tracking ────────────────────────────────────────────────────────
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
          // Fallback: simulated position in Laval
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

  // ─── Actions ─────────────────────────────────────────────────────────────

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

  /**
   * Accept a ride request using the Dispatch Engine (atomic transaction).
   * This ensures no race conditions or duplicate active_rides.
   */
  const acceptRide = useCallback(async (request: RideRequest) => {
    if (!user?.uid || !request.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const engine = getDispatchEngine(db);
      const result = await engine.acceptOffer(
        request.id,
        user.uid,
        user.displayName || user.email || 'Chauffeur',
        currentLocation
      );
      if (!result.success) {
        throw new Error(result.error || 'Echec de l\'assignation');
      }
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
    // Notify passenger
    if (activeRide.passengerId) {
      await addDoc(collection(db, 'notifications'), {
        userId: activeRide.passengerId,
        type: 'driver_arrived',
        title: 'Votre chauffeur est arrive !',
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

  /**
   * Complete ride: compute final fare, create completed_rides entry,
   * create a transaction record, and reset driver status.
   */
  const completeRide = useCallback(async () => {
    if (!activeRide?.id || !user?.uid) return;
    // Prevent double completion
    if (lastCompletedRideRef.current === activeRide.id) return;
    lastCompletedRideRef.current = activeRide.id;

    setIsLoading(true);
    try {
      const rideSnap = await getDoc(doc(db, 'active_rides', activeRide.id));
      if (!rideSnap.exists()) throw new Error('Course introuvable');
      const rideData = rideSnap.data();

      // Compute final fare based on actual duration
      const rideStartedAt = rideData.rideStartedAt?.toDate?.() || rideStartTimeRef.current || new Date();
      const actualDurationMin = Math.max(1, Math.round((Date.now() - rideStartedAt.getTime()) / 60000));
      const finalFare = calculateFare(
        rideData.estimatedDistanceKm || rideData.pricing?.distanceKm || 5,
        actualDurationMin,
        rideData.surgeMultiplier || rideData.pricing?.surgeMultiplier || 1.0,
        rideData.serviceType || 'KULOOC X'
      );

      const driverEarnings = +(finalFare.total * 0.70).toFixed(2);
      const platformFee = +(finalFare.total * 0.30).toFixed(2);

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
        driverEarnings,
        platformFee,
      };

      // 1. Update active_ride to completed
      await updateDoc(doc(db, 'active_rides', activeRide.id), {
        status: 'completed',
        finalPricing: finalFare,
        pricing: finalFare,
        finalPrice: finalFare.total,
        actualDurationMin,
        rideCompletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        driverEarnings,
        platformFee,
      });

      // 2. Copy to completed_rides
      await setDoc(doc(db, 'completed_rides', activeRide.id), completedRideData);

      // 3. Create transaction record
      await addDoc(collection(db, 'transactions'), {
        rideId: activeRide.id,
        requestId: rideData.requestId || null,
        passengerId: rideData.passengerId,
        passengerName: rideData.passengerName,
        driverId: user.uid,
        driverName: rideData.driverName || user.displayName || 'Chauffeur',
        serviceType: rideData.serviceType,
        pickup: rideData.pickup,
        destination: rideData.destination,
        // Fare breakdown
        fare: finalFare,
        subtotal: finalFare.subtotalWithSurge || finalFare.subtotal,
        tps: finalFare.tps,
        tvq: finalFare.tvq,
        total: finalFare.total,
        driverEarnings,
        platformFee,
        surgeMultiplier: finalFare.surgeMultiplier,
        actualDurationMin,
        distanceKm: finalFare.distanceKm,
        // Status
        status: 'completed',
        type: 'ride_payment',
        currency: 'CAD',
        paymentMethod: rideData.paymentMethod || 'card',
        // Timestamps
        rideStartedAt: rideData.rideStartedAt || null,
        rideCompletedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }).catch((err) => {
        console.error('[Driver] Failed to create transaction:', err);
      });

      // 4. Update ride_request if exists
      if (rideData.requestId) {
        await updateDoc(doc(db, 'ride_requests', rideData.requestId), {
          status: 'completed',
          completedAt: serverTimestamp(),
          finalPrice: finalFare.total,
        }).catch(() => {});
      }

      // 5. Reset driver to online
      await updateDriverStatus(user.uid, 'online');
      await updateDoc(doc(db, 'drivers', user.uid), {
        currentRideId: null,
        status: 'online',
        updatedAt: serverTimestamp(),
      }).catch(() => {});

      // 6. Notify passenger
      if (rideData.passengerId) {
        await addDoc(collection(db, 'notifications'), {
          userId: rideData.passengerId,
          type: 'ride_completed',
          title: 'Course terminee !',
          body: `Total: ${finalFare.total.toFixed(2)} $ CAD`,
          rideId: activeRide.id,
          read: false,
          createdAt: serverTimestamp(),
        }).catch(() => {});
      }

      setDriverStatus('online');
      setEarningsToday(prev => prev + driverEarnings);
      setRidesCompleted(prev => prev + 1);
      rideStartTimeRef.current = null;
    } catch (err: any) {
      setError(err.message);
      // Reset the guard so user can retry
      lastCompletedRideRef.current = null;
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
