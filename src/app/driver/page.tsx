'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  Loader2,
  MapPin,
  Navigation,
  Star,
  DollarSign,
  Clock,
  Car,
  CheckCircle2,
  Phone,
  X,
  TrendingUp,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { MapView } from '@/components/kulooc/map-view';
import { useDriver } from '@/lib/firestore/use-driver';
import { useUser } from '@/firebase/provider';
import type { RideRequest } from '@/lib/firestore/ride-service';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export default function DriverHomePage() {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const [selectedRequest, setSelectedRequest] = useState<RideRequest | null>(null);

  const {
    driverStatus,
    isOnline,
    pendingRequests,
    activeRide,
    isLoading,
    error,
    onlineDuration,
    earningsToday,
    ridesCompleted,
    goOnline,
    goOffline,
    acceptRide,
    declineRide,
    arrivedAtPickup,
    startRide,
    completeRide,
  } = useDriver();

  const handleToggleOnline = async () => {
    if (isOnline) {
      await goOffline();
      toast({ title: 'Vous êtes maintenant hors ligne.' });
    } else {
      await goOnline();
      toast({ title: '✅ Vous êtes maintenant en ligne !', description: 'En attente de courses...' });
    }
  };

  const handleAcceptRide = async (request: RideRequest) => {
    setSelectedRequest(null);
    await acceptRide(request);
    toast({ title: '🚗 Course acceptée !', description: `En route vers ${request.passengerName}` });
  };

  const handleDeclineRide = async (requestId: string) => {
    setSelectedRequest(null);
    await declineRide(requestId);
  };

  const statusColor = {
    offline: 'bg-gray-500',
    online: 'bg-green-500',
    'en-route': 'bg-blue-500',
    'on-trip': 'bg-primary',
    busy: 'bg-yellow-500',
  }[driverStatus];

  const statusLabel = {
    offline: 'Hors ligne',
    online: 'En ligne',
    'en-route': 'En route',
    'on-trip': 'Course en cours',
    busy: 'Occupé',
  }[driverStatus];

  return (
    <div className="flex flex-col h-full">
      {/* Map */}
      <div className="flex-1 bg-gray-300 relative">
        {apiKey ? (
          <MapView apiKey={apiKey} route={null} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Clé API Google Maps manquante.</p>
          </div>
        )}

        {/* Notification de course entrante */}
        {isOnline && pendingRequests.length > 0 && !activeRide && (
          <div className="absolute top-4 left-4 right-4 z-10">
            {pendingRequests.slice(0, 1).map((req) => (
              <Card key={req.id} className="border-primary shadow-lg animate-in slide-in-from-top-4">
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-primary">🔔 Nouvelle course !</CardTitle>
                    <Badge variant="outline" className="text-xs">{req.serviceType?.replace('kulooc_', '').toUpperCase()}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2">
                  <div className="flex items-start gap-2 text-xs">
                    <div className="flex flex-col items-center gap-0.5 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <div className="w-0.5 h-4 bg-gray-200" />
                      <MapPin className="h-2.5 w-2.5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="line-clamp-1 text-muted-foreground">{req.pickup?.address}</p>
                      <p className="line-clamp-1 font-medium">{req.destination?.address}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-base">${req.estimatedPrice?.toFixed(2)}</p>
                      <p className="text-muted-foreground">{req.estimatedDistanceKm?.toFixed(1)} km</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => handleDeclineRide(req.id!)}
                    >
                      <X className="mr-1 h-3 w-3" /> Refuser
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => handleAcceptRide(req)}
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Accepter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Panel bas */}
      <div className="p-4 bg-white space-y-3 border-t">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <DollarSign className="h-3 w-3" /> Gains
            </p>
            <p className="font-bold text-sm">${earningsToday.toFixed(2)}</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Car className="h-3 w-3" /> Courses
            </p>
            <p className="font-bold text-sm">{ridesCompleted}</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" /> En ligne
            </p>
            <p className="font-bold text-sm">{formatDuration(onlineDuration)}</p>
          </div>
        </div>

        {/* Statut */}
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${statusColor} animate-pulse`} />
            <span className="font-semibold text-sm">{statusLabel}</span>
          </div>
          {pendingRequests.length > 0 && isOnline && !activeRide && (
            <Badge variant="destructive" className="animate-bounce">
              {pendingRequests.length} demande{pendingRequests.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Course active — actions chauffeur */}
        {activeRide && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm">{activeRide.passengerName}</p>
                <Badge className="text-xs">{activeRide.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p className="flex items-center gap-1"><MapPin className="h-3 w-3 text-green-500" /> {activeRide.pickup?.address}</p>
                <p className="flex items-center gap-1"><MapPin className="h-3 w-3 text-primary" /> {activeRide.destination?.address}</p>
              </div>
              <p className="font-bold text-lg text-right">${activeRide.pricing?.total?.toFixed(2)} CAD</p>
              <div className="flex gap-2">
                {activeRide.status === 'driver-assigned' && (
                  <Button size="sm" className="flex-1 h-8 text-xs" onClick={arrivedAtPickup}>
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Arrivé au point de prise
                  </Button>
                )}
                {activeRide.status === 'driver-arrived' && (
                  <Button size="sm" className="flex-1 h-8 text-xs" onClick={startRide}>
                    <Navigation className="mr-1 h-3 w-3" /> Démarrer la course
                  </Button>
                )}
                {activeRide.status === 'in-progress' && (
                  <Button size="sm" className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700" onClick={completeRide}>
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Terminer la course
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bouton principal */}
        <Button
          size="lg"
          className={`w-full h-14 text-lg rounded-xl font-bold ${
            isOnline ? 'bg-gray-800 hover:bg-gray-900' : 'bg-primary hover:bg-primary/90'
          }`}
          onClick={handleToggleOnline}
          disabled={isLoading || (!!activeRide && activeRide.status === 'in-progress')}
        >
          {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
          {isLoading ? 'Vérification...' : isOnline ? 'Passer hors ligne' : 'Passer en ligne'}
        </Button>
      </div>
    </div>
  );
}
