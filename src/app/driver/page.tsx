'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, SlidersHorizontal, TrendingUp, Plane, MapPin,
  Navigation, CheckCircle2, Flag, DollarSign, Phone
} from 'lucide-react';
import { useUser } from '@/firebase/provider';
import { useDriver } from '@/lib/firestore/use-driver';
import { useDriverOffer } from '@/lib/firestore/use-driver-offer';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { NavigationMap } from '@/components/kulooc/navigation-map';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/firebase';
import { getDispatchEngine } from '@/lib/dispatch/dispatch-engine';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(seconds % 60).padStart(2, '0')}s`;
}
function formatMoney(amount: number): string {
  return amount.toFixed(2) + ' $';
}

export default function DriverHomePage() {
  const { user, isUserLoading: userLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [showPreferences, setShowPreferences] = useState(false);
  const [rideTimer, setRideTimer] = useState(0);
  const [navMode, setNavMode] = useState<'to-pickup' | 'to-destination' | null>(null);
  const [panelExpanded, setPanelExpanded] = useState(true);
  const rideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const engineStartedRef = useRef(false);

  const {
    isOnline, activeRide, isLoading, onlineDuration, earningsToday,
    ridesCompleted, currentLocation, goOnline, goOffline,
    arrivedAtPickup, startRide, completeRide,
  } = useDriver();

  const { currentOffer, countdown, isResponding, acceptOffer, declineOffer } =
    useDriverOffer(currentLocation ?? null);

  // Moteur de dispatch
  useEffect(() => {
    if (isOnline && !engineStartedRef.current) {
      getDispatchEngine(db).start();
      engineStartedRef.current = true;
    } else if (!isOnline && engineStartedRef.current) {
      getDispatchEngine(db).stop();
      engineStartedRef.current = false;
    }
  }, [isOnline]);

  // Timer de course
  useEffect(() => {
    if (activeRide?.status === 'in-progress') {
      if (!rideTimerRef.current)
        rideTimerRef.current = setInterval(() => setRideTimer(p => p + 1), 1000);
    } else {
      if (rideTimerRef.current) { clearInterval(rideTimerRef.current); rideTimerRef.current = null; }
      setRideTimer(0);
    }
    return () => { if (rideTimerRef.current) clearInterval(rideTimerRef.current); };
  }, [activeRide?.status]);

  // Mode navigation selon statut
  useEffect(() => {
    if (!activeRide) { setNavMode(null); return; }
    if (activeRide.status === 'driver-assigned') setNavMode('to-pickup');
    else if (activeRide.status === 'in-progress') setNavMode('to-destination');
    else setNavMode(null);
  }, [activeRide?.status]);

  useEffect(() => {
    if (!userLoading && !user) router.push('/driver/auth');
  }, [user, userLoading, router]);

  const handleToggleOnline = async () => {
    if (isOnline) { await goOffline(); toast({ title: 'Vous êtes maintenant hors ligne.' }); }
    else { await goOnline(); toast({ title: '✅ En ligne !', description: 'En attente de courses...' }); }
  };
  const handleAcceptOffer = async () => {
    await acceptOffer();
    toast({ title: '🚗 Course acceptée !', description: 'En route vers le passager' });
  };
  const handleDeclineOffer = async () => {
    await declineOffer();
    toast({ title: 'Course refusée', description: 'Recherche du prochain chauffeur...' });
  };
  const handleArrivedAtPickup = async () => {
    await arrivedAtPickup();
    setNavMode(null);
    toast({ title: '📍 Arrivé !', description: 'Notification envoyée au passager' });
  };
  const handleStartRide = async () => {
    await startRide();
    setNavMode('to-destination');
    toast({ title: '🏁 Course démarrée !' });
  };
  const handleCompleteRide = async () => {
    await completeRide();
    setNavMode(null);
    toast({ title: '✅ Course terminée !', description: 'Gains mis à jour' });
  };

  const driverLatLng = currentLocation
    ? { lat: currentLocation.latitude, lng: currentLocation.longitude } : null;
  const pickupLatLng = activeRide?.pickup?.latitude && activeRide?.pickup?.longitude
    ? { lat: activeRide.pickup.latitude, lng: activeRide.pickup.longitude } : null;
  const destLatLng = activeRide?.destination?.latitude && activeRide?.destination?.longitude
    ? { lat: activeRide.destination.latitude, lng: activeRide.destination.longitude } : null;

  const isNavActive = navMode !== null && driverLatLng !== null &&
    ((navMode === 'to-pickup' && pickupLatLng !== null) ||
     (navMode === 'to-destination' && destLatLng !== null));

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-100 flex flex-col">

      {/* ═══ CARTE / GPS ═══ */}
      <div className="flex-1 relative min-h-0">
        {isNavActive && driverLatLng ? (
          /* GPS de navigation intégré — jamais de popup externe */
          <NavigationMap
            origin={driverLatLng}
            destination={navMode === 'to-pickup' ? pickupLatLng! : destLatLng!}
            destinationLabel={
              navMode === 'to-pickup'
                ? (activeRide?.pickup?.address || 'Passager')
                : (activeRide?.destination?.address || activeRide?.destinationAddress || 'Destination')
            }
            mode={navMode}
            onArrived={navMode === 'to-pickup' ? handleArrivedAtPickup : undefined}
          />
        ) : (
          /* Carte statique quand pas en navigation */
          <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
            <Map
              defaultCenter={driverLatLng || { lat: 45.5017, lng: -73.5673 }}
              defaultZoom={14}
              mapId="a22506a8155b4369"
              gestureHandling="greedy"
              disableDefaultUI={true}
              className="w-full h-full"
            >
              {driverLatLng && (
                <AdvancedMarker position={driverLatLng}>
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-10 h-10 rounded-full bg-blue-500/25 animate-ping" />
                    <div className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-lg" />
                  </div>
                </AdvancedMarker>
              )}
              {pickupLatLng && activeRide?.status === 'driver-arrived' && (
                <AdvancedMarker position={pickupLatLng}>
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-xl border-2 border-white">
                    <MapPin size={18} className="text-white" />
                  </div>
                </AdvancedMarker>
              )}
            </Map>
          </APIProvider>
        )}

        {/* Header KULOOC */}
        <div
          className="absolute left-0 right-0 z-10 flex items-center justify-between px-4"
          style={{ top: isNavActive ? 'calc(env(safe-area-inset-top, 0px) + 108px)' : 'env(safe-area-inset-top, 12px)' }}
        >
          <div className="bg-white/95 backdrop-blur rounded-2xl px-3 py-2 shadow flex items-center gap-2">
            <span className="font-black text-red-600 text-lg">KULOOC</span>
            <span className="text-red-500">🍁</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowPreferences(true)}
              className="w-10 h-10 bg-white/95 backdrop-blur rounded-full shadow flex items-center justify-center">
              <SlidersHorizontal size={18} className="text-gray-700" />
            </button>
            <button className="w-10 h-10 bg-white/95 backdrop-blur rounded-full shadow flex items-center justify-center">
              <Shield size={18} className="text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══ PANNEAU BAS — Hors ligne / En attente ═══ */}
      {!currentOffer && !activeRide && (
        <div className="bg-white shadow-2xl rounded-t-3xl z-20 flex-shrink-0">
          <button className="w-full flex items-center justify-center pt-3 pb-1"
            onClick={() => setPanelExpanded(e => !e)}>
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </button>
          <div className="px-5 pb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <div>
                  <p className="font-black text-base">{isOnline ? 'En ligne' : 'Hors ligne'}</p>
                  {isOnline && (
                    <p className="text-xs text-gray-500">{Math.floor(onlineDuration / 60)}h {onlineDuration % 60}m en ligne</p>
                  )}
                </div>
              </div>
              {isOnline && (
                <div className="flex gap-4 text-right">
                  <div>
                    <p className="text-xs text-gray-500">Gains</p>
                    <p className="font-black text-green-600 text-sm">{formatMoney(earningsToday)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Courses</p>
                    <p className="font-black text-sm">{ridesCompleted}</p>
                  </div>
                </div>
              )}
            </div>

            {isOnline && panelExpanded && (
              <p className="text-center text-sm text-gray-400 mb-3 animate-pulse">⏳ En attente d&apos;une course...</p>
            )}

            <button onClick={handleToggleOnline} disabled={isLoading}
              className={`w-full py-4 rounded-full text-white font-black text-base shadow-lg flex items-center justify-center gap-3 transition-all ${
                isOnline ? 'bg-gray-900 hover:bg-black' : 'bg-red-600 hover:bg-red-700'
              } disabled:opacity-50`}>
              <div className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-white" />
              </div>
              {isLoading ? 'Chargement...' : isOnline ? 'Passer hors ligne' : 'Passer en ligne'}
            </button>

            {!isOnline && panelExpanded && (
              <div className="mt-4 space-y-2">
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex items-start gap-3">
                  <Plane size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-amber-800">Forte affluence YUL</p>
                    <p className="text-xs text-amber-600">Vols entre 15h–18h demain</p>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-2xl p-3 flex items-start gap-3">
                  <TrendingUp size={15} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-green-800">Tendances revenus</p>
                    <p className="text-xs text-green-600">Meilleures heures et secteurs aujourd&apos;hui</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ OFFRE DE COURSE ═══ */}
      {currentOffer && !activeRide && (
        <Sheet open={true} onOpenChange={() => {}}>
          <SheetContent side="bottom" className="rounded-t-3xl p-0 z-50 max-h-[92vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <SheetTitle className="text-xl font-black">Nouvelle course !</SheetTitle>
                  <SheetDescription className="text-sm text-gray-500">Répondez avant la fin du compte à rebours</SheetDescription>
                </div>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 font-black text-2xl ${
                  countdown > 20 ? 'border-green-500 text-green-600' :
                  countdown > 10 ? 'border-orange-500 text-orange-600' :
                  'border-red-600 text-red-600 animate-pulse'}`}>
                  {countdown}
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between mb-4">
                <div>
                  <p className="text-3xl font-black text-green-600">{formatMoney(currentOffer.estimatedPrice)}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {currentOffer.estimatedDistanceKm?.toFixed(1)} km · ~{currentOffer.estimatedDurationMin} min
                  </p>
                </div>
                <span className="text-sm font-bold bg-red-100 text-red-700 px-3 py-1.5 rounded-full">
                  {currentOffer.serviceType || 'KULOOC X'}
                </span>
              </div>

              <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {currentOffer.passengerName?.charAt(0).toUpperCase() || 'P'}
                </div>
                <div className="flex-1">
                  <p className="font-bold">{currentOffer.passengerName}</p>
                  <p className="text-xs text-gray-500">Passager</p>
                </div>

              </div>

              <div className="space-y-2 mb-5">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-3 h-3 rounded-full bg-black mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Prise en charge</p>
                    <p className="font-semibold text-sm mt-0.5">{currentOffer.pickup?.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
                  <div className="w-3 h-3 rounded-sm bg-red-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Destination</p>
                    <p className="font-semibold text-sm mt-0.5">{currentOffer.destination?.address}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handleDeclineOffer} disabled={isResponding}
                  className="flex-1 py-4 rounded-full border-2 border-gray-200 font-bold text-gray-700 text-base disabled:opacity-50">
                  Refuser
                </button>
                <button onClick={handleAcceptOffer} disabled={isResponding}
                  className="flex-[2] py-4 rounded-full bg-red-600 text-white font-black text-base shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                  {isResponding
                    ? <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />Traitement...</>
                    : <><CheckCircle2 size={18} />Accepter</>}
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* ═══ COURSE ACTIVE — Panneau bas ═══ */}
      {activeRide && (
        <div className="bg-white shadow-2xl rounded-t-3xl z-20 flex-shrink-0">
          <button className="w-full flex items-center justify-center pt-3 pb-1"
            onClick={() => setPanelExpanded(e => !e)}>
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </button>
          <div className="px-5 pb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                  activeRide.status === 'driver-assigned' ? 'bg-blue-500' :
                  activeRide.status === 'driver-arrived' ? 'bg-amber-500' : 'bg-green-500'}`} />
                <div>
                  <p className="font-black text-base">
                    {activeRide.status === 'driver-assigned' ? 'En route vers le passager' :
                     activeRide.status === 'driver-arrived' ? 'Sur place — attente passager' :
                     activeRide.status === 'in-progress' ? 'Course en cours' : 'Course'}
                  </p>
                  <p className="text-sm text-gray-500">{activeRide.passengerName}</p>
                </div>
              </div>
              {activeRide.status === 'in-progress' && (
                <div className="text-right">
                  <p className="text-xl font-black text-green-600">{formatDuration(rideTimer)}</p>
                  <p className="text-xs text-gray-400">Durée</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-3 mb-4">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">{activeRide.status === 'in-progress' ? 'Compteur' : 'Prix estimé'}</p>
                  <p className="text-xl font-black">
                    {activeRide.status === 'in-progress'
                      ? '0,00 $'
                      : formatMoney(activeRide.estimatedPrice || activeRide.pricing?.total || 0)}
                  </p>
                </div>
              </div>
              <div className="text-right max-w-44">
                <p className="text-xs text-gray-400">Destination</p>
                <p className="font-semibold text-sm leading-tight">
                  {activeRide.destination?.address || activeRide.destinationAddress}
                </p>
              </div>
            </div>

            {activeRide.status === 'driver-assigned' && (
              <button onClick={handleArrivedAtPickup}
                className="w-full py-4 rounded-full bg-black text-white font-black text-base shadow-lg flex items-center justify-center gap-2">
                <MapPin size={18} /> Je suis arrivé
              </button>
            )}
            {activeRide.status === 'driver-arrived' && (
              <button onClick={handleStartRide}
                className="w-full py-4 rounded-full bg-red-600 text-white font-black text-base shadow-lg flex items-center justify-center gap-2">
                <Flag size={18} /> Démarrer la course
              </button>
            )}
            {activeRide.status === 'in-progress' && (
              <button onClick={handleCompleteRide}
                className="w-full py-4 rounded-full bg-green-600 text-white font-black text-base shadow-lg flex items-center justify-center gap-2">
                <CheckCircle2 size={18} /> Terminer la course
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ Sheet préférences ═══ */}
      <Sheet open={showPreferences} onOpenChange={setShowPreferences}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="text-xl font-black">Préférences de conduite</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-1">
            {['Éviter les autoroutes', 'Accepter les animaux', 'Courses longues uniquement', 'Aéroport YUL'].map(pref => (
              <label key={pref} className="flex items-center justify-between py-3 border-b border-gray-100 cursor-pointer">
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
