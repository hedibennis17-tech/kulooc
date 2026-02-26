'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, SlidersHorizontal, TrendingUp, Plane, MapPin, Navigation, Star, Phone, ChevronUp, ChevronDown, X, Volume2, ArrowUp, ArrowLeft, ArrowRight, CornerUpLeft, CornerUpRight, RotateCcw, Home, DollarSign, Mail, Menu } from 'lucide-react';
import { useUser } from '@/firebase/provider';
import { useDriver } from '@/lib/firestore/use-driver';
import { useDriverOffer } from '@/lib/firestore/use-driver-offer';
import { getDispatchEngine } from '@/lib/dispatch/dispatch-engine';
import { db } from '@/firebase';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { RideSummary } from '@/components/kulooc/ride-summary';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(seconds % 60).padStart(2, '0')}s`;
}

function formatMoney(amount: number): string {
  return amount.toFixed(2) + ' $';
}

// In-app route directions state (rendered on the embedded map)
interface DirectionsState {
  route: google.maps.DirectionsResult | null;
  steps: google.maps.DirectionsStep[];
  currentStepIndex: number;
  totalDistanceM: number;
  totalDurationS: number;
  isActive: boolean;
}

// Render directions polyline on the Google Map using vis.gl useMap
function DirectionsRendererComponent({ route }: { route: google.maps.DirectionsResult }) {
  const map = useMap();
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  useEffect(() => {
    if (!map || !route) return;

    if (!rendererRef.current) {
      rendererRef.current = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#DC2626', // Red route
          strokeWeight: 5,
          strokeOpacity: 0.9,
        },
      });
    }
    rendererRef.current.setMap(map);
    rendererRef.current.setDirections(route);

    return () => {
      if (rendererRef.current) {
        rendererRef.current.setMap(null);
      }
    };
  }, [map, route]);

  return null;
}

// Parse maneuver to icon
function getStepIcon(maneuver?: string) {
  if (!maneuver) return <ArrowUp className="w-7 h-7 text-white" />;
  if (maneuver.includes('left') && maneuver.includes('turn')) return <CornerUpLeft className="w-7 h-7 text-white" />;
  if (maneuver.includes('right') && maneuver.includes('turn')) return <CornerUpRight className="w-7 h-7 text-white" />;
  if (maneuver.includes('uturn') || maneuver.includes('u-turn')) return <RotateCcw className="w-7 h-7 text-white" />;
  if (maneuver.includes('left')) return <ArrowLeft className="w-7 h-7 text-white" />;
  if (maneuver.includes('right')) return <ArrowRight className="w-7 h-7 text-white" />;
  return <ArrowUp className="w-7 h-7 text-white" />;
}

// Strip HTML tags from directions instructions
function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '');
}

// Turn-by-Turn Navigation Bar matching the design from image 1
function NavigationBar({
  destination,
  distanceKm,
  durationMin,
  steps,
  currentStepIndex,
  onHide,
  isVisible
}: {
  destination: string;
  distanceKm?: number;
  durationMin?: number;
  steps: google.maps.DirectionsStep[];
  currentStepIndex: number;
  onHide: () => void;
  isVisible: boolean;
}) {
  if (!isVisible) return null;

  const currentStep = steps[currentStepIndex];
  const instruction = currentStep ? stripHtml(currentStep.instructions) : 'Continuez tout droit';
  const stepDistance = currentStep?.distance?.text || '';
  const maneuver = currentStep?.maneuver;

  return (
    <div className="absolute top-0 left-0 right-0 z-30">
      {/* Main instruction card -- dark semi-transparent */}
      <div className="mx-3 mt-10 rounded-2xl bg-gray-900/95 backdrop-blur text-white p-4 shadow-2xl">
        <div className="flex items-start gap-4">
          {/* Direction arrow in a red square */}
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-red-600 flex items-center justify-center">
            {getStepIcon(maneuver)}
          </div>
          {/* Instruction text */}
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-black leading-tight">{stepDistance || '--'}</p>
            <p className="text-sm text-white/80 mt-1 leading-snug">{instruction}</p>
          </div>
          {/* Audio button */}
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0 mt-1">
            <Volume2 className="w-5 h-5 text-white/60" />
          </button>
        </div>
      </div>

      {/* ETA bar -- below the instruction card */}
      <div className="mx-3 mt-2 rounded-xl bg-red-700 text-white px-4 py-2.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-lg font-black">
            {durationMin ? `${Math.round(durationMin)} min` : '--'}
          </span>
          <span className="text-white/50">|</span>
          <span className="text-sm text-white/70 font-semibold">
            {distanceKm ? `${distanceKm.toFixed(1)} km` : '--'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm text-white/80 font-medium truncate max-w-[140px]">{destination}</p>
          <button
            onClick={onHide}
            className="p-1 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
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

      </div>

      {/* Bottom nav */}
      <BottomNav />
    </div>
  );
}

function BottomNav() {
  const items = [
    { label: 'Accueil', Icon: Home, active: true },
    { label: 'Revenus', Icon: DollarSign, active: false },
    { label: 'Boite de recep.', Icon: Mail, active: false },
    { label: 'Menu', Icon: Menu, active: false },
  ];
  return (
    <nav className="bg-white border-t border-gray-100">
      <div className="grid grid-cols-4 h-16">
        {items.map((item) => (
          <button
            key={item.label}
            className={cn(
              'flex flex-col items-center justify-center gap-1 relative',
              item.active ? 'text-gray-900' : 'text-gray-400'
            )}
          >
            <div className="relative">
              <item.Icon className="w-5 h-5" />
              {item.active && (
                <div className="absolute -top-0.5 -right-1.5 w-2 h-2 rounded-full bg-green-500" />
              )}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
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
  const [completedRideData, setCompletedRideData] = useState<any>(null);
  const rideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [directions, setDirections] = useState<DirectionsState>({
    route: null, steps: [], currentStepIndex: 0,
    totalDistanceM: 0, totalDurationS: 0, isActive: false,
  });
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const {
    isOnline, activeRide, isLoading, onlineDuration, earningsToday, ridesCompleted,
    currentLocation, goOnline, goOffline, arrivedAtPickup, startRide, completeRide,
  } = useDriver();

  const {
    currentOffer, countdown, isResponding, acceptOffer, declineOffer,
  } = useDriverOffer(currentLocation);

  // Start the dispatch engine from the driver page so it processes incoming ride_requests
  useEffect(() => {
    if (!user?.uid) return;
    const engine = getDispatchEngine(db);
    engine.start();
    return () => {
      // Don't stop the engine on unmount - it's a singleton and should keep running
    };
  }, [user?.uid]);

  // Show nav bar when ride starts, clear directions when ride ends
  useEffect(() => {
    if (activeRide) {
      setNavBarVisible(true);
      setPanelCollapsed(false);
    } else {
      // Reset directions when no active ride
      setDirections({ route: null, steps: [], currentStepIndex: 0, totalDistanceM: 0, totalDurationS: 0, isActive: false });
    }
  }, [activeRide?.id]);

  useEffect(() => {
    if (!userLoading && !user) router.push('/driver/auth');
  }, [user, userLoading, router]);

  // Wrap completeRide to capture ride data for the summary/rating screen
  const handleCompleteRide = async () => {
    if (activeRide) {
      // Capture ride data BEFORE completing (which deletes active_rides doc)
      setCompletedRideData({
        id: activeRide.id,
        passengerId: activeRide.passengerId,
        passengerName: activeRide.passengerName,
        driverId: user?.uid,
        driverName: activeRide.driverName || user?.displayName || 'Chauffeur',
        pickup: activeRide.pickup,
        destination: activeRide.destination,
        pricing: activeRide.pricing || {
          base: 3.5, perKmCharge: 0, perMinCharge: 0,
          distanceKm: activeRide.estimatedDistanceKm || 5,
          durationMin: activeRide.estimatedDurationMin || 10,
          surgeMultiplier: 1, subtotal: 0, subtotalWithSurge: 0,
          tps: 0, tvq: 0, total: activeRide.estimatedPrice || 0,
          driverEarnings: (activeRide.estimatedPrice || 0) * 0.7,
        },
        actualDurationMin: activeRide.actualDurationMin,
      });
    }
    await completeRide();
  };

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

  // Fetch directions from Google Maps Directions API (in-app, not external)
  // Retries if google.maps is not yet loaded (script may still be loading)
  const fetchDirections = useCallback((
    origin: { lat: number; lng: number },
    dest: { lat: number; lng: number },
    retryCount = 0
  ) => {
    if (!window.google?.maps) {
      // Retry up to 10 times (5 seconds total) waiting for Maps to load
      if (retryCount < 10) {
        setTimeout(() => fetchDirections(origin, dest, retryCount + 1), 500);
      }
      return;
    }
    if (!directionsServiceRef.current) {
      directionsServiceRef.current = new google.maps.DirectionsService();
    }
    directionsServiceRef.current.route(
      {
        origin: new google.maps.LatLng(origin.lat, origin.lng),
        destination: new google.maps.LatLng(dest.lat, dest.lng),
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          const leg = result.routes[0]?.legs[0];
          setDirections({
            route: result,
            steps: leg?.steps || [],
            currentStepIndex: 0,
            totalDistanceM: leg?.distance?.value || 0,
            totalDurationS: leg?.duration?.value || 0,
            isActive: true,
          });
          setNavBarVisible(true);
        }
      }
    );
  }, []);

  // Auto-fetch directions when active ride changes
  useEffect(() => {
    if (!activeRide || !currentLocation) return;
    const target = activeRide.status === 'in-progress' ? activeRide.destination : activeRide.pickup;
    if (target?.latitude && target?.longitude) {
      fetchDirections(
        { lat: currentLocation.latitude, lng: currentLocation.longitude },
        { lat: target.latitude, lng: target.longitude }
      );
    }
  }, [activeRide?.id, activeRide?.status, currentLocation?.latitude, currentLocation?.longitude, fetchDirections]);

  // Update current step based on driver location
  useEffect(() => {
    if (!directions.isActive || !currentLocation || directions.steps.length === 0) return;

    const driverLat = currentLocation.latitude;
    const driverLng = currentLocation.longitude;

    // Find the closest step to the driver's current position
    let closestIdx = directions.currentStepIndex;
    let minDist = Infinity;

    for (let i = directions.currentStepIndex; i < directions.steps.length; i++) {
      const step = directions.steps[i];
      const endLat = step.end_location.lat();
      const endLng = step.end_location.lng();
      const dist = Math.sqrt(Math.pow(driverLat - endLat, 2) + Math.pow(driverLng - endLng, 2));
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    }

    // If driver has passed the current step endpoint (within ~50m), advance
    if (closestIdx > directions.currentStepIndex) {
      setDirections(prev => ({ ...prev, currentStepIndex: closestIdx }));
    }
  }, [currentLocation, directions.isActive, directions.steps, directions.currentStepIndex]);

  const handleNavigate = () => {
    if (!currentLocation || !activeRide) return;
    const target = activeRide.status === 'in-progress' ? activeRide.destination : activeRide.pickup;
    if (target?.latitude && target?.longitude) {
      fetchDirections(
        { lat: currentLocation.latitude, lng: currentLocation.longitude },
        { lat: target.latitude, lng: target.longitude }
      );
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
              {/* Driver position - Gray compass/triangle icon (Uber-style) */}
              {currentLocation && (
                <AdvancedMarker
                  position={{ lat: currentLocation.latitude, lng: currentLocation.longitude }}
                  title="Votre position"
                >
                  <div className="relative flex items-center justify-center">
                    {/* Outer ring - subtle pulse */}
                    <div className="absolute w-14 h-14 rounded-full bg-gray-400/15 animate-pulse" />
                    {/* Gray circle with triangle compass */}
                    <div className="w-10 h-10 rounded-full bg-gray-700 border-[3px] border-white shadow-xl flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 18 18">
                        <polygon
                          points="9,1 16,15 9,11 2,15"
                          fill="white"
                        />
                      </svg>
                    </div>
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

              {/* In-app directions route (red polyline) */}
              {directions.route && <DirectionsRendererComponent route={directions.route} />}
            </Map>
          </APIProvider>
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Carte non disponible</p>
          </div>
        )}
      </div>

      {/* Turn-by-turn Navigation Bar (on active ride, with real directions) */}
      {activeRide && navBarVisible && (
        <NavigationBar
          destination={
            activeRide.status === 'in-progress'
              ? (activeRide.destination?.address || 'Destination')
              : (activeRide.pickup?.address || 'Point de prise en charge')
          }
          distanceKm={directions.totalDistanceM > 0 ? directions.totalDistanceM / 1000 : (activeRide.estimatedDistanceKm || activeRide.pricing?.distanceKm)}
          durationMin={directions.totalDurationS > 0 ? directions.totalDurationS / 60 : (activeRide.estimatedDurationMin || activeRide.pricing?.durationMin)}
          steps={directions.steps}
          currentStepIndex={directions.currentStepIndex}
          onHide={() => setNavBarVisible(false)}
          isVisible={true}
        />
      )}

      {/* DirectionsRenderer is rendered inside Map component below */}

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

      {/* GPS active block - overlaid on the map above the info panel (Uber-style) */}
      {activeRide && isOnline && (
        <div className="absolute bottom-[260px] left-0 right-0 z-[15] flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-5 py-2.5 shadow-lg flex items-center gap-3 pointer-events-auto">
            {/* Gray compass triangle icon */}
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14">
                <polygon points="7,1 12,12 7,9 2,12" fill="white" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-800">GPS actif</span>
              <span className="text-[10px] text-gray-500">Navigation en cours</span>
            </div>
            {directions.isActive && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-1" />
            )}
          </div>
        </div>
      )}

      {/* Active ride panel (compact, not full sheet) */}
      {activeRide && (
        <RideInfoPanel
          activeRide={activeRide}
          rideTimer={rideTimer}
          onArrive={arrivedAtPickup}
          onStartRide={startRide}
          onCompleteRide={handleCompleteRide}
          onNavigate={handleNavigate}
          isCollapsed={panelCollapsed}
          onToggleCollapse={() => setPanelCollapsed(!panelCollapsed)}
        />
      )}

      {/* Post-ride Summary / Rating modal */}
      {completedRideData && !activeRide && (
        <RideSummary
          rideId={completedRideData.id}
          passengerId={completedRideData.passengerId}
          passengerName={completedRideData.passengerName}
          driverId={completedRideData.driverId}
          driverName={completedRideData.driverName}
          pickup={completedRideData.pickup}
          destination={completedRideData.destination}
          pricing={completedRideData.pricing}
          actualDurationMin={completedRideData.actualDurationMin}
          userRole="driver"
          onClose={() => setCompletedRideData(null)}
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
