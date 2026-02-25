'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithCredential,
  PhoneAuthProvider,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import { useAuth, useUser } from '@/firebase/provider';
import { upsertClientProfile, getClientProfile } from '@/lib/client/client-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, Mail, ArrowLeft, ChevronRight, Apple, Facebook } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Suspense } from 'react';

function ClientLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const redirect = searchParams.get('redirect') || '/client';

  const [step, setStep] = useState<'method' | 'phone' | 'email' | 'verify-phone' | 'verify-email'>('method');
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!isUserLoading && user) {
      checkProfileAndRedirect(user.uid);
    }
  }, [user, isUserLoading]);

  // Check if email sign-in link
  useEffect(() => {
    if (typeof window !== 'undefined' && isSignInWithEmailLink(auth, window.location.href)) {
      const savedEmail = localStorage.getItem('kulooc_signin_email');
      if (savedEmail) {
        setIsLoading(true);
        signInWithEmailLink(auth, savedEmail, window.location.href)
          .then(async (cred) => {
            localStorage.removeItem('kulooc_signin_email');
            await upsertClientProfile(cred.user.uid, {
              uid: cred.user.uid,
              email: cred.user.email || savedEmail,
              displayName: cred.user.displayName || savedEmail.split('@')[0],
              photoURL: cred.user.photoURL || '',
            });
            checkProfileAndRedirect(cred.user.uid);
          })
          .catch(() => {
            toast({ title: 'Lien expire', description: 'Veuillez reessayer.', variant: 'destructive' });
          })
          .finally(() => setIsLoading(false));
      }
    }
  }, []);

  const checkProfileAndRedirect = async (uid: string) => {
    try {
      const profile = await getClientProfile(uid);
      if (!profile || !profile.phoneNumber || !profile.displayName || profile.displayName === 'Utilisateur KULOOC') {
        router.push(`/client/complete-profile?redirect=${encodeURIComponent(redirect)}`);
      } else {
        router.push(redirect);
      }
    } catch {
      router.push(redirect);
    }
  };

  // Social auth handlers
  const handleSocialLogin = async (providerType: 'google' | 'facebook' | 'apple') => {
    setIsLoading(true);
    try {
      let provider;
      if (providerType === 'google') provider = new GoogleAuthProvider();
      else if (providerType === 'facebook') provider = new FacebookAuthProvider();
      else provider = new OAuthProvider('apple.com');

      const cred = await signInWithPopup(auth, provider);
      await upsertClientProfile(cred.user.uid, {
        uid: cred.user.uid,
        email: cred.user.email || '',
        displayName: cred.user.displayName || '',
        photoURL: cred.user.photoURL || '',
        phoneNumber: cred.user.phoneNumber || '',
      });
      toast({ title: 'Connexion reussie !' });
      checkProfileAndRedirect(cred.user.uid);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        toast({ title: 'Erreur', description: 'Impossible de se connecter.', variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Phone OTP
  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;
    setIsLoading(true);
    try {
      const formatted = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`;
      // @ts-ignore
      if (!window.recaptchaVerifier) {
        // @ts-ignore
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
      }
      // @ts-ignore
      const confirmationResult = await signInWithPhoneNumber(auth, formatted, window.recaptchaVerifier);
      setVerificationId(confirmationResult.verificationId);
      setStep('verify-phone');
      toast({ title: 'Code envoye !', description: 'Verifiez vos SMS.' });
      setTimeout(() => otpInputRef.current?.focus(), 200);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Impossible d\'envoyer le code.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) return;
    setIsLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, otpCode);
      const cred = await signInWithCredential(auth, credential);
      await upsertClientProfile(cred.user.uid, {
        uid: cred.user.uid,
        phoneNumber: cred.user.phoneNumber || phoneNumber,
        displayName: cred.user.displayName || '',
      });
      toast({ title: 'Connexion reussie !' });
      checkProfileAndRedirect(cred.user.uid);
    } catch {
      toast({ title: 'Code invalide', description: 'Veuillez reessayer.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Email Magic Link
  const handleSendEmailLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    try {
      const actionCodeSettings = {
        url: typeof window !== 'undefined' ? `${window.location.origin}/client/login` : 'https://kulooc.com/client/login',
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      localStorage.setItem('kulooc_signin_email', email);
      setEmailSent(true);
      setStep('verify-email');
      toast({ title: 'Lien envoye !', description: `Verifiez votre boite ${email}` });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Impossible d\'envoyer le lien.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isUserLoading || (user && !isLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="bg-black px-6 pt-10 pb-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          {step !== 'method' && (
            <button onClick={() => setStep('method')} className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-base">K</span>
          </div>
          <span className="text-xl font-bold tracking-tight">KULOOC</span>
        </div>
        <h1 className="text-2xl font-bold text-balance">
          {step === 'method' && 'Se connecter ou creer un compte'}
          {step === 'phone' && 'Entrez votre numero'}
          {step === 'email' && 'Entrez votre email'}
          {step === 'verify-phone' && 'Entrez le code SMS'}
          {step === 'verify-email' && 'Verifiez votre email'}
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {step === 'method' && 'Choisissez votre methode de connexion'}
          {step === 'phone' && 'Un code de verification sera envoye par SMS'}
          {step === 'email' && 'Un lien de connexion sera envoye par email'}
          {step === 'verify-phone' && `Code envoye au ${phoneNumber}`}
          {step === 'verify-email' && `Lien envoye a ${email}`}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 space-y-4">
        {step === 'method' && (
          <>
            {/* Phone login */}
            <button
              onClick={() => setStep('phone')}
              className="w-full flex items-center gap-4 p-4 border border-border rounded-xl hover:bg-muted transition-colors"
            >
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-700" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground text-sm">Numero de telephone</p>
                <p className="text-xs text-muted-foreground">Recevez un code par SMS</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Email login */}
            <button
              onClick={() => setStep('email')}
              className="w-full flex items-center gap-4 p-4 border border-border rounded-xl hover:bg-muted transition-colors"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-700" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground text-sm">Adresse email</p>
                <p className="text-xs text-muted-foreground">Recevez un lien de connexion</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">ou continuer avec</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Social buttons */}
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="h-12 border-border"
                onClick={() => handleSocialLogin('google')}
                disabled={isLoading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </Button>
              <Button
                variant="outline"
                className="h-12 border-border"
                onClick={() => handleSocialLogin('facebook')}
                disabled={isLoading}
              >
                <Facebook className="w-5 h-5 text-blue-600 fill-blue-600" />
              </Button>
              <Button
                variant="outline"
                className="h-12 border-border"
                onClick={() => handleSocialLogin('apple')}
                disabled={isLoading}
              >
                <Apple className="w-5 h-5" />
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground pt-4">
              En continuant, vous acceptez nos{' '}
              <Link href="/help" className="underline text-foreground">Conditions</Link>
              {' '}et{' '}
              <Link href="/help" className="underline text-foreground">Politique de confidentialite</Link>.
            </p>
          </>
        )}

        {step === 'phone' && (
          <form onSubmit={handleSendPhoneOtp} className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Numero de telephone</Label>
              <div className="flex gap-2 mt-1">
                <div className="flex items-center px-3 bg-muted rounded-lg text-sm font-medium text-foreground">+1</div>
                <Input
                  type="tel"
                  placeholder="(514) 123-4567"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  className="h-12 text-lg"
                  autoFocus
                />
              </div>
            </div>
            <div id="recaptcha-container" />
            <Button
              type="submit"
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
              disabled={isLoading || !phoneNumber.trim()}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer le code'}
            </Button>
          </form>
        )}

        {step === 'email' && (
          <form onSubmit={handleSendEmailLink} className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Adresse email</Label>
              <Input
                type="email"
                placeholder="jean@exemple.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-12 text-lg mt-1"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
              disabled={isLoading || !email.trim()}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer le lien'}
            </Button>
          </form>
        )}

        {step === 'verify-phone' && (
          <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Code de verification (6 chiffres)</Label>
              <Input
                ref={otpInputRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="h-14 text-2xl text-center tracking-[0.5em] font-mono mt-2"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
              disabled={isLoading || otpCode.length < 6}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verifier'}
            </Button>
            <button
              type="button"
              onClick={() => { setOtpCode(''); setStep('phone'); }}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Renvoyer un code
            </button>
          </form>
        )}

        {step === 'verify-email' && (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Verifiez votre boite mail</h2>
            <p className="text-sm text-muted-foreground">
              Un lien de connexion a ete envoye a <strong className="text-foreground">{email}</strong>.
              Cliquez sur le lien pour vous connecter.
            </p>
            <Button
              variant="outline"
              onClick={() => { setEmailSent(false); setStep('email'); }}
              className="mt-4"
            >
              Renvoyer le lien
            </Button>
          </div>
        )}

        {/* Driver link */}
        <div className="pt-4 border-t border-border mt-6">
          <Link
            href="/driver/signup"
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
          >
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-600 font-bold text-xs">K</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Devenir chauffeur KULOOC</p>
              <p className="text-xs text-muted-foreground">Gagnez de l'argent en conduisant</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ClientLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <ClientLoginContent />
    </Suspense>
  );
}
