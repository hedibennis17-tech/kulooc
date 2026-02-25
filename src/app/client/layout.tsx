'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/firebase/provider';
import { upsertClientProfile } from '@/lib/client/client-service';
import { Car, Clock, Wallet, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/client', label: 'Course', icon: Car, exact: true },
  { href: '/client/activity', label: 'Activité', icon: Clock },
  { href: '/client/wallet', label: 'Portefeuille', icon: Wallet },
  { href: '/client/account', label: 'Compte', icon: User },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login?redirect=/client');
    }
  }, [user, isUserLoading, router]);

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

  if (!user) return null;

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    /*
     * MOBILE  (< md) : colonne centrée max-w-md, ombre latérale, nav bas fixe
     * DESKTOP (≥ md) : plein écran, pas de max-width, header horizontal, nav bas cachée
     */
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-black text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm">K</span>
          </div>
          <span className="font-bold text-lg tracking-tight">KULOOC</span>
        </div>

        {/* Nav desktop (cachée sur mobile) */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 text-sm font-medium transition-colors pb-1',
                  active
                    ? 'text-white border-b-2 border-white'
                    : 'text-gray-400 hover:text-white border-b-2 border-transparent'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Statut en ligne */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-gray-300">En ligne</span>
        </div>
      </header>

      {/* ── Contenu principal ───────────────────────────────────────────────── */}
      {/*
       * Mobile  : centré max-w-md, padding-bottom pour la nav bas
       * Desktop : plein écran h-[calc(100vh-56px)], pas de padding-bottom
       */}
      <main className="
        flex-1
        md:h-[calc(100vh-56px)] md:overflow-hidden
        max-md:max-w-md max-md:mx-auto max-md:w-full max-md:pb-20 max-md:overflow-y-auto
        max-md:shadow-2xl
      ">
        {children}
      </main>

      {/* ── Nav bas mobile (cachée sur desktop) ────────────────────────────── */}
      <nav className="
        md:hidden
        fixed bottom-0 left-1/2 -translate-x-1/2
        w-full max-w-md
        bg-white border-t border-gray-200 z-40
      ">
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
                  active ? 'text-red-600' : 'text-gray-400 hover:text-gray-700'
                )}
              >
                <Icon className={cn('w-5 h-5', active && 'fill-current')} />
                <span className={cn('text-xs font-medium', active && 'font-semibold')}>
                  {item.label}
                </span>
                {active && (
                  <div className="absolute bottom-0 w-8 h-0.5 bg-red-600 rounded-t-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
