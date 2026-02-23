'use client';
import { Gift, Star, Zap, Clock, ChevronRight, CheckCircle2, Lock } from 'lucide-react';

const activePromos = [
  {
    id: '1',
    type: 'boost',
    title: 'Bonus Heure de pointe',
    desc: 'Gagnez +2.50 $ par course entre 17h et 19h',
    reward: '+2.50 $/course',
    expires: 'Valide jusqu\'à 19h00 aujourd\'hui',
    progress: null,
    color: 'bg-red-600',
    icon: Zap,
  },
  {
    id: '2',
    type: 'challenge',
    title: 'Défi hebdomadaire',
    desc: 'Complétez 50 courses cette semaine',
    reward: '75 $ bonus',
    expires: 'Se termine dimanche',
    progress: { current: 42, total: 50 },
    color: 'bg-black',
    icon: Star,
  },
  {
    id: '3',
    type: 'challenge',
    title: 'Défi aéroport',
    desc: 'Effectuez 10 courses vers/depuis YUL',
    reward: '30 $ bonus',
    expires: 'Se termine dimanche',
    progress: { current: 7, total: 10 },
    color: 'bg-blue-600',
    icon: Clock,
  },
];

const upcomingPromos = [
  {
    id: '4',
    title: 'Bonus weekend',
    desc: 'Samedi et dimanche : +1.00 $ par course',
    reward: '+1.00 $/course',
    starts: 'Commence samedi',
    icon: Gift,
  },
  {
    id: '5',
    title: 'Défi mensuel',
    desc: 'Complétez 200 courses ce mois',
    reward: '200 $ bonus',
    starts: 'Commence le 1er du mois',
    icon: Star,
  },
];

const rewards = [
  { id: '1', title: 'Première course du jour', desc: 'Bonus de 5 $ pour la 1ère course', earned: true, amount: '5.00 $' },
  { id: '2', title: '5 courses consécutives', desc: 'Bonus de 10 $ sans refus', earned: true, amount: '10.00 $' },
  { id: '3', title: 'Note parfaite (5 étoiles)', desc: '10 courses avec 5 étoiles consécutives', earned: false, amount: '15.00 $' },
  { id: '4', title: 'Chauffeur du mois', desc: 'Meilleure note et plus de courses', earned: false, amount: '100.00 $' },
];

export default function PromotionsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-6">
        <h1 className="text-3xl font-black text-black">Promotions</h1>
        <p className="text-gray-500 text-sm mt-1">Gagnez plus avec les défis et bonus KULOOC</p>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Résumé bonus */}
        <div className="bg-black rounded-2xl p-5 text-white">
          <p className="text-gray-400 text-sm">Bonus gagnés ce mois</p>
          <p className="text-4xl font-black mt-1">127.50 $</p>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
            <div className="text-center">
              <p className="text-xl font-black">3</p>
              <p className="text-gray-400 text-xs">Défis actifs</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black">8</p>
              <p className="text-gray-400 text-xs">Complétés</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black">2</p>
              <p className="text-gray-400 text-xs">À venir</p>
            </div>
          </div>
        </div>

        {/* Promotions actives */}
        <div>
          <h2 className="text-lg font-black text-black mb-3">Promotions actives</h2>
          <div className="space-y-3">
            {activePromos.map(promo => {
              const Icon = promo.icon;
              return (
                <div key={promo.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className={`${promo.color} px-4 py-3 flex items-center gap-2`}>
                    <Icon className="h-5 w-5 text-white" />
                    <span className="text-white font-bold text-sm">{promo.type === 'boost' ? 'BOOST ACTIF' : 'DÉFI EN COURS'}</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-black text-base text-black">{promo.title}</h3>
                        <p className="text-gray-500 text-sm mt-0.5">{promo.desc}</p>
                        <p className="text-xs text-gray-400 mt-1">{promo.expires}</p>
                      </div>
                      <div className="text-right ml-3">
                        <span className="text-lg font-black text-green-600">{promo.reward}</span>
                      </div>
                    </div>
                    {promo.progress && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>{promo.progress.current} / {promo.progress.total} courses</span>
                          <span>{Math.round((promo.progress.current / promo.progress.total) * 100)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-black rounded-full transition-all"
                            style={{ width: `${(promo.progress.current / promo.progress.total) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Plus que {promo.progress.total - promo.progress.current} course{promo.progress.total - promo.progress.current > 1 ? 's' : ''} !
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Récompenses */}
        <div>
          <h2 className="text-lg font-black text-black mb-3">Récompenses</h2>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {rewards.map((reward, idx) => (
              <div
                key={reward.id}
                className={`flex items-center gap-3 px-4 py-3.5 ${idx < rewards.length - 1 ? 'border-b border-gray-50' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${reward.earned ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {reward.earned ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Lock className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${reward.earned ? 'text-black' : 'text-gray-400'}`}>{reward.title}</p>
                  <p className="text-xs text-gray-400">{reward.desc}</p>
                </div>
                <span className={`font-black text-sm ${reward.earned ? 'text-green-600' : 'text-gray-300'}`}>{reward.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Promotions à venir */}
        <div>
          <h2 className="text-lg font-black text-black mb-3">À venir</h2>
          <div className="space-y-3">
            {upcomingPromos.map(promo => {
              const Icon = promo.icon;
              return (
                <div key={promo.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 opacity-70">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-6 w-6 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm text-black">{promo.title}</h3>
                    <p className="text-xs text-gray-500">{promo.desc}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{promo.starts}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sm text-gray-600">{promo.reward}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Programme de parrainage */}
        <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-5 text-white mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="h-5 w-5 text-red-200" />
            <span className="text-red-200 text-xs font-bold uppercase tracking-wide">Parrainage</span>
          </div>
          <h3 className="font-black text-xl">Invitez un ami chauffeur</h3>
          <p className="text-red-100 text-sm mt-1">Gagnez 50 $ pour chaque chauffeur que vous parrainez qui complète 20 courses.</p>
          <button className="mt-4 bg-white text-red-600 font-bold text-sm px-5 py-2.5 rounded-full">
            Partager mon code
          </button>
        </div>
      </div>
    </div>
  );
}
