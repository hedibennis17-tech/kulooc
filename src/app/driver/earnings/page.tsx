'use client';
import { useState } from 'react';
import { ChevronRight, TrendingUp, Wallet, Star, Award, ArrowUpRight, ArrowDownRight, Clock, Car } from 'lucide-react';
import Link from 'next/link';

const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const weekData = [42.5, 78.3, 55.0, 91.2, 110.5, 145.8, 88.4];
const maxVal = Math.max(...weekData);

type Period = 'jour' | 'semaine' | 'mois';

const periodData: Record<Period, { total: number; trips: number; hours: number; perHour: number }> = {
  jour: { total: 88.4, trips: 6, hours: 4.5, perHour: 19.6 },
  semaine: { total: 611.7, trips: 42, hours: 31.2, perHour: 19.6 },
  mois: { total: 2447.0, trips: 168, hours: 124.8, perHour: 19.6 },
};

const recentTrips = [
  { id: '1', date: 'Aujourd\'hui, 14h32', from: 'Plateau-Mont-Royal', to: 'Centre-Ville', amount: 18.50, type: 'KULOOC X' },
  { id: '2', date: 'Aujourd\'hui, 12h15', from: 'Aéroport YUL', to: 'Vieux-Montréal', amount: 42.00, type: 'KULOOC XL' },
  { id: '3', date: 'Hier, 22h48', from: 'Rosemont', to: 'Plateau-Mont-Royal', amount: 12.75, type: 'KULOOC X' },
  { id: '4', date: 'Hier, 19h05', from: 'Centre-Ville', to: 'Laval', amount: 35.20, type: 'KULOOC XL' },
];

export default function EarningsPage() {
  const [period, setPeriod] = useState<Period>('semaine');
  const data = periodData[period];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-6">
        <h1 className="text-3xl font-black text-black">Revenus</h1>
        {/* Sélecteur de période */}
        <div className="flex gap-2 mt-4">
          {(['jour', 'semaine', 'mois'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors capitalize ${
                period === p ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {p === 'jour' ? 'Aujourd\'hui' : p === 'semaine' ? 'Cette semaine' : 'Ce mois'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Total principal */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-gray-500 text-sm">Total des gains</p>
          <p className="text-5xl font-black text-black mt-1">{data.total.toFixed(2)} $</p>
          <div className="flex items-center gap-1 mt-2">
            <ArrowUpRight className="h-4 w-4 text-green-500" />
            <span className="text-green-600 text-sm font-semibold">+12% vs {period === 'jour' ? 'hier' : period === 'semaine' ? 'semaine dernière' : 'mois dernier'}</span>
          </div>

          {/* Graphique barres semaine */}
          {period === 'semaine' && (
            <div className="mt-5">
              <div className="flex items-end gap-2 h-20">
                {weekData.map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-md bg-black transition-all"
                      style={{ height: `${(val / maxVal) * 100}%` }}
                    />
                    <span className="text-[10px] text-gray-400">{weekDays[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats secondaires */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-gray-100">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Car className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xl font-black mt-1">{data.trips}</p>
              <p className="text-xs text-gray-500">Courses</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Clock className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xl font-black mt-1">{data.hours}h</p>
              <p className="text-xs text-gray-500">En ligne</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xl font-black mt-1">{data.perHour.toFixed(2)} $</p>
              <p className="text-xs text-gray-500">Par heure</p>
            </div>
          </div>
        </div>

        {/* Portefeuille KULOOC */}
        <div className="bg-black rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-red-400" />
              <span className="font-bold text-lg">Portefeuille KULOOC</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-4xl font-black">247.50 $</p>
          <p className="text-gray-400 text-sm mt-1">Solde disponible</p>
          <div className="flex gap-3 mt-4">
            <button className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm">
              Retirer
            </button>
            <button className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold text-sm">
              Historique
            </button>
          </div>
        </div>

        {/* KULOOC Pro */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              <span className="font-bold text-lg">KULOOC Pro</span>
            </div>
            <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full">Or</span>
          </div>
          <p className="text-gray-600 text-sm mb-4">Vous êtes à <strong>8 courses</strong> du niveau Platine. Débloquez des bonus exclusifs !</p>

          {/* Barre de progression */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Niveau Or</span>
              <span>Platine</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full" style={{ width: '72%' }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">72 / 80 courses ce mois</p>
          </div>

          {/* Niveaux */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { name: 'Bleu', color: 'bg-blue-100 text-blue-700', desc: '0-30 courses' },
              { name: 'Or', color: 'bg-yellow-100 text-yellow-700', desc: '31-80 courses' },
              { name: 'Platine', color: 'bg-gray-100 text-gray-700', desc: '81+ courses' },
            ].map(level => (
              <div key={level.name} className={`rounded-xl p-3 text-center ${level.color}`}>
                <p className="font-bold text-sm">{level.name}</p>
                <p className="text-xs opacity-70 mt-0.5">{level.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Promotions actives */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-lg">Promotions actives</h3>
            <Link href="/driver/promotions" className="text-red-600 text-sm font-semibold">Voir tout</Link>
          </div>
          <div className="space-y-3">
            <div className="bg-red-50 rounded-xl p-3 border border-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-red-700">Bonus Heure de pointe</p>
                  <p className="text-xs text-gray-500">Valide jusqu'à 19h00 · +2.50 $/course</p>
                </div>
                <div className="bg-red-600 rounded-full px-3 py-1">
                  <span className="text-white text-xs font-bold">Actif</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">Défi hebdomadaire</p>
                  <p className="text-xs text-gray-500">50 courses = 75 $ bonus · 42/50 complétées</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black">84%</p>
                </div>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-black rounded-full" style={{ width: '84%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Courses récentes */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-lg">Courses récentes</h3>
            <Link href="/driver/history" className="text-red-600 text-sm font-semibold">Voir tout</Link>
          </div>
          <div className="space-y-3">
            {recentTrips.map(trip => (
              <div key={trip.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Car className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{trip.from} → {trip.to}</p>
                    <p className="text-xs text-gray-400">{trip.date} · {trip.type}</p>
                  </div>
                </div>
                <p className="font-black text-base">{trip.amount.toFixed(2)} $</p>
              </div>
            ))}
          </div>
        </div>

        {/* Résumé fiscal */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-lg">Résumé fiscal</h3>
              <p className="text-gray-500 text-sm">Année fiscale 2025-2026</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Revenus bruts</p>
              <p className="text-xl font-black mt-1">12,450 $</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">TPS/TVQ collectées</p>
              <p className="text-xl font-black mt-1">1,866 $</p>
            </div>
          </div>
          <button className="w-full mt-3 py-3 rounded-xl border-2 border-gray-200 font-bold text-sm text-gray-700">
            Télécharger le rapport fiscal
          </button>
        </div>
      </div>
    </div>
  );
}
