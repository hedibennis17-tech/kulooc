
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useUser, useAuth } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

// Schemas for form validation
const signUpSchema = z.object({
  email: z.string().email('Adresse email invalide.'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères.'),
});
const signInSchema = z.object({
  email: z.string().email('Adresse email invalide.'),
  password: z.string().min(1, 'Le mot de passe est requis.'),
});
const phoneSchema = z.object({
  phone: z.string().min(10, 'Numéro de téléphone invalide.'),
});

type SignUpValues = z.infer<typeof signUpSchema>;
type SignInValues = z.infer<typeof signInSchema>;
type PhoneValues = z.infer<typeof phoneSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  
  const [isSignUp, setIsSignUp] = useState(searchParams.get('signup') === 'true');
  const [isLoading, setIsLoading] = useState(false);
  const [authProvider, setAuthProvider] = useState<'email' | 'google' | 'facebook' | 'apple' | 'phone' | null>(null);

  // Phone Auth state
  const [phoneStep, setPhoneStep] = useState<'number' | 'code'>('number');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otp, setOtp] = useState('');
  const recaptchaRef = useRef<HTMLDivElement>(null);


  // Redirect if user is already logged in
  useEffect(() => {
    if (!isUserLoading && user) {
      const redirect = searchParams.get('redirect') || '/dashboard';
      router.push(redirect);
    }
  }, [user, isUserLoading, router, searchParams]);



  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInValues | SignUpValues>({
    resolver: zodResolver(isSignUp ? signUpSchema : signInSchema),
  });

  const {
    register: registerPhone,
    handleSubmit: handleSubmitPhone,
    formState: { errors: errorsPhone },
  } = useForm<PhoneValues>({
    resolver: zodResolver(phoneSchema),
  });
  
  // Set up reCAPTCHA for phone auth
  useEffect(() => {
    if (typeof window !== 'undefined' && auth && recaptchaRef.current) {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaRef.current, {
                'size': 'invisible',
                'callback': (response: any) => {
                  // reCAPTCHA solved, allow signInWithPhoneNumber.
                }
            });
        }
    }
  }, [auth]);

  const handleEmailAuth = async (values: SignInValues | SignUpValues) => {
    setIsLoading(true);
    setAuthProvider('email');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, values.email, values.password);
        toast({ title: 'Compte créé avec succès !', description: 'Vous êtes maintenant connecté.' });
      } else {
        await signInWithEmailAndPassword(auth, values.email, values.password);
        toast({ title: 'Connexion réussie !' });
      }
      // router will redirect via useEffect
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Une erreur est survenue',
        description: error.message.includes('auth/invalid-credential') 
          ? 'Email ou mot de passe incorrect.' 
          : "Cet email est peut-être déjà utilisé.",
      });
    } finally {
      setIsLoading(false);
      setAuthProvider(null);
    }
  };
  
  const handleSocialLogin = async (providerName: 'google' | 'facebook' | 'apple') => {
    setIsLoading(true);
    setAuthProvider(providerName);
    let provider;
    switch (providerName) {
      case 'google':
        provider = new GoogleAuthProvider();
        break;
      case 'facebook':
        provider = new FacebookAuthProvider();
        break;
      case 'apple':
        provider = new OAuthProvider('apple.com');
        break;
      default:
        setIsLoading(false);
        setAuthProvider(null);
        return;
    }

    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        toast({ title: 'Connexion réussie !' });
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error("Social login error:", error);
      let description = "Impossible de se connecter avec ce fournisseur. Veuillez réessayer.";
      if (error.code === 'auth/operation-not-allowed') {
        description = "La méthode de connexion n'est pas activée dans Firebase.";
      } else if (error.code === 'auth/popup-closed-by-user') {
        description = "La fenêtre de connexion a été fermée. Veuillez réessayer.";
      } else if (error.code === 'auth/popup-blocked') {
        description = "La fenêtre popup a été bloquée. Autorisez les popups pour ce site.";
      }
      toast({
        variant: 'destructive',
        title: 'Une erreur de connexion est survenue',
        description: description,
      });
    } finally {
      setIsLoading(false);
      setAuthProvider(null);
    }
  };

  const handlePhoneSignIn = async (values: PhoneValues) => {
    setIsLoading(true);
    setAuthProvider('phone');
    const appVerifier = window.recaptchaVerifier;
    try {
      // Firebase needs E.164 format
      const phoneNumber = `+1${values.phone.replace(/\D/g, '')}`;
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(result);
      setPhoneStep('code');
      toast({ title: "Code de vérification envoyé" });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Erreur',
            description: "Impossible d'envoyer le code. Vérifiez le numéro ou réessayez.",
        });
        // Reset reCAPTCHA
        if (window.grecaptcha && window.recaptchaVerifier) {
            window.recaptchaVerifier.render().then((widgetId: any) => {
                window.grecaptcha.reset(widgetId);
            });
        }
    } finally {
        setIsLoading(false);
        setAuthProvider(null);
    }
  };
  
  const handleVerifyOtp = async () => {
    if (!confirmationResult || !otp) return;
    setIsLoading(true);
    setAuthProvider('phone');
    try {
      await confirmationResult.confirm(otp);
      toast({ title: 'Connexion réussie !' });
      // router will redirect via useEffect
    } catch (error) {
      toast({ variant: 'destructive', title: 'Code incorrect', description: 'Veuillez vérifier le code et réessayer.' });
    } finally {
        setIsLoading(false);
        setAuthProvider(null);
    }
  };
  
  if (isUserLoading || user) {
    return <div className="flex justify-center items-center h-32"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="bg-white p-8 shadow-lg rounded-lg">
      <div ref={recaptchaRef} id="recaptcha-container"></div>
      <h1 className="text-3xl font-bold text-center mb-2">{isSignUp ? "Créer un compte" : "Se connecter"}</h1>
      <p className="text-center text-muted-foreground mb-6">
        {isSignUp ? "Déjà un compte ? " : "Pas encore de compte ? "}
        <button onClick={() => setIsSignUp(!isSignUp)} className="font-medium text-primary hover:underline">
          {isSignUp ? "Se connecter" : "S'inscrire"}
        </button>
      </p>

      {phoneStep === 'number' ? (
        <>
            <form onSubmit={handleSubmit(handleEmailAuth)} className="space-y-4">
                <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} className={errors.email ? 'border-destructive' : ''} />
                {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message as string}</p>}
                </div>
                <div>
                <Label htmlFor="password">Mot de passe</Label>
                <Input id="password" type="password" {...register('password')} className={errors.password ? 'border-destructive' : ''} />
                {errors.password && <p className="text-destructive text-sm mt-1">{errors.password.message as string}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading && authProvider === 'email'}>
                    {isLoading && authProvider === 'email' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isSignUp ? "S'inscrire" : 'Se connecter'}
                </Button>
            </form>
            <Separator className="my-6">OU</Separator>
        </>
      ) : null}

      {/* Phone Auth */}
      {phoneStep === 'number' ? (
        <form onSubmit={handleSubmitPhone(handlePhoneSignIn)} className="space-y-4">
            <div>
              <Label htmlFor="phone">Numéro de téléphone</Label>
              <Input id="phone" type="tel" placeholder="e.g. 5141234567" {...registerPhone('phone')} className={errorsPhone.phone ? 'border-destructive' : ''} />
              {errorsPhone.phone && <p className="text-destructive text-sm mt-1">{errorsPhone.phone.message as string}</p>}
            </div>
            <Button type="submit" variant="outline" className="w-full" disabled={isLoading && authProvider === 'phone'}>
                {isLoading && authProvider === 'phone' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Continuer avec un téléphone
            </Button>
        </form>
      ) : (
        <div className="space-y-4">
            <p className="text-sm text-center">Entrez le code à 6 chiffres envoyé.</p>
             <Input 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="______"
                maxLength={6}
                className="text-center text-2xl tracking-[0.5em]"
             />
             <Button onClick={handleVerifyOtp} className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Vérifier
             </Button>
             <Button variant="link" onClick={() => setPhoneStep('number')}>Changer de numéro</Button>
        </div>
      )}

      {phoneStep === 'number' && (
        <div className="mt-6 grid grid-cols-1 gap-3">
          <Button variant="outline" onClick={() => handleSocialLogin('google')} disabled={isLoading}>
            {isLoading && authProvider === 'google' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>}
            Continuer avec Google
          </Button>
          <Button variant="outline" onClick={() => handleSocialLogin('apple')} disabled={isLoading}>
            {isLoading && authProvider === 'apple' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="apple" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path fill="currentColor" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C39.2 141.6 0 184.2 0 241.2c0 61.6 31.5 112.6 68.9 146.6 37.2 33.9 79.7 54.7 121.3 54.7 21.2 0 43.4-6.5 63.3-18.5 23.2-14.2 44.8-32.8 65.1-54.7-47.5-24.3-81.5-56.9-81.5-103.5zM248.5 95.3c14.6-16.4 23.9-38.3 23.9-59.5-27.1-.4-52.2 16.5-63.7 34.3-12.7 19.3-23.9 44.8-23.9 66.5 26.5.9 50.8-15.5 63.7-41.3z"></path></svg>}
            Continuer avec Apple
          </Button>
          <Button variant="outline" onClick={() => handleSocialLogin('facebook')} disabled={isLoading}>
            {isLoading && authProvider === 'facebook' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="facebook-f" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path fill="currentColor" d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"></path></svg>}
            Continuer avec Facebook
          </Button>
        </div>
      )}
      
       <p className="mt-6 text-center text-xs text-gray-500">
        En continuant, vous acceptez les {' '}
        <Link href="#" className="underline">
          Conditions de service
        </Link>{' '}
        et la{' '}
        <Link href="#" className="underline">
          Politique de confidentialité
        </Link>
        .
      </p>
    </div>
  );
}

// this is needed for phone auth
declare global {
    interface Window {
        recaptchaVerifier: any;
        confirmationResult: any;
        grecaptcha: any;
    }
}
