'use client';

/**
 * KULOOC — Hook useDriver v2
 * ─────────────────────────────────────────────────────────────────────────────
 * Gère l'état complet du chauffeur: statut, position GPS, demandes entrantes, course active.
 *
 * Corrections v2 :
 *   - acceptRide() délègue à engine.acceptOffer() — plus de addDoc direct
 *   - completeRide() crée un enregistrement dans la collection `transactions`
 *   - Aucune création directe de active_rides dans ce hook
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
  const onlineTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gpsWatchRef = useRef<number | null>(null);
  const rideStartTimeRef = useRef<Date | null>(null);

  const isOnline = driverStatus !== 'offline';

  // Ref pour accéder à activeRide dans le callback GPS sans re-créer le watcher
  const activeRideRef = useRef<typeof activeRide>(null);
  useEffect(() => { activeRideRef.current = activeRide; }, [activeRide]);

  // ─── Écouter les demandes en attente (offered + pending) ──────────────────
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
          } catch {
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

  /**
   * Accepter une course — délègue UNIQUEMENT au Dispatch Engine.
   * Le moteur crée le document active_rides via transaction atomique.
   * Plus de addDoc direct ici pour éviter les doublons.
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
        setError(result.error || "Impossible d'accepter la course");
      } else {
        setDriverStatus('en-route');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentLocation]);

  const declineRide = useCallback(async (requestId: string) => {
    if (!user?.uid) return;
    try {
      const engine = getDispatchEngine(db);
      await engine.declineOffer(requestId, user.uid);
    } catch {
      // Silently fail
    }
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
  }, [user?.uid]);

  const arrivedAtPickup = useCallback(async () => {
    if (!activeRide?.id) return;
    await updateRideStatus(activeRide.id, 'driver-arrived');
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

  /**
   * Terminer une course.
   * Crée un enregistrement dans la collection `transactions` avec la répartition complète.
   */
  const completeRide = useCallback(async () => {
    if (!activeRide?.id || !user?.uid) return;
    setIsLoading(true);
    try {
      const rideSnap = await getDoc(doc(db, 'active_rides', activeRide.id));
      if (!rideSnap.exists()) throw new Error('Course introuvable');
      const rideData = rideSnap.data();

      // Calculer le tarif final basé sur la durée réelle
      const rideStartedAt = rideData.rideStartedAt?.toDate?.() || rideStartTimeRef.current || new Date();
      const actualDurationMin = Math.max(1, Math.round((Date.now() - rideStartedAt.getTime()) / 60000));
      const finalFare = calculateFare(
        rideData.estimatedDistanceKm || rideData.pricing?.distanceKm || 5,
        actualDurationMin,
        rideData.pricing?.surgeMultiplier || 1.0,
        rideData.serviceType || 'KULOOC X'
      );

      const driverEarnings = finalFare.driverEarnings;
      const platformFee = finalFare.platformFee;
      const completedAt = new Date();

      // 1. Mettre à jour active_ride
      await updateDoc(doc(db, 'active_rides', activeRide.id), {
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
      });

      // 2. Copier dans completed_rides
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
      await setDoc(doc(db, 'completed_rides', activeRide.id), completedRideData);

      // 3. Créer un enregistrement de transaction financière
      await addDoc(collection(db, 'transactions'), {
        rideId: activeRide.id,
        requestId: rideData.requestId || null,
        passengerId: rideData.passengerId,
        passengerName: rideData.passengerName,
        driverId: user.uid,
        driverName: rideData.driverName || user.displayName || 'Chauffeur',
        serviceType: rideData.serviceType || 'KULOOC X',
        // Tarif complet
        base: finalFare.base,
        perKmCharge: finalFare.perKmCharge,
        perMinCharge: finalFare.perMinCharge,
        subtotal: finalFare.subtotal,
        surgeMultiplier: finalFare.surgeMultiplier,
        surgeAmount: finalFare.surgeAmount,
        subtotalWithSurge: finalFare.subtotalWithSurge,
        tps: finalFare.tps,
        tvq: finalFare.tvq,
        total: finalFare.total,
        // Répartition
        driverEarnings,
        platformFee,
        driverShare: 0.70,
        platformShare: 0.30,
        // Métriques de course
        distanceKm: finalFare.distanceKm,
        durationMin: actualDurationMin,
        estimatedDurationMin: rideData.estimatedDurationMin || 0,
        pickup: rideData.pickup,
        destination: rideData.destination,
        // Timestamps
        rideStartedAt: rideData.rideStartedAt || null,
        completedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        currency: 'CAD',
        status: 'completed',
      });

      // 4. Mettre à jour ride_request
      if (rideData.requestId) {
        await updateDoc(doc(db, 'ride_requests', rideData.requestId), {
          status: 'completed',
          completedAt: serverTimestamp(),
          finalPrice: finalFare.total,
        }).catch(() => {});
      }

      // 5. Remettre le chauffeur en ligne
      await updateDriverStatus(user.uid, 'online');
      await updateDoc(doc(db, 'drivers', user.uid), {
        currentRideId: null,
        status: 'online',
        updatedAt: serverTimestamp(),
      }).catch(() => {});

      setDriverStatus('online');
      setEarningsToday(prev => prev + driverEarnings);
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
