'use client';
import { useState } from 'react';
import { Star, Camera, ChevronRight, Edit2, Phone, Mail, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/firebase/provider';

const ratingBreakdown = [
  { stars: 5, count: 142, pct: 85 },
  { stars: 4, count: 18, pct: 11 },
  { stars: 3, count: 5, pct: 3 },
  { stars: 2, count: 2, pct: 1 },
  { stars: 1, count: 1, pct: 1 },
];

export default function DriverProfilePage() {
  const { user } = useUser();
  const [editing, setEditing] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-6">
          <Link href="/driver/menu" className="text-red-600 text-sm font-semibold">← Retour</Link>
          <button onClick={() => setEditing(!editing)} className="flex items-center gap-1 text-sm font-semibold text-gray-700">
            <Edit2 className="h-4 w-4" />
            {editing ? 'Sauvegarder' : 'Modifier'}
          </button>
        </div>
        {/* Photo */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-red-600 flex items-center justify-center text-white text-4xl font-black">
              {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'C'}
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-black rounded-full flex items-center justify-center">
              <Camera className="h-4 w-4 text-white" />
            </button>
          </div>
          <h2 className="text-2xl font-black mt-3">{user?.displayName || 'Chauffeur KULOOC'}</h2>
          <p className="text-gray-500 text-sm">Membre depuis janvier 2024</p>
          <div className="flex items-center gap-1 mt-2">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            <span className="font-black text-lg">4.92</span>
            <span className="text-gray-400 text-sm">· 168 courses</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Note', value: '4.92', color: 'text-yellow-500' },
            { label: 'Courses', value: '168', color: 'text-black' },
            { label: 'Acceptation', value: '94%', color: 'text-green-600' },
            { label: 'Annulations', value: '2%', color: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-3 text-center shadow-sm">
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Évaluations */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-black text-lg mb-4">Évaluations</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-center">
              <p className="text-5xl font-black">4.92</p>
              <div className="flex gap-0.5 mt-1 justify-center">
                {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />)}
              </div>
              <p className="text-xs text-gray-400 mt-1">168 évaluations</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {ratingBreakdown.map(r => (
                <div key={r.stars} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-3">{r.stars}</span>
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${r.pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-6">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3 pt-3 border-t border-gray-50">
            {[
              { text: '"Excellent chauffeur, très ponctuel et professionnel !"', date: 'Il y a 2h' },
              { text: '"Voiture propre et trajet agréable. Je recommande !"', date: 'Hier' },
            ].map((c, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3">
                <p className="text-sm text-gray-700 italic">{c.text}</p>
                <p className="text-xs text-gray-400 mt-1">{c.date}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Infos personnelles */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-2">Informations personnelles</p>
          {[
            { icon: Mail, label: 'Email', value: user?.email || 'hedibennis17@gmail.com' },
            { icon: Phone, label: 'Téléphone', value: '+1 (514) 555-0189' },
            { icon: MapPin, label: 'Adresse', value: 'Montréal, QC, Canada' },
            { icon: Calendar, label: 'Date de naissance', value: '15 mars 1990' },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className={`flex items-center gap-3 px-4 py-3.5 ${idx < 3 ? 'border-b border-gray-50' : ''}`}>
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400">{item.label}</p>
                  <p className="font-semibold text-sm">{item.value}</p>
                </div>
                {editing && <ChevronRight className="h-4 w-4 text-gray-300" />}
              </div>
            );
          })}
        </div>

        {/* Catégories de service */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-2">Catégories de service</p>
          {[
            { name: 'KULOOC X', desc: 'Berline standard · 4 passagers', active: true },
            { name: 'KULOOC XL', desc: 'VUS · 6 passagers', active: true },
            { name: 'KULOOC Confort', desc: 'Véhicule haut de gamme', active: false },
            { name: 'KULOOC Accessibilité', desc: 'Véhicule adapté PMR', active: false },
          ].map((cat, idx) => (
            <div key={idx} className={`flex items-center justify-between px-4 py-3.5 ${idx < 3 ? 'border-b border-gray-50' : ''}`}>
              <div className="flex items-center gap-3">
                {cat.active && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                <div>
                  <p className="font-semibold text-sm">{cat.name}</p>
                  <p className="text-xs text-gray-400">{cat.desc}</p>
                </div>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${cat.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                {cat.active ? 'Actif' : 'Inactif'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
