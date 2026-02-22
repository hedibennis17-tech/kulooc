'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Database,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Users,
  Car,
  MapPin,
  Settings,
  Play,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { seedFirestore } from '@/lib/firestore/seed';

type SeedStatus = 'idle' | 'running' | 'success' | 'error';

export default function AdminPage() {
  const { toast } = useToast();
  const [seedStatus, setSeedStatus] = useState<SeedStatus>('idle');
  const [seedMessage, setSeedMessage] = useState('');

  const handleSeedFirestore = async () => {
    setSeedStatus('running');
    setSeedMessage('Initialisation en cours...');
    try {
      const result = await seedFirestore();
      if (result.success) {
        setSeedStatus('success');
        setSeedMessage(result.message);
        toast({ title: '✅ Firestore initialisé !', description: result.message });
      } else {
        setSeedStatus('error');
        setSeedMessage(result.message);
        toast({ variant: 'destructive', title: 'Erreur', description: result.message });
      }
    } catch (err: any) {
      setSeedStatus('error');
      setSeedMessage(err.message);
      toast({ variant: 'destructive', title: 'Erreur critique', description: err.message });
    }
  };

  const collections = [
    {
      name: 'drivers',
      description: 'Profils des chauffeurs KULOOC',
      icon: Car,
      fields: ['userId', 'name', 'status', 'location', 'vehicle', 'averageRating', 'acceptanceRate', 'earningsToday'],
      color: 'bg-blue-50 border-blue-200',
    },
    {
      name: 'ride_requests',
      description: 'Demandes de course des passagers',
      icon: MapPin,
      fields: ['passengerId', 'pickup', 'destination', 'serviceType', 'estimatedPrice', 'status', 'surgeMultiplier'],
      color: 'bg-yellow-50 border-yellow-200',
    },
    {
      name: 'active_rides',
      description: 'Courses en cours (assignées, en route, actives)',
      icon: Play,
      fields: ['requestId', 'driverId', 'passengerId', 'status', 'pricing', 'driverLocation', 'startedAt'],
      color: 'bg-green-50 border-green-200',
    },
    {
      name: 'completed_rides',
      description: 'Historique des courses terminées',
      icon: CheckCircle2,
      fields: ['requestId', 'driverId', 'passengerId', 'pricing', 'completedAt', 'rating'],
      color: 'bg-gray-50 border-gray-200',
    },
    {
      name: 'users',
      description: 'Profils des utilisateurs (passagers)',
      icon: Users,
      fields: ['uid', 'name', 'email', 'role', 'preferences', 'stats'],
      color: 'bg-purple-50 border-purple-200',
    },
    {
      name: 'zones',
      description: 'Zones géographiques de Montréal avec surge pricing',
      icon: MapPin,
      fields: ['name', 'center', 'surgeMultiplier', 'activeDrivers', 'pendingRequests', 'demandLevel'],
      color: 'bg-orange-50 border-orange-200',
    },
    {
      name: 'system_config',
      description: 'Configuration globale du système',
      icon: Settings,
      fields: ['pricing', 'dispatch', 'taxRate', 'operatingHours', 'supportPhone'],
      color: 'bg-red-50 border-red-200',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">K</span>
        </div>
        <div>
          <h1 className="font-bold text-lg leading-none">KULOOC Admin</h1>
          <p className="text-xs text-muted-foreground">Gestion de la base de données</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/dispatch">Dispatch</a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/ride">App</a>
          </Button>
        </div>
      </div>

      <main className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">

        {/* Seed Card */}
        <Card className="border-primary/30 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Initialiser Firestore</CardTitle>
                <CardDescription>
                  Crée les collections et insère les données de démonstration (6 chauffeurs, 3 zones, config système)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {seedStatus === 'success' && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>{seedMessage}</span>
              </div>
            )}
            {seedStatus === 'error' && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{seedMessage}</span>
              </div>
            )}
            {seedStatus === 'running' && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                <span>{seedMessage}</span>
              </div>
            )}
            <Button
              onClick={handleSeedFirestore}
              disabled={seedStatus === 'running'}
              className="w-full"
            >
              {seedStatus === 'running' ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Initialisation...</>
              ) : seedStatus === 'success' ? (
                <><RefreshCw className="mr-2 h-4 w-4" /> Réinitialiser les données</>
              ) : (
                <><Database className="mr-2 h-4 w-4" /> Initialiser les collections Firestore</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              ⚠️ Cette opération écrase les données existantes de démonstration
            </p>
          </CardContent>
        </Card>

        {/* Firebase Console Link */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Firebase Console</p>
                <p className="text-xs text-muted-foreground">Voir les collections en temps réel</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://console.firebase.google.com/project/studio-1433254313-1efda/firestore"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-3 w-3" />
                  Ouvrir
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Collections Schema */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Schéma des collections Firestore</h2>
          <div className="grid gap-3">
            {collections.map((col) => (
              <Card key={col.name} className={`border ${col.color}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <col.icon className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="font-bold text-sm">{col.name}</code>
                        <Badge variant="outline" className="text-xs">Collection</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{col.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {col.fields.map((field) => (
                          <code key={field} className="text-xs bg-white border rounded px-1.5 py-0.5">
                            {field}
                          </code>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Flux de synchronisation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Flux de synchronisation des 3 interfaces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="font-bold text-blue-700 min-w-fit">1. Passager</span>
                <span className="text-muted-foreground">Saisit adresses → Confirme → Crée un document dans <code>ride_requests</code> avec statut <code>pending</code></span>
              </div>
              <div className="flex items-center justify-center text-muted-foreground text-xs">↓ Firestore onSnapshot</div>
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <span className="font-bold text-yellow-700 min-w-fit">2. Dispatcher</span>
                <span className="text-muted-foreground">Voit la demande en temps réel → Algorithme de matching → Assigne un chauffeur → Crée dans <code>active_rides</code></span>
              </div>
              <div className="flex items-center justify-center text-muted-foreground text-xs">↓ Firestore onSnapshot</div>
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <span className="font-bold text-green-700 min-w-fit">3. Chauffeur</span>
                <span className="text-muted-foreground">Reçoit la notification → Accepte → Met à jour statut → GPS en temps réel → Complète la course</span>
              </div>
              <div className="flex items-center justify-center text-muted-foreground text-xs">↓ Course terminée</div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="font-bold text-gray-700 min-w-fit">4. Historique</span>
                <span className="text-muted-foreground">Document archivé dans <code>completed_rides</code> → Évaluation → Paiement traité</span>
              </div>
            </div>
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
