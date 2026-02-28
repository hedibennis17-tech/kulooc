'use client';
/**
 * KULOOC — RideSummary v2
 * Reçu de course SAAS UX + Rating intégré
 * Affiché côté chauffeur ET côté passager après completeRide()
 */
import { useState } from 'react';
import { Star, MapPin, Clock, Navigation, ChevronRight, X, Check } from 'lucide-react';
import { db } from '@/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import type { FareBreakdown } from '@/lib/services/fare-service';

interface RideSummaryProps {
  rideId: string;
  passengerId: string;
  passengerName: string;
  driverId: string;
  driverName: string;
  pickup: { address: string };
  destination: { address: string };
  pricing: Partial<FareBreakdown> & { total?: number; driverEarnings?: number };
  actualDurationMin?: number;
  userRole: 'passenger' | 'driver';
  onClose: () => void;
}

const TAGS_DRIVER   = ['Poli', 'Propre', 'À l\'heure', 'Bon trajet', 'Silencieux', 'Recommandé'];
const TAGS_PASSENGER = ['Très pro', 'Conduite sécuritaire', 'Ponctuel', 'Véhicule propre', 'Agréable'];

export function RideSummary({
  rideId, passengerId, passengerName, driverId, driverName,
  pickup, destination, pricing, actualDurationMin, userRole, onClose,
}: RideSummaryProps) {
  const [phase, setPhase] = useState<'receipt' | 'rating' | 'done'>('receipt');
  const [stars, setStars] = useState(5);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetId   = userRole === 'passenger' ? driverId    : passengerId;
  const targetName = userRole === 'passenger' ? driverName  : passengerName;
  const raterId    = userRole === 'passenger' ? passengerId : driverId;
  const raterName  = userRole === 'passenger' ? passengerName : driverName;
  const tagList    = userRole === 'passenger' ? TAGS_PASSENGER : TAGS_DRIVER;

  const total    = pricing?.total ?? 0;
  const earnings = pricing?.driverEarnings ?? total * 0.70;
  const base     = pricing?.base ?? 0;
  const perKm    = pricing?.perKmCharge ?? 0;
  const perMin   = pricing?.perMinCharge ?? 0;
  const tps      = pricing?.tps ?? 0;
  const tvq      = pricing?.tvq ?? 0;
  const distKm   = pricing?.distanceKm ?? 0;
  const durMin   = actualDurationMin ?? pricing?.durationMin ?? 0;
  const surge    = pricing?.surgeMultiplier ?? 1;

  const toggleTag = (t: string) =>
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const handleSubmitRating = async () => {
    if (stars === 0) return;
    setIsSubmitting(true);
    try {
      const fullComment = [...tags, comment.trim()].filter(Boolean).join(' · ');
      await addDoc(collection(db, 'ratings'), {
        rideId, raterId, raterName, raterRole: userRole,
        targetId, targetName, rating: stars,
        comment: fullComment, tags, createdAt: serverTimestamp(),
      });
      const field = userRole === 'passenger' ? 'passengerRating' : 'driverRating';
      await updateDoc(doc(db, 'completed_rides', rideId), {
        [field]: { rating: stars, comment: fullComment, ratedAt: serverTimestamp() },
      }).catch(() => {});
      setPhase('done');
      setTimeout(onClose, 1800);
    } finally {
      setIsSubmitting(false);
    }
  };

  const starLabels = ['', 'Mauvais', 'Passable', 'Bien', 'Très bien', 'Excellent !'];

  /* ── DONE ── */
  if (phase === 'done') return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-10 text-center max-w-xs w-full shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <Check size={32} className="text-green-500" strokeWidth={2.5} />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-1">Merci !</h2>
        <p className="text-gray-400 text-sm">Votre évaluation a été soumise.</p>
      </div>
    </div>
  );

  /* ── RATING ── */
  if (phase === 'rating') return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-end justify-center">
      <div className="bg-white rounded-t-3xl w-full max-w-lg pb-safe overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-gray-900">
              {userRole === 'passenger' ? 'Évaluer le chauffeur' : 'Évaluer le passager'}
            </h2>
            <button onClick={() => { setPhase('receipt'); }} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <X size={14} className="text-gray-500" />
            </button>
          </div>
          {/* Avatar + nom cible */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center text-white text-lg font-black flex-shrink-0">
              {targetName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-gray-900">{targetName}</p>
              <p className="text-xs text-gray-400">{userRole === 'passenger' ? 'Votre chauffeur' : 'Votre passager'}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Étoiles */}
          <div className="text-center">
            <div className="flex justify-center gap-2 mb-2">
              {[1,2,3,4,5].map(s => (
                <button key={s}
                  onMouseEnter={() => setHoveredStar(s)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => setStars(s)}
                  className="transition-transform hover:scale-110 active:scale-95">
                  <Star size={40}
                    className={`transition-colors ${s <= (hoveredStar || stars) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                </button>
              ))}
            </div>
            {stars > 0 && <p className="text-sm font-semibold text-gray-600">{starLabels[stars]}</p>}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {tagList.map(tag => (
              <button key={tag} onClick={() => toggleTag(tag)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all ${
                  tags.includes(tag)
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}>
                {tag}
              </button>
            ))}
          </div>

          {/* Commentaire */}
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Commentaire optionnel..."
            className="w-full border-2 border-gray-100 rounded-2xl p-4 text-sm resize-none h-20 focus:outline-none focus:border-gray-300 bg-gray-50"
          />

          {/* Bouton */}
          <button onClick={handleSubmitRating} disabled={stars === 0 || isSubmitting}
            className="w-full py-4 rounded-full font-black text-base disabled:opacity-40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ background: '#DC2626', color: 'white' }}>
            {isSubmitting
              ? <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />Envoi...</>
              : <><Star size={18} fill="white" />Soumettre l&apos;évaluation</>}
          </button>
          <button onClick={onClose} className="w-full py-3 text-gray-400 text-sm font-medium">
            Passer
          </button>
        </div>
      </div>
    </div>
  );

  /* ── RECEIPT ── */
  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-end justify-center">
      <div className="bg-white rounded-t-3xl w-full max-w-lg overflow-hidden" style={{ maxHeight: '92vh' }}>

        {/* Header reçu */}
        <div className="px-6 pt-6 pb-5" style={{ background: 'linear-gradient(135deg, #0A0A0A 0%, #1C1C1C 100%)' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">Course terminée</p>
              <h2 className="text-white text-2xl font-black">Reçu KULOOC</h2>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
              <X size={16} className="text-white/70" />
            </button>
          </div>

          {/* Prix principal */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-white/50 text-sm">Total payé</p>
              <p className="text-white font-black" style={{ fontSize: 42, lineHeight: 1 }}>
                {total.toFixed(2)} <span className="text-2xl">$</span>
              </p>
            </div>
            {userRole === 'driver' && (
              <div className="text-right">
                <p className="text-white/50 text-xs">Vos gains</p>
                <p className="text-green-400 font-black text-2xl">{earnings.toFixed(2)} $</p>
                <p className="text-white/30 text-xs">70% du total</p>
              </div>
            )}
          </div>
        </div>

        {/* Body scrollable */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(92vh - 200px)' }}>

          {/* Trajet */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 pt-1">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />
                <div className="w-px flex-1 bg-gray-200 my-0.5" style={{ minHeight: 20 }} />
                <div className="w-2.5 h-2.5 rounded-sm bg-red-600" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Départ</p>
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{pickup?.address || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Destination</p>
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{destination?.address || '—'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
            {[
              { icon: Clock, label: 'Durée', value: `${durMin} min` },
              { icon: Navigation, label: 'Distance', value: `${distKm.toFixed(1)} km` },
              { icon: MapPin, label: 'Courses', value: userRole === 'driver' ? '+1' : '✓' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center py-4 gap-1">
                <Icon size={16} className="text-gray-400" />
                <p className="font-bold text-gray-900 text-sm">{value}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>

          {/* Détail facture */}
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-3">Détail</p>
            <div className="space-y-2">
              {[
                { label: 'Prise en charge', value: base },
                { label: `Distance (${distKm.toFixed(1)} km)`, value: perKm },
                { label: `Temps (${durMin} min)`, value: perMin },
              ].filter(r => r.value > 0).map(row => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{row.label}</span>
                  <span className="font-medium text-gray-900">{row.value.toFixed(2)} $</span>
                </div>
              ))}
              {surge > 1 && (
                <div className="flex justify-between text-sm">
                  <span className="text-orange-500">Majoration ×{surge}</span>
                  <span className="font-medium text-orange-500">+{((pricing?.surgeAmount) ?? 0).toFixed(2)} $</span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-2 space-y-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>TPS (5%)</span><span>{tps.toFixed(2)} $</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>TVQ (9,975%)</span><span>{tvq.toFixed(2)} $</span>
                </div>
              </div>
              <div className="flex justify-between font-black text-base border-t border-gray-200 pt-2">
                <span>TOTAL</span>
                <span className="text-gray-900">{total.toFixed(2)} $</span>
              </div>
              {userRole === 'driver' && (
                <div className="flex justify-between text-sm font-bold bg-green-50 rounded-xl px-3 py-2 mt-1">
                  <span className="text-green-700">Vos gains (70%)</span>
                  <span className="text-green-700">{earnings.toFixed(2)} $</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 py-5 space-y-3">
            <button
              onClick={() => setPhase('rating')}
              className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg"
              style={{ background: '#DC2626', color: 'white' }}>
              <Star size={20} fill="white" />
              Évaluer {userRole === 'passenger' ? 'le chauffeur' : 'le passager'}
              <ChevronRight size={18} className="ml-auto opacity-70" />
            </button>
            <button onClick={onClose}
              className="w-full py-3 rounded-full border-2 border-gray-200 font-semibold text-gray-500 text-sm">
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
