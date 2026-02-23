import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-8 text-center p-8">
        {/* Logo KULOOC */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-2xl">
            <span className="text-white font-black text-3xl">K</span>
          </div>
          <div className="text-left">
            <h1 className="text-5xl font-black tracking-tighter text-white">KULOOC</h1>
            <p className="text-red-500 text-sm font-semibold tracking-widest uppercase">Kick Uber Lyft Out Of Canada</p>
          </div>
        </div>

        <p className="max-w-md text-base text-gray-400">
          La plateforme de covoiturage canadienne. Choisissez votre interface pour commencer.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          {/* Passager */}
          <Link href="/client" className="group">
            <div className="bg-gray-900 border border-gray-800 hover:border-red-600 rounded-2xl p-6 transition-all hover:bg-gray-800 text-center">
              <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-white font-bold text-sm">Passager</p>
              <p className="text-gray-500 text-xs mt-1">Commander une course</p>
            </div>
          </Link>

          {/* Chauffeur */}
          <Link href="/driver" className="group">
            <div className="bg-gray-900 border border-gray-800 hover:border-red-600 rounded-2xl p-6 transition-all hover:bg-gray-800 text-center">
              <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h10l2-2z" />
                </svg>
              </div>
              <p className="text-white font-bold text-sm">Chauffeur</p>
              <p className="text-gray-500 text-xs mt-1">Conduire avec KULOOC</p>
            </div>
          </Link>

          {/* Admin */}
          <Link href="/dashboard" className="group">
            <div className="bg-gray-900 border border-gray-800 hover:border-red-600 rounded-2xl p-6 transition-all hover:bg-gray-800 text-center">
              <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-white font-bold text-sm">Admin</p>
              <p className="text-gray-500 text-xs mt-1">Tableau de bord</p>
            </div>
          </Link>
        </div>

        <p className="text-gray-600 text-xs">Montréal, Québec · Canada 🍁</p>
      </div>
    </div>
  );
}
