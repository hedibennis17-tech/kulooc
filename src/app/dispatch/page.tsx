'use client';

import React, { useState, useCallback } from 'react';
// Sidebar and Header removed for fullscreen dispatch view
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { DispatchMap } from '@/components/dispatch/dispatch-map';
import { MetricsCards } from '@/components/dispatch/metrics-cards';
import { RideRequestsPanel } from '@/components/dispatch/ride-requests-panel';
import { DriversPanel } from '@/components/dispatch/drivers-panel';
import { ActiveRidesPanel } from '@/components/dispatch/active-rides-panel';
import { SurgeChart } from '@/components/dispatch/surge-chart';
import { DispatchAlerts } from '@/components/dispatch/dispatch-alerts';
import { useDispatch } from '@/lib/dispatch/use-dispatch';
import type { DispatchDriver, RideRequest } from '@/lib/dispatch/types';

export default function DispatcherDashboardPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  const {
    drivers,
    rideRequests,
    activeRides,
    metrics,
    surgeMultiplier,
    isLoading,
    error,
    assignDriver,
    updateStatus,
    loadDemoData,
  } = useDispatch();

  const [selectedDriver, setSelectedDriver] = useState<DispatchDriver | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RideRequest | null>(null);
  const [activeTab, setActiveTab] = useState('requests');

  const handleDriverClick = useCallback((driver: DispatchDriver) => {
    setSelectedDriver(driver);
  }, []);

  const handleRequestClick = useCallback((request: RideRequest) => {
    setSelectedRequest(request);
    setActiveTab('requests');
  }, []);

  return (
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">

          <main className="flex-1 flex flex-col gap-3 p-3 lg:p-4 overflow-hidden">

            {/* ── Header Row ── */}
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
                <div className="text-xs text-muted-foreground bg-white dark:bg-gray-900 border rounded-lg px-3 py-1.5">
                  {new Date().toLocaleString('fr-CA', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>

            {/* ── Alerts ── */}
            <DispatchAlerts
              drivers={drivers}
              requests={rideRequests}
              metrics={metrics}
              surgeMultiplier={surgeMultiplier}
            />

            {/* ── Metrics Row ── */}
            <MetricsCards metrics={metrics} surgeMultiplier={surgeMultiplier} />

            {/* ── Main Layout: Map + Panels ── */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-3 min-h-0" style={{ minHeight: '520px' }}>

              {/* Map — 2/3 width on desktop */}
              <div className="lg:col-span-2 flex flex-col gap-3 min-h-0">
                {/* Map */}
                <div className="flex-1 relative rounded-xl overflow-hidden shadow-sm border bg-white" style={{ minHeight: '400px' }}>
                  {apiKey ? (
                    <DispatchMap
                      apiKey={apiKey}
                      drivers={drivers}
                      rideRequests={rideRequests}
                      activeRides={activeRides}
                      onDriverClick={handleDriverClick}
                      onRequestClick={handleRequestClick}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <p className="text-muted-foreground text-sm">Clé API Google Maps manquante</p>
                    </div>
                  )}

                  {/* Map Legend */}
                  <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border p-2 text-xs space-y-1 z-10">
                    <p className="font-semibold text-gray-700 mb-1">Légende</p>
                    {[
                      { color: '#22c55e', label: 'Disponible' },
                      { color: '#f59e0b', label: 'En route vers passager' },
                      { color: '#3b82f6', label: 'En course' },
                      { color: '#ef4444', label: 'Occupé' },
                    ].map(({ color, label }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-gray-600">{label}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-1.5 pt-1 border-t">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <span className="text-gray-600">● Prise en charge</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span className="text-gray-600">● Destination</span>
                    </div>
                  </div>

                  {/* Selected driver info overlay */}
                  {selectedDriver && (
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg shadow-md border p-3 text-xs z-10 w-52">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">{selectedDriver.name}</p>
                        <button
                          className="text-gray-400 hover:text-gray-600"
                          onClick={() => setSelectedDriver(null)}
                        >✕</button>
                      </div>
                      <p className="text-muted-foreground">{selectedDriver.vehicle.make} {selectedDriver.vehicle.model}</p>
                      <p className="text-muted-foreground">{selectedDriver.vehicle.licensePlate}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-amber-500">★ {selectedDriver.averageRating?.toFixed(1)}</span>
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

                {/* Surge Chart */}
                <SurgeChart
                  currentSurge={surgeMultiplier}
                  pendingRequests={metrics.pendingRequests}
                  onlineDrivers={metrics.onlineDrivers}
                />
              </div>

              {/* Right Panel — 1/3 width */}
              <div className="flex flex-col min-h-0" style={{ minHeight: '520px' }}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                  <TabsList className="grid grid-cols-3 w-full flex-shrink-0 h-8">
                    <TabsTrigger value="requests" className="text-xs">
                      Demandes
                      {metrics.pendingRequests > 0 && (
                        <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                          {metrics.pendingRequests}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="rides" className="text-xs">
                      Courses
                      {metrics.activeRides > 0 && (
                        <span className="ml-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                          {metrics.activeRides}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="drivers" className="text-xs">
                      Flotte
                      {metrics.activeDrivers > 0 && (
                        <span className="ml-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                          {metrics.activeDrivers}
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
                </Tabs>
              </div>
            </div>
          </main>
        </div>
  );
}
