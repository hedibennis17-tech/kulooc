'use client';
/**
 * Hook useDriverOffer
 * Écoute les offres de course destinées au chauffeur connecté
 * Gère le countdown 60s et l'acceptation/refus
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection, query, where, onSnapshot, doc,
  updateDoc, serverTimestamp, getDoc, Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { useUser } from '@/firebase/provider';
import { getDispatchEngine } from '@/lib/dispatch/dispatch-engine';

export interface DriverOffer {
  id: string; // requestId_driverId
  requestId: string;
  driverId: string;
  passengerId: string;
  passengerName: string;
  pickup: { address: string; latitude: number; longitude: number };
  destination: { address: string; latitude: number; longitude: number };
  serviceType: string;
  estimatedPrice: number;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: Timestamp | null;
}

export function useDriverOffer(currentLocation: { latitude: number; longitude: number } | null) {
  const { user } = useUser();
  const [currentOffer, setCurrentOffer] = useState<DriverOffer | null>(null);
  // Directive 4 : compte à rebours 15s (document p.488)
  const [countdown, setCountdown] = useState(15);
  const [isResponding, setIsResponding] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Écouter les offres destinées à ce chauffeur
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'driver_offers'),
      where('driverId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsub = onSnapshot(q, (snap) => {
      console.log('[v0] driver_offers snapshot:', snap.size, 'offers for driver', user?.uid);
      if (!snap.empty) {
        const offerDoc = snap.docs[0];
        const offer = { id: offerDoc.id, ...offerDoc.data() } as DriverOffer;
        console.log('[v0] Current offer:', offer.requestId, 'from', offer.passengerName);
        setCurrentOffer(offer);

        // Directive 4 : countdown 15s
        if (offer.expiresAt) {
          const remaining = Math.max(0, Math.floor(
            (offer.expiresAt.toMillis() - Date.now()) / 1000
          ));
          // Limiter à 15s maximum
          setCountdown(Math.min(15, remaining));
        } else {
          setCountdown(15);
        }
      } else {
        setCurrentOffer(null);
        setCountdown(15);
        if (countdownRef.current) clearInterval(countdownRef.current);
      }
    });

    return () => unsub();
  }, [user?.uid]);

  // Timer countdown
  useEffect(() => {
    if (!currentOffer) return;

    if (countdownRef.current) clearInterval(countdownRef.current);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          // Directive 4 : refus automatique quand countdown atteint 0
          // Utiliser setTimeout pour éviter les appels d'état dans setState
          setTimeout(() => {
            setCurrentOffer((offer) => {
              if (offer) {
                // Décliner automatiquement
                const engine = getDispatchEngine(db);
                engine.declineOffer(offer.requestId, offer.driverId).catch(() => {});
              }
              return null;
            });
          }, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [currentOffer?.id]);

  const acceptOffer = useCallback(async () => {
    if (!currentOffer || !user) return;
    console.log('[v0] Accepting offer:', currentOffer.requestId, 'for driver:', user.uid);
    setIsResponding(true);
    try {
      const engine = getDispatchEngine(db);
      const result = await engine.acceptOffer(
        currentOffer.requestId,
        user.uid,
        user.displayName || 'Chauffeur',
        currentLocation
      );
      console.log('[v0] acceptOffer result:', result);
      if (result.success) {
        setCurrentOffer(null);
      } else {
        console.error('[v0] acceptOffer failed:', result.error);
      }
    } finally {
      setIsResponding(false);
    }
  }, [currentOffer, user, currentLocation]);

  const declineOffer = useCallback(async () => {
    if (!currentOffer || !user) return;
    setIsResponding(true);
    try {
      const engine = getDispatchEngine(db);
      await engine.declineOffer(currentOffer.requestId, user.uid);
      setCurrentOffer(null);
    } finally {
      setIsResponding(false);
    }
  }, [currentOffer, user]);

  return {
    currentOffer,
    countdown,
    isResponding,
    acceptOffer,
    declineOffer,
  };
}
