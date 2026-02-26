'use client';
/**
 * KULOOC — Hook useDriver v3
 * ─────────────────────────────────────────────────────────────────────────────
 * v3 — Persistance du statut "online" entre les changements de page :
 *
 *   1. Au MONTAGE : lit le statut depuis Firestore (drivers/{uid}.status)
 *      → si "online" / "en-route" / "on-trip" / "busy", restaure l'état local
 *   2. HEARTBEAT : toutes les 30s, écrit { status, lastHeartbeat } dans Firestore
 *      tant que le chauffeur est online — maintient le statut actif même si
 *      la page change (le composant se remonte et relit Firestore)
 *   3. localStorage "kulooc_driver_online" : filet de sécurité côté client
 *      pour restaurer l'état avant même que Firestore réponde
 *   4. goOffline() EXPLICITE uniquement — jamais appelé automatiquement
 *      au démontage du composant
 *
 * Corrections v2 conservées :
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

const ONLINE_STATUSES: DriverStatus[] = ['online', 'en-route', 'on-trip', 'busy'];
const LS_KEY = 'kulooc_driver_online';
const SESSION_KEY = 'kulooc_driver_session';
const HEARTBEAT_MS = 30_000;

// Generer un ID de session unique pour cet onglet
const SESSION_ID = typeof window !== 'undefined' 
  ? `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  : '';

export function useDriver(): UseDriverReturn {
  const { user } = useUser();

  // ── Init depuis localStorage (instantané, avant Firestore) ────────────────
  const [driverStatus, setDriverStatus] = useState<DriverStatus>(() => {
    if (typeof window === 'undefined') return 'offline';
    return localStorage.getItem(LS_KEY) === '1' ? 'online' : 'offline';
  });

  const [pendingRequests, setPendingRequests] = useState<RideRequest[]>([]);
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onlineDuration, setOnlineDuration] = useState(0);
  const [earningsToday, setEarningsToday] = useState(0);
  const [ridesCompleted, setRidesCompleted] = useState(0);

  const onlineTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gpsWatchRef = useRef<number | null>(null);
  const rideStartTimeRef = useRef<Date | null>(null);
  const activeRideRef = useRef<ActiveRide | null>(null);

  const isOnline = ONLINE_STATUSES.includes(driverStatus);

  useEffect(() => { activeRideRef.current = activeRide; }, [activeRide]);

  // ── RESTAURATION DU STATUT AU MONTAGE depuis Firestore ───────────────────
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'drivers', user.uid));
        if (cancelled) return;
        const data = snap.data();
        if (data?.status && ONLINE_STATUSES.includes(data.status as DriverStatus)) {
          setDriverStatus(data.status as DriverStatus);
          localStorage.setItem(LS_KEY, '1');
        } else if (data?.status === 'offline') {
          setDriverStatus('offline');
          localStorage.removeItem(LS_KEY);
        }
      } catch {
        // Firestore indisponible — on garde l'état localStorage
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid]);

  // ── HEARTBEAT — maintient le statut online dans Firestore ─────────────────
  useEffect(() => {
    if (!isOnline || !user?.uid) {
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
      return;
    }
    const beat = async () => {
      if (!user?.uid) return;
      // Verifier si cette session est toujours la session active
      const currentSession = localStorage.getItem(SESSION_KEY);
      if (currentSession && currentSession !== SESSION_ID) {
        // Une autre session a pris le relais - arreter ce heartbeat
        if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
        return;
      }
      try {
        await updateDoc(doc(db, 'drivers', user.uid), {
          status: driverStatus,
          lastHeartbeat: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Silently fail
      }
    };
    beat(); // premier battement immédiat
    heartbeatRef.current = setInterval(beat, HEARTBEAT_MS);
    return () => {
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, user?.uid, driverStatus]);

  // ── Sync localStorage ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isOnline) { localStorage.setItem(LS_KEY, '1'); }
    else { localStorage.removeItem(LS_KEY); }
  }, [isOnline]);

  // ── Écouter les demandes en attente (offered + pending) ───────────────────
  useEffect(() => {
    if (!isOnline || !user) return;
    const unsub = subscribeToDriverPendingRequests(user.uid, (requests) => {
      setPendingRequests(requests);
    });
    return unsub;
  }, [isOnline, user]);

  // ── Écouter la course active ──────────────────────────────────────────────
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
          localStorage.setItem(LS_KEY, '1');
          setEarningsToday(prev => prev + (ride.pricing?.total ?? 0));
          setRidesCompleted(prev => prev + 1);
          rideStartTimeRef.current = null;
        }
      }
    });
    return unsub;
  }, [user?.uid]);

  // ── Timer en ligne ────────────────────────────────────────────────────────
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

  // ── GPS tracking ──────────────────────────────────────────────────────────
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

  // ── Actions ───────────────────────────────────────────────────────────────
  const goOnline = useCallback(async () => {
    if (!user?.uid) return;
    setIsLoading(true);
    try {
      // Verifier si une autre session est deja active
      const existingSession = localStorage.getItem(SESSION_KEY);
      if (existingSession && existingSession !== SESSION_ID) {
        // Une autre session existe - la remplacer
        localStorage.setItem(SESSION_KEY, SESSION_ID);
      } else {
        localStorage.setItem(SESSION_KEY, SESSION_ID);
      }

      // Obtenir la position GPS actuelle ou utiliser un fallback (region Montreal)
      let locationToUse = currentLocation;
      if (!locationToUse && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          locationToUse = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setCurrentLocation(locationToUse);
        } catch {
          // Fallback: position par defaut Montreal/Laval si GPS echoue
          locationToUse = { latitude: 45.5631, longitude: -73.7124 };
        }
      }
      // Passer la location ET le nom au updateDriverStatus pour que le chauffeur soit visible immediatement
      const driverName = user.displayName || user.email?.split('@')[0] || 'Chauffeur';
      await updateDriverStatus(user.uid, 'online', locationToUse, driverName);
      setDriverStatus('online');
      localStorage.setItem(LS_KEY, '1');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, user?.displayName, user?.email, currentLocation]);

  const goOffline = useCallback(async () => {
    if (!user?.uid) return;
    // IMPORTANT: Empecher la deconnexion si une course est en cours
    if (activeRide && !['completed', 'cancelled'].includes(activeRide.status)) {
      setError('Impossible de se deconnecter pendant une course en cours');
      return;
    }
    setIsLoading(true);
    try {
      await updateDriverStatus(user.uid, 'offline', null);
      setDriverStatus('offline');
      setPendingRequests([]);
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(SESSION_KEY);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, activeRide]);

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

  const completeRide = useCallback(async () => {
    if (!activeRide?.id || !user?.uid) return;
    setIsLoading(true);
    try {
      const rideSnap = await getDoc(doc(db, 'active_rides', activeRide.id));
      if (!rideSnap.exists()) throw new Error('Course introuvable');
      const rideData = rideSnap.data();

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
      await setDoc(doc(db, 'completed_rides', activeRide.id), {
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
      });

      // 3. Créer un enregistrement de transaction financière
      await addDoc(collection(db, 'transactions'), {
        rideId: activeRide.id,
        requestId: rideData.requestId || null,
        passengerId: rideData.passengerId,
        passengerName: rideData.passengerName,
        driverId: user.uid,
        driverName: rideData.driverName || user.displayName || 'Chauffeur',
        serviceType: rideData.serviceType || 'KULOOC X',
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
        driverEarnings,
        platformFee,
        driverShare: 0.70,
        platformShare: 0.30,
        distanceKm: finalFare.distanceKm,
        durationMin: actualDurationMin,
        estimatedDurationMin: rideData.estimatedDurationMin || 0,
        pickup: rideData.pickup,
        destination: rideData.destination,
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

      // 5. Remettre le chauffeur en ligne (heartbeat reprend automatiquement)
      await updateDriverStatus(user.uid, 'online');
      await updateDoc(doc(db, 'drivers', user.uid), {
        currentRideId: null,
        status: 'online',
        updatedAt: serverTimestamp(),
      }).catch(() => {});

      setDriverStatus('online');
      localStorage.setItem(LS_KEY, '1');
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
