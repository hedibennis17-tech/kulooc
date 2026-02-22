'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import type { DispatchDriver } from '@/lib/dispatch/types';

interface DriversPanelProps {
  drivers: DispatchDriver[];
  onDriverSelect?: (driver: DispatchDriver) => void;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  online:    { label: 'Disponible', color: '#22c55e', bg: 'bg-green-100 text-green-800' },
  'en-route': { label: 'En route',   color: '#f59e0b', bg: 'bg-amber-100 text-amber-800' },
  'on-trip':  { label: 'En course',  color: '#3b82f6', bg: 'bg-blue-100 text-blue-800' },
  busy:       { label: 'Occupé',     color: '#ef4444', bg: 'bg-red-100 text-red-800' },
  offline:    { label: 'Hors ligne', color: '#6b7280', bg: 'bg-gray-100 text-gray-600' },
};

const vehicleTypeIcons: Record<string, string> = {
  electric: '⚡',
  xl: '🚐',
  premium: '💎',
  comfort: '🛋️',
  standard: '🚗',
};

export function DriversPanel({ drivers, onDriverSelect }: DriversPanelProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filtered = drivers.filter((d) => {
    const matchSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.vehicle.model?.toLowerCase().includes(search.toLowerCase()) ||
      d.vehicle.licensePlate?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    online: drivers.filter((d) => d.status === 'online').length,
    'en-route': drivers.filter((d) => d.status === 'en-route').length,
    'on-trip': drivers.filter((d) => d.status === 'on-trip').length,
  };

  return (
    <Card className="flex flex-col h-full border-0 shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm font-semibold">Flotte</CardTitle>
        <div className="flex gap-1 flex-wrap mt-2">
          {['all', 'online', 'en-route', 'on-trip'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                filterStatus === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:bg-muted'
              }`}
            >
              {s === 'all'
                ? `Tous (${drivers.length})`
                : `${statusConfig[s]?.label} (${counts[s as keyof typeof counts] ?? 0})`}
            </button>
          ))}
        </div>
        <Input
          placeholder="Rechercher un chauffeur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-2 h-7 text-xs"
        />
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              Aucun chauffeur trouvé
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((driver) => {
                const cfg = statusConfig[driver.status] ?? statusConfig.offline;
                return (
                  <div
                    key={driver.id}
                    className="p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => onDriverSelect?.(driver)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: cfg.color }}
                      >
                        {driver.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-sm font-medium truncate">{driver.name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${cfg.bg}`}>
                            {cfg.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {vehicleTypeIcons[driver.vehicle.type] ?? '🚗'}{' '}
                            {driver.vehicle.make} {driver.vehicle.model}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-amber-500">★ {driver.averageRating?.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">
                            {Math.round((driver.acceptanceRate ?? 0) * 100)}% acc.
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {driver.totalRidesToday ?? 0} courses/j
                          </span>
                        </div>

                        {driver.vehicle.licensePlate && (
                          <span className="text-xs font-mono text-muted-foreground">
                            {driver.vehicle.licensePlate}
                          </span>
                        )}
                      </div>
                    </div>
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
