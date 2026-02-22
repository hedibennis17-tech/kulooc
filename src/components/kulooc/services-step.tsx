'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Star, Languages, Zap, Clock, Route } from 'lucide-react';
import { drivers as allDrivers, services } from '@/lib/data';
import type { Service, Driver } from '@/lib/data';
import type { RideDetails } from './main-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getRouteDetails, type RouteDetailsData } from '@/app/actions/route';

type ServicesStepProps = {
  origin: string;
  destination: string;
  onServiceSelected: (ride: RideDetails) => void;
  onBack: () => void;
  onRouteFetched: (route: RouteDetailsData | null) => void;
};

type RouteInfo = RouteDetailsData;

export function ServicesStep({ origin, destination, onServiceSelected, onBack, onRouteFetched }: ServicesStepProps) {
  const { toast } = useToast();
  const [ecoFriendly, setEcoFriendly] = useState(false);
  const [language, setLanguage] = useState<'any' | 'fr' | 'en'>('any');
  const [minRating, setMinRating] = useState([4.5]);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRoute = async () => {
        if (!destination || !origin) {
            setIsLoading(false);
            return;
        };
      setIsLoading(true);
      const response = await getRouteDetails(origin, destination);
      if (response.success) {
        setRoute(response.data);
        onRouteFetched(response.data);
      } else {
        setRoute(null);
        onRouteFetched(null);
        toast({
          variant: "destructive",
          title: "Erreur de calcul d'itinéraire",
          description: response.error,
        });
      }
      setIsLoading(false);
    };
    fetchRoute();
  }, [origin, destination, toast, onRouteFetched]);

  const filteredDrivers = useMemo(() => {
    return allDrivers.filter((driver) => {
      const ratingMatch = driver.rating >= minRating[0];
      const ecoMatch = !ecoFriendly || driver.vehicle.type === 'electric';
      const langMatch = language === 'any' || driver.language === language || driver.language === 'both';
      return ratingMatch && ecoMatch && langMatch;
    });
  }, [minRating, ecoFriendly, language]);

  const calculatePrice = (baseMultiplier: number, distanceInMeters: number) => {
    const baseFare = 2.50; // $
    const perKmRate = 1.65; // $/km
    const distanceInKm = distanceInMeters / 1000;
    const price = (baseFare + (perKmRate * distanceInKm)) * baseMultiplier;
    return Math.max(price, 5.00 * baseMultiplier); // Minimum fare
  };

  const availableRides = useMemo(() => {
    if (!route) return [];

    return services.map((service) => {
      const isEcoService = service.id === 'kulooc_green';
      const potentialDrivers = filteredDrivers.filter(driver => 
          isEcoService ? driver.vehicle.type === 'electric' : true
      );
      
      if (potentialDrivers.length > 0) {
        const driver = potentialDrivers[0]; // Assign first available driver
        const price = calculatePrice(service.multiplier, route.distanceMeters);
        return { service, driver, price };
      }
      return null;
    }).filter(Boolean) as RideDetails[];
  }, [filteredDrivers, route]);

  const formatDuration = (durationString: string) => {
    if (!durationString) return '';
    const seconds = parseInt(durationString.replace('s', ''), 10);
    if (isNaN(seconds)) return '';
    return `${Math.round(seconds / 60)} min`;
  };

  const formatDistance = (distanceMeters: number) => {
    if (!distanceMeters && distanceMeters !== 0) return '';
    return `${(distanceMeters / 1000).toFixed(1)} km`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Go back" className="-ml-2">
          <ArrowLeft />
        </Button>
        <h2 className="text-xl font-semibold">Choose a ride</h2>
        <div className="w-8" />
      </div>
      <div className="space-y-4">
        {/* Filters section */}
        <div className="space-y-4 p-4 rounded-lg bg-muted">
          <div className="flex items-center justify-between">
            <Label htmlFor="eco-friendly" className="flex items-center gap-2">
              <Zap className="h-4 w-4" /> Eco-friendly
            </Label>
            <Switch id="eco-friendly" checked={ecoFriendly} onCheckedChange={setEcoFriendly} />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Languages className="h-4 w-4" /> Language</Label>
            <RadioGroup defaultValue="any" value={language} onValueChange={(val) => setLanguage(val as any)} className="flex">
              <div className="flex items-center space-x-2"><RadioGroupItem value="any" id="lang-any" /><Label htmlFor="lang-any">Any</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="fr" id="lang-fr" /><Label htmlFor="lang-fr">Français</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="en" id="lang-en" /><Label htmlFor="lang-en">English</Label></div>
            </RadioGroup>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="min-rating" className="flex items-center gap-2"><Star className="h-4 w-4" /> Minimum Rating: {minRating[0].toFixed(1)}</Label>
            <Slider id="min-rating" min={4} max={5} step={0.1} value={minRating} onValueChange={setMinRating} />
          </div>
        </div>

        {/* Route info section */}
        {isLoading ? (
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>
        ) : route && (
          <div className="flex items-center justify-between p-3 rounded-lg border text-sm">
            <div className="flex items-center gap-2 font-medium">
              <Route className="h-5 w-5 text-primary" />
              <span>{formatDistance(route.distanceMeters)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(route.duration)}</span>
            </div>
          </div>
        )}
        
        {/* Rides list section */}
        <div className="space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-[76px] w-full rounded-lg" />
              <Skeleton className="h-[76px] w-full rounded-lg" />
            </>
          ) : availableRides.length > 0 ? (
            availableRides.map((ride) => (
              <button key={ride.service.id} onClick={() => onServiceSelected(ride)} className="w-full text-left">
                <div className="flex items-center gap-4 p-2 rounded-lg hover:bg-accent transition-colors">
                  <ride.service.icon className="h-12 w-12 text-primary" />
                  <div className="flex-grow">
                    <p className="font-bold">{ride.service.name}</p>
                    <p className="text-sm text-muted-foreground">{ride.service.description}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {ride.driver.name} &middot; <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {ride.driver.rating}
                    </p>
                  </div>
                  <p className="font-bold text-lg">${ride.price.toFixed(2)}</p>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-8">
                <p className="font-semibold">No rides available</p>
                <p className="text-sm text-muted-foreground">{route ? "Try adjusting your filters" : "Could not calculate route"}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
