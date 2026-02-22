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

type ConfirmStepProps = {
  rideDetails: RideDetails;
  onBack: () => void;
  origin: string;
  destination: string;
};

const LOCK_DURATION = 30; // seconds

export function ConfirmStep({ rideDetails, onBack, origin, destination }: ConfirmStepProps) {
  const { service, driver, price } = rideDetails;
  const { toast } = useToast();
  const [isPriceLocked, setIsPriceLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(LOCK_DURATION);
  const [isConfirming, setIsConfirming] = useState(false);
  
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const driverAvatar = PlaceHolderImages.find(p => p.id === 'driver-avatar');

  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (isPriceLocked && lockTimer > 0) {
      timerId = setTimeout(() => {
        setLockTimer(lockTimer - 1);
      }, 1000);
    } else if (isPriceLocked && lockTimer === 0) {
      setIsPriceLocked(false);
      toast({
        title: 'Price lock expired',
        description: 'Your price is no longer locked. Please review and confirm.',
      });
    }
    return () => clearTimeout(timerId);
  }, [isPriceLocked, lockTimer, toast]);

  const handlePriceLock = () => {
    setIsPriceLocked(true);
    setLockTimer(LOCK_DURATION);
    toast({
      title: 'Price Locked!',
      description: `Your price is locked for ${LOCK_DURATION} seconds.`,
    });
  };
  
  const handleConfirmRide = () => {
    if (isUserLoading) return;

    if (!user) {
      try {
        const pendingRide = {
            serviceId: rideDetails.service.id,
            driver: rideDetails.driver,
            price: rideDetails.price,
            origin,
            destination
        };
        localStorage.setItem('pendingRide', JSON.stringify(pendingRide));
      } catch (error) {
        console.error("Failed to save pending ride:", error);
        toast({
          variant: 'destructive',
          title: "Couldn't save your ride details",
          description: "Please log in and try creating the ride again.",
        });
        return;
      }
      router.push('/login');
      return;
    }

    // User is logged in, proceed with confirmation
    setIsConfirming(true);
    setTimeout(() => {
        toast({
            title: 'Ride Confirmed!',
            description: `${driver.name} is on their way.`,
        });
        // In a real app, this would trigger a state change to a "trip tracking" view.
        setIsConfirming(false);
    }, 2000);
  };

  const buttonText = isUserLoading 
    ? 'Loading...' 
    : isConfirming 
    ? 'Confirming...' 
    : !user 
    ? 'Sign in to Confirm' 
    : 'Confirm KULOOC Ride';


  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Go back" className="-ml-2">
          <ArrowLeft />
        </Button>
        <h2 className="text-xl font-semibold">Confirm your ride</h2>
        <div className="w-8" />
      </div>
      <div className="space-y-4 flex-1 flex flex-col">
        <div className="p-4 rounded-lg bg-primary/5 flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {driverAvatar && <AvatarImage src={driverAvatar.imageUrl} alt={driver.name} data-ai-hint={driverAvatar.imageHint} />}
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
            <Button variant="link" size="sm">Change</Button>
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
          {isPriceLocked ? `Price locked for ${lockTimer}s` : 'Lock in this price'}
        </Button>

        <Button size="lg" className="w-full" onClick={handleConfirmRide} disabled={isConfirming || isUserLoading}>
          {(isConfirming || isUserLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {buttonText}
        </Button>
      </div>
    </div>
  );
}
