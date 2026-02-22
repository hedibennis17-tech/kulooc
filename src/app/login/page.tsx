import { LoginForm } from '@/components/kulooc/login-form';
import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function LoginPage() {
  const loginBg = PlaceHolderImages.find(p => p.id === 'login-background');

  return (
    <div className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-2 font-sans">
      <div className="relative hidden lg:flex flex-col justify-between p-8 bg-black">
        {loginBg && (
            <Image
                src={loginBg.imageUrl}
                alt="Montreal street at night"
                fill
                className="object-cover opacity-50"
                data-ai-hint={loginBg.imageHint}
            />
        )}
        <div className="relative z-10">
            <Link href="/" className="text-2xl font-bold tracking-tighter text-white">KULOOC</Link>
        </div>
        <div className="relative z-10 text-white max-w-md">
            <h1 className="text-4xl font-bold">Votre partenaire de confiance.</h1>
            <p className="mt-4 text-white/80">Rejoignez des milliers d'utilisateurs qui se déplacent intelligemment chaque jour à Montréal.</p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-background p-4 sm:p-8">
        <div className="w-full max-w-md">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
