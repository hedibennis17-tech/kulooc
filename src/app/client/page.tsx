'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/firebase/provider';
import { useFirestore } from '@/firebase/provider';
import { createRideRequest, cancelRideRequest } from '@/lib/client/client-service';
import { subscribeToLiveDrivers, subscribeToPassengerRide, updateClientPresence, type LiveDriver, type LiveActiveRide } from '@/lib/realtime/realtime-service';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MapPin, Navigation, Car, Clock, DollarSign,
  Star, ChevronRight, X, Loader2, CheckCircle,
  Shield, Phone, User, AlertCircle, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { autocompleteAddress, reverseGeocode, type AutocompletePrediction } from '@/app/actions/places';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { calculateFare, generateInvoiceText } from '@/lib/services/fare-service';
import { RatingModal } from '@/components/kulooc/rating-modal';
import { db } from '@/firebase';
import { onSnapshot, doc } from 'firebase/firestore';
import { getDispatchEngine } from '@/lib/dispatch/dispatch-engine';

// ─── Tarifs KULOOC ────────────────────────────────────────────────────────────

const SERVICE_TYPES = [
  {
    id: 'KULOOC X',
    name: 'KULOOC X',
    description: 'Berline standard · 4 passagers',
    shortDesc: 'Économique, rapide et fiable',
    icon: <Car className="w-5 h-5" />,
    eta: '3-5 min',
    capacity: 4,
    color: 'bg-gray-900',
  },
  {
    id: 'KULOOC XL',
    name: 'KULOOC XL',
    description: 'SUV/Minivan · 6 passagers',
    shortDesc: "Plus d'espace pour votre groupe",
    icon: <Shield className="w-5 h-5" />,
    eta: '6-10 min',
    capacity: 6,
    color: 'bg-purple-900',
  },
  {
    id: 'KULOOC CONFORT',
    name: 'KULOOC CONFORT',
    description: 'Berline premium · confort',
    shortDesc: 'Confort et discrétion garantis',
    icon: <Star className="w-5 h-5" />,
    eta: '5-8 min',
    capacity: 4,
    color: 'bg-blue-900',
  },
];

const MONTREAL_CENTER = { lat: 45.5019, lng: -73.5674 };

function estimatePrice(serviceId: string, distanceKm = 8, durationMin = 20) {
  const fare = calculateFare(distanceKm, durationMin, 1.0, serviceId);
  return { price: fare.total, distance: distanceKm, duration: durationMin, fare };
}

// ─── Marqueur voiture ─────────────────────────────────────────────────────────

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
    <div className="relative flex items-center justify-center" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
      <div className="absolute inset-0 rounded-full animate-pulse" style={{ backgroundColor: color + '40', width: 32, height: 32, margin: -6 }} />
      {isTruck ? (
        <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
          <rect x="1" y="5" width="16" height="10" rx="2" fill={color} />
          <rect x="17" y="7" width="7" height="8" rx="1" fill={color} />
          <circle cx="5" cy="17" r="2.5" fill="#1f2937" stroke="white" strokeWidth="1" />
          <circle cx="13" cy="17" r="2.5" fill="#1f2937" stroke="white" strokeWidth="1" />
          <circle cx="21" cy="17" r="2.5" fill="#1f2937" stroke="white" strokeWidth="1" />
        </svg>
      ) : (
        <svg width="24" height="18" viewBox="0 0 24 18" fill="none">
          <path d="M4 8 L6 4 L18 4 L20 8 L22 9 L22 14 L2 14 L2 9 Z" fill={color} />
          <path d="M7 4 L8 8 L16 8 L17 4 Z" fill="white" opacity="0.5" />
          <circle cx="6" cy="15" r="2.5" fill="#1f2937" stroke="white" strokeWidth="1" />
          <circle cx="18" cy="15" r="2.5" fill="#1f2937" stroke="white" strokeWidth="1" />
        </svg>
      )}
    </div>
  );
}

// ─── Carte Google Maps ────────────────────────────────────────────────────────

