'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { DispatchMap } from '@/components/dispatch/dispatch-map';
import { MetricsCards } from '@/components/dispatch/metrics-cards';
import { RideRequestsPanel } from '@/components/dispatch/ride-requests-panel';
import { DriversPanel } from '@/components/dispatch/drivers-panel';
import { ActiveRidesPanel } from '@/components/dispatch/active-rides-panel';
import { SurgeChart } from '@/components/dispatch/surge-chart';
import { DispatchAlerts } from '@/components/dispatch/dispatch-alerts';
import { ClientsPanel } from '@/components/dispatch/clients-panel';
import { useDispatch } from '@/lib/dispatch/use-dispatch';
import { useRealtime } from '@/lib/realtime/use-realtime';
import type { DispatchDriver, RideRequest } from '@/lib/dispatch/types';
import { useToast } from '@/hooks/use-toast';
import { Zap, Users, Car, Activity } from 'lucide-react';

export default function DispatcherDashboardPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  const { toast } = useToast();

  // ─── useDispatch : données existantes (drivers, rides, requests) ────────────
  const {
    drivers,
    rideRequests,
    activeRides,
    metrics,
    surgeMultiplier,
    isLoading,
    assignDriver,
    updateStatus,
    loadDemoData,
  } = useDispatch();

  // ─── useRealtime : clients connectés + assignation auto ────────────────────
  const {
    clients,
    metrics: realtimeMetrics,
    autoAssign,
    autoAssigning,
  } = useRealtime();

  const [selectedDriver, setSelectedDriver] = useState<DispatchDriver | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RideRequest | null>(null);
  const [activeTab, setActiveTab] = useState('requests');
  const [currentTime, setCurrentTime] = useState('');

  // Fix React #418 — horloge uniquement côté client
  useEffect(() => {
    const update = () => setCurrentTime(
      new Date().toLocaleString('fr-CA', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    );
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleDriverClick = useCallback((driver: DispatchDriver) => {
    setSelectedDriver(driver);
  }, []);

  const handleRequestClick = useCallback((request: RideRequest) => {
    setSelectedRequest(request);
    setActiveTab('requests');
  }, []);

  // ─── Assignation automatique avec feedback ──────────────────────────────────
  const handleAutoAssign = useCallback(async (requestId: string) => {
    const result = await autoAssign(requestId);
    if (result.success) {
      toast({
        title: '✅ Chauffeur assigné automatiquement',
        description: `${result.driverName} est en route`,
      });
    } else {
      toast({
        title: 'Assignation impossible',
        description: result.error || 'Aucun chauffeur disponible',
        variant: 'destructive',
      });
    }
  }, [autoAssign, toast]);

  // IDs des clients actuellement en course
  const activeRideClientIds = activeRides.map((r) => (r as any).passengerId).filter(Boolean);

  // Métriques combinées
  const combinedMetrics = {
    ...metrics,
    connectedClients: realtimeMetrics.connectedClients,
    onlineClients: realtimeMetrics.onlineClients,
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="flex-1 flex flex-col gap-3 p-3 lg:p-4 overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-foreground">Centre de Dispatch KULOOC</h1>
            <p className="text-xs text-muted-foreground">
              Montréal, QC · Temps réel ·{' '}
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                En direct
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {drivers.length === 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={loadDemoData}
                disabled={isLoading}
                className="text-xs h-8"
              >
                {isLoading ? 'Chargement...' : '⚡ Charger données démo'}
              </Button>
            )}
            <div suppressHydrationWarning className="text-xs text-muted-foreground bg-white dark:bg-gray-900 border rounded-lg px-3 py-1.5">
              {currentTime}
            </div>
          </div>
        </div>

        {/* ── Barre de statut temps réel ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-white border rounded-lg px-3 py-2 flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Car className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Chauffeurs actifs</p>
              <p className="text-lg font-bold text-green-600">{realtimeMetrics.activeDrivers}</p>
            </div>
            <div className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>

          <div className="bg-white border rounded-lg px-3 py-2 flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Clients connectés</p>
              <p className="text-lg font-bold text-blue-600">{realtimeMetrics.connectedClients}</p>
            </div>
            <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          </div>

          <div className="bg-white border rounded-lg px-3 py-2 flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <Activity className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Courses actives</p>
              <p className="text-lg font-bold text-amber-600">{realtimeMetrics.activeRides}</p>
            </div>
            <div className="ml-auto w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          </div>

          <div className="bg-white border rounded-lg px-3 py-2 flex items-center gap-2">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <Zap className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">En attente</p>
              <p className="text-lg font-bold text-red-600">{realtimeMetrics.pendingRequests}</p>
            </div>
            {realtimeMetrics.pendingRequests > 0 && (
              <div className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-ping" />
            )}
          </div>
        </div>

        {/* ── Alertes ── */}
        <DispatchAlerts
          drivers={drivers}
          requests={rideRequests}
          metrics={combinedMetrics}
          surgeMultiplier={surgeMultiplier}
        />

        {/* ── Métriques ── */}
        <MetricsCards metrics={combinedMetrics} surgeMultiplier={surgeMultiplier} />

        {/* ── Layout principal : Carte + Panneaux ── */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-3 min-h-0" style={{ minHeight: '520px' }}>

          {/* Carte — 2/3 */}
          <div className="lg:col-span-2 flex flex-col gap-3 min-h-0">
            <div className="flex-1 relative rounded-xl overflow-hidden shadow-sm border bg-white" style={{ minHeight: '400px' }}>
              {apiKey ? (
                <DispatchMap
                  apiKey={apiKey}
                  drivers={drivers}
                  rideRequests={rideRequests}
                  activeRides={activeRides}
                  connectedClients={clients}
                  showClientMarkers={false}
                  onDriverClick={handleDriverClick}
                  onRequestClick={handleRequestClick}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <p className="text-muted-foreground text-sm">Clé API Google Maps manquante</p>
                </div>
              )}

              {/* Légende */}
              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border p-2 text-xs space-y-1 z-10">
                <p className="font-semibold text-gray-700 mb-1">Légende</p>
                {[
                  { color: '#22c55e', label: 'Disponible' },
                  { color: '#f59e0b', label: 'En route vers passager' },
                  { color: '#3b82f6', label: 'En course' },
                  { color: '#ef4444', label: 'Occupé' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                      <path d="M2 5 L4 2 L12 2 L14 5 L15 6 L15 10 L1 10 L1 6 Z" fill={color} />
                      <circle cx="4" cy="11" r="1.5" fill="#1f2937" />
                      <circle cx="12" cy="11" r="1.5" fill="#1f2937" />
                    </svg>
                    <span className="text-gray-600">{label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 pt-1 border-t">
                  <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                  <span className="text-gray-600">Prise en charge</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-red-500 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-sm" />
                  </div>
                  <span className="text-gray-600">Destination</span>
                </div>
              </div>

              {/* Overlay chauffeur sélectionné */}
              {selectedDriver && (
                <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg shadow-md border p-3 text-xs z-10 w-52">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{selectedDriver.name}</p>
                    <button className="text-gray-400 hover:text-gray-600" onClick={() => setSelectedDriver(null)}>✕</button>
                  </div>
                  <p className="text-muted-foreground">{selectedDriver.vehicle?.make} {selectedDriver.vehicle?.model}</p>
                  <p className="text-muted-foreground font-mono">{selectedDriver.vehicle?.licensePlate}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-amber-500">★ {(selectedDriver.averageRating || 0).toFixed(1)}</span>
                    <span className="text-muted-foreground">{Math.round((selectedDriver.acceptanceRate ?? 0) * 100)}% acc.</span>
                  </div>
                  <div className={`mt-1.5 text-xs px-2 py-0.5 rounded-full inline-block font-medium ${
                    selectedDriver.status === 'online' ? 'bg-green-100 text-green-700' :
                    selectedDriver.status === 'en-route' ? 'bg-amber-100 text-amber-700' :
                    selectedDriver.status === 'on-trip' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {selectedDriver.status}
                  </div>
                </div>
              )}
            </div>

            {/* Graphique surge */}
            <SurgeChart
              currentSurge={surgeMultiplier}
              pendingRequests={metrics.pendingRequests}
              onlineDrivers={metrics.onlineDrivers}
            />
          </div>

          {/* Panneaux droite — 1/3 */}
          <div className="flex flex-col min-h-0" style={{ minHeight: '520px' }}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <TabsList className="grid grid-cols-4 w-full flex-shrink-0 h-8">
                <TabsTrigger value="requests" className="text-xs">
                  Dem.
                  {metrics.pendingRequests > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center leading-none">
                      {metrics.pendingRequests}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="rides" className="text-xs">
                  Courses
                  {metrics.activeRides > 0 && (
                    <span className="ml-1 bg-blue-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center leading-none">
                      {metrics.activeRides}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="drivers" className="text-xs">
                  Flotte
                  {metrics.activeDrivers > 0 && (
                    <span className="ml-1 bg-green-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center leading-none">
                      {metrics.activeDrivers}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="clients" className="text-xs">
                  Clients
                  {realtimeMetrics.connectedClients > 0 && (
                    <span className="ml-1 bg-purple-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center leading-none">
                      {realtimeMetrics.connectedClients > 9 ? '9+' : realtimeMetrics.connectedClients}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="requests" className="flex-1 mt-2 min-h-0">
                <div className="h-full" style={{ minHeight: '400px' }}>
                  <RideRequestsPanel
                    requests={rideRequests}
                    drivers={drivers}
                    onAssign={assignDriver}
                  />
                </div>
              </TabsContent>

              <TabsContent value="rides" className="flex-1 mt-2 min-h-0">
                <div className="h-full" style={{ minHeight: '400px' }}>
                  <ActiveRidesPanel
                    rides={activeRides}
                    onUpdateStatus={updateStatus}
                  />
                </div>
              </TabsContent>

              <TabsContent value="drivers" className="flex-1 mt-2 min-h-0">
                <div className="h-full" style={{ minHeight: '400px' }}>
                  <DriversPanel
                    drivers={drivers}
                    onDriverSelect={handleDriverClick}
                  />
                </div>
              </TabsContent>

              <TabsContent value="clients" className="flex-1 mt-2 min-h-0">
                <div className="h-full" style={{ minHeight: '400px' }}>
                  <ClientsPanel
                    clients={clients}
                    activeRideClientIds={activeRideClientIds}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
