'use client';

import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { RideRequest, DispatchDriver } from '@/lib/dispatch/types';
import { haversineDistance, calculateMatchScore } from '@/lib/dispatch/dispatch-service';

interface RideRequestsPanelProps {
  requests: RideRequest[];
  drivers: DispatchDriver[];
  onAssign: (requestId: string, driverId: string) => Promise<{ success: boolean; error?: string }>;
  onAutoAssign?: (requestId: string) => Promise<void>;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  searching: 'bg-blue-100 text-blue-800 border-blue-200',
  matched: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

const productColors: Record<string, string> = {
  standard: '#6b7280',
  electric: '#22c55e',
  xl: '#f59e0b',
  premium: '#8b5cf6',
  comfort: '#3b82f6',
};

function getElapsedTime(date: Date | any): string {
  if (!date) return '—';
  const d = date.toDate ? date.toDate() : new Date(date);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

function getBestDrivers(request: RideRequest, drivers: DispatchDriver[], top = 3) {
  const available = drivers.filter((d) => d.status === 'online' && (d.currentLocation || d.location));

  return available
    .map((driver) => {
      const driverLoc = driver.currentLocation ?? driver.location;
      const pickupLat = request.pickup.location?.latitude ?? request.pickup.latitude ?? 45.5;
      const pickupLng = request.pickup.location?.longitude ?? request.pickup.longitude ?? -73.5;
      const distKm = haversineDistance(
        { latitude: driverLoc!.latitude, longitude: driverLoc!.longitude },
        { latitude: pickupLat, longitude: pickupLng }
      );
      const etaSec = (distKm / 30) * 3600; // 30 km/h average urban speed
      const score = calculateMatchScore({
        etaSeconds: etaSec,
        driverRating: driver.averageRating ?? 4.5,
        acceptanceRate: driver.acceptanceRate ?? 0.9,
        distanceKm: distKm,
      });
      return { driver, distKm, etaSec, score: score.total };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, top);
}

export function RideRequestsPanel({ requests, drivers, onAssign, onAutoAssign }: RideRequestsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [autoAssigning, setAutoAssigning] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const handleAutoAssign = async (requestId: string) => {
    if (!onAutoAssign) return;
    setAutoAssigning(requestId);
    try {
      await onAutoAssign(requestId);
      setFeedback((prev) => ({ ...prev, [requestId]: '\u2713 Assign\u00e9 automatiquement' }));
    } catch (e: any) {
      setFeedback((prev) => ({ ...prev, [requestId]: `\u2717 ${e.message}` }));
    } finally {
      setAutoAssigning(null);
      setTimeout(() => {
        setFeedback((prev) => { const n = { ...prev }; delete n[requestId]; return n; });
      }, 3000);
    }
  };

  const handleAssign = async (requestId: string, driverId: string) => {
    setAssigning(requestId);
    const result = await onAssign(requestId, driverId);
    setAssigning(null);
    setFeedback((prev) => ({
      ...prev,
      [requestId]: result.success ? '✓ Assigné avec succès' : `✗ ${result.error}`,
    }));
    setTimeout(() => {
      setFeedback((prev) => { const n = { ...prev }; delete n[requestId]; return n; });
    }, 3000);
  };

  return (
    <Card className="flex flex-col h-full border-0 shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span>Demandes de course</span>
          <Badge variant="secondary" className="text-xs">
            {requests.filter((r) => r.status === 'pending').length} en attente
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          {requests.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              Aucune demande en attente
            </div>
          ) : (
            <div className="divide-y">
              {requests.map((req) => {
                const isExpanded = expandedId === req.id;
                const bestDrivers = isExpanded ? getBestDrivers(req, drivers) : [];

                return (
                  <div key={req.id} className="p-3 hover:bg-muted/30 transition-colors">
                    <div
                      className="cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : req.id ?? null)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: productColors[req.serviceType] ?? '#6b7280' }}
                            />
                            <span className="text-xs font-semibold truncate">
                              {req.passengerName || 'Passager'}
                            </span>
                            <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                              {getElapsedTime(req.requestedAt)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            📍 {req.pickup.address}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            🏁 {req.destination.address}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded border font-medium ${
                              statusColors[req.status] ?? 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {req.status}
                          </span>
                          <span className="text-xs font-semibold text-green-600">
                            ${(req.estimatedPrice ?? 0).toFixed(2)}
                          </span>
                          {req.surgeMultiplier && req.surgeMultiplier > 1 && (
                            <span className="text-xs text-orange-500 font-medium">
                              ×{req.surgeMultiplier.toFixed(1)} surge
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded: show best driver matches */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-dashed">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                          Meilleurs chauffeurs disponibles
                        </p>
                        {bestDrivers.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Aucun chauffeur disponible</p>
                        ) : (
                          <div className="space-y-2">
                            {bestDrivers.map(({ driver, distKm, etaSec, score }) => (
                              <div
                                key={driver.id}
                                className="flex items-center justify-between bg-muted/50 rounded-lg p-2"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{driver.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {driver.vehicle?.make} {driver.vehicle?.model} · ★{driver.averageRating ?? '—'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {distKm.toFixed(1)} km · ~{Math.ceil(etaSec / 60)} min
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-1 ml-2">
                                  <div className="flex items-center gap-1">
                                    <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-green-500"
                                        style={{ width: `${score * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {Math.round(score * 100)}
                                    </span>
                                  </div>
                                  <Button
                                    size="sm"
                                    className="h-6 text-xs px-2"
                                    disabled={assigning === (req.id ?? '')}
                                    onClick={() => handleAssign(req.id ?? '', driver.id)}
                                  >
                                    {assigning === (req.id ?? '') ? '...' : 'Assigner'}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {feedback[req.id ?? ''] && (
                          <p className={`text-xs mt-2 font-medium ${
                            feedback[req.id ?? ''].startsWith('✓') ? 'text-green-600' : 'text-red-500'
                          }`}>
                            {feedback[req.id ?? '']}
                          </p>
                        )}
                      </div>
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
