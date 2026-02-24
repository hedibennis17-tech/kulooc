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

        // Play sound for incoming offer
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkpqZlIl+c2pjXl1gZW55hpGZnpaKfW9jVlBQV2Ftf46boZyRhHVkVElGSVRjdIiXoqKZjH1sXE9FQUdTZHiMnKamnpF/bmBSTkhNW21/kaCpp52SgnFiVEpGSlhpdImdqqqglIR0ZFZLSExabnqMnqyqn5ODb2BTTEZLWGZ2iJqmqaCUhXRlV01ITlpqfIycrquglIN0Z1pSUFtodIaVoqadkYN0Z1pQTE9bZ3iIl6OhmZCEdGhdUU5SW2p7ip2opZ2UhXdoW1BNVF9xgI+eppqRg3RlV0xGSVZlc4SWo6efmIt9cGNaVlpkdIeXpKadkoV1aFxRTU9aZ3WFl6SknpKFdWdaT0pNV2R0g5ekpp2TiHttYltYX2x9jZ6oqaKYjH1xZVtVVVtndYWVoaGak4d6bWBUTkxSXWp3iZeipp+Xin5xY1pTUFlkcoGRoKWgmI2AcmVaUU5SXGhyhJKfpKGYjYFzZltST1NcaHODk6Ckopmaj4J1al9WUVNbZnGAj5qenpePg3VoXVVRU1tmdISSn6Oimo+Dd25lX1xeZnB+jJmfm5SMfnFkW1VUWGFtfImUnpuTi35xZFtVUlZeaHWFkpqfm5SMfXFkXFZUV2BseIeLkZCKfnFmX1lXWmJse4mWnpyVjoF1amBZVVdeaHWFk5+hm5WLf3NmX1hUV19peYeSmpuUi390ZlxVUlReaXeFkpqel5KIe3BkXVhXXGZ0g5Odop+ZkYR5bWNbVlVaYW16iZahop6WjYF1amBYU1RbZnKBkJugnZaOgXVpXldUVVxlcoCPm5+clY2BdmlgWFRWXGVzgpKeoJ6WjYF2a2FZVVVcZXOCkp6gnpaMgXZrYVlWVlxlc4KSnqCelpF/c2RYT0pLUl5re4qYoKGdmJCEdGhcUktKUV1oeomYoqOdl5CCdWldVE9PV2NwfoqWnJqSi390aF5XVFZZZHB+i5mgnpeTiXxxZFtUUVVdaXiFk5+gnpeMgHRnXlhVWF9qdoaUn6KglpCDd2xjXFhZYGt4hpOdnpaOgHJkWVFNTlRfbHqKmaCem5OIfHFmX1tZXWVxgI+cnpqSin10Z11UUFNcZ3WFk56gnpaPg3ZsZF5bXWRue4mWnJiQhHdsYVlVVV1ncIGRnZ+bmJCHfHNsZWFfYmlxfomTl5OLfnFkW1NQVF1re4mXn56YkIR4bWReWltgaXaFk5+gnJePg3dsZF5cXmRsfYqYnp2Yl4+DeG1lXlpcY2t5h5WdnZaOg3VpYFlVV19peYmXnp2WjIB0al9YVFZZZHB+jJignpiPg3VqYFhUVltlc4KSnqCflZCEdGhcUktJT1tndYaUn6Kfl5CEdGlcU05NVmFufYuanp2WjoJ1amBYVFVcZnOCk5+gnpaPg3ZrYltYWWBpeYiXnp6Yl5CDd2xkXltcYmx7ipmenpmTi4B2bWVeXF5kbXuKmZ2cmJCFem5lXlpcYWl3hpSdnpmTi4B1bGRdW15kbHqJl52cmZOLgXhuZl9dX2VufYqXnZyYk4qAdWxkXVtdYmx6iZecm5iUi4J3cGhiYWJnb3uJlZqYlIyCd3BoY2BhZm55h5OYl5OLgnhxaGNgYWZue4eTl5aTi4J4cGhjX2FmaHN9iJGTj4eDfHNsZmNhZWlyfomSmJeTjoaCeHFsZ2VkaW96ipSbm5aSh3xxaGBbV1ldZnN/');
          audio.volume = 0.7;
          audio.play().catch(() => {});
        } catch (_) {}

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
