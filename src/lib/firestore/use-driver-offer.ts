'use client';
/**
 * Hook useDriverOffer
 * Écoute les offres de course destinées au chauffeur connecté
 * Gère le countdown 60s et l'acceptation/refus
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection, query, where, onSnapshot, doc,
  updateDoc, serverTimestamp, getDoc, Timestamp, getDocs, limit,
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
  const [countdown, setCountdown] = useState(60);
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
      if (!snap.empty) {
        const offerDoc = snap.docs[0];
        const offer = { id: offerDoc.id, ...offerDoc.data() } as DriverOffer;
        setCurrentOffer(offer);

        // Calculer le countdown restant
        if (offer.expiresAt) {
          const remaining = Math.max(0, Math.floor(
            (offer.expiresAt.toMillis() - Date.now()) / 1000
          ));
          setCountdown(remaining);
        } else {
          setCountdown(60);
        }
      } else {
        setCurrentOffer(null);
        setCountdown(60);
        if (countdownRef.current) clearInterval(countdownRef.current);
      }
    });

    return () => unsub();
  }, [user?.uid]);

  // ─── POLLING FALLBACK — Vérifier les offres toutes les 30s ─────────────────
  // Corrige le problème où onSnapshot échoue silencieusement
  useEffect(() => {
    if (!user?.uid) return;

    const pollOffers = async () => {
      try {
        const q = query(
          collection(db, 'driver_offers'),
          where('driverId', '==', user.uid),
          where('status', '==', 'pending'),
          limit(1)
        );
        const snap = await getDocs(q);

        if (!snap.empty && !currentOffer) {
          const offerDoc = snap.docs[0];
          const offer = { id: offerDoc.id, ...offerDoc.data() } as DriverOffer;
          console.log('[useDriverOffer] Polling: Offre trouvée:', offer.id);
          setCurrentOffer(offer);

          if (offer.expiresAt) {
            const remaining = Math.max(0, Math.floor(
              (offer.expiresAt.toMillis() - Date.now()) / 1000
            ));
            setCountdown(remaining);
          } else {
            setCountdown(60);
          }
        }
      } catch (err) {
        console.error('[useDriverOffer] Polling error:', err);
      }
    };

    // Poll immédiatement puis toutes les 30 secondes
    pollOffers();
    const interval = setInterval(pollOffers, 30000);

    return () => clearInterval(interval);
  }, [user?.uid, currentOffer]);

  // Timer countdown
  useEffect(() => {
    if (!currentOffer) return;

    if (countdownRef.current) clearInterval(countdownRef.current);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
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
    setIsResponding(true);
    try {
      const engine = getDispatchEngine(db);
      const result = await engine.acceptOffer(
        currentOffer.requestId,
        user.uid,
        user.displayName || 'Chauffeur',
        currentLocation
      );
      if (result.success) {
        setCurrentOffer(null);
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
