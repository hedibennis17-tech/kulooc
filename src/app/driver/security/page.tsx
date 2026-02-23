'use client';
import { useState } from 'react';
import { Shield, Lock, Smartphone, Eye, EyeOff, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function SecurityPage() {
  const [show2FA, setShow2FA] = useState(false);
  const [biometric, setBiometric] = useState(true);
  const [locationShare, setLocationShare] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-6">
        <Link href="/driver/menu" className="text-red-600 text-sm font-semibold mb-3 block">← Retour</Link>
        <h1 className="text-3xl font-black text-black">Confidentialité<br />et sécurité</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Statut sécurité */}
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-bold text-green-800">Compte sécurisé</p>
              <p className="text-green-600 text-sm">Toutes les mesures de sécurité sont actives</p>
            </div>
          </div>
        </div>

        {/* Connexion */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-2">Connexion</p>
          <div className="px-4 py-3.5 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <Lock className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">Mot de passe</p>
                <p className="text-xs text-gray-400">Dernière modification il y a 30 jours</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </div>
          <div className="px-4 py-3.5 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">Authentification à 2 facteurs</p>
                <p className="text-xs text-gray-400">SMS vers +1 (514) ***-**89</p>
              </div>
            </div>
            <button
              onClick={() => setShow2FA(!show2FA)}
              className={`w-12 h-6 rounded-full transition-colors ${show2FA ? 'bg-black' : 'bg-gray-200'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${show2FA ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className="px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <Shield className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">Déverrouillage biométrique</p>
                <p className="text-xs text-gray-400">Face ID / Empreinte digitale</p>
              </div>
            </div>
            <button
              onClick={() => setBiometric(!biometric)}
              className={`w-12 h-6 rounded-full transition-colors ${biometric ? 'bg-black' : 'bg-gray-200'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${biometric ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* Confidentialité */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-2">Confidentialité</p>
          <div className="px-4 py-3.5 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <Eye className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">Partage de position</p>
                <p className="text-xs text-gray-400">Nécessaire pour recevoir des courses</p>
              </div>
            </div>
            <button
              onClick={() => setLocationShare(!locationShare)}
              className={`w-12 h-6 rounded-full transition-colors ${locationShare ? 'bg-black' : 'bg-gray-200'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${locationShare ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
          <button className="w-full px-4 py-3.5 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <EyeOff className="h-5 w-5 text-gray-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Masquer mon numéro</p>
                <p className="text-xs text-gray-400">Les passagers voient un numéro masqué</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </button>
          <button className="w-full px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <Shield className="h-5 w-5 text-gray-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Politique de confidentialité</p>
                <p className="text-xs text-gray-400">Voir comment nous utilisons vos données</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </button>
        </div>

        {/* Sessions actives */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-2">Sessions actives</p>
          {[
            { device: 'iPhone 15 Pro', location: 'Montréal, QC', time: 'Actif maintenant', current: true },
            { device: 'Chrome · Windows', location: 'Montréal, QC', time: 'Il y a 2 jours', current: false },
          ].map((session, idx) => (
            <div key={idx} className={`px-4 py-3.5 flex items-center justify-between ${idx === 0 ? 'border-b border-gray-50' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${session.current ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Smartphone className={`h-5 w-5 ${session.current ? 'text-green-600' : 'text-gray-500'}`} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{session.device}</p>
                  <p className="text-xs text-gray-400">{session.location} · {session.time}</p>
                </div>
              </div>
              {session.current ? (
                <span className="text-xs bg-green-100 text-green-600 font-bold px-2 py-0.5 rounded-full">Actuel</span>
              ) : (
                <button className="text-xs text-red-600 font-bold">Déconnecter</button>
              )}
            </div>
          ))}
        </div>

        {/* Zone danger */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-2">Zone de danger</p>
          <button className="w-full px-4 py-3.5 flex items-center gap-3 border-b border-gray-50">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm text-orange-700">Désactiver le compte</p>
              <p className="text-xs text-gray-400">Suspendre temporairement votre compte</p>
            </div>
          </button>
          <button className="w-full px-4 py-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm text-red-700">Supprimer le compte</p>
              <p className="text-xs text-gray-400">Supprimer définitivement votre compte KULOOC</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
