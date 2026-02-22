'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { SearchStep } from './search-step';
import { ServicesStep } from './services-step';
import { ConfirmStep } from './confirm-step';
import { type Service, type Driver, services } from '@/lib/data';
import type { RouteDetailsData } from '@/app/actions/route';
import { useUser } from '@/firebase/provider';

export type RideDetails = {
  service: Service;
  driver: Driver;
  price: number;
};

export type RouteForMap = {
    polyline: string;
    start: { lat: number; lng: number };
    end: { lat: number; lng: number };
} | null;

type PendingRideInfo = {
    serviceId: string;
    driver: Driver;
    price: number;
    origin: string;
    destination: string;
}

export function MainPanel({ onRouteUpdated }: { onRouteUpdated: (route: RouteForMap) => void }) {
  const [step, setStep] = useState<'search' | 'services' | 'confirm'>('search');
  const [origin, setOrigin] = useState<string | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const [selectedRide, setSelectedRide] = useState<RideDetails | null>(null);
  const { user, isUserLoading } = useUser();

  // Check for a pending ride after login
  useEffect(() => {
    if (typeof window !== 'undefined' && user && !isUserLoading && !selectedRide) {
      const pendingRideJSON = localStorage.getItem('pendingRide');
      if (pendingRideJSON) {
        try {
          const pendingRide: PendingRideInfo = JSON.parse(pendingRideJSON);
          
          const service = services.find(s => s.id === pendingRide.serviceId);

          if (!service) {
              console.error("Could not find service from pending ride:", pendingRide.serviceId);
              localStorage.removeItem('pendingRide');
              return;
          }

          // Restore the state from localStorage
          setOrigin(pendingRide.origin);
          setDestination(pendingRide.destination);
          setSelectedRide({
              service,
              driver: pendingRide.driver,
              price: pendingRide.price
          });
          setStep('confirm');

          // Clean up localStorage
          localStorage.removeItem('pendingRide');
        } catch (error) {
          console.error("Failed to parse pending ride:", error);
          localStorage.removeItem('pendingRide');
        }
      }
    }
  }, [user, isUserLoading, selectedRide]);

  const handleSearch = (origin: string, destination: string) => {
    setOrigin(origin);
    setDestination(destination);
    setStep('services');
  };

  const handleServiceSelected = (ride: RideDetails) => {
    setSelectedRide(ride);
    setStep('confirm');
  };

  const handleRouteFetched = useCallback((route: RouteDetailsData | null) => {
    if (route?.polyline?.encodedPolyline && route.startLocation && route.endLocation) {
        onRouteUpdated({
            polyline: route.polyline.encodedPolyline,
            start: route.startLocation,
            end: route.endLocation
        });
    } else {
        onRouteUpdated(null);
    }
  }, [onRouteUpdated]);

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('services');
    } else if (step === 'services') {
      setStep('search');
      setOrigin(null);
      setDestination(null);
      onRouteUpdated(null); // Clear route on back
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'search':
        return <SearchStep onSearch={handleSearch} />;
      case 'services':
        return <ServicesStep origin={origin!} destination={destination!} onServiceSelected={handleServiceSelected} onBack={handleBack} onRouteFetched={handleRouteFetched} />;
      case 'confirm':
        return selectedRide && <ConfirmStep rideDetails={selectedRide} onBack={handleBack} origin={origin!} destination={destination!} />;
      default:
        return <SearchStep onSearch={handleSearch} />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {renderStep()}
    </div>
  );
}