function ClientMapView({ apiKey, drivers, userPos, activeRide, liveDriverLocation, className }: {
  apiKey: string;
  drivers: LiveDriver[];
  userPos: { lat: number; lng: number };
  activeRide?: LiveActiveRide | null;
  liveDriverLocation?: { latitude: number; longitude: number } | null;
  className?: string;
}) {
  const mapCenter = liveDriverLocation && activeRide?.status === 'driver-assigned'
    ? { lat: liveDriverLocation.latitude, lng: liveDriverLocation.longitude }
    : userPos;

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={MONTREAL_CENTER}
        center={mapCenter}
        defaultZoom={activeRide ? 15 : 14}
        mapId="a22506a8155b4369"
        disableDefaultUI={true}
        zoomControl={true}
        gestureHandling="greedy"
        className={cn('w-full h-full', className)}
      >
        <AdvancedMarker position={userPos} title="Votre position">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-10 h-10 rounded-full bg-red-500/25 animate-ping" />
            <div className="w-5 h-5 rounded-full bg-red-600 border-2 border-white shadow-lg" />
          </div>
        </AdvancedMarker>

        {!activeRide && drivers.map((d) => {
          if (!d.location) return null;
          return (
            <AdvancedMarker key={d.id} position={{ lat: d.location.latitude, lng: d.location.longitude }}>
              <CarMarker status={d.status} vehicleType={d.vehicle?.type} />
            </AdvancedMarker>
          );
        })}

        {activeRide && liveDriverLocation && (
          <AdvancedMarker position={{ lat: liveDriverLocation.latitude, lng: liveDriverLocation.longitude }}>
            <div className="relative flex items-center justify-center">
              <div className="absolute w-14 h-14 rounded-full bg-blue-400/20 animate-ping" />
              <div className="w-11 h-11 bg-black rounded-full flex items-center justify-center shadow-xl border-2 border-white">
                <span className="text-white text-lg">🚗</span>
              </div>
              <div className="absolute -bottom-6 bg-black text-white text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                {activeRide.driverName?.split(' ')[0] || 'Chauffeur'}
              </div>
            </div>
          </AdvancedMarker>
        )}

        {activeRide && activeRide.pickup?.latitude && (
          <AdvancedMarker position={{ lat: activeRide.pickup.latitude, lng: activeRide.pickup.longitude }}>
            <div className="w-8 h-8 bg-white border-2 border-black rounded-full flex items-center justify-center shadow-md">
              <span className="text-sm">📍</span>
            </div>
          </AdvancedMarker>
        )}
      </Map>
    </APIProvider>
  );
}

// ─── Champ avec autocomplete ──────────────────���───────────────────────────────

