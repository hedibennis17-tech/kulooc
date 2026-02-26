'use client';
/**
 * KULOOC — Layout chauffeur
 * Le Dispatch Engine démarre ici pour tourner sur TOUTES les pages /driver/*
 * même quand le chauffeur navigue vers /driver/earnings, /driver/inbox, etc.
 */
import { useEffect, useRef } from 'react';
import { Home, DollarSign, Mail, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { db } from '@/firebase';
import { getDispatchEngine } from '@/lib/dispatch/dispatch-engine';
import { useUser } from '@/firebase/provider';

const navItems = [
  { href: '/driver', label: 'Accueil', icon: Home },
  { href: '/driver/earnings', label: 'Revenus', icon: DollarSign },
  { href: '/driver/inbox', label: 'Boîte de récep.', icon: Mail },
  { href: '/driver/menu', label: 'Menu', icon: Menu },
];

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  const engineStarted = useRef(false);

  // ─── Démarrer le moteur de dispatch dès que le chauffeur est authentifié ──────────────────
  // Le moteur tourne sur TOUTES les pages /driver/* (pas seulement /driver)
  useEffect(() => {
    if (user && !engineStarted.current) {
      const engine = getDispatchEngine(db);
      engine.start();
      engineStarted.current = true;
      console.log('[KULOOC] Dispatch Engine démarré depuis DriverLayout');
    }
  }, [user]);

  // Pages sans navigation (onboarding, auth, login)
  const noNavPages = ['/driver/onboarding', '/driver/auth', '/driver/login', '/driver/signup'];
  const showNav = !noNavPages.some(p => pathname.startsWith(p));

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans max-w-md mx-auto relative">
      <main className={cn('flex-1 overflow-y-auto', showNav ? 'pb-20' : '')}>
        {children}
      </main>

      {showNav && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 z-50">
          <div className="flex items-center justify-around h-16">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = href === '/driver' ? pathname === '/driver' : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
                    isActive ? 'text-black' : 'text-gray-400'
                  )}
                >
                  <Icon className={cn('h-6 w-6', isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]')} />
                  <span className={cn('text-xs', isActive ? 'font-bold' : 'font-normal')}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
