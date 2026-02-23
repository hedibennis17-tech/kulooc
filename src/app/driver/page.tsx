'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, SlidersHorizontal, AlertTriangle, ChevronRight, TrendingUp, Plane } from 'lucide-react';
import { useUser } from '@/firebase/provider';
import { useDriver } from '@/lib/firestore/use-driver';
import { MapView } from '@/components/kulooc/map-view';
import { useToast } from '@/hooks/use-toast';
import type { RideRequest } from '@/lib/firestore/ride-service';
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

export default function DriverHomePage() {
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [selectedRequest, setSelectedRequest] = useState<RideRequest | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);

  const {
    isOnline,
    pendingRequests,
    activeRide,
    isLoading,
    onlineDuration,
    earningsToday,
    ridesCompleted,
    goOnline,
    goOffline,
    acceptRide,
    declineRide,
    arrivedAtPickup,
    startRide,
    completeRide,
  } = useDriver();

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/driver/auth');
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    if (pendingRequests.length > 0 && !selectedRequest && !activeRide) {
      setSelectedRequest(pendingRequests[0]);
    }
  }, [pendingRequests, selectedRequest, activeRide]);

  const handleToggleOnline = async () => {
    if (isOnline) {
      await goOffline();
      toast({ title: 'Vous êtes maintenant hors ligne.' });
    } else {
      await goOnline();
      toast({ title: '✅ En ligne !', description: 'En attente de courses...' });
    }
  };

  const handleAcceptRide = async (request: RideRequest) => {
    setSelectedRequest(null);
    await acceptRide(request);
    toast({ title: '🚗 Course acceptée !', description: `En route vers ${request.passengerName}` });
  };

  const handleDeclineRide = async (requestId: string) => {
    setSelectedRequest(null);
    await declineRide(requestId);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <div className="relative h-screen bg-white overflow-hidden">
      {/* Carte en fond */}
      <div className="absolute inset-0">
        {apiKey ? (
          <MapView apiKey={apiKey} route={null} />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <p className="text-gray-500 text-sm">Carte non disponible</p>
          </div>
        )}
      </div>

      {/* Header overlay */}
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
      {isOnline && (
        <div className="absolute top-20 left-4 right-4 z-10">
          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-lg p-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-black">{earningsToday.toFixed(2)} $</p>
                <p className="text-xs text-gray-500">Gains du jour</p>
              </div>
              <div>
                <p className="text-2xl font-black">{ridesCompleted}</p>
                <p className="text-xs text-gray-500">Courses</p>
              </div>
              <div>
                <p className="text-2xl font-black">{formatDuration(onlineDuration)}</p>
                <p className="text-xs text-gray-500">En ligne</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerte si hors ligne */}
      {!isOnline && (
        <div className="absolute top-20 left-4 right-4 z-10 space-y-3">
          <div className="bg-white rounded-2xl shadow-lg p-4">
            <h2 className="text-2xl font-black text-black mb-3">Impossible de<br />passer en ligne</h2>
            <div className="bg-red-50 rounded-xl p-3 border border-red-100">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-gray-900">Actions requises (1)</p>
                  <p className="text-red-600 text-xs mt-0.5">Une fois le problème résolu, vous pourrez passer en ligne.</p>
                </div>
              </div>
              <button className="w-full mt-3 flex items-center justify-between text-sm font-medium text-gray-800">
                <span>Documents manquants</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Occasions */}
          <div className="bg-white rounded-2xl shadow-md p-4">
            <div className="flex items-center gap-2 mb-2">
              <Plane className="h-4 w-4 text-gray-600" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Occasion</span>
            </div>
            <h3 className="font-black text-base">Heures de forte affluence pour les vols à YUL</h3>
            <p className="text-xs text-gray-500 mt-1">La plupart des vols atterrissent entre 15h - 18h demain</p>
            <div className="flex items-end gap-1 mt-3 h-10">
              {[30, 20, 70, 90, 85, 40].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className={`w-full rounded-sm ${h > 60 ? 'bg-black' : 'bg-gray-200'}`} style={{ height: `${h}%` }} />
                  <span className="text-[9px] text-gray-400">{13 + i}h</span>
                </div>
              ))}
            </div>
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

      {/* Bouton Passer en ligne */}
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

      {/* Sheet demande entrante */}
      <Sheet open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl p-0">
          {selectedRequest && (
            <div className="p-6">
              <SheetHeader className="mb-4">
                <SheetTitle className="text-2xl font-black">Nouvelle course</SheetTitle>
                <SheetDescription className="text-base text-gray-600">
                  {selectedRequest.passengerName} · ⭐ {selectedRequest.passengerRating?.toFixed(1) || '5.0'}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-black">{selectedRequest.estimatedPrice?.toFixed(2) || '0.00'} $</p>
                    <p className="text-sm text-gray-500">{selectedRequest.estimatedDistanceKm?.toFixed(1) || '0'} km</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{selectedRequest.serviceType || 'KULOOC X'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-black mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Prise en charge</p>
                      <p className="font-semibold text-sm">{selectedRequest.pickup?.address || selectedRequest.pickupAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-sm bg-red-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Destination</p>
                      <p className="font-semibold text-sm">{selectedRequest.destination?.address || selectedRequest.destinationAddress}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => handleDeclineRide(selectedRequest.id!)} className="flex-1 py-4 rounded-full border-2 border-gray-200 font-bold text-gray-700">Refuser</button>
                  <button onClick={() => handleAcceptRide(selectedRequest)} className="flex-[2] py-4 rounded-full bg-red-600 text-white font-bold">Accepter</button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet course active */}
      {activeRide && (
        <Sheet open={true} onOpenChange={() => {}}>
          <SheetContent side="bottom" className="rounded-t-3xl p-0">
            <div className="p-6">
              <SheetHeader className="mb-4">
                <SheetTitle className="text-xl font-black">
                  {activeRide.status === 'driver-assigned' ? '🚗 En route vers le passager' :
                   activeRide.status === 'driver-arrived' ? '📍 Arrivé au point de prise en charge' :
                   activeRide.status === 'in-progress' ? '🏁 Course en cours' : 'Course'}
                </SheetTitle>
                <SheetDescription>{activeRide.passengerName}</SheetDescription>
              </SheetHeader>
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-sm text-gray-500">Destination</p>
                  <p className="font-bold">{activeRide.destination?.address || activeRide.destinationAddress}</p>
                  <p className="text-2xl font-black mt-1">{activeRide.pricing?.total?.toFixed(2) || activeRide.estimatedPrice?.toFixed(2) || '0.00'} $</p>
                </div>
                {activeRide.status === 'driver-assigned' && (
                  <button onClick={() => arrivedAtPickup()} className="w-full py-4 rounded-full bg-black text-white font-bold text-lg">Je suis arrivé</button>
                )}
                {activeRide.status === 'driver-arrived' && (
                  <button onClick={() => startRide()} className="w-full py-4 rounded-full bg-red-600 text-white font-bold text-lg">Démarrer la course</button>
                )}
                {activeRide.status === 'in-progress' && (
                  <button onClick={() => completeRide()} className="w-full py-4 rounded-full bg-green-600 text-white font-bold text-lg">Terminer la course</button>
                )}
              </div>
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
