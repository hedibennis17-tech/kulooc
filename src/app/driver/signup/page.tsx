'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Phone, Apple, Facebook } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, OAuthProvider, createUserWithEmailAndPassword, RecaptchaVerifier, signInWithPhoneNumber, signInWithCredential, PhoneAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, initializeFirebase } from '@/firebase';

const { auth } = initializeFirebase();
import Image from 'next/image';

export default function DriverSignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [signupMethod, setSignupMethod] = useState<'social' | 'email' | 'phone'>('social');
  
  // Email signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Phone signup
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [showVerificationInput, setShowVerificationInput] = useState(false);

  // Créer le profil chauffeur dans Firestore
  const createDriverProfile = async (userId: string, email: string | null, phoneNumber: string | null) => {
    try {
      const driverRef = doc(db, 'drivers', userId);
      const driverSnap = await getDoc(driverRef);
      
      if (!driverSnap.exists()) {
        await setDoc(driverRef, {
          email: email || null,
          phone: phoneNumber || null,
          status: 'pending',
          onboardingCompleted: false,
          documentsVerified: false,
          trainingCompleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error creating driver profile:', error);
      return false;
    }
  };

  // Google Sign-In
  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      await createDriverProfile(result.user.uid, result.user.email, result.user.phoneNumber);
      
      toast({
        title: '🎉 Bienvenue chez KULOOC !',
        description: 'Votre compte a été créé avec succès.',
      });
      
      router.push('/driver/onboarding');
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Facebook Sign-In
  const handleFacebookSignup = async () => {
    setIsLoading(true);
    try {
      const provider = new FacebookAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      await createDriverProfile(result.user.uid, result.user.email, result.user.phoneNumber);
      
      toast({
        title: '🎉 Bienvenue chez KULOOC !',
        description: 'Votre compte a été créé avec succès.',
      });
      
      router.push('/driver/onboarding');
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Apple Sign-In
  const handleAppleSignup = async () => {
    setIsLoading(true);
    try {
      const provider = new OAuthProvider('apple.com');
      const result = await signInWithPopup(auth, provider);
      
      await createDriverProfile(result.user.uid, result.user.email, result.user.phoneNumber);
      
      toast({
        title: '🎉 Bienvenue chez KULOOC !',
        description: 'Votre compte a été créé avec succès.',
      });
      
      router.push('/driver/onboarding');
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Email + Password Signup
  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas.',
        variant: 'destructive',
      });
      return;
    }
    
    if (password.length < 6) {
      toast({
        title: 'Erreur',
        description: 'Le mot de passe doit contenir au moins 6 caractères.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      await createDriverProfile(result.user.uid, result.user.email, null);
      
      toast({
        title: '🎉 Bienvenue chez KULOOC !',
        description: 'Votre compte a été créé avec succès.',
      });
      
      router.push('/driver/onboarding');
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Phone Number Signup
  const handlePhoneSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // @ts-ignore
      if (!window.recaptchaVerifier) {
        // @ts-ignore
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
      }
      
      // @ts-ignore
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
      setVerificationId(confirmationResult.verificationId);
      setShowVerificationInput(true);
      
      toast({
        title: 'Code envoyé !',
        description: 'Un code de vérification a été envoyé à votre téléphone.',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
      const result = await signInWithCredential(auth, credential);
      
      await createDriverProfile(result.user.uid, result.user.email, result.user.phoneNumber);
      
      toast({
        title: '🎉 Bienvenue chez KULOOC !',
        description: 'Votre compte a été créé avec succès.',
      });
      
      router.push('/driver/onboarding');
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo et drapeau canadien */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-6xl">🇨🇦</span>
            <h1 className="text-4xl font-bold text-red-600">KULOOC</h1>
          </div>
          <p className="text-gray-600 font-medium">Devenez chauffeur KULOOC</p>
          <p className="text-sm text-gray-500">100% Canadian Production 🍁</p>
        </div>

        <Card className="border-2 border-red-100 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-lg">
            <CardTitle className="text-2xl text-center">Créer un compte chauffeur</CardTitle>
            <CardDescription className="text-red-100 text-center">
              Choisissez votre méthode d'inscription
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-4">
            {signupMethod === 'social' && (
              <>
                {/* Boutons réseaux sociaux */}
                <Button
                  variant="outline"
                  className="w-full h-12 text-base border-2 hover:bg-gray-50"
                  onClick={handleGoogleSignup}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <FcGoogle className="mr-2 h-5 w-5" />
                  )}
                  Continuer avec Google
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-12 text-base border-2 hover:bg-blue-50 text-blue-600"
                  onClick={handleFacebookSignup}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Facebook className="mr-2 h-5 w-5 fill-blue-600" />
                  )}
                  Continuer avec Facebook
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-12 text-base border-2 hover:bg-gray-50"
                  onClick={handleAppleSignup}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Apple className="mr-2 h-5 w-5" />
                  )}
                  Continuer avec Apple
                </Button>

                <div className="relative my-6">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-sm text-gray-500">
                    ou
                  </span>
                </div>

                <Button
                  variant="outline"
                  className="w-full h-12 text-base border-2 border-red-200 hover:bg-red-50 text-red-600"
                  onClick={() => setSignupMethod('email')}
                >
                  <Mail className="mr-2 h-5 w-5" />
                  S'inscrire avec Email
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-12 text-base border-2 border-red-200 hover:bg-red-50 text-red-600"
                  onClick={() => setSignupMethod('phone')}
                >
                  <Phone className="mr-2 h-5 w-5" />
                  S'inscrire avec Téléphone
                </Button>
              </>
            )}

            {signupMethod === 'email' && (
              <form onSubmit={handleEmailSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base bg-red-600 hover:bg-red-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Création du compte...
                    </>
                  ) : (
                    'Créer mon compte'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setSignupMethod('social')}
                >
                  ← Retour
                </Button>
              </form>
            )}

            {signupMethod === 'phone' && (
              <>
                {!showVerificationInput ? (
                  <form onSubmit={handlePhoneSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Numéro de téléphone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (514) 123-4567"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                        className="h-12"
                      />
                      <p className="text-xs text-gray-500">
                        Format: +1 suivi de votre numéro (ex: +15141234567)
                      </p>
                    </div>

                    <div id="recaptcha-container"></div>

                    <Button
                      type="submit"
                      className="w-full h-12 text-base bg-red-600 hover:bg-red-700"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Envoi du code...
                        </>
                      ) : (
                        'Envoyer le code de vérification'
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setSignupMethod('social')}
                    >
                      ← Retour
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyCode} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Code de vérification</Label>
                      <Input
                        id="code"
                        type="text"
                        placeholder="123456"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        required
                        maxLength={6}
                        className="h-12 text-center text-2xl tracking-widest"
                      />
                      <p className="text-xs text-gray-500">
                        Entrez le code à 6 chiffres reçu par SMS
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 text-base bg-red-600 hover:bg-red-700"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Vérification...
                        </>
                      ) : (
                        'Vérifier et créer mon compte'
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        setShowVerificationInput(false);
                        setVerificationCode('');
                      }}
                    >
                      ← Renvoyer un code
                    </Button>
                  </form>
                )}
              </>
            )}

            <Separator className="my-4" />

            <p className="text-center text-sm text-gray-600">
              Vous avez déjà un compte ?{' '}
              <Button
                variant="link"
                className="text-red-600 p-0 h-auto font-semibold"
                onClick={() => router.push('/login')}
              >
                Se connecter
              </Button>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-500 mt-4">
          En créant un compte, vous acceptez nos{' '}
          <a href="/help/terms" className="text-red-600 underline">
            Conditions d'utilisation
          </a>{' '}
          et notre{' '}
          <a href="/help/privacy" className="text-red-600 underline">
            Politique de confidentialité
          </a>
        </p>
      </div>
    </div>
  );
}
