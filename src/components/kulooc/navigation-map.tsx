'use client';
/**
 * KULOOC — NavigationMap v3
 * Style: Image 1 (reference) + Image 4
 *  ┌───────────────────────────────────────────────────────────┐
 *  │ TOP: Panneau noir — manœuvre + distance + rue             │
 *  │      Sous-barre: durée | km | destination                 │
 *  ├───────────────────────────────────────────────────────────┤
 *  │ MAP: Triangle dans tiers inférieur (centre décalé avant)  │
 *  ├───────────────────────────────────────────────────────────┤
 *  │ BAS: Overlay sombre — passager + durée + bouton action    │
 *  └───────────────────────────────────────────────────────────┘
 * SUPPRIMÉ: barre des étapes (1/20) au milieu
 */
import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { Volume2, VolumeX, Navigation2 } from 'lucide-react';

interface LatLng { lat: number; lng: number; }
interface NavigationStep { instruction: string; distance: string; maneuver?: string; }

export interface NavigationMapProps {
  origin: LatLng;
  destination: LatLng;
  destinationLabel?: string;
  onArrived?: () => void;
  mode?: 'to-pickup' | 'to-destination';
  passengerName?: string;
  actionLabel?: string;
  actionColor?: string;
  onAction?: () => void;
  onRouteCalculated?: (distanceKm: number, durationMin: number) => void;
}

export interface NavigationMapRef {
  recenter: () => void;
}

function ManeuverArrow({ m }: { m: string }) {
  if (m.includes('left'))      return <span style={{ display:'inline-block', transform:'rotate(-90deg)', fontSize:26 }}>↑</span>;
  if (m.includes('right'))     return <span style={{ display:'inline-block', transform:'rotate(90deg)', fontSize:26 }}>↑</span>;
  if (m.includes('uturn'))     return <span style={{ fontSize:24 }}>↩</span>;
  if (m.includes('roundabout'))return <span style={{ fontSize:22 }}>↻</span>;
  return <span style={{ fontSize:26 }}>↑</span>;
}

function offsetCenter(pos: LatLng, heading: number, deg = 0.0025): LatLng {
  const rad = (heading * Math.PI) / 180;
  return { lat: pos.lat + deg * Math.cos(rad), lng: pos.lng + deg * Math.sin(rad) };
}

