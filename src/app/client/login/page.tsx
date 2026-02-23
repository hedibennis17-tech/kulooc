'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from 'firebase/auth';
import { useAuth, useUser } from '@/firebase/provider';
import { upsertClientProfile } from '@/lib/client/client-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, Eye, EyeOff, MapleLeaf } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ClientLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  // Rediriger si déjà connecté
  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/client');
    }
  }, [user, isUserLoading, router]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    setIsLoading(true);
    try {
      if (isSignUp) {
        if (!form.name.trim()) {
          toast({ title: 'Nom requis', variant: 'destructive' });
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
        // Mettre à jour le displayName Firebase
        await updateProfile(cred.user, { displayName: form.name });
        // Créer le profil dans Firestore
        await upsertClientProfile(cred.user.uid, {
          uid: cred.user.uid,
          email: form.email,
          displayName: form.name,
        });
        toast({ title: 'Compte créé !', description: `Bienvenue ${form.name} !` });
      } else {
        const cred = await signInWithEmailAndPassword(auth, form.email, form.password);
        // Mettre à jour le profil Firestore à la connexion
        await upsertClientProfile(cred.user.uid, {
          uid: cred.user.uid,
          email: cred.user.email || form.email,
          displayName: cred.user.displayName || form.email.split('@')[0],
          photoURL: cred.user.photoURL || '',
        });
        toast({ title: 'Connexion réussie !' });
      }
      router.push('/client');
    } catch (err: any) {
      let msg = 'Une erreur est survenue.';
      if (err.code === 'auth/email-already-in-use') msg = 'Cet email est déjà utilisé.';
      if (err.code === 'auth/invalid-credential') msg = 'Email ou mot de passe incorrect.';
      if (err.code === 'auth/weak-password') msg = 'Le mot de passe doit contenir au moins 6 caractères.';
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      // Créer/mettre à jour le profil Firestore
      await upsertClientProfile(cred.user.uid, {
        uid: cred.user.uid,
        email: cred.user.email || '',
        displayName: cred.user.displayName || '',
        photoURL: cred.user.photoURL || '',
        phoneNumber: cred.user.phoneNumber || '',
      });
      toast({ title: 'Connexion réussie !' });
      router.push('/client');
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        toast({ title: 'Erreur Google', description: 'Impossible de se connecter.', variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      {/* Header rouge KULOOC */}
      <div className="bg-black px-6 pt-12 pb-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-lg">K</span>
          </div>
          <span className="text-2xl font-bold tracking-tight">KULOOC</span>
        </div>
        <h1 className="text-2xl font-bold">
          {isSignUp ? 'Créer un compte' : 'Bon retour !'}
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {isSignUp ? 'Rejoignez KULOOC aujourd\'hui' : 'Connectez-vous pour commander une course'}
        </p>
      </div>

      {/* Formulaire */}
      <div className="flex-1 px-6 py-6 space-y-4">
        {/* Google */}
        <Button
          variant="outline"
          className="w-full h-12 border-gray-200 font-medium"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuer avec Google
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400">ou par email</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3">
          {isSignUp && (
            <div>
              <Label className="text-xs text-gray-600">Nom complet</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Jean Tremblay"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="pl-9 h-11 border-gray-200"
                />
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs text-gray-600">Adresse email</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="email"
                placeholder="jean@exemple.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="pl-9 h-11 border-gray-200"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-gray-600">Mot de passe</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={isSignUp ? 'Minimum 6 caractères' : '••••••••'}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="pl-9 pr-9 h-11 border-gray-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl mt-2"
            disabled={isLoading || !form.email || !form.password}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSignUp ? (
              'Créer mon compte'
            ) : (
              'Se connecter'
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500">
          {isSignUp ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-red-600 font-semibold hover:underline"
          >
            {isSignUp ? 'Se connecter' : "S'inscrire gratuitement"}
          </button>
        </p>

        {isSignUp && (
          <p className="text-center text-xs text-gray-400">
            En créant un compte, vous acceptez nos{' '}
            <Link href="/help" className="underline">Conditions d'utilisation</Link>
            {' '}et notre{' '}
            <Link href="/help" className="underline">Politique de confidentialité</Link>.
          </p>
        )}
      </div>
    </div>
  );
}
