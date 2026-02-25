'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/firebase/provider';
import { db } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Car, MapPin, Clock, Star,
  RefreshCw, Circle, DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type RideRecord = {
  id: string;
  status: string;
  pickup?: { address?: string };
  destination?: { address?: string };
  serviceType?: string;
  driverName?: string;
  pricing?: { total?: number; distanceKm?: number; durationMin?: number };
  estimatedPrice?: number;
  finalPrice?: number;
  estimatedDistanceKm?: number;
  estimatedDurationMin?: number;
  completedAt?: any;
  rideCompletedAt?: any;
  assignedAt?: any;
  requestedAt?: any;
  createdAt?: any;
  driverRating?: number | null;
};

const statusConfig: Record<string, { label: string; color: string }> = {
  completed: { label: 'Terminee', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulee', color: 'bg-red-100 text-red-700' },
  'in-progress': { label: 'En cours', color: 'bg-blue-100 text-blue-700' },
  'driver-assigned': { label: 'En route', color: 'bg-orange-100 text-orange-700' },
  'driver-arrived': { label: 'Arrive', color: 'bg-purple-100 text-purple-700' },
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
};

export default function ClientActivityPage() {
  const { user } = useUser();
  const [rides, setRides] = useState<RideRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load ride history from multiple sources: completed_rides + active_rides
  useEffect(() => {
    if (!user?.uid) return;

    const loadRides = async () => {
      setIsLoading(true);
      const allRides: RideRecord[] = [];

      try {
        // 1. Load from completed_rides
        const completedQ = query(
          collection(db, 'completed_rides'),
          where('passengerId', '==', user.uid),
          limit(30)
        );
        const completedSnap = await getDocs(completedQ);
        completedSnap.docs.forEach(d => {
          allRides.push({ id: d.id, ...d.data() } as RideRecord);
        });
      } catch (err: any) {
        console.warn('Activity: completed_rides query:', err?.message);
      }

      try {
        // 2. Load from active_rides (for rides not yet in completed)
        const activeQ = query(
          collection(db, 'active_rides'),
          where('passengerId', '==', user.uid),
          limit(20)
        );
        const activeSnap = await getDocs(activeQ);
        activeSnap.docs.forEach(d => {
          // Avoid duplicates
          if (!allRides.find(r => r.id === d.id)) {
            allRides.push({ id: d.id, ...d.data() } as RideRecord);
          }
        });
      } catch (err: any) {
        console.warn('Activity: active_rides query:', err?.message);
      }

      // Sort by most recent timestamp
      allRides.sort((a, b) => {
        const getTs = (r: RideRecord) => {
          const ts = r.completedAt || r.rideCompletedAt || r.assignedAt || r.requestedAt || r.createdAt;
          return ts?.toMillis?.() || ts?.seconds * 1000 || 0;
        };
        return getTs(b) - getTs(a);
      });

      setRides(allRides);
      setIsLoading(false);
    };

    loadRides();
  }, [user?.uid]);

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
  };

  const getPrice = (ride: RideRecord) => {
    return ride.finalPrice || ride.pricing?.total || ride.estimatedPrice || 0;
  };

  const completedRides = rides.filter(r => r.status === 'completed');
  const totalSpent = completedRides.reduce((sum, r) => sum + getPrice(r), 0);
  const avgRating = completedRides.length > 0
    ? completedRides.reduce((sum, r) => sum + (r.driverRating || 5), 0) / completedRides.length
    : 5.0;

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Mes activites</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.location.reload()}
          className="text-muted-foreground"
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{rides.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Courses</p>
        </div>
        <div className="bg-muted rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-foreground">
            {totalSpent.toFixed(0)} $
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Depense</p>
        </div>
        <div className="bg-muted rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-foreground">
            {avgRating.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Note moy.</p>
        </div>
      </div>

      {/* Ride List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : rides.length === 0 ? (
        <div className="text-center py-12">
          <Car className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Aucune course pour l'instant</p>
          <p className="text-muted-foreground/60 text-sm mt-1">Vos courses apparaitront ici</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rides.map(ride => {
            const status = statusConfig[ride.status] || statusConfig.completed;
            const ts = ride.completedAt || ride.rideCompletedAt || ride.assignedAt || ride.requestedAt || ride.createdAt;
            const price = getPrice(ride);
            const distance = ride.pricing?.distanceKm || ride.estimatedDistanceKm;
            const duration = ride.pricing?.durationMin || ride.estimatedDurationMin;

            return (
              <Card key={ride.id} className="border-border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
                        <Car className="w-4 h-4 text-background" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">
                          {ride.serviceType?.replace('kulooc_', 'KULOOC ').replace('_', ' ').toUpperCase() || 'KULOOC X'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(ts)} {formatTime(ts) && `- ${formatTime(ts)}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">
                        {price.toFixed(2)} $
                      </p>
                      <Badge className={cn('text-xs mt-0.5', status.color)}>
                        {status.label}
                      </Badge>
                    </div>
                  </div>

                  {/* Route */}
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <div className="flex flex-col items-center mt-0.5 flex-shrink-0">
                      <Circle className="w-2.5 h-2.5 fill-current text-muted-foreground" />
                      <div className="w-px h-4 bg-border my-0.5" />
                      <div className="w-2.5 h-2.5 bg-red-600 rounded-sm" />
                    </div>
                    <div className="space-y-2 flex-1 min-w-0">
                      <p className="truncate">{ride.pickup?.address || 'Depart'}</p>
                      <p className="truncate font-medium text-foreground">{ride.destination?.address || 'Destination'}</p>
                    </div>
                  </div>

                  {/* Extra info */}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                    {distance && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {typeof distance === 'number' ? distance.toFixed(1) : distance} km
                      </span>
                    )}
                    {duration && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {Math.round(typeof duration === 'number' ? duration : parseInt(duration))} min
                      </span>
                    )}
                    {ride.driverName && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="w-3 h-3 text-yellow-500" />
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
