'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, SlidersHorizontal, TrendingUp, Plane, MapPin, Navigation, Star, Phone, ChevronUp, ChevronDown, X, Volume2, ArrowUp, ArrowLeft, ArrowRight, CornerUpLeft, CornerUpRight, RotateCcw } from 'lucide-react';
import { useUser } from '@/firebase/provider';
import { useDriver } from '@/lib/firestore/use-driver';
import { useDriverOffer } from '@/lib/firestore/use-driver-offer';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(seconds % 60).padStart(2, '0')}s`;
}

function formatMoney(amount: number): string {
  return amount.toFixed(2) + ' $';
}

function openNavigation(latitude: number, longitude: number, address?: string) {
  const encoded = address ? encodeURIComponent(address) : `${latitude},${longitude}`;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=driving`;
  window.open(url, '_blank');
}

// Compact Turn-by-Turn Navigation Bar (Uber-inspired)
function NavigationBar({ 
  destination, 
  distanceKm, 
  durationMin, 
  onHide, 
  isVisible 
}: { 
  destination: string; 
  distanceKm?: number; 
  durationMin?: number; 
  onHide: () => void; 
  isVisible: boolean;
}) {
  if (!isVisible) return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-30">
      {/* Compact nav instruction bar - dark with red accent */}
      <div className="bg-red-700 text-white px-4 pt-10 pb-3">
        <div className="flex items-center gap-3">
          {/* Direction icon */}
          <div className="flex-shrink-0">
            <ArrowUp className="w-8 h-8 text-white" />
          </div>
          {/* Instruction */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">
              Continuez tout droit
            </p>
            <p className="text-white/70 text-xs">200 m</p>
          </div>
          {/* Audio button */}
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0">
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ETA bar */}
      <div className="bg-red-800 text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-bold text-sm">
            {durationMin ? `${Math.round(durationMin)} min` : '--'}
          </span>
          <span className="text-white/60 text-xs">
            {distanceKm ? `${distanceKm.toFixed(1)} km` : '--'}
          </span>
        </div>
        <p className="text-xs text-white/80 truncate max-w-[50%] text-right">{destination}</p>
        <button
          onClick={onHide}
          className="ml-2 p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
          title="Masquer la navigation"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// Compact ride info panel at the bottom (not a full Sheet)
function RideInfoPanel({
  activeRide,
  rideTimer,
  onArrive,
  onStartRide,
  onCompleteRide,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
}: {
  activeRide: any;
  rideTimer: number;
  onArrive: () => void;
  onStartRide: () => void;
  onCompleteRide: () => void;
  onNavigate: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const price = activeRide.estimatedPrice || activeRide.pricing?.total || 0;
  const distance = activeRide.estimatedDistanceKm || activeRide.pricing?.distanceKm || 0;
  const duration = activeRide.estimatedDurationMin || activeRide.pricing?.durationMin || 0;
  const driverEarnings = price * 0.70;
  const statusLabel = activeRide.status === 'driver-assigned' ? 'En route vers le passager'
    : activeRide.status === 'driver-arrived' ? 'Arrive au point de prise en charge'
    : activeRide.status === 'in-progress' ? 'Course en cours'
    : 'Course';

  if (isCollapsed) {
    return (
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <button
          onClick={onToggleCollapse}
          className="w-full bg-red-700 text-white py-3 px-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4" />
            <span className="text-sm font-bold">{statusLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{formatMoney(price)}</span>
            <ChevronUp className="w-4 h-4" />
          </div>
        </button>
        {/* Bottom nav */}
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20">
      <div className="bg-white rounded-t-2xl shadow-2xl">
        {/* Handle + collapse button */}
        <div className="flex items-center justify-center pt-2 pb-1">
          <button onClick={onToggleCollapse} className="p-1">
            <ChevronDown className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        {/* Status */}
        <div className="px-4 pb-2 flex items-center gap-2">
          <div className={cn(
            'w-2 h-2 rounded-full',
            activeRide.status === 'in-progress' ? 'bg-green-500 animate-pulse' : 'bg-red-600'
          )} />
          <span className="text-sm font-semibold text-gray-900">{statusLabel}</span>
          <span className="text-xs text-gray-400 ml-auto">{activeRide.passengerName}</span>
        </div>

        {/* Fare + destination info */}
        <div className="px-4 pb-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Tarif</p>
            <p className="text-2xl font-black text-gray-900">{formatMoney(price)}</p>
            <p className="text-xs text-green-600 font-semibold">Votre gain: {formatMoney(driverEarnings)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Destination</p>
            <p className="text-sm font-semibold text-gray-900 max-w-[180px] truncate">
              {activeRide.destination?.address || 'Destination'}
            </p>
            <p className="text-xs text-gray-400">
              {distance > 0 ? `${distance.toFixed(1)} km` : ''}{duration > 0 ? ` - ${Math.round(duration)} min` : ''}
            </p>
          </div>
        </div>

        {/* In-progress timer */}
        {activeRide.status === 'in-progress' && rideTimer > 0 && (
          <div className="px-4 pb-2">
            <div className="bg-green-50 rounded-lg px-3 py-1.5 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-bold text-green-700">{formatDuration(rideTimer)}</span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-4 pb-4">
          {activeRide.status === 'driver-assigned' && (
            <div className="flex gap-2">
              <button
                onClick={onNavigate}
                className="flex-shrink-0 w-14 h-14 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-lg"
              >
                <Navigation className="w-6 h-6" />
              </button>
              <button
                onClick={onArrive}
                className="flex-1 h-14 rounded-xl bg-black text-white font-bold text-base shadow-lg flex items-center justify-center gap-2"
              >
                <MapPin className="w-5 h-5" /> Je suis arrive
              </button>
            </div>
          )}
          {activeRide.status === 'driver-arrived' && (
            <button
              onClick={onStartRide}
              className="w-full h-14 rounded-xl bg-red-600 text-white font-bold text-base shadow-lg flex items-center justify-center gap-2"
            >
              <Navigation className="w-5 h-5" /> Demarrer la course
            </button>
          )}
          {activeRide.status === 'in-progress' && (
            <div className="flex gap-2">
              <button
                onClick={onNavigate}
                className="flex-shrink-0 w-14 h-14 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-lg"
              >
                <Navigation className="w-6 h-6" />
              </button>
              <button
                onClick={onCompleteRide}
                className="flex-1 h-14 rounded-xl bg-green-600 text-white font-bold text-base shadow-lg flex items-center justify-center gap-2"
              >
                <Star className="w-5 h-5" /> Terminer la course
              </button>
            </div>
          )}
        </div>

        {/* GPS active indicator */}
        <div className="bg-red-50 px-4 py-2 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
          <span className="text-xs text-red-700 font-medium">GPS actif -- Navigation en cours</span>
        </div>
      </div>

      {/* Bottom nav */}
      <BottomNav />
    </div>
  );
}

function BottomNav() {
  return (
    <nav className="bg-white border-t border-gray-100">
      <div className="grid grid-cols-4 h-14">
        {[
          { label: 'Accueil', icon: '/' , active: true },
          { label: 'Revenus', icon: '$' },
          { label: 'Boite de recep.', icon: 'M' },
          { label: 'Menu', icon: '=' },
        ].map((item, i) => (
          <button
            key={i}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5',
              item.active ? 'text-red-600' : 'text-gray-400'
            )}
          >
            <span className="text-xs font-bold">{item.icon}</span>
            <span className="text-[9px]">{item.label}</span>
            {item.active && <div className="w-1 h-1 rounded-full bg-green-500 absolute top-1" />}
          </button>
        ))}
      </div>
    </nav>
  );
}

export default function DriverHomePage() {
  const { user, isUserLoading: userLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [showPreferences, setShowPreferences] = useState(false);
  const [rideTimer, setRideTimer] = useState(0);
  const [navBarVisible, setNavBarVisible] = useState(true);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const rideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const {
    isOnline, activeRide, isLoading, onlineDuration, earningsToday, ridesCompleted,
    currentLocation, goOnline, goOffline, arrivedAtPickup, startRide, completeRide,
  } = useDriver();

  const {
    currentOffer, countdown, isResponding, acceptOffer, declineOffer,
  } = useDriverOffer(currentLocation ?? null);

  // Ride timer
  useEffect(() => {
    if (activeRide?.status === 'in-progress') {
      if (!rideTimerRef.current) {
        rideTimerRef.current = setInterval(() => setRideTimer(p => p + 1), 1000);
      }
    } else {
      if (rideTimerRef.current) { clearInterval(rideTimerRef.current); rideTimerRef.current = null; }
      setRideTimer(0);
    }
    return () => { if (rideTimerRef.current) clearInterval(rideTimerRef.current); };
  }, [activeRide?.status]);

  // Show nav bar when ride starts
  useEffect(() => {
    if (activeRide) {
      setNavBarVisible(true);
      setPanelCollapsed(false);
    }
  }, [activeRide?.id]);

  useEffect(() => {
    if (!userLoading && !user) router.push('/driver/auth');
  }, [user, userLoading, router]);

  const handleToggleOnline = async () => {
    if (isOnline) { await goOffline(); toast({ title: 'Vous etes hors ligne.' }); }
    else { await goOnline(); toast({ title: 'En ligne !', description: 'En attente de courses...' }); }
  };

  const handleAcceptOffer = async () => {
    await acceptOffer();
    toast({ title: 'Course acceptee !', description: 'En route vers le passager.' });
  };

  const handleDeclineOffer = async () => {
    await declineOffer();
    toast({ title: 'Course refusee.' });
  };

  const handleNavigate = () => {
    const target = activeRide?.status === 'in-progress' ? activeRide?.destination : activeRide?.pickup;
    if (target?.latitude && target?.longitude) {
      openNavigation(target.latitude, target.longitude, target.address);
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      {/* GPS Map */}
      <div className="absolute inset-0">
        {apiKey ? (
          <APIProvider apiKey={apiKey}>
            <Map
              defaultCenter={currentLocation
                ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
                : { lat: 45.5631, lng: -73.7124 }}
              defaultZoom={16}
              mapId="a22506a8155b4369"
              disableDefaultUI={true}
              gestureHandling="greedy"
              className="w-full h-full"
            >
              {/* Driver position - Red triangle for navigation */}
              {currentLocation && (
                <AdvancedMarker
                  position={{ lat: currentLocation.latitude, lng: currentLocation.longitude }}
                  title="Votre position"
                >
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-12 h-12 rounded-full bg-red-500/20 animate-ping" />
                    {/* Navigation triangle */}
                    <svg width="28" height="28" viewBox="0 0 28 28" className="drop-shadow-lg">
                      <polygon
                        points="14,2 24,24 14,18 4,24"
                        fill="#DC2626"
                        stroke="white"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                </AdvancedMarker>
              )}

              {/* Pickup marker */}
              {activeRide && activeRide.status === 'driver-assigned' && activeRide.pickup && (
                <AdvancedMarker
                  position={{ lat: activeRide.pickup.latitude, lng: activeRide.pickup.longitude }}
                  title="Prise en charge"
                >
                  <div className="w-8 h-8 bg-red-600 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                </AdvancedMarker>
              )}

              {/* Destination marker */}
              {activeRide && activeRide.status === 'in-progress' && activeRide.destination && (
                <AdvancedMarker
                  position={{ lat: activeRide.destination.latitude, lng: activeRide.destination.longitude }}
                  title="Destination"
                >
                  <div className="w-8 h-8 bg-red-800 rounded-sm border-2 border-white shadow-lg flex items-center justify-center">
                    <Star className="w-4 h-4 text-white" />
                  </div>
                </AdvancedMarker>
              )}
            </Map>
          </APIProvider>
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Carte non disponible</p>
          </div>
        )}
      </div>

      {/* Turn-by-turn Navigation Bar (on active ride) */}
      {activeRide && (
        <NavigationBar
          destination={
            activeRide.status === 'in-progress'
              ? (activeRide.destination?.address || 'Destination')
              : (activeRide.pickup?.address || 'Point de prise en charge')
          }
          distanceKm={activeRide.estimatedDistanceKm || activeRide.pricing?.distanceKm}
          durationMin={activeRide.estimatedDurationMin || activeRide.pricing?.durationMin}
          onHide={() => setNavBarVisible(false)}
          isVisible={navBarVisible}
        />
      )}

      {/* Show nav bar button when hidden */}
      {activeRide && !navBarVisible && (
        <button
          onClick={() => setNavBarVisible(true)}
          className="absolute top-12 right-4 z-20 bg-red-600 text-white px-3 py-2 rounded-full shadow-lg flex items-center gap-1.5 text-xs font-bold"
        >
          <Navigation className="w-3.5 h-3.5" /> Nav
        </button>
      )}

      {/* Header (when no active ride) */}
      {!activeRide && (
        <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between">
          <div className="bg-white rounded-full px-4 py-2 shadow-md">
            <span className="text-xl font-black tracking-tighter text-red-600">KULOOC</span>
          </div>
          <div className="flex gap-2">
            <button className="bg-white rounded-full p-3 shadow-md">
              <Shield className="h-5 w-5 text-gray-700" />
            </button>
            <button className="bg-white rounded-full p-3 shadow-md" onClick={() => setShowPreferences(true)}>
              <SlidersHorizontal className="h-5 w-5 text-gray-700" />
            </button>
          </div>
        </div>
      )}

      {/* Stats when online */}
      {isOnline && !activeRide && !currentOffer && (
        <div className="absolute top-20 left-4 right-4 z-10">
          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-lg p-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-black text-green-600">{formatMoney(earningsToday)}</p>
                <p className="text-xs text-gray-500">Gains du jour</p>
              </div>
              <div>
                <p className="text-2xl font-black">{ridesCompleted}</p>
                <p className="text-xs text-gray-500">Courses</p>
              </div>
              <div>
                <p className="text-2xl font-black text-blue-600">{formatDuration(onlineDuration)}</p>
                <p className="text-xs text-gray-500">En ligne</p>
              </div>
            </div>
            <p className="text-center text-sm text-gray-500 mt-3 animate-pulse">En attente d'une course...</p>
          </div>
        </div>
      )}

      {/* Offline info */}
      {!isOnline && (
        <div className="absolute top-20 left-4 right-4 z-10 space-y-3">
          <div className="bg-white rounded-2xl shadow-lg p-4">
            <h2 className="text-2xl font-black text-black mb-2">Pret a conduire ?</h2>
            <p className="text-sm text-gray-500">Appuyez sur <strong>Passer en ligne</strong> pour recevoir des courses.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-4">
            <div className="flex items-center gap-2 mb-2">
              <Plane className="h-4 w-4 text-gray-600" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Occasion</span>
            </div>
            <h3 className="font-black text-base">Heures de forte affluence pour les vols a YUL</h3>
            <p className="text-xs text-gray-500 mt-1">Vols entre 15h - 18h demain</p>
          </div>
        </div>
      )}

      {/* Online/Offline toggle */}
      {!activeRide && !currentOffer && (
        <div className="absolute bottom-24 left-4 right-4 z-10">
          <button
            onClick={handleToggleOnline}
            disabled={isLoading}
            className={cn(
              'w-full py-4 rounded-full text-white font-bold text-lg shadow-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50',
              isOnline ? 'bg-black hover:bg-gray-900' : 'bg-red-600 hover:bg-red-700'
            )}
          >
            <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-white" />
            </div>
            {isLoading ? 'Chargement...' : isOnline ? 'Passer hors ligne' : 'Passer en ligne'}
          </button>
        </div>
      )}

      {/* Offer sheet */}
      {currentOffer && !activeRide && (
        <Sheet open={true} onOpenChange={() => {}}>
          <SheetContent side="bottom" className="rounded-t-3xl p-0 z-50">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <SheetTitle className="text-xl font-black">Nouvelle course !</SheetTitle>
                <div className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center border-4 font-black text-xl',
                  countdown > 20 ? 'border-green-500 text-green-600' :
                  countdown > 10 ? 'border-orange-500 text-orange-600' :
                  'border-red-600 text-red-600 animate-pulse'
                )}>
                  {countdown}
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between mb-4">
                <div>
                  <p className="text-3xl font-black text-green-600">{formatMoney(currentOffer.estimatedPrice)}</p>
                  <p className="text-sm text-gray-500">
                    {currentOffer.estimatedDistanceKm?.toFixed(1)} km - ~{currentOffer.estimatedDurationMin} min
                  </p>
                </div>
                <span className="text-sm font-bold bg-red-100 text-red-700 px-3 py-1 rounded-full">
                  {currentOffer.serviceType || 'KULOOC X'}
                </span>
              </div>

              <div className="flex items-center gap-3 mb-4 p-3 bg-red-50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">
                  {currentOffer.passengerName?.charAt(0).toUpperCase() || 'P'}
                </div>
                <div>
                  <p className="font-bold">{currentOffer.passengerName}</p>
                  <p className="text-xs text-gray-500">Passager</p>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Prise en charge</p>
                    <p className="font-semibold text-sm">{currentOffer.pickup?.address}</p>
                  </div>
                </div>
                <div className="w-px h-4 bg-gray-300 ml-1.5" />
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-sm bg-red-800 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Destination</p>
                    <p className="font-semibold text-sm">{currentOffer.destination?.address}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDeclineOffer}
                  disabled={isResponding}
                  className="flex-1 py-4 rounded-full border-2 border-gray-200 font-bold text-gray-700 text-lg"
                >
                  Refuser
                </button>
                <button
                  onClick={handleAcceptOffer}
                  disabled={isResponding}
                  className="flex-[2] py-4 rounded-full bg-red-600 text-white font-black text-lg shadow-lg"
                >
                  {isResponding ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    </span>
                  ) : 'Accepter'}
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Active ride panel (compact, not full sheet) */}
      {activeRide && (
        <RideInfoPanel
          activeRide={activeRide}
          rideTimer={rideTimer}
          onArrive={arrivedAtPickup}
          onStartRide={startRide}
          onCompleteRide={completeRide}
          onNavigate={handleNavigate}
          isCollapsed={panelCollapsed}
          onToggleCollapse={() => setPanelCollapsed(!panelCollapsed)}
        />
      )}

      {/* Preferences sheet */}
      <Sheet open={showPreferences} onOpenChange={setShowPreferences}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="text-xl font-black">Preferences de conduite</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {['Eviter les autoroutes', 'Accepter les animaux', 'Courses longues uniquement', 'Aeroport YUL'].map(pref => (
              <label key={pref} className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="font-medium text-gray-800">{pref}</span>
                <input type="checkbox" className="w-5 h-5 accent-red-600" />
              </label>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