const NavigationRenderer = forwardRef<NavigationMapRef, NavigationMapProps & { onCenter: (c:LatLng)=>void }>(
  function NR({ origin, destination, destinationLabel, onArrived, mode, onAction, actionLabel, actionColor, passengerName, onRouteCalculated, onCenter }, ref) {
  const map = useMap();
  const rendererRef = useRef<google.maps.DirectionsRenderer|null>(null);
  const watchRef = useRef<number|null>(null);
  const [steps, setSteps] = useState<NavigationStep[]>([]);
  const [totalDist, setTotalDist] = useState('');
  const [totalTime, setTotalTime] = useState('');
  const [voice, setVoice] = useState(true);
  const [heading, setHeading] = useState(0);
  const [pos, setPos] = useState<LatLng>(origin);
  const lastSpoken = useRef('');

  useImperativeHandle(ref, () => ({
    recenter() { if (map) { map.panTo(offsetCenter(pos,heading)); map.setZoom(17); } }
  }));

  const speak = useCallback((txt: string) => {
    if (!voice || lastSpoken.current === txt) return;
    lastSpoken.current = txt;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(txt);
      u.lang = 'fr-CA'; u.rate = 0.92;
      window.speechSynthesis.speak(u);
    }
  }, [voice]);

  useEffect(() => {
    if (!map) return;
    const svc = new google.maps.DirectionsService();
    if (rendererRef.current) rendererRef.current.setMap(null);
    const rndr = new google.maps.DirectionsRenderer({
      suppressMarkers: true,
      preserveViewport: true,
      polylineOptions: { strokeColor: mode === 'to-pickup' ? '#2563EB' : '#DC2626', strokeWeight: 7, strokeOpacity: 0.95 },
    });
    rndr.setMap(map);
    rendererRef.current = rndr;
    svc.route({
      origin: new google.maps.LatLng(origin.lat, origin.lng),
      destination: new google.maps.LatLng(destination.lat, destination.lng),
      travelMode: google.maps.TravelMode.DRIVING,
      drivingOptions: { departureTime: new Date(), trafficModel: google.maps.TrafficModel.BEST_GUESS },
    }, (res, stat) => {
      if (stat === 'OK' && res) {
        rndr.setDirections(res);
        const leg = res.routes[0]?.legs[0];
        if (leg) {
          setTotalDist(leg.distance?.text || '');
          setTotalTime(leg.duration_in_traffic?.text || leg.duration?.text || '');
          const parsed: NavigationStep[] = leg.steps.map(s => ({
            instruction: s.instructions.replace(/<[^>]*>/g,''),
            distance: s.distance?.text || '',
            maneuver: s.maneuver || '',
          }));
          setSteps(parsed);
          if (parsed[0]) speak(parsed[0].instruction);
          if (onRouteCalculated && leg.distance && leg.duration) {
            onRouteCalculated((leg.distance.value||0)/1000, Math.ceil((leg.duration.value||0)/60));
          }
        }
      }
    });
    return () => { if (rendererRef.current) rendererRef.current.setMap(null); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, origin.lat, origin.lng, destination.lat, destination.lng, mode]);

  useEffect(() => {
    if (!map) return;
    const orient = (e: DeviceOrientationEvent) => {
      const h = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading ?? e.alpha;
      if (h !== null) setHeading(Math.round(h));
    };
    window.addEventListener('deviceorientationabsolute', orient as EventListener, true);
    window.addEventListener('deviceorientation', orient as EventListener, true);
    if (navigator.geolocation) {
      watchRef.current = navigator.geolocation.watchPosition(p => {
        const cur = { lat: p.coords.latitude, lng: p.coords.longitude };
        if (p.coords.heading !== null && !isNaN(p.coords.heading!)) setHeading(Math.round(p.coords.heading!));
        setPos(cur);
        const ctr = offsetCenter(cur, heading, 0.0025);
        map.panTo(ctr);
        onCenter(ctr);
        try {
          const d = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(cur.lat, cur.lng),
            new google.maps.LatLng(destination.lat, destination.lng)
          );
          if (d < 60 && onArrived) { speak('Vous êtes arrivé'); onArrived(); }
        } catch { /* geometry loading */ }
      }, null, { enableHighAccuracy: true, maximumAge: 1500, timeout: 8000 });
    }
    return () => {
      window.removeEventListener('deviceorientationabsolute', orient as EventListener, true);
      window.removeEventListener('deviceorientation', orient as EventListener, true);
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, destination.lat, destination.lng, onArrived, heading]);

  const color = mode === 'to-pickup' ? '#2563EB' : '#DC2626';
  const step = steps[0];

  return (
    <>
      {/* Marqueur chauffeur — triangle orienté, tiers inférieur */}
      <AdvancedMarker position={pos}>
        <div style={{ transform:`rotate(${heading}deg)`, transition:'transform 0.4s ease', filter:'drop-shadow(0 3px 8px rgba(0,0,0,0.6))' }}>
          <svg width="28" height="36" viewBox="0 0 28 36" fill="none">
            {/* Triangle navigation (pointe en haut = nord) */}
            <polygon points="14,2 27,34 14,27 1,34" fill={color} stroke="white" strokeWidth="2.5" strokeLinejoin="round"/>
          </svg>
        </div>
      </AdvancedMarker>

      {/* Marqueur destination */}
      <AdvancedMarker position={destination}>
        <div className="flex flex-col items-center">
          <div style={{ width:44, height:44, borderRadius:'50%', background:color, border:'3px solid white', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(0,0,0,0.4)', fontSize:20 }}>
            {mode === 'to-pickup' ? '👤' : '🏁'}
          </div>
          {destinationLabel && (
            <div style={{ marginTop:4, background:'white', borderRadius:8, padding:'3px 8px', fontSize:11, fontWeight:700, boxShadow:'0 2px 6px rgba(0,0,0,0.2)', maxWidth:130, textAlign:'center', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {destinationLabel}
            </div>
          )}
        </div>
      </AdvancedMarker>

      {/* ═══ TOP — Instruction sombre (style Google Maps / Image 1) ═══ */}
      {step && (
        <div className="absolute top-0 left-0 right-0 z-20" style={{ paddingTop:'env(safe-area-inset-top, 6px)' }}>
          <div className="mx-3 mt-2 rounded-2xl shadow-2xl overflow-hidden" style={{ background:'rgba(16,16,18,0.97)' }}>
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Icône manœuvre carré coloré */}
              <div className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center" style={{ background:color }}>
                <div className="text-white font-black"><ManeuverArrow m={step.maneuver||''} /></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-xl leading-tight">{step.distance}</p>
                <p className="text-white/75 text-sm leading-snug mt-0.5 line-clamp-2">{step.instruction}</p>
              </div>
              <button onClick={() => setVoice(v=>!v)} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background:'rgba(255,255,255,0.1)' }}>
                {voice ? <Volume2 size={17} className="text-white"/> : <VolumeX size={17} className="text-red-400"/>}
              </button>
            </div>
            {/* Sous-barre infos: durée | distance | destination */}
            <div className="flex items-center gap-3 px-4 py-2" style={{ borderTop:'1px solid rgba(255,255,255,0.07)' }}>
              <span className="text-white font-black text-sm">{totalTime}</span>
              <span className="text-white/25">|</span>
              <span className="text-white/65 text-sm">{totalDist}</span>
              <span className="text-white/25">|</span>
              <span className="text-white/45 text-xs truncate flex-1">{destinationLabel || (mode === 'to-pickup' ? 'Passager' : 'Destination')}</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DROITE — Recentrer ═══ */}
      <div className="absolute right-3 z-20" style={{ bottom:170 }}>
        <button
          onClick={() => { if (map) { map.panTo(offsetCenter(pos,heading,0.0025)); map.setZoom(17); } }}
          className="w-11 h-11 rounded-full shadow-lg flex items-center justify-center"
          style={{ background:'rgba(255,255,255,0.95)' }}
        >
          <Navigation2 size={18} className="text-gray-700"/>
        </button>
      </div>

      {/* ═══ BAS — Overlay action (style barre rouge Image 1) ═══ */}
      {onAction && actionLabel && (
        <div className="absolute left-0 right-0 z-20 px-4" style={{ bottom:0, paddingBottom:'calc(env(safe-area-inset-bottom, 8px) + 8px)' }}>
          <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background:'rgba(14,14,16,0.96)' }}>
            {passengerName && (
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider font-semibold">
                    {mode === 'to-pickup' ? 'Aller chercher' : 'Déposer'}
                  </p>
                  <p className="text-white font-black text-base mt-0.5">{passengerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-black text-lg">{totalTime}</p>
                  <p className="text-white/45 text-sm">{totalDist}</p>
                </div>
              </div>
            )}
            <div className="px-3 pb-3">
              <button
                onClick={onAction}
                className="w-full py-4 rounded-xl font-black text-base text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                style={{ background: actionColor || color }}
              >
                {actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
NavigationRenderer.displayName = 'NavigationRenderer';

// ── Export principal ──────────────────────────────────────────────────────────
export const NavigationMap = forwardRef<NavigationMapRef, NavigationMapProps>(
  function NavigationMap(props, ref) {
    const [mapCenter, setMapCenter] = useState(props.origin);
    return (
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''} libraries={['geometry', 'routes']}>
        <div className="relative w-full h-full">
          <Map
            center={mapCenter}
            zoom={17}
            mapId="kulooc-nav-v3"
            gestureHandling="greedy"
            disableDefaultUI={true}
            className="w-full h-full"
          >
            <NavigationRenderer ref={ref} {...props} onCenter={setMapCenter} />
          </Map>
        </div>
      </APIProvider>
    );
  }
);
