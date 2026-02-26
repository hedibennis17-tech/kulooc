/**
 * KULOOC — API Route /api/session
 * Directive 2 : Session unique + protection des routes
 *
 * POST /api/session  → écrire le cookie sessionToken (HTTP-only, Secure)
 * DELETE /api/session → supprimer le cookie (logout)
 */
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'kulooc_session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 jours
};

// POST /api/session — appelé après login réussi pour écrire le cookie
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, token, role } = body;

    if (!uid || !token) {
      return NextResponse.json({ error: 'uid et token requis' }, { status: 400 });
    }

    const response = NextResponse.json({ success: true });

    // Cookie sessionToken : contient uid|token|role pour vérification middleware
    const sessionValue = `${uid}|${token}|${role || 'unknown'}`;
    response.cookies.set(COOKIE_NAME, sessionValue, COOKIE_OPTIONS);

    return response;
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/session — appelé au logout
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
