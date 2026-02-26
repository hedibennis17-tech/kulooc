'use client';
/**
 * KULOOC — Composant de notation post-course
 * Affiché après la fin d'une course pour les deux parties
 */
import { useState } from 'react';
import { Star } from 'lucide-react';
import { db } from '@/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

interface RatingModalProps {
  rideId: string;
  raterId: string;
  raterName: string;
  raterRole: 'passenger' | 'driver';
  targetId: string;
  targetName: string;
  onClose: () => void;
}

/**
 * PING: Force-reset a driver's status to 'online' after rating.
 * This ensures the driver is never stuck in 'en-route' or 'on-trip' after a ride ends.
 */
async function pingDriverOnline(driverId: string) {
  try {
    await updateDoc(doc(db, 'drivers', driverId), {
      status: 'online',
      currentRideId: null,
      isOnline: true,
      onlineSince: serverTimestamp(),
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (_) {
    // Silently fail — the completeRide already tried to reset
  }
}

const QUICK_COMMENTS_PASSENGER = [
  'Très professionnel', 'Conduite sécuritaire', 'Ponctuel', 'Véhicule propre', 'Agréable'
];

const QUICK_COMMENTS_DRIVER = [
  'Passager respectueux', 'Ponctuel au rendez-vous', 'Agréable', 'Bonne communication', 'Recommandé'
];

export function RatingModal({
  rideId,
  raterId,
  raterName,
  raterRole,
  targetId,
  targetName,
  onClose,
}: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const quickComments = raterRole === 'passenger' ? QUICK_COMMENTS_PASSENGER : QUICK_COMMENTS_DRIVER;

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      const fullComment = [
        ...selectedTags,
        comment.trim(),
      ].filter(Boolean).join(' · ');

      // Créer la notation dans Firestore
      await addDoc(collection(db, 'ratings'), {
        rideId,
        raterId,
        raterName,
        raterRole,
        targetId,
        targetName,
        rating,
        comment: fullComment,
        tags: selectedTags,
        createdAt: serverTimestamp(),
      });

      // Mettre à jour la course avec la notation
      const field = raterRole === 'passenger' ? 'passengerRating' : 'driverRating';
      await updateDoc(doc(db, 'completed_rides', rideId), {
        [field]: { rating, comment: fullComment, ratedAt: serverTimestamp() },
      }).catch(() => {});

      // PING: If the driver just submitted their rating, force-reset to online.
      // This is the final safety net to ensure the driver never stays stuck in 'en-route'.
      if (raterRole === 'driver') {
        await pingDriverOnline(raterId);
      }

      setSubmitted(true);
      setTimeout(onClose, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const ratingLabels = ['', 'Mauvais', 'Passable', 'Bien', 'Très bien', 'Excellent !'];

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
        <div className="bg-white rounded-t-3xl w-full max-w-lg p-8 text-center">
          <div className="text-5xl mb-4">⭐</div>
          <h2 className="text-2xl font-black mb-2">Merci !</h2>
          <p className="text-gray-500">Votre évaluation a été soumise.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-3xl w-full max-w-lg p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3 text-2xl font-black text-gray-700">
            {targetName.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-xl font-black">
            {raterRole === 'passenger' ? 'Évaluer votre chauffeur' : 'Évaluer votre passager'}
          </h2>
          <p className="text-gray-500 text-sm mt-1">{targetName}</p>
        </div>

        {/* Étoiles */}
        <div className="flex justify-center gap-3 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110"
            >
              <Star
                size={36}
                className={`transition-colors ${
                  star <= (hoveredStar || rating)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-center text-sm font-semibold text-gray-700 mb-4">
            {ratingLabels[rating]}
          </p>
        )}

        {/* Tags rapides */}
        {rating > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 justify-center">
            {quickComments.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Commentaire libre */}
        {rating > 0 && (
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ajouter un commentaire (optionnel)..."
            className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none h-20 mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        )}

        {/* Boutons */}
        <div className="flex gap-3">
          <button
            onClick={async () => {
              // Even if skipping rating, ping the driver back online
              if (raterRole === 'driver') {
                await pingDriverOnline(raterId);
              }
              onClose();
            }}
            className="flex-1 py-3 rounded-full border-2 border-gray-200 font-semibold text-gray-600"
          >
            Passer
          </button>
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            className="flex-[2] py-3 rounded-full bg-red-600 text-white font-black disabled:opacity-40"
          >
            {isSubmitting ? 'Envoi...' : 'Soumettre'}
          </button>
        </div>
      </div>
    </div>
  );
}
