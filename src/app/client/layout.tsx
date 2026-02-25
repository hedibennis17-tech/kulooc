'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/firebase/provider';
import { upsertClientProfile } from '@/lib/client/client-service';
import { Car, Clock, Wallet, User, Home, MessageSquare, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/client', label: 'Accueil', icon: Home, exact: true },
  { href: '/client/activity', label: 'Activite', icon: Clock },
  { href: '/client/wallet', label: 'Portefeuille', icon: Wallet },
  { href: '/client/account', label: 'Menu', icon: Menu },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  // Skip auth check for login & complete-profile pages
  const isAuthPage = pathname.includes('/login') || pathname.includes('/complete-profile');

  // Redirect to client login if not authenticated (skip on auth pages)
  useEffect(() => {
    if (!isUserLoading && !user && !isAuthPage) {
      router.push('/client/login');
    }
  }, [user, isUserLoading, router, isAuthPage]);

  // Update Firestore profile on login
  useEffect(() => {
    if (user) {
      upsertClientProfile(user.uid, {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Utilisateur',
        phoneNumber: user.phoneNumber || '',
        photoURL: user.photoURL || '',
      }).catch(console.error);
    }
  }, [user]);

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  // On auth pages, render children without layout chrome
  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!user) return null;

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:max-w-md mx-auto relative lg:shadow-2xl">
      {/* Header - black */}
      <header className="bg-black text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm">K</span>
          </div>
          <span className="font-bold text-lg tracking-tight">KULOOC</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-gray-300">En ligne</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation - Canadian Red */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full lg:max-w-md bg-red-600 z-40">
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 transition-colors relative',
                  active ? 'text-white' : 'text-white/60 hover:text-white/80'
                )}
              >
                <Icon className={cn('w-5 h-5', active && 'fill-current')} />
                <span className={cn('text-[10px] font-medium', active && 'font-bold')}>
                  {item.label}
                </span>
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-white rounded-b-full" />
                )}
              </Link>
            );
          })}
        </div>
        {/* Safe area for mobile */}
        <div className="h-safe-area-inset-bottom bg-red-600" />
      </nav>
    </div>
  );
}
