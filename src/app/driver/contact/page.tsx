'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function ContactPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 z-10">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-black">Nous contacter</h1>
      </div>
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="text-6xl mb-4">📞</div>
        <h2 className="text-2xl font-black mb-2">Nous contacter</h2>
        <p className="text-gray-500 text-sm">Contactez l'équipe KULOOC</p>
        <p className="text-gray-400 text-xs mt-4">Disponible prochainement dans KULOOC v2.0</p>
      </div>
    </div>
  );
}
