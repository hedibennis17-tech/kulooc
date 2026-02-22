
'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { autocompleteAddress, type AutocompletePrediction, reverseGeocode } from '@/app/actions/places';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Circle, Square, Clock, User, Loader2, MapPin, Navigation } from 'lucide-react';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { FavoriteAddresses } from './booking/favorite-addresses';
import { DateTimePicker } from './booking/date-time-picker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type SearchStepProps = {
  onSearch: (origin: string, destination: string, scheduledTime?: Date) => void;
};

export function SearchStep({ onSearch }: SearchStepProps) {
  const [origin, setOrigin] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState<AutocompletePrediction[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isOriginActive, setIsOriginActive] = useState(false);

  const [destination, setDestination] = useState('');
  const [destinationSuggestions, setDestinationSuggestions] = useState<AutocompletePrediction[]>([]);
  const [isSearchingDestination, setIsSearchingDestination] = useState(false);
  const [isDestinationActive, setIsDestinationActive] = useState(false);

  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [rideFor, setRideFor] = useState<'me' | 'someone'>('me');
  
  const [showOriginFavorites, setShowOriginFavorites] = useState(false);
  const [showDestinationFavorites, setShowDestinationFavorites] = useState(false);

  const { toast } = useToast();
  const geolocation = useGeolocation();

  // Géolocalisation automatique au chargement
  useEffect(() => {
    if (geolocation.latitude && geolocation.longitude && !origin) {
      reverseGeocode(geolocation.latitude, geolocation.longitude).then((response) => {
        if (response.success && response.address) {
          setOrigin(response.address);
        }
      });
    }
  }, [geolocation.latitude, geolocation.longitude]);

  // Autocomplete pour origine
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (origin.length > 2 && isOriginActive) {
        setIsSearchingOrigin(true);
        const response = await autocompleteAddress(origin);
        if (response.success) {
          // Ajouter l'adresse actuelle en premier si disponible
          const suggestions = [...response.predictions];
          if (geolocation.latitude && geolocation.longitude) {
            const currentLocationResponse = await reverseGeocode(geolocation.latitude, geolocation.longitude);
            if (currentLocationResponse.success && currentLocationResponse.address) {
              suggestions.unshift({
                place_id: 'current-location',
                description: currentLocationResponse.address,
                structured_formatting: {
                  main_text: 'Position actuelle',
                  secondary_text: currentLocationResponse.address,
                },
              } as AutocompletePrediction);
            }
          }
          setOriginSuggestions(suggestions);
        } else {
          toast({ variant: 'destructive', title: "Erreur de recherche d'adresse", description: response.error });
          setOriginSuggestions([]);
        }
        setIsSearchingOrigin(false);
      } else {
        setOriginSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [origin, isOriginActive, toast, geolocation]);

  // Autocomplete pour destination
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (destination.length > 2 && isDestinationActive) {
        setIsSearchingDestination(true);
        const response = await autocompleteAddress(destination);
        if (response.success) {
          setDestinationSuggestions(response.predictions);
        } else {
          toast({ variant: 'destructive', title: "Erreur de recherche d'adresse", description: response.error });
          setDestinationSuggestions([]);
        }
        setIsSearchingDestination(false);
      } else {
        setDestinationSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [destination, isDestinationActive, toast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) {
      toast({
        variant: 'destructive',
        title: 'Champs manquants',
        description: 'Veuillez renseigner un lieu de prise en charge et une destination.',
      });
      return;
    }
    onSearch(origin, destination, scheduledTime || undefined);
  };

  const handleUseCurrentLocation = async () => {
    if (geolocation.loading) {
      toast({ title: 'Géolocalisation en cours...', description: 'Veuillez patienter.' });
      return;
    }
    if (geolocation.error) {
      toast({ variant: 'destructive', title: 'Erreur de géolocalisation', description: geolocation.error });
      return;
    }
    if (geolocation.latitude && geolocation.longitude) {
      const response = await reverseGeocode(geolocation.latitude, geolocation.longitude);
      if (response.success && response.address) {
        setOrigin(response.address);
      } else {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de récupérer votre adresse.' });
      }
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      <h1 className="text-3xl font-medium mb-8">Commander une course</h1>
      <form onSubmit={handleSubmit} className="space-y-3 flex-1 flex flex-col">
        <div className="space-y-2">
          {/* Origine avec géolocalisation */}
          <div className="relative">
            <Circle className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 z-10" />
            <Input
              placeholder="Lieu de prise en charge"
              className="pl-11 pr-11 py-6 bg-muted border-transparent rounded-md text-base focus:bg-muted focus:border-gray-300 focus-visible:ring-primary"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              onFocus={() => {
                setIsOriginActive(true);
                setShowOriginFavorites(false);
              }}
              onBlur={() => setTimeout(() => setIsOriginActive(false), 200)}
              autoComplete="off"
            />
            {isSearchingOrigin && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground z-10" />}
            {!isSearchingOrigin && (
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full z-10"
                title="Utiliser ma position actuelle"
              >
                <Navigation className="h-5 w-5 text-blue-600" />
              </button>
            )}
            {isOriginActive && originSuggestions.length > 0 && (
              <div className="absolute top-full mt-1 w-full rounded-md border bg-white text-card-foreground shadow-lg z-20 max-h-60 overflow-y-auto">
                <ul>
                  {originSuggestions.map((s) => (
                    <li
                      key={s.place_id}
                      onMouseDown={() => {
                        setOrigin(s.description);
                        setOriginSuggestions([]);
                      }}
                      className="cursor-pointer px-4 py-3 text-sm hover:bg-muted flex items-start gap-3"
                    >
                      {s.place_id === 'current-location' ? (
                        <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
                      )}
                      <div>
                        <div className="font-medium">{s.structured_formatting.main_text}</div>
                        <div className="text-gray-500">{s.structured_formatting.secondary_text}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Destination */}
          <div className="relative">
            <Square className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 z-10" />
            <Input
              placeholder="Destination"
              className="pl-11 py-6 bg-muted border-transparent rounded-md text-base focus:bg-muted focus:border-gray-300 focus-visible:ring-primary"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onFocus={() => {
                setIsDestinationActive(true);
                setShowDestinationFavorites(false);
              }}
              onBlur={() => setTimeout(() => setIsDestinationActive(false), 200)}
              autoComplete="off"
            />
            {isSearchingDestination && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground z-10" />}
            {isDestinationActive && destinationSuggestions.length > 0 && (
              <div className="absolute top-full mt-1 w-full rounded-md border bg-white text-card-foreground shadow-lg z-20 max-h-60 overflow-y-auto">
                <ul>
                  {destinationSuggestions.map((s) => (
                    <li
                      key={s.place_id}
                      onMouseDown={() => {
                        setDestination(s.description);
                        setDestinationSuggestions([]);
                      }}
                      className="cursor-pointer px-4 py-3 text-sm hover:bg-muted"
                    >
                      <div className="font-medium">{s.structured_formatting.main_text}</div>
                      <div className="text-gray-500">{s.structured_formatting.secondary_text}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Adresses favorites */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowOriginFavorites(!showOriginFavorites)}
              className="text-sm text-blue-600 hover:underline mb-2"
            >
              {showOriginFavorites ? 'Masquer' : 'Afficher'} les adresses favorites
            </button>
            {showOriginFavorites && (
              <FavoriteAddresses
                onSelect={(address) => {
                  if (isOriginActive || !destination) {
                    setOrigin(address);
                  } else {
                    setDestination(address);
                  }
                  setShowOriginFavorites(false);
                }}
              />
            )}
          </div>
        </div>

        <div className="flex-grow" />

        <div className="space-y-3">
          {/* Sélecteur de date/heure */}
          <button
            type="button"
            onClick={() => setShowDateTimePicker(true)}
            className="w-full bg-muted border-none rounded-md py-6 text-base focus:ring-primary flex items-center gap-4 px-4 hover:bg-gray-200 transition-colors"
          >
            <Clock className="h-5 w-5 text-gray-500" />
            <span className="text-left">
              {scheduledTime
                ? format(scheduledTime, "d MMMM yyyy 'à' HH:mm", { locale: fr })
                : 'Prise en charge immédiate'}
            </span>
          </button>

          {showDateTimePicker && (
            <DateTimePicker
              value={scheduledTime}
              onChange={setScheduledTime}
              onClose={() => setShowDateTimePicker(false)}
            />
          )}

          {/* Pour qui */}
          <button
            type="button"
            onClick={() => setRideFor(rideFor === 'me' ? 'someone' : 'me')}
            className="w-full bg-muted border-none rounded-md py-6 text-base focus:ring-primary flex items-center gap-4 px-4 hover:bg-gray-200 transition-colors"
          >
            <User className="h-5 w-5 text-gray-500" />
            <span>{rideFor === 'me' ? 'Pour moi' : 'Pour quelqu\'un d\'autre'}</span>
          </button>

          <Button type="submit" size="lg" className="w-full h-14 text-lg rounded-lg">
            Rechercher
          </Button>
        </div>
      </form>
    </div>
  );
}
