'use client';
/**
 * KULOOC — Page Chauffeur v7
 * ────────────────────────────────────────────────────────────────────────────
 * FIX v7 :
 *  1. GPS MANUEL : bouton "Démarrer GPS" → navMode, puis "Je suis arrivé"
 *  2. Auto-nav SUPPRIMÉ pour driver-assigned (plus de navMode auto)
 *  3. Ping reset driver après évaluation → statut revient à 'online'
 *  4. UI style Image 4 : panneau rouge transparent bas pendant la course
 *  5. dispatch-engine.ts NON MODIFIÉ
 */
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, SlidersHorizontal, TrendingUp, Plane,
  MapPin, Navigation, CheckCircle2, Flag, Phone, Star,
} from 'lucide-react';
import { useUser } from '@/firebase/provider';
import { useDriver } from '@/lib/firestore/use-driver';
import { useDriverOffer } from '@/lib/firestore/use-driver-offer';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { NavigationMap } from '@/components/kulooc/navigation-map';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/firebase';
import { getDispatchEngine } from '@/lib/dispatch/dispatch-engine';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { doc, addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore';

function fmtDur(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
function fmtMoney(n: number) { return (n || 0).toFixed(2) + '\u00a0$'; }

// ── Types locaux ──────────────────────────────────────────────────────────────
type RatingTag = 'Poli' | 'Propre' | 'À l\'heure' | 'Bon trajet' | 'Silencieux';
const RATING_TAGS: RatingTag[] = ['Poli', 'Propre', 'À l\'heure', 'Bon trajet', 'Silencieux'];

export default function DriverHomePage() {
  const { user, isUserLoading: userLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  const [showPrefs, setShowPrefs] = useState(false);
  const [navMode, setNavMode] = useState<'to-pickup' | 'to-destination' | null>(null);
  const [rideTimer, setRideTimer] = useState(0);
  const [showRating, setShowRating] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingTags, setRatingTags] = useState<RatingTag[]>([]);
  const [completedRideId, setCompletedRideId] = useState<string | null>(null);
  const [completedPassengerId, setCompletedPassengerId] = useState<string | null>(null);
  const rideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const engineStartedRef = useRef(false);

  // ── Hooks métier ───────────────────────────────────────────────────────────
  const {
    isOnline, activeRide, isLoading, onlineDuration, earningsToday,
    ridesCompleted, currentLocation, goOnline, goOffline,
    arrivedAtPickup, startRide, completeRide,
  } = useDriver();

  const { currentOffer, countdown, isResponding, acceptOffer, declineOffer } =
    useDriverOffer(currentLocation ?? null);

  // ── Moteur dispatch — démarre dès auth ────────────────────────────────────
  useEffect(() => {
    if (user?.uid && !engineStartedRef.current) {
      getDispatchEngine(db).start();
      engineStartedRef.current = true;
    }
  }, [user?.uid]);

  // ── Timer course ──────────────────────────────────────────────────────────
  useEffect(() => {
    const status = activeRide?.status as string | undefined;
    if (status === 'in-progress') {
      if (!rideTimerRef.current)
        rideTimerRef.current = setInterval(() => setRideTimer(p => p + 1), 1000);
    } else {
      if (rideTimerRef.current) { clearInterval(rideTimerRef.current); rideTimerRef.current = null; }
      setRideTimer(0);
    }
    return () => { if (rideTimerRef.current) clearInterval(rideTimerRef.current); };
  }, [activeRide?.status]);

  // ── Reset navMode quand la course se termine ──────────────────────────────
  useEffect(() => {
    if (!activeRide) { setNavMode(null); return; }
    // En-cours → auto-nav vers destination
    if (activeRide.status === 'in-progress' && navMode !== 'to-destination') {
      setNavMode('to-destination');
    }
    // Arrivé / terminé → stop nav
    if (activeRide.status === 'driver-arrived' || activeRide.status === 'completed') {
      setNavMode(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRide?.status]);

  useEffect(() => {
    if (!userLoading && !user) router.push('/driver/auth');
  }, [user, userLoading, router]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleToggleOnline = async () => {
    if (isOnline) { await goOffline(); toast({ title: 'Hors ligne.' }); }
    else { await goOnline(); toast({ title: '✅ En ligne !', description: 'En attente de courses...' }); }
  };

  const handleAccept = async () => {
    await acceptOffer();
    toast({ title: '✅ Course acceptée !', description: 'Démarrez le GPS quand vous êtes prêt.' });
  };

  const handleDecline = async () => {
    await declineOffer();
    toast({ title: 'Course refusée.' });
  };

  const handleStartGPS = () => {
    setNavMode('to-pickup');
    toast({ title: '🧭 GPS activé', description: 'Navigation vers le passager.' });
  };

  const handleArrived = async () => {
    await arrivedAtPickup();
    setNavMode(null);
    toast({ title: '📍 Arrivé !', description: 'Notification envoyée au passager.' });
  };

  const handleStartRide = async () => {
    await startRide();
    setNavMode('to-destination');
    toast({ title: '🏁 Course démarrée !' });
  };

  const handleComplete = async () => {
    const rideId = activeRide?.id || null;
    const passId = activeRide?.passengerId || null;
    await completeRide();
    setNavMode(null);
    setCompletedRideId(rideId);
    setCompletedPassengerId(passId);
    setTimeout(() => setShowRating(true), 1500);
    toast({ title: '✅ Course terminée !', description: 'Gains mis à jour.' });
  };

  const handleSubmitRating = async () => {
    setShowRating(false);
    // Sauvegarder l'évaluation
    if (completedRideId && completedPassengerId && user?.uid) {
      await addDoc(collection(db, 'ratings'), {
        rideId: completedRideId,
        raterId: user.uid,
        ratedId: completedPassengerId,
        raterRole: 'driver',
        stars: ratingStars,
        tags: ratingTags,
        createdAt: serverTimestamp(),
      }).catch(() => {});
    }
    // PING — remet le chauffeur online via API serveur (filet de sécurité)
    if (user?.uid) {
      fetch('/api/driver-ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: user.uid }),
      }).then(async (r) => {
        const d = await r.json().catch(() => ({}));
        console.log('[driver-ping]', d);
      }).catch(console.warn);
      // Aussi forcer localement via Firestore direct
      await updateDoc(doc(db, 'drivers', user.uid), {
        status: 'online', currentRideId: null, updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
    setRatingStars(5); setRatingTags([]); setCompletedRideId(null); setCompletedPassengerId(null);
    toast({ title: '⭐ Évaluation envoyée !', description: 'Prêt pour la prochaine course.' });
  };

  // ── Positions ─────────────────────────────────────────────────────────────
  const driverPos = currentLocation
    ? { lat: currentLocation.latitude, lng: currentLocation.longitude } : null;
  const pickupPos = activeRide?.pickup?.latitude
    ? { lat: activeRide.pickup.latitude, lng: activeRide.pickup.longitude } : null;
  const destPos = activeRide?.destination?.latitude
    ? { lat: activeRide.destination.latitude, lng: activeRide.destination.longitude } : null;

  const isNavActive = navMode !== null && driverPos !== null &&
    ((navMode === 'to-pickup' && pickupPos !== null) || (navMode === 'to-destination' && destPos !== null));

  if (userLoading) return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-red-600 border-t-transparent" />
    </div>
  );

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-100 flex flex-col">

      {/* ══════════════════════════════════════════════════════════════
          CARTE / NAVIGATION
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 relative min-h-0">
        {isNavActive && driverPos ? (
          <NavigationMap
            origin={driverPos}
            destination={navMode === 'to-pickup' ? pickupPos! : destPos!}
            destinationLabel={
              navMode === 'to-pickup'
                ? (activeRide?.pickup?.address || 'Passager')
                : (activeRide?.destination?.address || activeRide?.destinationAddress || 'Destination')
            }
            mode={navMode}
            onArrived={navMode === 'to-pickup' ? handleArrived : undefined}
          />
        ) : (
          <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
            <Map
              defaultCenter={driverPos || { lat: 45.5648, lng: -73.7462 }}
              defaultZoom={14}
              mapId="a22506a8155b4369"
              gestureHandling="greedy"
              disableDefaultUI={true}
              className="w-full h-full"
            >
              {driverPos && (
                <AdvancedMarker position={driverPos}>
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-10 h-10 rounded-full bg-blue-500/25 animate-ping" />
                    <div className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-lg" />
                  </div>
                </AdvancedMarker>
              )}
              {pickupPos && (activeRide?.status === 'driver-arrived' || activeRide?.status === 'driver-assigned') && (
                <AdvancedMarker position={pickupPos}>
                  <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-xl border-2 border-white">
                    <MapPin size={18} className="text-white" />
                  </div>
                </AdvancedMarker>
              )}
            </Map>
          </APIProvider>
        )}

        {/* Header KULOOC — visible seulement quand pas en GPS */}
        {!isNavActive && (
          <div className="absolute left-0 right-0 top-3 z-10 flex items-center justify-between px-4">
            <div className="bg-white/95 backdrop-blur rounded-2xl px-3 py-2 shadow flex items-center gap-2">
              <span className="font-black text-red-600 text-lg">KULOOC</span>
              <span className="text-red-500">🍁</span>
              {isOnline && (
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse ml-1" />
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowPrefs(true)}
                className="w-10 h-10 bg-white/95 backdrop-blur rounded-full shadow flex items-center justify-center">
                <SlidersHorizontal size={18} className="text-gray-700" />
              </button>
              <button className="w-10 h-10 bg-white/95 backdrop-blur rounded-full shadow flex items-center justify-center">
                <Shield size={18} className="text-gray-700" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          PANNEAU BAS — Hors ligne / En attente (sans course)
      ══════════════════════════════════════════════════════════════ */}
      {!currentOffer && !activeRide && (
        <div className="bg-white shadow-2xl rounded-t-3xl z-20 flex-shrink-0">
          <div className="w-full flex items-center justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>
          <div className="px-5 pb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <div>
                  <p className="font-black text-base">{isOnline ? 'En ligne' : 'Hors ligne'}</p>
                  {isOnline && (
                    <p className="text-xs text-gray-500">{Math.floor(onlineDuration / 60)}h {onlineDuration % 60}m</p>
                  )}
                </div>
              </div>
              {isOnline && (
                <div className="flex gap-4 text-right">
                  <div>
                    <p className="text-xs text-gray-500">Gains</p>
                    <p className="font-black text-green-600 text-sm">{fmtMoney(earningsToday)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Courses</p>
                    <p className="font-black text-sm">{ridesCompleted}</p>
                  </div>
                </div>
              )}
            </div>

            {isOnline && (
              <p className="text-center text-sm text-gray-400 mb-3 animate-pulse">⏳ En attente d&apos;une course...</p>
            )}

            <button onClick={handleToggleOnline} disabled={isLoading}
              className={`w-full py-4 rounded-full text-white font-black text-base shadow-lg flex items-center justify-center gap-3 transition-all ${
                isOnline ? 'bg-gray-900' : 'bg-red-600'
              } disabled:opacity-50`}>
              <div className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-white" />
              </div>
              {isLoading ? 'Chargement...' : isOnline ? 'Passer hors ligne' : 'Passer en ligne'}
            </button>

            {!isOnline && (
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
                    <p className="text-xs text-green-600">Meilleures heures et secteurs</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          OFFRE — Sheet 60s (ÉTAPE 1)
      ══════════════════════════════════════════════════════════════ */}
      {currentOffer && !activeRide && (
        <Sheet open={true} onOpenChange={() => {}}>
          <SheetContent side="bottom" className="rounded-t-3xl p-0 z-50 max-h-[95vh] overflow-y-auto">
            <div className="p-5">
              {/* Timer circulaire */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <SheetTitle className="text-xl font-black">Nouvelle course !</SheetTitle>
                  <SheetDescription className="text-sm text-gray-500">Répondez avant la fin du compte à rebours</SheetDescription>
                </div>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 font-black text-2xl ${
                  countdown > 30 ? 'border-green-500 text-green-600' :
                  countdown > 15 ? 'border-orange-500 text-orange-600' :
                  'border-red-600 text-red-600 animate-pulse'}`}>
                  {countdown}
                </div>
              </div>

              {/* Prix + service */}
              <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between mb-4">
                <div>
                  <p className="text-3xl font-black text-green-600">{fmtMoney(currentOffer.estimatedPrice)}</p>
                  <p className="text-xs text-green-500 font-bold">Votre gain: {fmtMoney((currentOffer.estimatedPrice || 0) * 0.70)}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {currentOffer.estimatedDistanceKm?.toFixed(1)} km · ~{currentOffer.estimatedDurationMin} min
                  </p>
                </div>
                <span className="text-sm font-bold bg-red-100 text-red-700 px-3 py-1.5 rounded-full">
                  {currentOffer.serviceType || 'KULOOC X'}
                </span>
              </div>

              {/* Passager */}
              <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {currentOffer.passengerName?.charAt(0).toUpperCase() || 'P'}
                </div>
                <div>
                  <p className="font-bold">{currentOffer.passengerName}</p>
                  <p className="text-xs text-gray-500">Passager</p>
                </div>
              </div>

              {/* Adresses */}
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

              {/* Boutons */}
              <div className="flex gap-3">
                <button onClick={handleDecline} disabled={isResponding}
                  className="flex-1 py-4 rounded-full border-2 border-gray-200 font-bold text-gray-700 disabled:opacity-50">
                  Refuser
                </button>
                <button onClick={handleAccept} disabled={isResponding}
                  className="flex-[2] py-4 rounded-full bg-red-600 text-white font-black shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                  {isResponding
                    ? <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />Traitement...</>
                    : <><CheckCircle2 size={18} />Accepter</>}
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* ══════════════════════════════════════════════════════════════
          COURSE ACTIVE — Panneau bas style Image 4
          Fond sombre/rouge transparent, actions séquentielles
      ══════════════════════════════════════════════════════════════ */}
      {activeRide && (
        <div
          className="z-20 flex-shrink-0 rounded-t-3xl shadow-2xl overflow-hidden"
          style={{ background: isNavActive ? 'rgba(0,0,0,0.92)' : 'white' }}
        >
          {/* Drag handle */}
          <div className="flex items-center justify-center pt-3 pb-2">
            <div className={`w-10 h-1 rounded-full ${isNavActive ? 'bg-white/30' : 'bg-gray-200'}`} />
          </div>

          <div className="px-5 pb-6 space-y-3">

            {/* Info course + passager */}
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-black text-base ${isNavActive ? 'text-white' : 'text-gray-900'}`}>
                  {activeRide.passengerName}
                </p>
                <p className={`text-sm ${isNavActive ? 'text-white/60' : 'text-gray-400'}`}>
                  {(activeRide.status as string) === 'driver-assigned' ? 'En route vers le passager' :
                   (activeRide.status as string) === 'driver-arrived' ? 'Sur place — passager notifié ✓' :
                   (activeRide.status as string) === 'in-progress' ? `Course en cours · ${fmtDur(rideTimer)}` : 'Course'}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-xl font-black ${isNavActive ? 'text-green-400' : 'text-green-600'}`}>
                  {fmtMoney(activeRide.estimatedPrice || activeRide.pricing?.total || 0)}
                </p>
                <p className={`text-xs ${isNavActive ? 'text-green-400/70' : 'text-green-500/80'}`}>
                  Gain: {fmtMoney((activeRide.estimatedPrice || 0) * 0.70)}
                </p>
              </div>
            </div>

            {/* Adresses */}
            <div className={`rounded-2xl p-3 space-y-2 ${isNavActive ? 'bg-white/10' : 'bg-gray-50'}`}>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-black mt-1.5 flex-shrink-0" />
                <p className={`text-xs flex-1 leading-tight ${isNavActive ? 'text-white/80' : 'text-gray-700'}`}>
                  {activeRide.pickup?.address}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-sm bg-red-500 mt-1.5 flex-shrink-0" />
                <p className={`text-xs flex-1 leading-tight ${isNavActive ? 'text-white/80' : 'text-gray-700'}`}>
                  {activeRide.destination?.address || activeRide.destinationAddress}
                </p>
              </div>
            </div>

            {/* ── ÉTAPES SÉQUENTIELLES ──────────────────────────────────────
                RÈGLE: UN SEUL bouton principal à la fois
            ─────────────────────────────────────────────────────────────── */}

            {/* ÉTAPE 2 — Démarrer GPS (driver-assigned + GPS pas encore actif) */}
            {(activeRide.status as string) === 'driver-assigned' && !isNavActive && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black flex-shrink-0">2</span>
                  <p className="text-sm font-bold text-gray-700">Naviguez vers le passager</p>
                </div>
                <button onClick={handleStartGPS}
                  className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-base shadow-lg flex items-center justify-center gap-3 active:scale-[0.98]">
                  <Navigation size={18} />
                  Démarrer GPS — Aller au client
                </button>
              </div>
            )}

            {/* ÉTAPE 3 — Je suis arrivé (driver-assigned + GPS actif) */}
            {(activeRide.status as string) === 'driver-assigned' && isNavActive && (
              <div className="space-y-2">
                <div className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  GPS actif — Navigation vers le passager
                </div>
                <div className="flex items-center gap-2 px-1">
                  <span className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center text-xs font-black flex-shrink-0">3</span>
                  <p className="text-sm font-bold text-white/90">Appuyez quand vous êtes devant le passager</p>
                </div>
                <button onClick={handleArrived}
                  className="w-full py-4 rounded-full bg-white text-black font-black text-base shadow-lg flex items-center justify-center gap-2 active:scale-[0.98]">
                  <MapPin size={18} /> Je suis arrivé chez le passager
                </button>
              </div>
            )}

            {/* ÉTAPE 4 — Commencer (driver-arrived) */}
            {(activeRide.status as string) === 'driver-arrived' && (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex items-center gap-3">
                  <span className="text-xl">⏳</span>
                  <div>
                    <p className="font-black text-amber-900 text-sm">Passager notifié ✓</p>
                    <p className="text-xs text-amber-700">«Votre taxi KULOOC est devant vous»</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-1">
                  <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-black flex-shrink-0">4</span>
                  <p className="text-sm font-bold text-gray-700">Appuyez quand le passager est monté</p>
                </div>
                <button onClick={handleStartRide}
                  className="w-full py-4 rounded-full bg-red-600 text-white font-black text-base shadow-lg flex items-center justify-center gap-2 active:scale-[0.98]">
                  <Flag size={18} /> Commencer la course
                </button>
              </div>
            )}

            {/* ÉTAPE 5 — Terminer (in-progress) */}
            {(activeRide.status as string) === 'in-progress' && (
              <div className="space-y-2">
                <div className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-green-500/20 text-green-300 border border-green-500/30">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  GPS actif — Navigation vers la destination
                </div>
                <div className="flex items-center gap-2 px-1">
                  <span className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-black flex-shrink-0">5</span>
                  <p className={`text-sm font-bold ${isNavActive ? 'text-white/90' : 'text-gray-700'}`}>Appuyez à la destination du passager</p>
                </div>
                <button onClick={handleComplete}
                  className="w-full py-4 rounded-full bg-green-600 text-white font-black text-base shadow-lg flex items-center justify-center gap-2 active:scale-[0.98]">
                  <CheckCircle2 size={18} /> Terminer la course
                </button>
              </div>
            )}

            {/* Appel passager */}
            {activeRide.passengerPhone && ((activeRide.status as string) === 'driver-assigned' || (activeRide.status as string) === 'driver-arrived') && (
              <a href={`tel:${activeRide.passengerPhone}`}
                className={`w-full py-3 rounded-full border font-semibold text-sm flex items-center justify-center gap-2 ${
                  isNavActive
                    ? 'border-white/20 text-white/70'
                    : 'border-gray-200 text-gray-600'
                }`}>
                <Phone size={14} /> Appeler {activeRide.passengerPhone}
              </a>
            )}

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL ÉVALUATION (ÉTAPE 6)
      ══════════════════════════════════════════════════════════════ */}
      <Sheet open={showRating} onOpenChange={(o) => { if (!o) handleSubmitRating(); }}>
        <SheetContent side="bottom" className="rounded-t-3xl z-[60] p-0">
          <div className="p-5">
            <SheetTitle className="text-xl font-black text-center mb-1">Évaluer le passager</SheetTitle>
            <p className="text-sm text-gray-500 text-center mb-5">Comment s&apos;est passée la course ?</p>

            {/* Étoiles */}
            <div className="flex justify-center gap-3 mb-5">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRatingStars(s)}>
                  <Star
                    size={36}
                    className={s <= ratingStars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                  />
                </button>
              ))}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 justify-center mb-5">
              {RATING_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setRatingTags(t => t.includes(tag) ? t.filter(x => x !== tag) : [...t, tag])}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                    ratingTags.includes(tag)
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            <button onClick={handleSubmitRating}
              className="w-full py-4 rounded-full bg-red-600 text-white font-black text-base shadow-lg">
              ✅ Soumettre l&apos;évaluation
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ══════════════════════════════════════════════════════════════
          Sheet préférences
      ══════════════════════════════════════════════════════════════ */}
      <Sheet open={showPrefs} onOpenChange={setShowPrefs}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="text-xl font-black">Préférences de conduite</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-1">
            {['Éviter les autoroutes', 'Accepter les animaux', 'Courses longues uniquement', 'Aéroport YUL'].map(p => (
              <label key={p} className="flex items-center justify-between py-3 border-b border-gray-100 cursor-pointer">
                <span className="font-medium text-gray-800">{p}</span>
                <input type="checkbox" className="w-5 h-5 accent-red-600" />
              </label>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
