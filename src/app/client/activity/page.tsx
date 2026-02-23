'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/firebase/provider';
import { getClientRideHistory } from '@/lib/client/client-service';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Car, MapPin, Clock, DollarSign, Star,
  RefreshCw, ChevronRight, Circle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; color: string }> = {
  completed: { label: 'Terminée', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700' },
  in_progress: { label: 'En cours', color: 'bg-blue-100 text-blue-700' },
};

export default function ClientActivityPage() {
  const { user } = useUser();
  const [rides, setRides] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const history = await getClientRideHistory(user.uid, 30);
      setRides(history);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, [user]);

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Mes courses</h1>
        <Button variant="ghost" size="sm" onClick={loadHistory} className="text-gray-400">
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{rides.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Courses</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">
            ${rides.reduce((sum, r) => sum + (r.pricing?.total || r.estimatedPrice || 0), 0).toFixed(0)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Dépensé</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {rides.length > 0
              ? (rides.reduce((sum, r) => sum + (r.passengerRating || 5), 0) / rides.length).toFixed(1)
              : '5.0'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Note moy.</p>
        </div>
      </div>

      {/* Liste des courses */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : rides.length === 0 ? (
        <div className="text-center py-12">
          <Car className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucune course pour l'instant</p>
          <p className="text-gray-400 text-sm mt-1">Vos courses apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rides.map(ride => {
            const status = statusConfig[ride.status] || statusConfig.completed;
            return (
              <Card key={ride.id} className="border-gray-100 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                        <Car className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">
                          {ride.serviceType?.replace('kulooc_', 'KULOOC ').replace('_', ' ').toUpperCase() || 'KULOOC X'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(ride.completedAt)} · {formatTime(ride.completedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        ${(ride.pricing?.total || ride.estimatedPrice || 0).toFixed(2)}
                      </p>
                      <Badge className={cn('text-xs mt-0.5', status.color)}>
                        {status.label}
                      </Badge>
                    </div>
                  </div>

                  {/* Trajet */}
                  <div className="flex items-start gap-2 text-xs text-gray-500">
                    <div className="flex flex-col items-center mt-0.5 flex-shrink-0">
                      <Circle className="w-2.5 h-2.5 fill-current text-gray-400" />
                      <div className="w-px h-4 bg-gray-200 my-0.5" />
                      <div className="w-2.5 h-2.5 bg-red-600 rounded-sm" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <p className="truncate">{ride.pickup?.address || 'Départ'}</p>
                      <p className="truncate font-medium text-gray-700">{ride.destination?.address || 'Destination'}</p>
                    </div>
                  </div>

                  {/* Infos supplémentaires */}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
                    {ride.estimatedDistance && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <MapPin className="w-3 h-3" />
                        {ride.estimatedDistance} km
                      </span>
                    )}
                    {ride.estimatedDuration && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {ride.estimatedDuration} min
                      </span>
                    )}
                    {ride.driverName && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Star className="w-3 h-3 text-yellow-400" />
                        {ride.driverName}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
