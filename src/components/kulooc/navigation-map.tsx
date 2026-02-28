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

// ─── Flèche de manœuvre SVG — comme l'image (flèche blanche dans bloc coloré) ──
function ManeuverArrow({ maneuver }: { maneuver: string }) {
  // Rotation selon la manœuvre
  const rotation = maneuver.includes('left') ? -45
    : maneuver.includes('right') ? 45
    : maneuver.includes('uturn') ? 180
    : maneuver.includes('sharp-left') ? -90
    : maneuver.includes('sharp-right') ? 90
    : 0; // tout droit par défaut

  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none"
      style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.3s' }}>
      {/* Flèche vers le haut */}
      <path d="M18 4 L18 28" stroke="white" strokeWidth="4" strokeLinecap="round"/>
      <path d="M8 14 L18 4 L28 14" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}


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
      {/* ── HEADER GPS — exactement comme l'image ── */}
      {currentStep && (
        <div className="absolute top-0 left-0 right-0 z-20" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>

          {/* Ligne 1 — flèche + distance + instruction */}
          <div
            className="flex items-start gap-0 shadow-2xl"
            style={{ background: '#0D0D0D' }}
          >
            {/* Bloc flèche coloré — exactement comme l'image */}
            <div
              className="flex-shrink-0 flex items-center justify-center"
              style={{
                background: mode === 'to-pickup' ? '#2563EB' : '#DC2626',
                width: 80,
                minHeight: 84,
                alignSelf: 'stretch',
              }}
            >
              <ManeuverArrow maneuver={currentStep.maneuver || ''} />
            </div>

            {/* Distance + instruction */}
            <div className="flex-1 px-4 py-3 min-w-0">
              <p className="text-white font-black leading-none" style={{ fontSize: 32 }}>
                {currentStep.distance}
              </p>
              <p className="text-white font-bold text-base leading-tight mt-0.5 line-clamp-1">
                {/* Extraire "vers X" de l'instruction */}
                {currentStep.instruction.split(' ').slice(0, 3).join(' ')}
              </p>
              <p className="text-white/55 text-xs mt-0.5 line-clamp-2 leading-snug">
                {currentStep.instruction}
              </p>
            </div>

            {/* Bouton son */}
            <button
              onClick={() => setVoiceEnabled(v => !v)}
              className="flex-shrink-0 w-11 h-11 m-3 rounded-full bg-white/10 flex items-center justify-center border border-white/20"
            >
              {voiceEnabled
                ? <Volume2 size={16} className="text-white" />
                : <VolumeX size={16} className="text-red-400" />}
            </button>
          </div>

          {/* Ligne 2 — stats : durée | distance | vitesse | destination */}
          <div
            className="flex items-center gap-0 px-4 py-2"
            style={{ background: 'rgba(13,13,13,0.97)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span className="text-white font-black text-sm">{totalDuration}</span>
            <span className="text-white/30 mx-2">|</span>
            <span className="text-white/80 text-sm font-semibold">{totalDistance}</span>
            <span className="text-white/30 mx-2">|</span>
            <span className="text-white/80 text-sm font-semibold">{speed} <span className="text-white/40 font-normal text-xs">km/h</span></span>
            <span className="text-white/30 mx-2">|</span>
            <span className="text-white/60 text-xs flex-1 truncate">
              {destinationLabel || 'Destination'}
            </span>
          </div>

          {/* Prochaine instruction */}
          {nextStep && (
            <div
              className="px-4 py-2 flex items-center gap-2"
              style={{ background: 'rgba(20,20,20,0.95)' }}
            >
              <span className="text-white/40 text-xs">Ensuite :</span>
              <span className="text-white/80 text-xs font-semibold flex-1 truncate">{nextStep.instruction}</span>
              <span className="text-white/40 text-xs flex-shrink-0">{nextStep.distance}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Bouton recentrer (droite) ── */}
      <div className="absolute right-4 z-20" style={{ bottom: 260 }}>
        <button
          onClick={() => { if (map) { map.panTo(currentPos); map.setZoom(17); } }}
          className="w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center border border-gray-200"
        >
          <RotateCcw size={18} className="text-gray-700" />
        </button>
      </div>

      {/* ── Barre étapes — style image (1/20 avec flèches + recenter) ── */}
      {steps.length > 0 && (
        <div className="absolute left-4 right-4 z-20" style={{ bottom: 204 }}>
          <div className="bg-white rounded-2xl shadow-xl flex items-center overflow-hidden" style={{ height: 52 }}>
            <button
              onClick={() => setCurrentStepIndex(i => Math.max(0, i - 1))}
              disabled={currentStepIndex === 0}
              className="w-10 flex items-center justify-center h-full disabled:opacity-30 border-r border-gray-100"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <div className="flex-1 text-center">
              <p className="font-bold text-gray-900 text-sm">{currentStepIndex + 1} / {steps.length}</p>
            </div>
            <button
              onClick={() => {
                const next = Math.min(steps.length - 1, currentStepIndex + 1);
                setCurrentStepIndex(next);
                if (steps[next]) speak(steps[next].instruction);
              }}
              disabled={currentStepIndex === steps.length - 1}
              className="w-10 flex items-center justify-center h-full disabled:opacity-30 border-l border-r border-gray-100"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
            <button
              onClick={() => { if (map) { map.panTo(currentPos); map.setZoom(17); } }}
              className="w-10 flex items-center justify-center h-full border-l border-gray-100"
            >
              <RotateCcw size={16} className="text-gray-600" />
            </button>
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
