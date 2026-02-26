'use client';
/**
 * KULOOC — Page /unauthorized
 * Directive 2 : Affichée quand un utilisateur tente d'accéder à une route
 * avec un rôle incorrect.
 */
import { useRouter } from 'next/navigation';
import { ShieldX } from 'lucide-react';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldX size={40} className="text-red-600" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Accès refusé</h1>
        <p className="text-gray-500 text-sm mb-8">
          Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
          Veuillez vous connecter avec le bon compte.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => router.push('/client/login')}
            className="w-full py-3 rounded-full bg-black text-white font-bold text-sm"
          >
            Connexion Client
          </button>
          <button
            onClick={() => router.push('/driver/auth')}
            className="w-full py-3 rounded-full border-2 border-gray-200 text-gray-700 font-bold text-sm"
          >
            Connexion Chauffeur
          </button>
        </div>
      </div>
    </div>
  );
}
