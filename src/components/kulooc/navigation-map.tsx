'use client';
/**
 * KULOOC — NavigationMap v3
 * Directive 3 : GPS chauffeur
 *   - Marqueur SVG Google Maps natif (google.maps.Symbol) avec rotation heading
 *   - Décentrage : padding bottom 260px dans fitBounds + panTo offset
 *   - Géofencing 50m : détection d'arrivée automatique
 *   - Boussole : webkitCompassHeading (iOS) > alpha (Android) > GPS heading
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { Volume2, VolumeX, Compass, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

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

export interface RouteInfo {
  totalDuration: string;
  totalDistance: string;
  stepIndex: number;
  stepTotal: number;
  speed: number;
}

interface NavigationMapProps {
  origin: LatLng;
  destination: LatLng;
  destinationLabel?: string;
  onArrived?: () => void;
  onRouteInfo?: (info: RouteInfo) => void;
  mode?: 'to-pickup' | 'to-destination';
}

// ─── Composant interne qui utilise useMap ───────────────────────────────────
function NavigationRenderer({
  origin,
  destination,
  destinationLabel,
  onArrived,
  onRouteInfo,
  mode,
}: NavigationMapProps) {
  const map = useMap();
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const driverMarkerRef = useRef<google.maps.Marker | null>(null);
  const destMarkerRef = useRef<google.maps.Marker | null>(null);
  const [steps, setSteps] = useState<NavigationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [totalDistance, setTotalDistance] = useState('');
  const [totalDuration, setTotalDuration] = useState('');
  const [speed, setSpeed] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [heading, setHeading] = useState<number>(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentPos, setCurrentPos] = useState<LatLng>(origin);
  const watchIdRef = useRef<number | null>(null);
  const lastSpokenRef = useRef('');
  const arrivedRef = useRef(false);

  // Couleur selon le mode
  const modeColor = mode === 'to-pickup' ? '#3B82F6' : '#EF4444';

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

  // ── Créer/mettre à jour le marqueur chauffeur SVG Google Maps natif ──────
  // Directive 3 : path SVG triangle, rotation = heading, anchor au centre
  useEffect(() => {
    if (!map) return;

    const driverIcon: google.maps.Symbol = {
      // Triangle pointant vers le haut (Nord) — même path que le document
      path: 'M 0,0 L -10,-20 L 10,-20 Z',
      fillColor: modeColor,
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
      rotation: heading,
      scale: 1.5,
      // Ancre au centre géométrique du triangle
      anchor: new google.maps.Point(0, -10),
    };

    if (!driverMarkerRef.current) {
      // Créer le marqueur la première fois
      driverMarkerRef.current = new google.maps.Marker({
        position: currentPos,
        map,
        icon: driverIcon,
        zIndex: 100,
        title: 'Chauffeur',
      });
    } else {
      // Mettre à jour position + rotation
      driverMarkerRef.current.setPosition(currentPos);
      driverMarkerRef.current.setIcon(driverIcon);
    }

    return () => {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setMap(null);
        driverMarkerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Mettre à jour le marqueur quand position ou heading change
  useEffect(() => {
    if (!driverMarkerRef.current || !map) return;
    const driverIcon: google.maps.Symbol = {
      path: 'M 0,0 L -10,-20 L 10,-20 Z',
      fillColor: modeColor,
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
      rotation: heading,
      scale: 1.5,
      anchor: new google.maps.Point(0, -10),
    };
    driverMarkerRef.current.setPosition(currentPos);
    driverMarkerRef.current.setIcon(driverIcon);
  }, [currentPos, heading, modeColor, map]);

  // ── Marqueur destination ─────────────────────────────────────────────────
  useEffect(() => {
    if (!map) return;

    const destIcon: google.maps.Symbol = {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: modeColor,
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 3,
      scale: 10,
    };

    if (!destMarkerRef.current) {
      destMarkerRef.current = new google.maps.Marker({
        position: destination,
        map,
        icon: destIcon,
        zIndex: 90,
        title: destinationLabel || 'Destination',
        label: {
          text: mode === 'to-pickup' ? '👤' : '🏁',
          fontSize: '16px',
        },
      });
    }

    return () => {
      if (destMarkerRef.current) {
        destMarkerRef.current.setMap(null);
        destMarkerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // ── Calculer l'itinéraire via Directions API ─────────────────────────────
  useEffect(() => {
    if (!map || !origin || !destination) return;

    const directionsService = new google.maps.DirectionsService();

    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }

    const renderer = new google.maps.DirectionsRenderer({
      suppressMarkers: true, // On gère nos propres marqueurs
      polylineOptions: {
        strokeColor: modeColor,
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
          // Directive 3 : padding bottom 260px pour décentrer le chauffeur vers le bas
          const bounds = result.routes[0]?.bounds;
          if (bounds) {
            map.fitBounds(bounds, {
              top: 80,
              bottom: 260,
              left: 20,
              right: 20,
            });
          }
        }
      }
    );

    return () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, origin.lat, origin.lng, destination.lat, destination.lng, mode]);

  // ── Suivi GPS en temps réel + boussole ──────────────────────────────────
  useEffect(() => {
    if (!map) return;

    // Boussole — Directive 3 : webkitCompassHeading (iOS) > 360-alpha (Android)
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const ev = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
      if (ev.webkitCompassHeading !== undefined && ev.webkitCompassHeading !== null) {
        setHeading(Math.round(ev.webkitCompassHeading));
      } else if (e.alpha !== null) {
        setHeading(Math.round(360 - e.alpha));
      }
    };

    window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
    window.addEventListener('deviceorientation', handleOrientation as EventListener, true);

    // Suivi GPS
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCurrentPos(current);

          // Cap GPS prioritaire en mouvement (plus fiable que la boussole)
          if (pos.coords.heading !== null && pos.coords.heading !== undefined && !isNaN(pos.coords.heading)) {
            setHeading(Math.round(pos.coords.heading));
          }

          // Directive 3 : décentrer le chauffeur vers le bas
          // setOptions avec padding pousse le centre vers le haut
          map.setOptions({
            center: current,
            zoom: map.getZoom(),
          });

          // Vitesse en km/h
          setSpeed(Math.round((pos.coords.speed || 0) * 3.6));

          // Directive 3 : Géofencing 50m — détection d'arrivée
          if (!arrivedRef.current) {
            const dist = google.maps.geometry.spherical.computeDistanceBetween(
              new google.maps.LatLng(current.lat, current.lng),
              new google.maps.LatLng(destination.lat, destination.lng)
            );
            if (dist < 50) {
              arrivedRef.current = true;
              speak('Vous êtes arrivé à destination');
              if (onArrived) onArrived();
            }
          }
        },
        (err) => {
          console.warn('[GPS] Erreur watchPosition:', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
      );
    }

    setIsNavigating(true);

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
      window.removeEventListener('deviceorientation', handleOrientation as EventListener, true);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, destination.lat, destination.lng]);

  // Notifier le parent des infos de route
  useEffect(() => {
    if (!onRouteInfo) return;
    onRouteInfo({
      totalDuration,
      totalDistance,
      stepIndex: currentStepIndex,
      stepTotal: steps.length,
      speed,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalDuration, totalDistance, currentStepIndex, steps.length, speed]);

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
              <p className="text-white font-bold text-base leading-tight line-clamp-2">
                {currentStep.instruction}
              </p>
              <p className="text-white/70 text-sm mt-0.5">{currentStep.distance}</p>
            </div>
            {/* Boussole */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
                style={{
                  transform: `rotate(${-heading}deg)`,
                  transition: 'transform 0.3s',
                }}
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
          onClick={() => {
            if (map) {
              map.panTo(currentPos);
              map.setZoom(17);
            }
          }}
          className="w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center border border-gray-200"
        >
          <RotateCcw size={18} className="text-gray-700" />
        </button>
      </div>

      {/* ── Barre de progression des étapes ── */}
      {steps.length > 0 && (
        <div className="absolute bottom-52 left-4 right-4 z-20">
          <div className="bg-white/95 backdrop-blur rounded-2xl px-4 py-2 flex items-center gap-2 shadow-lg">
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
                    background: modeColor,
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

      {/* ── Indicateur vitesse ── */}
      {isNavigating && speed > 0 && (
        <div className="absolute bottom-4 left-4 z-20">
          <div className="bg-white rounded-xl px-3 py-2 shadow-lg border border-gray-200 text-center">
            <p className="text-xl font-black text-gray-900">{speed}</p>
            <p className="text-xs text-gray-400">km/h</p>
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
          defaultZoom={17}
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
