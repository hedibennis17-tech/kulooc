'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db, initializeFirebase } from '@/firebase';

const { auth } = initializeFirebase();

export default function DriverLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const checkDriverProfile = async (uid: string) => {
    const driverRef = doc(db, 'drivers', uid);
    const driverSnap = await getDoc(driverRef);
    return driverSnap.exists();
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const hasProfile = await checkDriverProfile(result.user.uid);
      
      if (!hasProfile) {
        toast({
          title: 'Aucun compte chauffeur',
          description: 'Veuillez créer un compte chauffeur d\'abord.',
          variant: 'destructive',
        });
        await auth.signOut();
        return;
      }
      
      toast({
        title: 'Connexion réussie !',
        description: 'Bienvenue sur KULOOC.',
      });
      
      router.push('/driver');
    } catch (error: any) {
      toast({
        title: 'Erreur de connexion',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'Champs manquants',
        description: 'Veuillez remplir tous les champs.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      const hasProfile = await checkDriverProfile(result.user.uid);
      
      if (!hasProfile) {
        toast({
          title: 'Aucun compte chauffeur',
          description: 'Veuillez créer un compte chauffeur d\'abord.',
          variant: 'destructive',
        });
        await auth.signOut();
        return;
      }
      
      toast({
        title: 'Connexion réussie !',
        description: 'Bienvenue sur KULOOC.',
      });
      
      router.push('/driver');
    } catch (error: any) {
      let errorMessage = 'Une erreur est survenue.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Email ou mot de passe incorrect.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email invalide.';
      }
      
      toast({
        title: 'Erreur de connexion',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 p-4">
      <div className="max-w-md mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/driver/auth')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-6xl">🇨🇦</span>
            <h1 className="text-4xl font-bold text-red-600">KULOOC</h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connexion Chauffeur</h2>
          <p className="text-gray-600">Connectez-vous à votre compte</p>
          <p className="text-sm text-red-600 font-medium mt-2">100% Canadian Production</p>
        </div>

        <Card className="border-2 border-red-100 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-lg">
            <CardTitle className="text-2xl">Se connecter</CardTitle>
            <CardDescription className="text-red-100">
              Accédez à votre espace chauffeur
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-6">
            <Button
              variant="outline"
              className="w-full h-12 border-2"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <FcGoogle className="mr-2 h-6 w-6" />
              )}
              Continuer avec Google
            </Button>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-sm text-gray-500">
                ou
              </span>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12"
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 h-12 text-lg font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>

            <div className="text-center text-sm">
              <p className="text-gray-600">
                Pas encore de compte ?{' '}
                <button
                  onClick={() => router.push('/driver/signup')}
                  className="text-red-600 font-semibold hover:underline"
                >
                  Créer un compte
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
