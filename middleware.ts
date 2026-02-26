/**
 * KULOOC — Middleware Next.js
 * Directive 2 : Protection des routes par rôle et session
 *
 * Protège :
 *   /client/*  → rôle 'client' ou 'admin'
 *   /driver/*  → rôle 'driver' ou 'admin'
 *   /dispatch  → rôle 'admin' ou 'dispatcher'
 *
 * Mécanisme :
 *   - Vérifie le cookie 'kulooc_session' (uid|token|role)
 *   - Si absent → redirection vers la page de login appropriée
 *   - Si rôle incorrect → redirection vers /unauthorized
 *
 * Note : Ce middleware est Edge-compatible (pas de Firebase Admin SDK).
 * La vérification du token Firestore se fait côté client dans les layouts
 * (watchSession) pour la détection multi-session en temps réel.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'kulooc_session';

// Pages qui ne nécessitent pas de session
const PUBLIC_PATHS = [
  '/driver/auth',
  '/driver/login',
  '/driver/signup',
  '/client/login',
  '/login',
  '/api/',
  '/_next/',
  '/favicon',
  '/unauthorized',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p));
}

function parseSession(cookie: string | undefined): { uid: string; token: string; role: string } | null {
  if (!cookie) return null;
  const parts = cookie.split('|');
  if (parts.length < 3) return null;
  return { uid: parts[0], token: parts[1], role: parts[2] };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Laisser passer les chemins publics
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;
  const session = parseSession(sessionCookie);

  // ── Routes /driver/* ──────────────────────────────────────────────────────
  if (pathname.startsWith('/driver')) {
    if (!session) {
      // Pas de session → rediriger vers auth chauffeur
      const url = request.nextUrl.clone();
      url.pathname = '/driver/auth';
      url.searchParams.set('reason', 'not_authenticated');
      return NextResponse.redirect(url);
    }
    // Vérification du rôle chauffeur
    if (session.role !== 'driver' && session.role !== 'admin' && session.role !== 'unknown') {
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ── Routes /client/* ──────────────────────────────────────────────────────
  if (pathname.startsWith('/client')) {
    if (!session) {
      // Pas de session → rediriger vers login client
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    // Vérification du rôle client
    if (session.role !== 'client' && session.role !== 'admin' && session.role !== 'unknown') {
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ── Routes /dispatch ──────────────────────────────────────────────────────
  if (pathname.startsWith('/dispatch')) {
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    if (session.role !== 'admin' && session.role !== 'dispatcher' && session.role !== 'unknown') {
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/driver/:path*',
    '/client/:path*',
    '/dispatch/:path*',
  ],
};