function AddressInput({
  value, onChange, placeholder, icon, suggestions, isSearching, onFocus, onBlur, onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: React.ReactNode;
  suggestions: AutocompletePrediction[];
  isSearching: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onSelect: (s: AutocompletePrediction) => void;
}) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">{icon}</div>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        autoComplete="off"
        className="pl-9 h-12 border-gray-200 bg-gray-50 text-sm pr-8"
      />
      {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
      {suggestions.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto">
          {suggestions.map(s => (
            <button
              key={s.place_id}
              onMouseDown={() => onSelect(s)}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors"
            >
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">{s.structured_formatting.main_text}</p>
                <p className="text-xs text-gray-400">{s.structured_formatting.secondary_text}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ClientHomePage() {
  const { user } = useUser();
  const firestoreDb = useFirestore();
  const { toast } = useToast();
  const geolocation = useGeolocation();

  // Adresses
  const [pickup, setPickup] = useState('');
  const [pickupPos, setPickupPos] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupSuggestions, setPickupSuggestions] = useState<AutocompletePrediction[]>([]);
  const [isPickupActive, setIsPickupActive] = useState(false);
  const [isSearchingPickup, setIsSearchingPickup] = useState(false);

  const [destination, setDestination] = useState('');
  const [destPos, setDestPos] = useState<{ lat: number; lng: number } | null>(null);
  const [destSuggestions, setDestSuggestions] = useState<AutocompletePrediction[]>([]);
  const [isDestActive, setIsDestActive] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);

  const [selectedService, setSelectedService] = useState('KULOOC X');
  const [step, setStep] = useState<'search' | 'select' | 'waiting' | 'active'>('search');
  const [activeRide, setActiveRide] = useState<LiveActiveRide | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [liveDrivers, setLiveDrivers] = useState<LiveDriver[]>([]);
  const [userPos, setUserPos] = useState(MONTREAL_CENTER);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [completedRide, setCompletedRide] = useState<LiveActiveRide | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [liveDriverLocation, setLiveDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const activeRideRef = useRef<LiveActiveRide | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const selectedServiceData = SERVICE_TYPES.find(s => s.id === selectedService)!;

  // ─── DÉMARRER LE MOTEUR DE DISPATCH ────────────────────────────────────────
  // Le moteur doit tourner pour que les commandes soient traitées (pending → offered → assigned)
  // Sans cela, les ride_requests restent "pending" indéfiniment si aucun dashboard n'est ouvert
  const engineStartedRef = useRef(false);
  useEffect(() => {
    if (!engineStartedRef.current) {
      getDispatchEngine(db).start();
      engineStartedRef.current = true;
    }
  }, []);

  // ─── Géolocalisation → adresse réelle ──────────────────────────────────────
  useEffect(() => {
    if (geolocation.latitude && geolocation.longitude) {
      const lat = geolocation.latitude;
      const lng = geolocation.longitude;
      setUserPos({ lat, lng });
      setPickupPos({ lat, lng });
      if (!pickup) {
        reverseGeocode(lat, lng).then(res => {
          if (res.success && res.address) setPickup(res.address);
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geolocation.latitude, geolocation.longitude]);

  // ─── Autocomplete pickup ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPickupActive || pickup.length < 3) { setPickupSuggestions([]); return; }
    const t = setTimeout(async () => {
      setIsSearchingPickup(true);
      const res = await autocompleteAddress(pickup);
      if (res.success) setPickupSuggestions(res.predictions);
      setIsSearchingPickup(false);
    }, 300);
    return () => clearTimeout(t);
  }, [pickup, isPickupActive]);

  // ─── Autocomplete destination ───────────────────────────────────────────────
  useEffect(() => {
    if (!isDestActive || destination.length < 3) { setDestSuggestions([]); return; }
    const t = setTimeout(async () => {
      setIsSearchingDest(true);
      const res = await autocompleteAddress(destination);
      if (res.success) setDestSuggestions(res.predictions);
      setIsSearchingDest(false);
    }, 300);
    return () => clearTimeout(t);
  }, [destination, isDestActive]);

  // ─── Présence client ────────────────────────────────────────────────────────
  useEffect(() => {
    if (user && firestoreDb) updateClientPresence(firestoreDb, user.uid).catch(() => {});
  }, [user, firestoreDb]);

  // ─── Chauffeurs en temps réel ───────────────────────────────────────────────
  useEffect(() => {
    if (!firestoreDb) return;
    const unsub = subscribeToLiveDrivers(firestoreDb, setLiveDrivers);
    return () => unsub();
  }, [firestoreDb]);

  // ─── Course active + tracking live ─────────────────────────────────────────
  useEffect(() => {
    if (!user || !firestoreDb) return;
    const unsub = subscribeToPassengerRide(firestoreDb, user.uid, (ride) => {
      const prev = activeRideRef.current?.status;
      activeRideRef.current = ride;
      setActiveRide(ride);
      if (ride) {
        if (['driver-assigned', 'driver-arrived', 'in-progress'].includes(ride.status)) setStep('active');
        if (ride.status === 'driver-arrived' && prev !== 'driver-arrived')
          toast({ title: '📍 Votre chauffeur est arrivé !', description: 'Votre taxi KULOOC est devant vous.' });
        if (ride.status === 'in-progress' && prev !== 'in-progress')
          toast({ title: '🏁 Course démarrée !', description: 'Bon voyage !' });
        if (ride.status === 'completed' && prev !== 'completed') {
          setCompletedRide(ride);
          setActiveRide(null);
          activeRideRef.current = null;
          setStep('search');
          setCurrentRequestId(null);
          setPickup('');
          setDestination('');
          setLiveDriverLocation(null);
          setDriverProfile(null);
          setShowInvoice(true);
          toast({ title: '✅ Course terminée !', description: "Merci d'avoir choisi KULOOC 🍁" });
          setTimeout(() => setShowRatingModal(true), 2500);
        }
      } else {
        if (prev && ['driver-assigned', 'driver-arrived', 'in-progress'].includes(prev)) {
          setStep('search');
        }
      }
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, firestoreDb]);

  // ─── Tracking live position du chauffeur ─────────────────────────────────
  useEffect(() => {
    if (!activeRide?.driverId || !['driver-assigned', 'driver-arrived', 'in-progress'].includes(activeRide.status)) {
      setLiveDriverLocation(null);
      return;
    }
    const unsub = onSnapshot(doc(db, 'drivers', activeRide.driverId), (snap: any) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.location?.latitude && data.location?.longitude) {
        setLiveDriverLocation(data.location);
      }
      if (!driverProfile) {
        setDriverProfile({
          name: data.driverName || data.name || activeRide.driverName,
          averageRating: data.averageRating || 4.8,
          totalRatings: data.totalRatings || 0,
          vehicle: data.vehicle || {},
          phoneNumber: data.phoneNumber || activeRide.passengerPhone,
          photoURL: data.photoURL || null,
        });
      }
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRide?.driverId, activeRide?.status]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleSearch = () => {
    if (!pickup.trim() || !destination.trim()) {
      toast({ title: 'Adresses requises', description: 'Entrez un départ et une destination.', variant: 'destructive' });
      return;
    }
    setStep('select');
  };

  const handleRequestRide = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const est = estimatePrice(selectedService);
      const requestId = await createRideRequest({
        passengerId: user.uid,
        passengerName: user.displayName || user.email?.split('@')[0] || 'Passager',
        passengerPhone: user.phoneNumber || '',
        pickup: {
          address: pickup,
          latitude: pickupPos?.lat ?? userPos.lat,
          longitude: pickupPos?.lng ?? userPos.lng,
        },
        destination: {
          address: destination,
          latitude: destPos?.lat ?? MONTREAL_CENTER.lat,
          longitude: destPos?.lng ?? MONTREAL_CENTER.lng,
        },
        serviceType: selectedService,
        estimatedPrice: Math.round(est.price * 100) / 100,
        estimatedDurationMin: est.duration,
        estimatedDistanceKm: est.distance,
        surgeMultiplier: 1.0,
      });
      setCurrentRequestId(requestId);
      setStep('waiting');
      toast({ title: '🚗 Course demandée !', description: "Recherche d'un chauffeur en cours..." });

      // Le Dispatch Engine détecte automatiquement la ride_request via onSnapshot
      // et assigne le meilleur chauffeur disponible — aucun appel API nécessaire
      console.log('[KULOOC] ride_request créée:', requestId, '— moteur dispatch en attente');
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de créer la course.', variant: 'destructive' });
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
  };

  const est = estimatePrice(selectedService);
  const nearbyDrivers = liveDrivers.filter(d => d.status === 'online').length;

  // ════════════════════════════════════════════════════════════════════════════
  // CONTENU PARTAGÉ : étapes (search / select / waiting / active)
  // Utilisé à la fois dans MobileView et DesktopView (colonne gauche)
  // ════════════════════════════════════════════════════════════════════════════

  const StepSearch = () => (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-gray-900 md:hidden">Où allez-vous ?</h2>
      <AddressInput
        value={pickup}
        onChange={setPickup}
        placeholder="Votre position actuelle"
        icon={<div className="w-3 h-3 bg-black rounded-full" />}
        suggestions={pickupSuggestions}
        isSearching={isSearchingPickup}
        onFocus={() => setIsPickupActive(true)}
        onBlur={() => setTimeout(() => { setIsPickupActive(false); setPickupSuggestions([]); }, 200)}
        onSelect={s => { setPickup(s.description); setPickupSuggestions([]); }}
      />
      <AddressInput
        value={destination}
        onChange={setDestination}
        placeholder="Entrez votre destination"
        icon={<div className="w-3 h-3 bg-red-600 rounded-sm" />}
        suggestions={destSuggestions}
        isSearching={isSearchingDest}
        onFocus={() => setIsDestActive(true)}
        onBlur={() => setTimeout(() => { setIsDestActive(false); setDestSuggestions([]); }, 200)}
        onSelect={s => { setDestination(s.description); setDestSuggestions([]); }}
      />
      <div className="space-y-1">
        {[
          { label: 'Aéroport YUL', sub: 'Dorval, QC' },
          { label: 'Gare Centrale', sub: 'Montréal, QC' },
          { label: 'Vieux-Montréal', sub: 'Montréal, QC' },
          { label: 'Université McGill', sub: 'Montréal, QC' },
        ].map(place => (
          <button
            key={place.label}
            onClick={() => setDestination(`${place.label}, ${place.sub}`)}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left transition-colors"
          >
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{place.label}</p>
              <p className="text-xs text-gray-400">{place.sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
          </button>
        ))}
      </div>
      <Button
        className="w-full h-12 bg-black hover:bg-gray-800 text-white font-semibold rounded-xl"
        onClick={handleSearch}
        disabled={!pickup || !destination}
      >
        <Navigation className="w-4 h-4 mr-2" />
        Voir les options
      </Button>
    </div>
  );

  const StepSelect = ({ showHeader = true }: { showHeader?: boolean }) => (
    <div className="space-y-3">
      {showHeader && (
        <div className="flex items-center gap-2 mb-1">
          <button onClick={() => setStep('search')} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-xs text-gray-400 truncate">{pickup}</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{destination}</p>
          </div>
        </div>
      )}
      <h3 className="font-bold text-gray-900">Choisir un service</h3>
      <div className="space-y-2">
        {SERVICE_TYPES.map(service => {
          const e = estimatePrice(service.id);
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
                <p className="text-xs text-gray-400">~{e.distance} km</p>
              </div>
              {isSelected && <CheckCircle className="w-5 h-5 text-black flex-shrink-0" />}
            </button>
          );
        })}
      </div>
      <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <DollarSign className="w-4 h-4" />
          <span>Estimation TTC (taxes incluses)</span>
        </div>
        <span className="font-bold text-gray-900">${est.price.toFixed(2)}</span>
      </div>
      <Button
        className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl"
        onClick={handleRequestRide}
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Car className="w-4 h-4 mr-2" />}
        Confirmer — {selectedServiceData.name}
      </Button>
    </div>
  );

  const StepWaiting = () => (
    <div className="space-y-4 py-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <h3 className="font-bold text-gray-900 text-lg">Recherche d&apos;un chauffeur</h3>
        <p className="text-gray-400 text-sm mt-1">
          {nearbyDrivers > 0
            ? `${nearbyDrivers} chauffeur${nearbyDrivers > 1 ? 's' : ''} disponible${nearbyDrivers > 1 ? 's' : ''} à proximité`
            : "Aucun chauffeur disponible pour l'instant..."}
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
      <Button variant="outline" className="w-full h-11 border-red-200 text-red-600 hover:bg-red-50" onClick={handleCancel}>
        <X className="w-4 h-4 mr-2" />
        Annuler la demande
      </Button>
    </div>
  );

  const StepActive = () => activeRide ? (
    <div className="space-y-3 py-2">
      <div className={`flex items-center gap-3 rounded-xl p-3 ${
        activeRide.status === 'driver-assigned' ? 'bg-blue-50' :
        activeRide.status === 'driver-arrived' ? 'bg-amber-50' : 'bg-green-50'
      }`}>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
          activeRide.status === 'driver-assigned' ? 'bg-blue-100' :
          activeRide.status === 'driver-arrived' ? 'bg-amber-100' : 'bg-green-100'
        }`}>
          <span className="text-lg">
            {activeRide.status === 'driver-assigned' ? '🚗' :
             activeRide.status === 'driver-arrived' ? '📍' : '🏁'}
          </span>
        </div>
        <div className="flex-1">
          <p className={`font-bold text-sm ${
            activeRide.status === 'driver-assigned' ? 'text-blue-800' :
            activeRide.status === 'driver-arrived' ? 'text-amber-800' : 'text-green-800'
          }`}>
            {activeRide.status === 'driver-assigned' && 'Chauffeur en route vers vous'}
            {activeRide.status === 'driver-arrived' && '🎉 Votre chauffeur est arrivé !'}
            {activeRide.status === 'in-progress' && 'Course en cours — Bon voyage !'}
          </p>
          {activeRide.status === 'driver-assigned' && liveDriverLocation && (
            <p className="text-xs text-blue-600 mt-0.5">📡 Suivi GPS en direct activé</p>
          )}
        </div>
        <div className={`w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0 ${
          activeRide.status === 'driver-assigned' ? 'bg-blue-500' :
          activeRide.status === 'driver-arrived' ? 'bg-amber-500' : 'bg-green-500'
        }`} />
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center overflow-hidden border-2 border-gray-200">
              {driverProfile?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={driverProfile.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-black text-xl">
                  {(driverProfile?.name || activeRide.driverName || 'C').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-900 text-base truncate">
              {driverProfile?.name || activeRide.driverName}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-yellow-400">★</span>
              <span className="text-sm font-semibold text-gray-700">
                {(driverProfile?.averageRating || 4.8).toFixed(1)}
              </span>
              {driverProfile?.totalRatings > 0 && (
                <span className="text-xs text-gray-400">({driverProfile.totalRatings} avis)</span>
              )}
              <span className="text-gray-300">·</span>
              <span className="text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                {activeRide.serviceType}
              </span>
            </div>
            {driverProfile?.vehicle?.model && (
              <p className="text-xs text-gray-500 mt-0.5">
                🚗 {driverProfile.vehicle.model}
                {driverProfile.vehicle.color && ` · ${driverProfile.vehicle.color}`}
              </p>
            )}
            {driverProfile?.vehicle?.licensePlate && (
              <p className="text-xs font-mono font-bold text-gray-700 mt-0.5 bg-gray-100 px-2 py-0.5 rounded inline-block">
                {driverProfile.vehicle.licensePlate}
              </p>
            )}
          </div>
          {driverProfile?.phoneNumber && (
            <a href={`tel:${driverProfile.phoneNumber}`}
              className="w-11 h-11 bg-black rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
              <Phone className="w-5 h-5 text-white" />
            </a>
          )}
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-3 space-y-2">
        <div className="flex items-start gap-2 text-sm">
          <div className="flex flex-col items-center gap-0.5 mt-0.5 flex-shrink-0">
            <div className="w-3 h-3 rounded-full bg-black" />
            <div className="w-px h-5 bg-gray-300" />
            <div className="w-3 h-3 rounded-sm bg-red-600" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Prise en charge</p>
              <p className="text-gray-700 truncate">{activeRide.pickup?.address}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Destination</p>
              <p className="text-gray-700 truncate font-medium">{activeRide.destination?.address}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
        <div>
          <p className="text-xs text-gray-400">Tarif estimé</p>
          <p className="font-black text-gray-900 text-lg">
            {(activeRide.pricing?.total || activeRide.estimatedPrice || 0).toFixed(2)} $
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">{activeRide.estimatedDistanceKm?.toFixed(1)} km</p>
          <p className="text-xs text-gray-400">~{activeRide.estimatedDurationMin} min</p>
        </div>
      </div>
    </div>
  ) : null;

  // ════════════════════════════════════════════════════════════════════════════
  // VERSION MOBILE (< md) — identique à l'original
  // ════════════════════════════════════════════════════════════════════════════
  const MobileView = () => (
    <div className="flex flex-col h-full md:hidden">
      <div className="relative h-52 bg-gray-100 overflow-hidden flex-shrink-0">
        {apiKey ? (
          <ClientMapView apiKey={apiKey} drivers={liveDrivers} userPos={userPos} activeRide={activeRide} liveDriverLocation={liveDriverLocation} />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <MapPin className="w-8 h-8 text-red-600" />
          </div>
        )}
        {nearbyDrivers > 0 && step === 'search' && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 shadow text-xs font-medium text-green-700 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {nearbyDrivers} chauffeur{nearbyDrivers > 1 ? 's' : ''} disponible{nearbyDrivers > 1 ? 's' : ''}
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </div>
      <div className="flex-1 bg-white px-4 pt-3 pb-4 overflow-y-auto">
        {step === 'search' && <StepSearch />}
        {step === 'select' && <StepSelect />}
        {step === 'waiting' && <StepWaiting />}
        {step === 'active' && <StepActive />}
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // VERSION DESKTOP (≥ md) — Layout 3 colonnes style Uber
  // ════════════════════════════════════════════════════════════════════════════
  const DesktopView = () => (
    <div className="hidden md:flex w-full overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>

      {/* ── Colonne gauche : Commander une course ── */}
      <div className="w-96 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-y-auto z-10 shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Commander une course</h2>
        </div>

        <div className="p-4 space-y-3 flex-1">
          {/* Champ départ */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
              <div className="w-3 h-3 bg-black rounded-full" />
            </div>
            <Input
              placeholder="Votre position actuelle"
              value={pickup}
              onChange={e => setPickup(e.target.value)}
              onFocus={() => setIsPickupActive(true)}
              onBlur={() => setTimeout(() => { setIsPickupActive(false); setPickupSuggestions([]); }, 200)}
              autoComplete="off"
              className="pl-9 h-11 border-gray-200 bg-gray-50 text-sm"
            />
            {isSearchingPickup && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
            {pickupSuggestions.length > 0 && (
              <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                {pickupSuggestions.map(s => (
                  <button key={s.place_id} onMouseDown={() => { setPickup(s.description); setPickupSuggestions([]); }}
                    className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 text-left">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.structured_formatting.main_text}</p>
                      <p className="text-xs text-gray-400">{s.structured_formatting.secondary_text}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Champ destination */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
              <div className="w-3 h-3 bg-red-600 rounded-sm" />
            </div>
            <Input
              placeholder="Entrez votre destination"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              onFocus={() => setIsDestActive(true)}
              onBlur={() => setTimeout(() => { setIsDestActive(false); setDestSuggestions([]); }, 200)}
              autoComplete="off"
              className="pl-9 h-11 border-gray-200 bg-gray-50 text-sm"
            />
            {isSearchingDest && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
            {destSuggestions.length > 0 && (
              <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                {destSuggestions.map(s => (
                  <button key={s.place_id} onMouseDown={() => { setDestination(s.description); setDestSuggestions([]); }}
                    className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 text-left">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.structured_formatting.main_text}</p>
                      <p className="text-xs text-gray-400">{s.structured_formatting.secondary_text}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Options horaire + passager */}
          <div className="flex gap-2 flex-wrap">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-gray-200 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
              <Clock className="w-3.5 h-3.5" />
              Prise en charge immédiate
              <ChevronRight className="w-3 h-3 text-gray-400" />
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-gray-200 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
              <User className="w-3.5 h-3.5" />
              Pour moi
              <ChevronRight className="w-3 h-3 text-gray-400" />
            </button>
          </div>

          {/* Destinations rapides */}
          {!destination && step === 'search' && (
            <div className="space-y-0.5 pt-1">
              {[
                { label: 'Aéroport YUL', sub: 'Dorval, QC' },
                { label: 'Gare Centrale', sub: 'Montréal, QC' },
                { label: 'Vieux-Montréal', sub: 'Montréal, QC' },
                { label: 'Université McGill', sub: 'Montréal, QC' },
              ].map(place => (
                <button
                  key={place.label}
                  onClick={() => setDestination(`${place.label}, ${place.sub}`)}
                  className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{place.label}</p>
                    <p className="text-xs text-gray-400">{place.sub}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Statut en attente (desktop colonne gauche) */}
          {step === 'waiting' && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <div className="w-9 h-9 flex items-center justify-center">
                  <div className="w-7 h-7 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Recherche en cours…</p>
                  <p className="text-gray-400 text-xs">{selectedServiceData.name} · ${est.price.toFixed(2)} $CA</p>
                </div>
              </div>
              <Button variant="outline" className="w-full h-10 border-red-200 text-red-600 hover:bg-red-50 text-sm" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
            </div>
          )}

          {/* Course active (desktop colonne gauche) */}
          {step === 'active' && activeRide && (
            <div className="pt-2">
              <StepActive />
            </div>
          )}
        </div>
      </div>

      {/* ── Colonne centre : Choisissez une course ── */}
      {(step === 'select' || (step === 'search' && pickup && destination)) && (
        <div className="w-96 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-y-auto z-10">
          <div className="p-6 pb-3">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Choisissez une course</h2>
            <p className="text-sm text-gray-500">Les courses que vous pourriez apprécier</p>
          </div>

          <div className="px-4 space-y-2 flex-1">
            {SERVICE_TYPES.map(service => {
              const e = estimatePrice(service.id);
              const isSelected = selectedService === service.id;
              const etaMin = parseInt(service.eta.split('-')[0]);
              const etaDate = new Date(Date.now() + etaMin * 60000);
              const etaStr = etaDate.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });

              return (
                <button
                  key={service.id}
                  onClick={() => { setSelectedService(service.id); setStep('select'); }}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                    isSelected ? 'border-black bg-white shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200'
                  )}
                >
                  <div className="w-16 h-12 flex-shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 80 50" className="w-full h-full" fill="none">
                      <path d="M10 28 L16 14 L64 14 L70 28 L76 30 L76 40 L4 40 L4 30 Z" fill={isSelected ? '#111' : '#555'} />
                      <path d="M18 14 L20 28 L60 28 L62 14 Z" fill="white" opacity="0.35" />
                      <circle cx="18" cy="42" r="7" fill="#222" stroke="white" strokeWidth="2" />
                      <circle cx="62" cy="42" r="7" fill="#222" stroke="white" strokeWidth="2" />
                      {service.id === 'KULOOC XL' && (
                        <text x="40" y="36" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">XL</text>
                      )}
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="font-bold text-gray-900 text-base">{service.name}</p>
                      <Users className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-xs text-gray-500">{service.capacity}</span>
                    </div>
                    <p className="text-xs text-gray-500">Dans {etaMin} mins · {etaStr}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{service.shortDesc}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900 text-base">{e.price.toFixed(2)} $CA</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-4 border-t border-gray-100 bg-white">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1 px-3 py-2 border border-gray-200 rounded-lg">
                <div className="w-8 h-5 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">V</span>
                </div>
                <span className="text-sm text-gray-700">Visa ••••7673</span>
                <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
              </div>
              <Button
                className="flex-1 h-11 bg-black hover:bg-gray-800 text-white font-semibold rounded-xl text-sm"
                onClick={handleRequestRide}
                disabled={isLoading || !pickup || !destination}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Commander {selectedServiceData.name}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Colonne droite : Carte ── */}
      <div className="flex-1 relative bg-gray-100 h-full">
        {apiKey ? (
          <ClientMapView apiKey={apiKey} drivers={liveDrivers} userPos={userPos} activeRide={activeRide} liveDriverLocation={liveDriverLocation} />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <MapPin className="w-12 h-12 text-red-600" />
          </div>
        )}
        {nearbyDrivers > 0 && (
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow text-xs font-medium text-green-700 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {nearbyDrivers} chauffeur{nearbyDrivers > 1 ? 's' : ''} disponible{nearbyDrivers > 1 ? 's' : ''}
          </div>
        )}
        {pickup && destination && (
          <div className="absolute top-4 right-4 bg-white rounded-xl shadow-lg p-3 max-w-xs">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 bg-black rounded-full flex-shrink-0" />
                <span className="text-gray-700 truncate font-medium">{pickup}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 bg-red-600 rounded-sm flex-shrink-0" />
                <span className="text-gray-700 truncate font-medium">{destination}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // MODALS PARTAGÉS (mobile + desktop)
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <>
      <MobileView />
      <DesktopView />

      {/* Facture post-course */}
      {showInvoice && completedRide && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black">Votre reçu de course</h2>
              <button onClick={() => setShowInvoice(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 text-sm font-mono whitespace-pre-wrap text-gray-700 mb-4">
              {generateInvoiceText({
                id: completedRide.id,
                passengerName: completedRide.passengerName,
                driverName: completedRide.driverName,
                pickup: completedRide.pickup,
                destination: completedRide.destination,
                pricing: completedRide.pricing as any,
                completedAt: (completedRide as any).completedAt,
                actualDurationMin: completedRide.actualDurationMin,
              })}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowInvoice(false); setShowRatingModal(true); }}
                className="flex-[2] py-3 rounded-full bg-red-600 text-white font-black"
              >
                Évaluer le chauffeur
              </button>
              <button
                onClick={() => setShowInvoice(false)}
                className="flex-1 py-3 rounded-full border-2 border-gray-200 font-semibold text-gray-600"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'évaluation */}
      {showRatingModal && completedRide && user && (
        <RatingModal
          rideId={completedRide.id}
          raterId={user.uid}
          raterName={user.displayName || user.email || 'Passager'}
          raterRole="passenger"
          targetId={completedRide.driverId}
          targetName={completedRide.driverName}
          onClose={() => setShowRatingModal(false)}
        />
      )}
    </>
  );
}
