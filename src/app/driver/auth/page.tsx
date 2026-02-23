'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function DriverAuthPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // Utilisateur connecté - rediriger vers la page principale qui gérera le routing
      router.push('/driver');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50">
        <Loader2 className="h-12 w-12 animate-spin text-red-600" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50">
        <Loader2 className="h-12 w-12 animate-spin text-red-600" />
      </div>
    );
  }

  // Utilisateur non connecté - afficher les options login/signup
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 p-4">
      <div className="max-w-md mx-auto py-16">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-6xl">🇨🇦</span>
            <h1 className="text-4xl font-bold text-red-600">KULOOC</h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Espace Chauffeur</h2>
          <p className="text-gray-600">Rejoignez la meilleure plateforme de covoiturage au Canada</p>
          <p className="text-sm text-red-600 font-medium mt-2">100% Canadian Production</p>
        </div>

        <Card className="border-2 border-red-100 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-lg">
            <CardTitle className="text-2xl">Bienvenue chez KULOOC</CardTitle>
            <CardDescription className="text-red-100">
              Commencez votre parcours en tant que chauffeur partenaire
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-3">
              <Button
                onClick={() => router.push('/driver/signup')}
                className="w-full bg-red-600 hover:bg-red-700 text-white h-12 text-lg font-semibold"
              >
                Créer un compte chauffeur
              </Button>
              
              <Button
                onClick={() => router.push('/driver/login')}
                variant="outline"
                className="w-full border-2 border-red-600 text-red-600 hover:bg-red-50 h-12 text-lg font-semibold"
              >
                Se connecter
              </Button>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Pourquoi conduire avec KULOOC ?</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Gagnez jusqu'à 2000$ par semaine</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Horaires flexibles - Travaillez quand vous voulez</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Paiements hebdomadaires garantis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Support 24/7 en français et anglais</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Assurance complète incluse</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>En vous inscrivant, vous acceptez nos</p>
          <p>
            <a href="/terms" className="text-red-600 hover:underline">Conditions d'utilisation</a>
            {' '} et notre{' '}
            <a href="/privacy" className="text-red-600 hover:underline">Politique de confidentialité</a>
          </p>
        </div>
      </div>
    </div>
  );
}
