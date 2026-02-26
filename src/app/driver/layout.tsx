'use client';
/**
 * KULOOC — Layout chauffeur v2
 * FEATURE 1: Session unique — autre connexion = déco automatique
 * FEATURE 2: ActiveRideContext — bloque la déco pendant une course
 */
import { useEffect, useRef, createContext, useContext, useState } from 'react';
import { Home, DollarSign, Mail, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { db } from '@/firebase';
import { getAuth } from 'firebase/auth';
import { getDispatchEngine } from '@/lib/dispatch/dispatch-engine';
import { useUser } from '@/firebase/provider';
import { watchSession } from '@/lib/auth/session-manager';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';

// ── Context partagé dans tout /driver/* ─────────────────────────────────────
interface ActiveRideCtx { hasActiveRide: boolean; }
export const ActiveRideContext = createContext<ActiveRideCtx>({ hasActiveRide: false });
export function useActiveRide() { return useContext(ActiveRideContext); }

const navItems = [
  { href: '/driver', label: 'Accueil', icon: Home },
  { href: '/driver/earnings', label: 'Revenus', icon: DollarSign },
  { href: '/driver/inbox', label: 'Boîte de récep.', icon: Mail },
  { href: '/driver/menu', label: 'Menu', icon: Menu },
];

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const engineStarted = useRef(false);
  const sessionWatchRef = useRef<(() => void) | null>(null);
  const [hasActiveRide, setHasActiveRide] = useState(false);

  // ── Dispatch Engine ──────────────────────────────────────────────────────
  useEffect(() => {
    if (user && !engineStarted.current) {
      getDispatchEngine(db).start();
      engineStarted.current = true;
    }
  }, [user]);

  // ── FEATURE 1: Session unique ────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const noSessionPages = ['/driver/auth', '/driver/login', '/driver/signup'];
    if (noSessionPages.some(p => pathname.startsWith(p))) return;

    if (sessionWatchRef.current) { sessionWatchRef.current(); sessionWatchRef.current = null; }

    const auth = getAuth();
    sessionWatchRef.current = watchSession(user.uid, auth, () => {
      router.push('/driver/auth?reason=session_expired');
    });

    return () => { if (sessionWatchRef.current) sessionWatchRef.current(); };
  }, [user?.uid, pathname, router]);

  // ── FEATURE 2: Course active → bloque déconnexion ───────────────────────
  useEffect(() => {
    if (!user?.uid) { setHasActiveRide(false); return; }
    const q = query(
      collection(db, 'active_rides'),
      where('driverId', '==', user.uid),
      where('status', 'in', ['driver-assigned', 'driver-arrived', 'in-progress']),
      limit(1)
    );
    return onSnapshot(q, (snap) => setHasActiveRide(!snap.empty));
  }, [user?.uid]);

  const noNavPages = ['/driver/onboarding', '/driver/auth', '/driver/login', '/driver/signup'];
  const showNav = !noNavPages.some(p => pathname.startsWith(p));

  return (
    <ActiveRideContext.Provider value={{ hasActiveRide }}>
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
                  <Link key={href} href={href}
                    className={cn('flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
                      isActive ? 'text-black' : 'text-gray-400')}>
                    <Icon className={cn('h-6 w-6', isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]')} />
                    <span className={cn('text-xs', isActive ? 'font-bold' : 'font-normal')}>{label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </ActiveRideContext.Provider>
  );
}
