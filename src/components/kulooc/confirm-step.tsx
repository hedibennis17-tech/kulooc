'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ShieldCheck, Star, CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { RideDetails } from './main-panel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useUser } from '@/firebase/provider';
import { useRouter } from 'next/navigation';
import { RideTracker } from './ride-tracker';
import { useRide } from '@/lib/firestore/use-ride';

type ConfirmStepProps = {
  rideDetails: RideDetails;
  onBack: () => void;
  origin: string;
  destination: string;
  originCoords?: { lat: number; lng: number } | null;
  destinationCoords?: { lat: number; lng: number } | null;
  distanceKm?: number;
  durationMin?: number;
};

const LOCK_DURATION = 30; // seconds

export function ConfirmStep({
  rideDetails,
  onBack,
  origin,
  destination,
  originCoords,
  destinationCoords,
  distanceKm = 5,
  durationMin = 10,
}: ConfirmStepProps) {
  const { service, driver, price } = rideDetails;
  const { toast } = useToast();
  const [isPriceLocked, setIsPriceLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(LOCK_DURATION);

  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const {
    flowState,
    rideRequest,
    activeRide,
    estimatedPrice,
    isLoading,
    error,
    submitRideRequest,
    cancelRide,
    resetRide,
  } = useRide();

  const driverAvatar = PlaceHolderImages.find(p => p.id === 'driver-avatar');

  // Price lock timer
  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (isPriceLocked && lockTimer > 0) {
      timerId = setTimeout(() => setLockTimer(lockTimer - 1), 1000);
    } else if (isPriceLocked && lockTimer === 0) {
      setIsPriceLocked(false);
      toast({ title: 'Prix expiré', description: 'Votre prix n\'est plus verrouillé.' });
    }
    return () => clearTimeout(timerId);
  }, [isPriceLocked, lockTimer, toast]);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: error });
    }
  }, [error, toast]);

  const handlePriceLock = () => {
    setIsPriceLocked(true);
    setLockTimer(LOCK_DURATION);
    toast({ title: 'Prix verrouillé !', description: `Votre prix est verrouillé pour ${LOCK_DURATION} secondes.` });
  };

  const handleConfirmRide = async () => {
    if (isUserLoading) return;

    if (!user) {
      try {
        const pendingRide = {
          serviceId: rideDetails.service.id,
          driver: rideDetails.driver,
          price: rideDetails.price,
          origin,
          destination,
        };
        localStorage.setItem('pendingRide', JSON.stringify(pendingRide));
      } catch (err) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de sauvegarder la course.' });
        return;
      }
      router.push('/login');
      return;
    }

    // Créer la demande dans Firestore
    const requestId = await submitRideRequest({
      pickup: {
        latitude: originCoords?.lat ?? 45.5088,
        longitude: originCoords?.lng ?? -73.554,
        address: origin,
      },
      destination: {
        latitude: destinationCoords?.lat ?? 45.495,
        longitude: destinationCoords?.lng ?? -73.57,
        address: destination,
      },
      serviceType: service.id,
      serviceMultiplier: service.multiplier,
      estimatedDistanceKm: distanceKm,
      estimatedDurationMin: durationMin,
      surgeMultiplier: 1.0,
      paymentMethod: 'card',
    });

    if (requestId) {
      toast({
        title: '🚗 Demande envoyée !',
        description: 'Nous recherchons un chauffeur pour vous.',
      });
    }
  };

  // Si une course est en cours, afficher le tracker
  if (flowState !== 'idle') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Votre course</h2>
        </div>
        <RideTracker
          flowState={flowState}
          rideRequest={rideRequest}
          activeRide={activeRide}
          estimatedPrice={estimatedPrice}
          onCancel={cancelRide}
          onNewRide={() => { resetRide(); onBack(); }}
        />
      </div>
    );
  }

  const buttonText = isUserLoading
    ? 'Chargement...'
    : isLoading
    ? 'Envoi en cours...'
    : !user
    ? 'Se connecter pour confirmer'
    : 'Confirmer la course KULOOC';

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Retour" className="-ml-2">
          <ArrowLeft />
        </Button>
        <h2 className="text-xl font-semibold">Confirmer la course</h2>
        <div className="w-8" />
      </div>
      <div className="space-y-4 flex-1 flex flex-col">
        <div className="p-4 rounded-lg bg-primary/5 flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {driverAvatar && (
              <AvatarImage src={driverAvatar.imageUrl} alt={driver.name} data-ai-hint={driverAvatar.imageHint} />
            )}
            <AvatarFallback>{driver.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-bold text-lg">{driver.name}</p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> {driver.rating.toFixed(1)}
            </div>
            <p className="text-sm text-muted-foreground">{driver.vehicle.model}</p>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {service && service.icon && <service.icon className="h-8 w-8 text-primary" />}
            <p className="font-bold">{service.name}</p>
          </div>
          <p className="font-bold text-2xl">${price.toFixed(2)}</p>
        </div>
        <Separator />

        {user && (
          <div className="p-3 rounded-lg border flex justify-between items-center">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">MasterCard **** 4242</span>
            </div>
            <Button variant="link" size="sm">Changer</Button>
          </div>
        )}

        <div className="flex-1"></div>

        <Button
          variant={isPriceLocked ? 'secondary' : 'outline'}
          className="w-full"
          onClick={handlePriceLock}
          disabled={isPriceLocked}
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          {isPriceLocked ? `Prix verrouillé pour ${lockTimer}s` : 'Verrouiller ce prix'}
        </Button>

        <Button
          size="lg"
          className="w-full"
          onClick={handleConfirmRide}
          disabled={isLoading || isUserLoading}
        >
          {(isLoading || isUserLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {buttonText}
        </Button>
      </div>
    </div>
  );
}
