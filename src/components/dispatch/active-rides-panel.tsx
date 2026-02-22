'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ActiveRide } from '@/lib/dispatch/types';

interface ActiveRidesPanelProps {
  rides: ActiveRide[];
  onUpdateStatus: (rideId: string, status: ActiveRide['status']) => Promise<void>;
}

const statusConfig: Record<string, { label: string; color: string; next?: ActiveRide['status']; nextLabel?: string }> = {
  'driver-assigned': { label: 'Assigné',         color: 'bg-blue-100 text-blue-800',   next: 'driver-arrived', nextLabel: 'Arrivé' },
  'driver-arrived':  { label: 'Arrivé',           color: 'bg-purple-100 text-purple-800', next: 'in-progress', nextLabel: 'Démarrer' },
  'in-progress':     { label: 'En cours',         color: 'bg-green-100 text-green-800',  next: 'completed',   nextLabel: 'Terminer' },
  completed:         { label: 'Terminé',          color: 'bg-gray-100 text-gray-700' },
  cancelled:         { label: 'Annulé',           color: 'bg-red-100 text-red-700' },
};

function getElapsed(date: Date | any): string {
  if (!date) return '—';
  const d = date.toDate ? date.toDate() : new Date(date);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

export function ActiveRidesPanel({ rides, onUpdateStatus }: ActiveRidesPanelProps) {
  const [updating, setUpdating] = useState<string | null>(null);

  const handleUpdate = async (rideId: string, status: ActiveRide['status']) => {
    setUpdating(rideId);
    await onUpdateStatus(rideId, status);
    setUpdating(null);
  };

  return (
    <Card className="flex flex-col h-full border-0 shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span>Courses actives</span>
          <Badge variant="secondary" className="text-xs">{rides.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          {rides.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              Aucune course active
            </div>
          ) : (
            <div className="divide-y">
              {rides.map((ride) => {
                const cfg = statusConfig[ride.status] ?? { label: ride.status, color: 'bg-gray-100 text-gray-700' };
                return (
                  <div key={ride.id} className="p-3 hover:bg-muted/30 transition-colors">
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          #{ride.id.slice(-6).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {getElapsed(ride.assignedAt)}
                      </span>
                    </div>

                    {/* Passenger & Driver */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="bg-muted/40 rounded p-2">
                        <p className="text-xs text-muted-foreground">Passager</p>
                        <p className="text-xs font-medium truncate">{ride.passengerName || ride.passengerId}</p>
                      </div>
                      <div className="bg-muted/40 rounded p-2">
                        <p className="text-xs text-muted-foreground">Chauffeur</p>
                        <p className="text-xs font-medium truncate">{ride.driverName || ride.driverId}</p>
                      </div>
                    </div>

                    {/* Route */}
                    <div className="space-y-1 mb-2">
                      <p className="text-xs text-muted-foreground truncate">
                        <span className="text-green-500">●</span> {ride.pickup.address}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        <span className="text-red-500">●</span> {ride.destination.address}
                      </p>
                    </div>

                    {/* Pricing */}
                    {ride.pricing && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">
                          {ride.pricing.surgeMultiplier > 1 && (
                            <span className="text-orange-500 mr-1">×{ride.pricing.surgeMultiplier.toFixed(1)}</span>
                          )}
                          {ride.actualRoute?.distanceKm?.toFixed(1)} km
                        </span>
                        <span className="text-sm font-bold text-green-600">
                          ${ride.pricing.total.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {/* Action button */}
                    {cfg.next && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-7 text-xs"
                        disabled={updating === ride.id}
                        onClick={() => handleUpdate(ride.id, cfg.next!)}
                      >
                        {updating === ride.id ? 'Mise à jour...' : cfg.nextLabel}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
