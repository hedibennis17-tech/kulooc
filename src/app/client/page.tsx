'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/firebase/provider';
import { useFirestore } from '@/firebase/provider';
import { createRideRequest, cancelRideRequest } from '@/lib/client/client-service';
import { subscribeToLiveDrivers, subscribeToPassengerRide, updateClientPresence, type LiveDriver, type LiveActiveRide } from '@/lib/realtime/realtime-service';
import { calculateFare } from '@/lib/services/fare-service';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MapPin, Navigation, Car, Clock, DollarSign,
  Star, ChevronRight, X, Loader2, CheckCircle,
  Shield, Leaf, Phone, User, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { PlacesAutocomplete, type PlaceResult } from '@/components/kulooc/places-autocomplete';

// ─── Types ────────────────────────────────────────────────────────────────────

const SERVICE_TYPES = [
  {
    id: 'kulooc_x',
    name: 'KULOOC X',
    description: 'Économique',
    icon: <Car className="w-5 h-5" />,
    multiplier: 1.0,
    eta: '3-5 min',
    color: 'bg-gray-900',
  },
  {
    id: 'kulooc_comfort',
    name: 'Confort',
    description: "Plus d'espace",
    icon: <Star className="w-5 h-5" />,
    multiplier: 1.4,
    eta: '5-8 min',
    color: 'bg-blue-900',
  },
  {
    id: 'kulooc_xl',
    name: 'XL',
    description: "Jusqu'à 6 passagers",
    icon: <Shield className="w-5 h-5" />,
    multiplier: 1.8,
    eta: '6-10 min',
    color: 'bg-purple-900',
  },
  {
    id: 'kulooc_green',
    name: 'Green',
    description: 'Véhicule électrique',
    icon: <Leaf className="w-5 h-5" />,
    multiplier: 1.2,
    eta: '4-7 min',
    color: 'bg-green-900',
  },
];

const MONTREAL_CENTER = { lat: 45.5019, lng: -73.5674 };

// Map service IDs to fare-service names
const SERVICE_NAME_MAP: Record<string, string> = {
  'kulooc_x': 'KULOOC X',
  'kulooc_comfort': 'KULOOC COMFORT',
  'kulooc_xl': 'KULOOC XL',
  'kulooc_green': 'KULOOC X', // Green uses same rates as X
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateFromCoords(
  pickupCoords: { lat: number; lng: number } | null,
  destCoords: { lat: number; lng: number } | null,
  serviceId: string
) {
  if (!pickupCoords || !destCoords) {
    return { price: 0, distance: 0, duration: 0 };
  }
  // Real distance via haversine, multiply by 1.3 for road factor
  const straightKm = haversineKm(pickupCoords.lat, pickupCoords.lng, destCoords.lat, destCoords.lng);
  const distanceKm = Math.max(1, +(straightKm * 1.3).toFixed(1));
  const durationMin = Math.max(3, Math.round(distanceKm * 2.5));
  const fareName = SERVICE_NAME_MAP[serviceId] || 'KULOOC X';
  const fare = calculateFare(distanceKm, durationMin, 1.0, fareName);
  return { price: fare.total, distance: distanceKm, duration: durationMin };
}

// ─── Icône voiture SVG pour les marqueurs chauffeurs ─────────────────────────

function CarMarker({ status, vehicleType }: { status: string; vehicleType?: string }) {
  const colors: Record<string, string> = {
    online: '#22c55e',
    'en-route': '#f59e0b',
    'on-trip': '#3b82f6',
    busy: '#ef4444',
  };
  const color = colors[status] || '#22c55e';
  const isTruck = vehicleType === 'truck' || vehicleType === 'van';

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
    >
      <div
        className="absolute inset-0 rounded-full animate-pulse"
        style={{ backgroundColor: color + '40', width: 32, height: 32, margin: -6 }}
      />
      {isTruck ? (
        <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
          <rect x="1" y="5" width="16" height="10" rx="2" fill={color} />
          <rect x="17" y="7" width="7" height="8" rx="1" fill={color} />
          <rect x="22" y="9" width="3" height="4" rx="0.5" fill={color} opacity="0.7" />
          <circle cx="5" cy="17" r="2.5" fill="#1f2937" stroke="white" strokeWidth="1" />
          <circle cx="13" cy="17" r="2.5" fill="#1f2937" stroke="white" strokeWidth="1" />
          <circle cx="21" cy="17" r="2.5" fill="#1f2937" stroke="white" strokeWidth="1" />
          <rect x="3" y="7" width="5" height="4" rx="0.5" fill="white" opacity="0.6" />
        </svg>
      ) : (
        <svg width="24" height="18" viewBox="0 0 24 18" fill="none">
          <path d="M4 8 L6 4 L18 4 L20 8 L22 9 L22 14 L2 14 L2 9 Z" fill={color} />
          <path d="M7 4 L8 8 L16 8 L17 4 Z" fill="white" opacity="0.5" />
          <circle cx="6" cy="15" r="2.5" fill="#1f2937" stroke="white" strokeWidth="1" />
          <circle cx="18" cy="15" r="2.5" fill="#1f2937" stroke="white" strokeWidth="1" />
          <rect x="2" y="10" width="3" height="2" rx="0.5" fill="#fbbf24" />
          <rect x="19" y="10" width="3" height="2" rx="0.5" fill="#fbbf24" />
        </svg>
      )}
    </div>
  );
}

