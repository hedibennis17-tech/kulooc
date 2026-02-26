'use client';
/**
 * KULOOC — Résumé de course post-course
 * Affiche la facture détaillée et déclenche la notation
 */
import { useState } from 'react';
import { Star, MapPin, Clock, DollarSign, Download } from 'lucide-react';
import { RatingModal } from './rating-modal';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import type { FareBreakdown } from '@/lib/services/fare-service';

/** Force-reset driver status to online when closing summary */
async function pingDriverOnlineFromSummary(driverId: string) {
  try {
    await updateDoc(doc(db, 'drivers', driverId), {
      status: 'online',
      currentRideId: null,
      isOnline: true,
      onlineSince: serverTimestamp(),
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (_) {}
}

interface RideSummaryProps {
  rideId: string;
  passengerId: string;
  passengerName: string;
  driverId: string;
  driverName: string;
  pickup: { address: string };
  destination: { address: string };
  pricing: FareBreakdown;
  actualDurationMin?: number;
  userRole: 'passenger' | 'driver';
  onClose: () => void;
}

export function RideSummary({
  rideId,
  passengerId,
  passengerName,
  driverId,
  driverName,
  pickup,
  destination,
  pricing,
  actualDurationMin,
  userRole,
  onClose,
}: RideSummaryProps) {
  const [showRating, setShowRating] = useState(false);

  const targetId = userRole === 'passenger' ? driverId : passengerId;
  const targetName = userRole === 'passenger' ? driverName : passengerName;
  const raterId = userRole === 'passenger' ? passengerId : driverId;
  const raterName = userRole === 'passenger' ? passengerName : driverName;

  if (showRating) {
    return (
      <RatingModal
        rideId={rideId}
        raterId={raterId}
        raterName={raterName}
        raterRole={userRole}
        targetId={targetId}
        targetName={targetName}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">✅</div>
          <h2 className="text-2xl font-black">Course terminée !</h2>
          <p className="text-gray-500 text-sm mt-1">
            {userRole === 'passenger'
              ? `Merci d'avoir choisi KULOOC 🍁`
              : `Excellent travail, ${driverName} !`}
          </p>
        </div>

        {/* Trajet */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 rounded-full bg-black mt-1 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Départ</p>
              <p className="font-semibold text-sm">{pickup?.address}</p>
            </div>
          </div>
          <div className="w-px h-4 bg-gray-300 ml-1.5" />
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 rounded-sm bg-red-600 mt-1 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Destination</p>
              <p className="font-semibold text-sm">{destination?.address}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <Clock size={16} className="text-gray-400 mx-auto mb-1" />
            <p className="font-bold text-sm">{actualDurationMin || pricing.durationMin} min</p>
            <p className="text-xs text-gray-400">Durée</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <MapPin size={16} className="text-gray-400 mx-auto mb-1" />
            <p className="font-bold text-sm">{pricing.distanceKm?.toFixed(1)} km</p>
            <p className="text-xs text-gray-400">Distance</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <DollarSign size={16} className="text-gray-400 mx-auto mb-1" />
            <p className="font-bold text-sm text-green-600">{pricing.total?.toFixed(2)} $</p>
            <p className="text-xs text-gray-400">Total</p>
          </div>
        </div>

        {/* Détail de la facture */}
        <div className="border border-gray-100 rounded-2xl p-4 mb-4 space-y-2 text-sm">
          <h3 className="font-bold text-gray-900 mb-3">Détail de la facture</h3>
          <div className="flex justify-between text-gray-600">
            <span>Prise en charge</span>
            <span>{pricing.base?.toFixed(2)} $</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Distance ({pricing.distanceKm?.toFixed(1)} km)</span>
            <span>{pricing.perKmCharge?.toFixed(2)} $</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Temps ({pricing.durationMin} min)</span>
            <span>{pricing.perMinCharge?.toFixed(2)} $</span>
          </div>
          {pricing.surgeMultiplier > 1 && (
            <div className="flex justify-between text-orange-600">
              <span>Majoration (×{pricing.surgeMultiplier})</span>
              <span>+{pricing.surgeAmount?.toFixed(2)} $</span>
            </div>
          )}
          <div className="border-t border-gray-100 pt-2 mt-2">
            <div className="flex justify-between text-gray-600">
              <span>Sous-total</span>
              <span>{pricing.subtotalWithSurge?.toFixed(2)} $</span>
            </div>
            <div className="flex justify-between text-gray-500 text-xs">
              <span>TPS (5 %)</span>
              <span>{pricing.tps?.toFixed(2)} $</span>
            </div>
            <div className="flex justify-between text-gray-500 text-xs">
              <span>TVQ (9,975 %)</span>
              <span>{pricing.tvq?.toFixed(2)} $</span>
            </div>
          </div>
          <div className="flex justify-between font-black text-lg border-t border-gray-200 pt-2 mt-2">
            <span>TOTAL</span>
            <span className="text-green-600">{pricing.total?.toFixed(2)} $</span>
          </div>
          {userRole === 'driver' && (
            <div className="flex justify-between text-blue-600 font-semibold mt-1">
              <span>Vos gains (70 %)</span>
              <span>{pricing.driverEarnings?.toFixed(2)} $</span>
            </div>
          )}
        </div>

        {/* Boutons */}
        <div className="space-y-3">
          <button
            onClick={() => setShowRating(true)}
            className="w-full py-4 rounded-full bg-red-600 text-white font-black text-lg flex items-center justify-center gap-2"
          >
            <Star size={20} />
            Évaluer {userRole === 'passenger' ? 'le chauffeur' : 'le passager'}
          </button>
          <button
            onClick={async () => {
              // Ping driver back online even if they skip rating
              if (userRole === 'driver') {
                await pingDriverOnlineFromSummary(driverId);
              }
              onClose();
            }}
            className="w-full py-3 rounded-full border-2 border-gray-200 font-semibold text-gray-600"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
