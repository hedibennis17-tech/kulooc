'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Loader2,
  MapPin,
  Navigation,
  Star,
  Phone,
  MessageSquare,
  CheckCircle2,
  Clock,
  Car,
  X,
} from 'lucide-react';
import type { RideFlowState } from '@/lib/firestore/use-ride';
import type { RideRequest, ActiveRide } from '@/lib/firestore/ride-service';

type RideTrackerProps = {
  flowState: RideFlowState;
  rideRequest: RideRequest | null;
  activeRide: ActiveRide | null;
  estimatedPrice: { subtotal: number; tax: number; total: number } | null;
  onCancel: () => void;
  onNewRide: () => void;
};

const STATUS_CONFIG: Record<RideFlowState, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  idle: { label: 'Prêt', color: 'bg-gray-100 text-gray-700', icon: Car },
  requesting: { label: 'Envoi de la demande...', color: 'bg-blue-100 text-blue-700', icon: Loader2 },
  searching: { label: 'Recherche d\'un chauffeur...', color: 'bg-yellow-100 text-yellow-700', icon: Loader2 },
  'driver-assigned': { label: 'Chauffeur en route', color: 'bg-blue-100 text-blue-700', icon: Navigation },
  'driver-arrived': { label: 'Chauffeur arrivé !', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  'in-progress': { label: 'Course en cours', color: 'bg-primary/10 text-primary', icon: Car },
  completed: { label: 'Course terminée', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  cancelled: { label: 'Course annulée', color: 'bg-red-100 text-red-700', icon: X },
  error: { label: 'Erreur', color: 'bg-red-100 text-red-700', icon: X },
};

export function RideTracker({ flowState, rideRequest, activeRide, estimatedPrice, onCancel, onNewRide }: RideTrackerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const config = STATUS_CONFIG[flowState];
  const StatusIcon = config.icon;

  // Timer pour la recherche
  useEffect(() => {
    if (flowState !== 'searching') {
      setElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [flowState]);

  if (flowState === 'idle') return null;

  const ride = activeRide || rideRequest;
  const price = activeRide?.pricing?.total ?? estimatedPrice?.total;

  return (
    <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-300">
      {/* Status Banner */}
      <div className={`flex items-center gap-3 p-3 rounded-lg ${config.color}`}>
        <StatusIcon className={`h-5 w-5 flex-shrink-0 ${['requesting', 'searching'].includes(flowState) ? 'animate-spin' : ''}`} />
        <div className="flex-1">
          <p className="font-semibold text-sm">{config.label}</p>
          {flowState === 'searching' && (
            <p className="text-xs opacity-75">Temps d'attente: {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}</p>
          )}
        </div>
        {(flowState === 'searching' || flowState === 'requesting') && (
          <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 px-2 text-xs">
            Annuler
          </Button>
        )}
      </div>

      {/* Infos du trajet */}
      {ride && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 mt-1">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <div className="w-0.5 h-8 bg-gray-200" />
                <MapPin className="h-3 w-3 text-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Départ</p>
                  <p className="text-sm font-medium line-clamp-1">{rideRequest?.pickup?.address || 'Votre position'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Destination</p>
                  <p className="text-sm font-medium line-clamp-1">{rideRequest?.destination?.address || 'Destination'}</p>
                </div>
              </div>
            </div>

            {price && (
              <>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Prix estimé</span>
                  <span className="font-bold text-lg">${price.toFixed(2)} CAD</span>
                </div>
                {estimatedPrice && (
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div className="flex justify-between">
                      <span>Sous-total</span>
                      <span>${estimatedPrice.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TPS + TVQ (14.975%)</span>
                      <span>${estimatedPrice.tax.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Infos du chauffeur (une fois assigné) */}
      {activeRide && ['driver-assigned', 'driver-arrived', 'in-progress'].includes(flowState) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-white font-bold">
                  {activeRide.driverName?.charAt(0) || 'C'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-bold">{activeRide.driverName}</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span>4.9</span>
                  <span className="mx-1">•</span>
                  <span>En route</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" className="h-9 w-9">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" className="h-9 w-9">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {flowState === 'driver-arrived' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="font-semibold text-green-700">Votre chauffeur est arrivé !</p>
                <p className="text-xs text-green-600">Dirigez-vous vers le véhicule</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Course terminée */}
      {flowState === 'completed' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
            <div>
              <p className="font-bold text-green-700">Course terminée !</p>
              {activeRide?.pricing?.total && (
                <p className="text-2xl font-bold mt-1">${activeRide.pricing.total.toFixed(2)} CAD</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" variant="outline">
                <Star className="mr-2 h-4 w-4" />
                Évaluer
              </Button>
              <Button className="flex-1" onClick={onNewRide}>
                Nouvelle course
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course annulée */}
      {flowState === 'cancelled' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center space-y-3">
            <X className="h-10 w-10 text-red-500 mx-auto" />
            <p className="font-semibold text-red-700">Course annulée</p>
            <Button className="w-full" onClick={onNewRide}>
              Commander une nouvelle course
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