// ─── Carte Google Maps avec chauffeurs temps réel ────────────────────────────

function ClientMapView({
  apiKey,
  drivers,
  userPos,
  pickupPos,
  destPos,
  activeRide,
}: {
  apiKey: string;
  drivers: LiveDriver[];
  userPos: { lat: number; lng: number };
  pickupPos?: { lat: number; lng: number } | null;
  destPos?: { lat: number; lng: number } | null;
  activeRide?: LiveActiveRide | null;
}) {
  return (
    <APIProvider apiKey={apiKey} libraries={['geometry']}>
      <div className="w-full h-full">
        <Map
          defaultCenter={MONTREAL_CENTER}
          center={userPos}
          defaultZoom={13}
          mapId="a22506a8155b4369"
          disableDefaultUI={true}
          zoomControl={true}
          gestureHandling="greedy"
          className="w-full h-full"
        >
          {/* Position du passager */}
          <AdvancedMarker position={userPos} title="Votre position">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-10 h-10 rounded-full bg-red-500/25 animate-ping" />
              <div className="w-5 h-5 rounded-full bg-red-600 border-2 border-white shadow-lg" />
            </div>
          </AdvancedMarker>

          {/* Marqueur de prise en charge */}
          {pickupPos && (
            <AdvancedMarker position={pickupPos} title="Prise en charge">
              <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-white shadow-md flex items-center justify-center">
                <MapPin className="w-3 h-3 text-white" />
              </div>
            </AdvancedMarker>
          )}

          {/* Marqueur de destination */}
          {destPos && (
            <AdvancedMarker position={destPos} title="Destination">
              <div className="w-6 h-6 rounded-sm bg-red-600 border-2 border-white shadow-md flex items-center justify-center">
                <MapPin className="w-3 h-3 text-white" />
              </div>
            </AdvancedMarker>
          )}

          {/* Chauffeurs en temps réel */}
          {drivers.map((driver) => {
            if (!driver.location) return null;
            const pos = { lat: driver.location.latitude, lng: driver.location.longitude };
            return (
              <AdvancedMarker
                key={driver.id}
                position={pos}
                title={`${driver.name} — ${driver.status}`}
              >
                <CarMarker
                  status={driver.status}
                  vehicleType={driver.vehicle?.type}
                />
              </AdvancedMarker>
            );
          })}

          {/* Position du chauffeur assigné (course active) */}
          {activeRide?.driverLocation && (
            <AdvancedMarker
              position={{
                lat: activeRide.driverLocation.latitude,
                lng: activeRide.driverLocation.longitude,
              }}
              title={`${activeRide.driverName} — En route`}
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-amber-400/40 animate-ping w-10 h-10 -m-2" />
                <CarMarker status="en-route" />
              </div>
            </AdvancedMarker>
          )}
        </Map>
      </div>
    </APIProvider>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ClientHomePage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedService, setSelectedService] = useState('kulooc_x');
  const [step, setStep] = useState<'search' | 'select' | 'waiting' | 'active'>('search');
  const [activeRide, setActiveRide] = useState<LiveActiveRide | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [liveDrivers, setLiveDrivers] = useState<LiveDriver[]>([]);
  const [userPos, setUserPos] = useState(MONTREAL_CENTER);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const selectedServiceData = SERVICE_TYPES.find(s => s.id === selectedService)!;

  // ─── Géolocalisation ────────────────────────────────────────────────────────
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserPos(coords);
          setPickupCoords(coords);
          setPickup('Ma position actuelle');
        },
        () => {} // Fallback silencieux sur Montreal
      );
    }
  }, []);

  // ─── Présence client ────────────────────────────────────────────────────────
  useEffect(() => {
    if (user && db) {
      updateClientPresence(db, user.uid).catch(() => {});
    }
  }, [user, db]);

  // ─── Chauffeurs en temps réel ────────────────────────────────────────────────
  useEffect(() => {
    if (!db) return;
    const unsub = subscribeToLiveDrivers(db, (drivers) => {
      setLiveDrivers(drivers);
    });
    return () => unsub();
  }, [db]);

   // ─── Course active du passager ───────────────────────────────────────────
  useEffect(() => {
    if (!user || !db) return;
    const unsub = subscribeToPassengerRide(db, user.uid, (ride) => {
      const prevStatus = activeRide?.status;
      setActiveRide(ride);
      if (ride) {
        // Passer à l'étape active dès qu'un chauffeur est assigné
        if (
          ride.status === 'driver-assigned' ||
          ride.status === 'driver-arrived' ||
          ride.status === 'in-progress'
        ) {
          setStep('active');
        }
        // Notifier le passager quand le chauffeur arrive
        if (ride.status === 'driver-arrived' && prevStatus !== 'driver-arrived') {
          toast({ title: '📍 Votre chauffeur est arrivé !', description: 'Votre taxi KULOOC est devant vous.' });
        }
        // Course démarrée
        if (ride.status === 'in-progress' && prevStatus !== 'in-progress') {
          toast({ title: '🏁 Course démarrée !', description: 'Bon voyage !' });
        }
        // Course terminée
        if (ride.status === 'completed') {
          setStep('search');
          setCurrentRequestId(null);
          toast({ title: '✅ Course terminée !', description: `Merci d'avoir choisi KULOOC 🍁` });
        }
      }
      if (!ride && step === 'active') setStep('search');
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, db]);

  const handleSearch = () => {
    if (!pickup.trim() || !destination.trim()) {
      toast({ title: 'Adresses requises', description: 'Entrez un depart et une destination.', variant: 'destructive' });
      return;
    }
    if (!pickupCoords || !destCoords) {
      toast({ title: 'Adresses non validees', description: 'Selectionnez une adresse dans la liste de suggestions.', variant: 'destructive' });
      return;
    }
    setStep('select');
  };

  const handlePickupSelect = (place: PlaceResult) => {
    setPickup(place.address);
    setPickupCoords({ lat: place.latitude, lng: place.longitude });
  };

  const handleDestSelect = (place: PlaceResult) => {
    setDestination(place.address);
    setDestCoords({ lat: place.latitude, lng: place.longitude });
  };

  const handleRequestRide = async () => {
    if (!user || !pickupCoords || !destCoords) return;
    setIsLoading(true);
    try {
      const est = estimateFromCoords(pickupCoords, destCoords, selectedService);
      const requestId = await createRideRequest({
        passengerId: user.uid,
        passengerName: user.displayName || user.email?.split('@')[0] || 'Passager',
        passengerPhone: user.phoneNumber || '',
        pickup: {
          address: pickup,
          latitude: pickupCoords.lat,
          longitude: pickupCoords.lng,
        },
        destination: {
          address: destination,
          latitude: destCoords.lat,
          longitude: destCoords.lng,
        },
        serviceType: SERVICE_NAME_MAP[selectedService] || 'KULOOC X',
        estimatedPrice: est.price,
        estimatedDurationMin: est.duration,
        estimatedDistanceKm: est.distance,
        surgeMultiplier: 1.0,
      });
      setCurrentRequestId(requestId);
      setStep('waiting');
      toast({ title: 'Course demandee !', description: 'Recherche d\'un chauffeur en cours...' });
    } catch (err) {
      console.log('[v0] createRideRequest error:', err);
      toast({ title: 'Erreur', description: 'Impossible de creer la course.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (currentRequestId) await cancelRideRequest(currentRequestId).catch(() => {});
    setStep('search');
    setCurrentRequestId(null);
    setPickup('');
    setDestination('');
    setPickupCoords(null);
    setDestCoords(null);
  };

  const est = estimateFromCoords(pickupCoords, destCoords, selectedService);
  const nearbyDrivers = liveDrivers.filter((d) => d.status === 'online').length;

  const content = (
    <div className="flex flex-col h-full">
      {/* ── Carte Google Maps ── */}
      <div className="relative h-52 bg-gray-100 overflow-hidden">
        {apiKey ? (
          <ClientMapView
            apiKey={apiKey}
            drivers={liveDrivers}
            userPos={userPos}
            pickupPos={pickupCoords}
            destPos={destCoords}
            activeRide={activeRide}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-center">
              <MapPin className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Montréal, QC</p>
            </div>
          </div>
        )}

        {/* Badge chauffeurs disponibles */}
        {nearbyDrivers > 0 && step === 'search' && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 shadow text-xs font-medium text-green-700 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {nearbyDrivers} chauffeur{nearbyDrivers > 1 ? 's' : ''} disponible{nearbyDrivers > 1 ? 's' : ''}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </div>

      {/* ── Contenu principal ── */}
      <div className="flex-1 bg-white px-4 pt-3 pb-2 overflow-y-auto">

        {/* ── ÉTAPE 1 : Recherche ── */}
        {step === 'search' && (
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900">Où allez-vous ?</h2>

            <PlacesAutocomplete
              value={pickup}
              onChange={setPickup}
              onPlaceSelect={handlePickupSelect}
              placeholder="Adresse de depart"
              icon={<div className="w-3 h-3 bg-black rounded-full" />}
            />

            <PlacesAutocomplete
              value={destination}
              onChange={setDestination}
              onPlaceSelect={handleDestSelect}
              placeholder="Entrez votre destination"
              icon={<div className="w-3 h-3 bg-red-600 rounded-sm" />}
            />

            <div className="space-y-1">
              {[
                { name: 'Aeroport YUL', sub: 'Dorval, QC', lat: 45.4657, lng: -73.7455 },
                { name: 'Gare Centrale', sub: 'Montreal, QC', lat: 45.4994, lng: -73.5667 },
                { name: 'Vieux-Montreal', sub: 'Montreal, QC', lat: 45.5048, lng: -73.5538 },
                { name: 'Universite McGill', sub: 'Montreal, QC', lat: 45.5048, lng: -73.5772 },
              ].map(place => (
                <button
                  key={place.name}
                  onClick={() => {
                    setDestination(`${place.name}, ${place.sub}`);
                    setDestCoords({ lat: place.lat, lng: place.lng });
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{place.name}</p>
                    <p className="text-xs text-gray-400">{place.sub}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                </button>
              ))}
            </div>

            <Button
              className="w-full h-12 bg-black hover:bg-gray-800 text-white font-semibold rounded-xl"
              onClick={handleSearch}
              disabled={!pickup || !destination || !pickupCoords || !destCoords}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Voir les options
            </Button>
          </div>
        )}

        {/* ── ÉTAPE 2 : Sélection du service ── */}
        {step === 'select' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setStep('search')} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <p className="text-xs text-gray-400 truncate">{pickup}</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{destination}</p>
              </div>
            </div>

            <h3 className="font-bold text-gray-900">Choisir un service</h3>

            <div className="space-y-2">
              {SERVICE_TYPES.map(service => {
                const e = estimateFromCoords(pickupCoords, destCoords, service.id);
                const isSelected = selectedService === service.id;
                return (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                      isSelected ? 'border-black bg-gray-50' : 'border-gray-100 bg-white hover:border-gray-200'
                    )}
                  >
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0', service.color)}>
                      {service.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900">{service.name}</p>
                      <p className="text-xs text-gray-400">{service.description} · {service.eta}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">${e.price.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">{e.distance} km</p>
                    </div>
                    {isSelected && <CheckCircle className="w-5 h-5 text-black flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="w-4 h-4" />
                <span>Estimation TTC</span>
              </div>
              <span className="font-bold text-gray-900">${est.price.toFixed(2)}</span>
            </div>

            <Button
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl"
              onClick={handleRequestRide}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Car className="w-4 h-4 mr-2" />
              )}
              Confirmer — {selectedServiceData.name}
            </Button>
          </div>
        )}

        {/* ── ÉTAPE 3 : En attente d'un chauffeur ── */}
        {step === 'waiting' && (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Recherche d'un chauffeur</h3>
              <p className="text-gray-400 text-sm mt-1">
                {nearbyDrivers > 0
                  ? `${nearbyDrivers} chauffeur${nearbyDrivers > 1 ? 's' : ''} disponible${nearbyDrivers > 1 ? 's' : ''} à proximité`
                  : 'Aucun chauffeur disponible pour l\'instant...'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-black rounded-full" />
                <span className="text-gray-600 truncate">{pickup}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-red-600 rounded-sm" />
                <span className="text-gray-600 truncate">{destination}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm bg-gray-50 rounded-xl p-3">
              <span className="text-gray-500">{selectedServiceData.name}</span>
              <span className="font-bold text-gray-900">${est.price.toFixed(2)}</span>
            </div>

            <Button
              variant="outline"
              className="w-full h-11 border-red-200 text-red-600 hover:bg-red-50"
              onClick={handleCancel}
            >
              <X className="w-4 h-4 mr-2" />
              Annuler la demande
            </Button>
          </div>
        )}

        {/* ── ÉTAPE 4 : Course active ── */}
        {step === 'active' && activeRide && (
          <div className="space-y-4 py-2">
            {/* Statut */}
            <div className="flex items-center gap-3 bg-green-50 rounded-xl p-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Car className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-800 text-sm">
                  {activeRide.status === 'driver-assigned' && 'Chauffeur en route vers vous'}
                  {activeRide.status === 'driver-arrived' && 'Votre chauffeur est arrivé !'}
                  {activeRide.status === 'in-progress' && 'Course en cours'}
                </p>
                <p className="text-green-600 text-xs">{activeRide.driverName}</p>
              </div>
              <div className="ml-auto">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
            </div>

            {/* Infos chauffeur */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{activeRide.driverName}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                    <span>4.9</span>
                    <span>·</span>
                    <span>{activeRide.serviceType?.replace('kulooc_', 'KULOOC ').toUpperCase()}</span>
                  </div>
                </div>
                <button className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                  <Phone className="w-4 h-4 text-white" />
                </button>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 bg-black rounded-full flex-shrink-0" />
                  <span className="text-gray-600 truncate">{activeRide.pickup?.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 bg-red-600 rounded-sm flex-shrink-0" />
                  <span className="text-gray-600 truncate">{activeRide.destination?.address}</span>
                </div>
              </div>
            </div>

            {/* Prix estimé */}
            {activeRide.pricing && (
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                <span className="text-sm text-gray-500">Tarif estimé</span>
                <span className="font-bold text-gray-900">${activeRide.pricing.total?.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Wrap everything in APIProvider so PlacesAutocomplete has access to Places library
  if (apiKey) {
    return (
      <APIProvider apiKey={apiKey} libraries={['places']}>
        {content}
      </APIProvider>
    );
  }

  return content;
}
