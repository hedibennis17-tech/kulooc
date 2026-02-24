'use client';

/**
 * KULOOC — Hook useRide
 * Gère l'état complet du cycle de vie d'une course pour le passager
 */

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/firebase/provider';
import {
  createRideRequest,
  cancelRideRequest,
  subscribeToRideRequest,
  subscribeToPassengerActiveRide,
  calculateRidePrice,
  type RideRequest,
  type ActiveRide,
  type RideStatus,
  type GeoPoint,
} from './ride-service';

export type RideFlowState =
  | 'idle'
  | 'requesting'
  | 'searching'
  | 'driver-assigned'
  | 'driver-arrived'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'error';

export type UseRideReturn = {
  flowState: RideFlowState;
  rideRequest: RideRequest | null;
  activeRide: ActiveRide | null;
  requestId: string | null;
  isLoading: boolean;
  error: string | null;
  estimatedPrice: { subtotal: number; tax: number; total: number } | null;
  submitRideRequest: (params: {
    pickup: GeoPoint;
    destination: GeoPoint;
    serviceType: string;
    serviceMultiplier: number;
    estimatedDistanceKm: number;
    estimatedDurationMin: number;
    surgeMultiplier?: number;
    paymentMethod?: string;
    notes?: string;
  }) => Promise<string | null>;
  cancelRide: () => Promise<void>;
  resetRide: () => void;
  getEstimate: (params: {
    distanceKm: number;
    durationMin: number;
    serviceMultiplier: number;
    surgeMultiplier?: number;
  }) => { subtotal: number; tax: number; total: number };
};

export function useRide(): UseRideReturn {
  const { user } = useUser();
  const [flowState, setFlowState] = useState<RideFlowState>('idle');
  const [rideRequest, setRideRequest] = useState<RideRequest | null>(null);
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<{ subtotal: number; tax: number; total: number } | null>(null);

  // Écouter la demande de course en temps réel
  useEffect(() => {
    if (!requestId) return;
    const unsub = subscribeToRideRequest(requestId, (req) => {
      if (!req) return;
      setRideRequest(req);
      mapStatusToFlowState(req.status);
    });
    return unsub;
  }, [requestId]);

  // Écouter la course active du passager
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToPassengerActiveRide(user.uid, (ride) => {
      if (!ride) return;
      setActiveRide(ride);
      mapStatusToFlowState(ride.status);
    });
    return unsub;
  }, [user?.uid]);

  const mapStatusToFlowState = (status: RideStatus) => {
    const map: Record<RideStatus, RideFlowState> = {
      'pending': 'searching',
      'searching': 'searching',
      'offered': 'searching',
      'driver-assigned': 'driver-assigned',
      'driver-arrived': 'driver-arrived',
      'in-progress': 'in-progress',
      'completed': 'completed',
      'cancelled': 'cancelled',
    };
    setFlowState(map[status] || 'idle');
  };

  const submitRideRequest = useCallback(async (params: {
    pickup: GeoPoint;
    destination: GeoPoint;
    serviceType: string;
    serviceMultiplier: number;
    estimatedDistanceKm: number;
    estimatedDurationMin: number;
    surgeMultiplier?: number;
    paymentMethod?: string;
    notes?: string;
  }): Promise<string | null> => {
    if (!user) {
      setError('Vous devez être connecté pour commander une course.');
      return null;
    }

    setIsLoading(true);
    setError(null);
    setFlowState('requesting');

    try {
      const surge = params.surgeMultiplier ?? 1.0;
      const pricing = calculateRidePrice({
        distanceKm: params.estimatedDistanceKm,
        durationMin: params.estimatedDurationMin,
        serviceMultiplier: params.serviceMultiplier,
        surgeMultiplier: surge,
      });

      const id = await createRideRequest({
        passengerId: user.uid,
        passengerName: user.displayName || user.email || 'Passager',
        passengerPhone: user.phoneNumber || undefined,
        pickup: params.pickup,
        destination: params.destination,
        serviceType: params.serviceType,
        estimatedPrice: pricing.total,
        estimatedDistanceKm: params.estimatedDistanceKm,
        estimatedDurationMin: params.estimatedDurationMin,
        surgeMultiplier: surge,
        paymentMethod: params.paymentMethod || 'card',
        notes: params.notes,
      });

      setRequestId(id);
      setEstimatedPrice({ subtotal: pricing.subtotal, tax: pricing.tax, total: pricing.total });
      setFlowState('searching');
      return id;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de la demande.');
      setFlowState('error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const cancelRide = useCallback(async () => {
    if (!requestId || !user) return;
    setIsLoading(true);
    try {
      await cancelRideRequest(requestId, user.uid);
      setFlowState('cancelled');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [requestId, user]);

  const resetRide = useCallback(() => {
    setFlowState('idle');
    setRideRequest(null);
    setActiveRide(null);
    setRequestId(null);
    setError(null);
    setEstimatedPrice(null);
  }, []);

  const getEstimate = useCallback((params: {
    distanceKm: number;
    durationMin: number;
    serviceMultiplier: number;
    surgeMultiplier?: number;
  }) => {
    const pricing = calculateRidePrice({
      ...params,
      surgeMultiplier: params.surgeMultiplier ?? 1.0,
    });
    return { subtotal: pricing.subtotal, tax: pricing.tax, total: pricing.total };
  }, []);

  return {
    flowState,
    rideRequest,
    activeRide,
    requestId,
    isLoading,
    error,
    estimatedPrice,
    submitRideRequest,
    cancelRide,
    resetRide,
    getEstimate,
  };
}
