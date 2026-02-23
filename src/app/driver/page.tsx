'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, SlidersHorizontal, TrendingUp, Plane, MapPin, Navigation, Star, Phone } from 'lucide-react';
import { useUser } from '@/firebase/provider';
import { useDriver } from '@/lib/firestore/use-driver';
import { useDriverOffer } from '@/lib/firestore/use-driver-offer';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/firebase';
import { getDispatchEngine } from '@/lib/dispatch/dispatch-engine';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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
  const rideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const engineStartedRef = useRef(false);

  const {
    isOnline,
    activeRide,
    isLoading,
    onlineDuration,
    earningsToday,
    ridesCompleted,
    currentLocation,
    goOnline,
    goOffline,
    arrivedAtPickup,
    startRide,
    completeRide,
  } = useDriver();

  const {
    currentOffer,
    countdown,
    isResponding,
    acceptOffer,
    declineOffer,
  } = useDriverOffer(currentLocation ?? null);

  // Démarrer le moteur de dispatch quand le chauffeur est en ligne
  useEffect(() => {
    if (isOnline && !engineStartedRef.current) {
      const engine = getDispatchEngine(db);
      engine.start();
      engineStartedRef.current = true;
    } else if (!isOnline && engineStartedRef.current) {
      const engine = getDispatchEngine(db);
      engine.stop();
      engineStartedRef.current = false;
    }
  }, [isOnline]);

  // Timer de course
  useEffect(() => {
    if (activeRide?.status === 'in-progress') {
      if (!rideTimerRef.current) {
        rideTimerRef.current = setInterval(() => setRideTimer((p) => p + 1), 1000);
      }
    } else {
      if (rideTimerRef.current) { clearInterval(rideTimerRef.current); rideTimerRef.current = null; }
      setRideTimer(0);
    }
    return () => { if (rideTimerRef.current) clearInterval(rideTimerRef.current); };
  }, [activeRide?.status]);

  useEffect(() => {
    if (!userLoading && !user) router.push('/driver/auth');
  }, [user, userLoading, router]);

  const handleToggleOnline = async () => {
    if (isOnline) {
      await goOffline();
      toast({ title: 'Vous êtes maintenant hors ligne.' });
    } else {
      await goOnline();
      toast({ title: '✅ En ligne !', description: 'En attente de courses...' });
    }
  };

  const handleAcceptOffer = async () => {
    await acceptOffer();
    toast({ title: '🚗 Course acceptée !', description: 'En route vers le passager' });
  };

  const handleDeclineOffer = async () => {
    await declineOffer();
    toast({ title: 'Course refusée', description: 'Recherche du prochain chauffeur...' });
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-white">
      {/* Carte GPS */}
      <div className="absolute inset-0">
        {apiKey ? (
          <APIProvider apiKey={apiKey}>
            <Map
              defaultCenter={currentLocation
                ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
                : { lat: 45.5631, lng: -73.7124 }
              }
              defaultZoom={15}
              mapId="a22506a8155b4369"
              disableDefaultUI={true}
              gestureHandling="greedy"
              className="w-full h-full"
            >
              {currentLocation && (
                <AdvancedMarker
                  position={{ lat: currentLocation.latitude, lng: currentLocation.longitude }}
                  title="Votre position"
                >
                  <div className="relative">
                    <div className="absolute w-10 h-10 rounded-full bg-blue-500/25 animate-ping" />
                    <div className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-lg" />
                  </div>
                </AdvancedMarker>
              )}
            </Map>
          </APIProvider>
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <p className="text-gray-500 text-sm">Carte non disponible</p>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between">
        <div className="bg-white rounded-full px-4 py-2 shadow-md">
          <span className="text-xl font-black tracking-tighter text-red-600">KULOOC 🍁</span>
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

      {/* Stats si en ligne */}
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
            <p className="text-center text-sm text-gray-500 mt-3 animate-pulse">⏳ En attente d'une course...</p>
          </div>
        </div>
      )}

      {/* Info si hors ligne */}
      {!isOnline && (
        <div className="absolute top-20 left-4 right-4 z-10 space-y-3">
          <div className="bg-white rounded-2xl shadow-lg p-4">
            <h2 className="text-2xl font-black text-black mb-2">Prêt à conduire ?</h2>
            <p className="text-sm text-gray-500">Appuyez sur <strong>Passer en ligne</strong> pour commencer à recevoir des courses.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-4">
            <div className="flex items-center gap-2 mb-2">
              <Plane className="h-4 w-4 text-gray-600" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Occasion</span>
            </div>
            <h3 className="font-black text-base">Heures de forte affluence pour les vols à YUL</h3>
            <p className="text-xs text-gray-500 mt-1">La plupart des vols atterrissent entre 15h - 18h demain</p>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-gray-600" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenus</span>
            </div>
            <h3 className="font-black text-base">Tendances des revenus pour les courses à Montréal</h3>
            <p className="text-xs text-gray-500 mt-1">Découvrez les meilleures heures et les meilleurs secteurs aujourd&apos;hui</p>
          </div>
        </div>
      )}

      {/* Bouton En ligne / Hors ligne */}
      {!activeRide && !currentOffer && (
        <div className="absolute bottom-24 left-4 right-4 z-10">
          <button
            onClick={handleToggleOnline}
            disabled={isLoading}
            className={`w-full py-4 rounded-full text-white font-bold text-lg shadow-xl flex items-center justify-center gap-3 transition-all ${
              isOnline ? 'bg-black hover:bg-gray-900' : 'bg-red-600 hover:bg-red-700'
            } disabled:opacity-50`}
          >
            <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-white" />
            </div>
            {isLoading ? 'Chargement...' : isOnline ? 'Passer hors ligne' : 'Passer en ligne'}
          </button>
        </div>
      )}

      {/* ═══ OFFRE DE COURSE — Countdown 60s ═══ */}
      {currentOffer && !activeRide && (
        <Sheet open={true} onOpenChange={() => {}}>
          <SheetContent side="bottom" className="rounded-t-3xl p-0 z-50">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <SheetTitle className="text-xl font-black">Nouvelle course !</SheetTitle>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 font-black text-xl ${
                  countdown > 20 ? 'border-green-500 text-green-600' :
                  countdown > 10 ? 'border-orange-500 text-orange-600' :
                  'border-red-600 text-red-600 animate-pulse'
                }`}>
                  {countdown}
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between mb-4">
                <div>
                  <p className="text-3xl font-black text-green-600">{formatMoney(currentOffer.estimatedPrice)}</p>
                  <p className="text-sm text-gray-500">
                    {currentOffer.estimatedDistanceKm?.toFixed(1)} km · ~{currentOffer.estimatedDurationMin} min
                  </p>
                </div>
                <span className="text-sm font-bold bg-red-100 text-red-700 px-3 py-1 rounded-full">
                  {currentOffer.serviceType || 'KULOOC X'}
                </span>
              </div>

              <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                  {currentOffer.passengerName?.charAt(0).toUpperCase() || 'P'}
                </div>
                <div>
                  <p className="font-bold">{currentOffer.passengerName}</p>
                  <p className="text-xs text-gray-500">Passager</p>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-black mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Prise en charge</p>
                    <p className="font-semibold text-sm">{currentOffer.pickup?.address}</p>
                  </div>
                </div>
                <div className="w-px h-4 bg-gray-300 ml-1.5" />
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-sm bg-red-600 mt-1 flex-shrink-0" />
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
                      Traitement...
                    </span>
                  ) : 'Accepter'}
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* ═══ COURSE ACTIVE ═══ */}
      {activeRide && (
        <Sheet open={true} onOpenChange={() => {}}>
          <SheetContent side="bottom" className="rounded-t-3xl p-0 z-50">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <SheetTitle className="text-xl font-black">
                    {activeRide.status === 'driver-assigned' ? '🚗 En route' :
                     activeRide.status === 'driver-arrived' ? '📍 Sur place' :
                     activeRide.status === 'in-progress' ? '🏁 En course' : 'Course'}
                  </SheetTitle>
                  <SheetDescription>{activeRide.passengerName}</SheetDescription>
                </div>
                {activeRide.status === 'in-progress' && (
                  <div className="text-right">
                    <p className="text-2xl font-black text-green-600">{formatDuration(rideTimer)}</p>
                    <p className="text-xs text-gray-500">Durée</p>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">
                      {activeRide.status === 'in-progress' ? 'Compteur' : 'Prix estimé'}
                    </p>
                    <p className="text-3xl font-black">
                      {activeRide.status === 'in-progress' ? '0,00 $' :
                       formatMoney(activeRide.estimatedPrice || activeRide.pricing?.total || 0)}
                    </p>
                  </div>
                  <div className="text-right max-w-40">
                    <p className="text-xs text-gray-500">Destination</p>
                    <p className="font-semibold text-sm">
                      {activeRide.destination?.address || activeRide.destinationAddress}
                    </p>
                  </div>
                </div>
              </div>

              {activeRide.status === 'driver-assigned' && (
                <button
                  onClick={() => arrivedAtPickup()}
                  className="w-full py-5 rounded-full bg-black text-white font-black text-lg shadow-lg flex items-center justify-center gap-2"
                >
                  <MapPin size={20} /> Je suis arrivé
                </button>
              )}
              {activeRide.status === 'driver-arrived' && (
                <button
                  onClick={() => startRide()}
                  className="w-full py-5 rounded-full bg-red-600 text-white font-black text-lg shadow-lg flex items-center justify-center gap-2"
                >
                  <Navigation size={20} /> Démarrer la course
                </button>
              )}
              {activeRide.status === 'in-progress' && (
                <button
                  onClick={() => completeRide()}
                  className="w-full py-5 rounded-full bg-green-600 text-white font-black text-lg shadow-lg flex items-center justify-center gap-2"
                >
                  <Star size={20} /> Terminer la course
                </button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Sheet préférences */}
      <Sheet open={showPreferences} onOpenChange={setShowPreferences}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="text-xl font-black">Préférences de conduite</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {['Éviter les autoroutes', 'Accepter les animaux', 'Courses longues uniquement', 'Aéroport YUL'].map(pref => (
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
