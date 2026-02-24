'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { Navigation, Volume2, VolumeX, Compass, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface LatLng {
  lat: number;
  lng: number;
}

interface NavigationStep {
  instruction: string;
  distance: string;
  duration: string;
  maneuver?: string;
}

interface NavigationMapProps {
  origin: LatLng;
  destination: LatLng;
  destinationLabel?: string;
  onArrived?: () => void;
  mode?: 'to-pickup' | 'to-destination';
}

// ─── Composant interne qui utilise useMap ───────────────────────────────────
function NavigationRenderer({
  origin,
  destination,
  destinationLabel,
  onArrived,
  mode,
}: NavigationMapProps) {
  const map = useMap();
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [steps, setSteps] = useState<NavigationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [totalDistance, setTotalDistance] = useState('');
  const [totalDuration, setTotalDuration] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [heading, setHeading] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastSpokenRef = useRef('');

  // Synthèse vocale
  const speak = useCallback((text: string) => {
    if (!voiceEnabled || lastSpokenRef.current === text) return;
    lastSpokenRef.current = text;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-CA';
      utterance.rate = 0.95;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    }
  }, [voiceEnabled]);

  // Calculer l'itinéraire via Directions API
  useEffect(() => {
    if (!map || !origin || !destination) return;

    const directionsService = new google.maps.DirectionsService();

    // Supprimer l'ancien renderer
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }

    const renderer = new google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: mode === 'to-pickup' ? '#3B82F6' : '#EF4444',
        strokeWeight: 6,
        strokeOpacity: 0.9,
      },
    });
    renderer.setMap(map);
    directionsRendererRef.current = renderer;

    directionsService.route(
      {
        origin: new google.maps.LatLng(origin.lat, origin.lng),
        destination: new google.maps.LatLng(destination.lat, destination.lng),
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: google.maps.TrafficModel.BEST_GUESS,
        },
      },
      (result, status) => {
        if (status === 'OK' && result) {
          renderer.setDirections(result);
          const leg = result.routes[0]?.legs[0];
          if (leg) {
            setTotalDistance(leg.distance?.text || '');
            setTotalDuration(leg.duration_in_traffic?.text || leg.duration?.text || '');
            const parsedSteps: NavigationStep[] = leg.steps.map((s) => ({
              instruction: s.instructions.replace(/<[^>]*>/g, ''),
              distance: s.distance?.text || '',
              duration: s.duration?.text || '',
              maneuver: s.maneuver || '',
            }));
            setSteps(parsedSteps);
            setCurrentStepIndex(0);
            if (parsedSteps[0]) speak(parsedSteps[0].instruction);
          }
          // Centrer la carte sur l'itinéraire
          const bounds = result.routes[0]?.bounds;
          if (bounds) map.fitBounds(bounds, { top: 80, bottom: 200, left: 20, right: 20 });
        }
      }
    );

    return () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
    };
  }, [map, origin.lat, origin.lng, destination.lat, destination.lng, mode, speak]);

  // Suivi GPS en temps réel + boussole
  useEffect(() => {
    if (!map) return;

    // Boussole via DeviceOrientationEvent
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const alpha = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading ?? e.alpha;
      if (alpha !== null) setHeading(Math.round(alpha));
    };
    window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
    window.addEventListener('deviceorientation', handleOrientation as EventListener, true);

    // Suivi position GPS
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          map.panTo(current);

          // Vérifier si on est arrivé (< 50m de la destination)
          const dist = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(current.lat, current.lng),
            new google.maps.LatLng(destination.lat, destination.lng)
          );
          if (dist < 50 && onArrived) {
            speak('Vous êtes arrivé à destination');
            onArrived();
          }
        },
        null,
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
      );
    }

    setIsNavigating(true);

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
      window.removeEventListener('deviceorientation', handleOrientation as EventListener, true);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [map, destination.lat, destination.lng, onArrived, speak]);

  // Icône de manœuvre
  const getManeuverIcon = (maneuver: string) => {
    if (maneuver.includes('left')) return '↰';
    if (maneuver.includes('right')) return '↱';
    if (maneuver.includes('uturn')) return '↩';
    if (maneuver.includes('roundabout')) return '↻';
    return '↑';
  };

  const currentStep = steps[currentStepIndex];
  const nextStep = steps[currentStepIndex + 1];

  return (
    <>
      {/* Marqueur position chauffeur */}
      <AdvancedMarker position={origin}>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shadow-xl border-2 border-white"
          style={{
            background: mode === 'to-pickup' ? '#3B82F6' : '#EF4444',
            transform: `rotate(${heading}deg)`,
            transition: 'transform 0.3s ease',
          }}
        >
          <Navigation size={18} className="text-white" fill="white" />
        </div>
      </AdvancedMarker>

      {/* Marqueur destination */}
      <AdvancedMarker position={destination}>
        <div className="flex flex-col items-center">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-xl border-2 border-white text-white font-black text-xs"
            style={{ background: mode === 'to-pickup' ? '#3B82F6' : '#EF4444' }}
          >
            {mode === 'to-pickup' ? '👤' : '🏁'}
          </div>
          {destinationLabel && (
            <div className="mt-1 bg-white rounded-lg px-2 py-0.5 text-xs font-bold shadow text-gray-800 max-w-28 text-center truncate">
              {destinationLabel}
            </div>
          )}
        </div>
      </AdvancedMarker>

      {/* ── Bandeau instruction en haut ── */}
      {currentStep && (
        <div
          className="absolute top-0 left-0 right-0 z-20 px-4 pt-safe"
          style={{ paddingTop: 'env(safe-area-inset-top, 12px)' }}
        >
          <div
            className="rounded-2xl shadow-2xl p-4 flex items-center gap-3"
            style={{ background: mode === 'to-pickup' ? '#1D4ED8' : '#DC2626' }}
          >
            {/* Icône manœuvre */}
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
              {getManeuverIcon(currentStep.maneuver || '')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-base leading-tight">{currentStep.instruction}</p>
              <p className="text-white/70 text-sm mt-0.5">{currentStep.distance}</p>
            </div>
            {/* Boussole */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
                style={{ transform: `rotate(${-heading}deg)`, transition: 'transform 0.3s' }}
              >
                <Compass size={16} className="text-white" />
              </div>
              <span className="text-white/60 text-xs">{heading}°</span>
            </div>
          </div>

          {/* Prochaine instruction */}
          {nextStep && (
            <div className="mt-2 bg-white/95 backdrop-blur rounded-xl px-4 py-2 flex items-center gap-2 shadow">
              <span className="text-gray-400 text-sm">Ensuite :</span>
              <span className="text-gray-800 text-sm font-semibold truncate">{nextStep.instruction}</span>
              <span className="text-gray-400 text-xs ml-auto flex-shrink-0">{nextStep.distance}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Contrôles navigation en bas à droite ── */}
      <div className="absolute right-4 bottom-56 z-20 flex flex-col gap-2">
        {/* Bouton son */}
        <button
          onClick={() => setVoiceEnabled(v => !v)}
          className="w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center border border-gray-200"
        >
          {voiceEnabled
            ? <Volume2 size={18} className="text-gray-700" />
            : <VolumeX size={18} className="text-red-500" />}
        </button>

        {/* Recentrer */}
        <button
          onClick={() => map?.panTo(origin)}
          className="w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center border border-gray-200"
        >
          <RotateCcw size={18} className="text-gray-700" />
        </button>
      </div>

      {/* ── Barre de progression des étapes ── */}
      {steps.length > 0 && (
        <div className="absolute bottom-52 left-4 right-4 z-20">
          <div className="bg-white/95 backdrop-blur rounded-2xl px-4 py-2 shadow flex items-center gap-3">
            <button
              onClick={() => setCurrentStepIndex(i => Math.max(0, i - 1))}
              disabled={currentStepIndex === 0}
              className="p-1 disabled:opacity-30"
            >
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            <div className="flex-1 text-center">
              <p className="text-xs text-gray-500">Étape {currentStepIndex + 1}/{steps.length}</p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
                    background: mode === 'to-pickup' ? '#3B82F6' : '#EF4444',
                  }}
                />
              </div>
            </div>
            <button
              onClick={() => {
                const next = Math.min(steps.length - 1, currentStepIndex + 1);
                setCurrentStepIndex(next);
                if (steps[next]) speak(steps[next].instruction);
              }}
              disabled={currentStepIndex === steps.length - 1}
              className="p-1 disabled:opacity-30"
            >
              <ChevronRight size={18} className="text-gray-600" />
            </button>
            <div className="border-l border-gray-200 pl-3 text-right">
              <p className="text-xs font-bold text-gray-800">{totalDuration}</p>
              <p className="text-xs text-gray-500">{totalDistance}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Composant principal exporté ────────────────────────────────────────────
export function NavigationMap(props: NavigationMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  return (
    <APIProvider apiKey={apiKey} libraries={['geometry']}>
      <div className="relative w-full h-full">
        <Map
          defaultCenter={props.origin}
          defaultZoom={16}
          mapId="kulooc-nav-map"
          gestureHandling="greedy"
          disableDefaultUI={true}
          className="w-full h-full"
        >
          <NavigationRenderer {...props} />
        </Map>
      </div>
    </APIProvider>
  );
}
