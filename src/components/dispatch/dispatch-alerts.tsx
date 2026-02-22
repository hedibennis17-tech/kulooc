'use client';

import React, { useState, useEffect } from 'react';
import type { DispatchDriver, RideRequest, DispatchMetrics } from '@/lib/dispatch/types';

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  message: string;
  timestamp: Date;
}

interface DispatchAlertsProps {
  drivers: DispatchDriver[];
  requests: RideRequest[];
  metrics: DispatchMetrics;
  surgeMultiplier: number;
}

export function DispatchAlerts({ drivers, requests, metrics, surgeMultiplier }: DispatchAlertsProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newAlerts: Alert[] = [];

    // Alert: high pending requests
    if (metrics.pendingRequests > 5) {
      newAlerts.push({
        id: 'high-pending',
        type: 'error',
        message: `${metrics.pendingRequests} demandes en attente — capacité insuffisante`,
        timestamp: new Date(),
      });
    } else if (metrics.pendingRequests > 2) {
      newAlerts.push({
        id: 'medium-pending',
        type: 'warning',
        message: `${metrics.pendingRequests} demandes en attente`,
        timestamp: new Date(),
      });
    }

    // Alert: surge pricing active
    if (surgeMultiplier >= 2.0) {
      newAlerts.push({
        id: 'surge-high',
        type: 'error',
        message: `Surge ×${surgeMultiplier.toFixed(2)} — Zone à forte demande`,
        timestamp: new Date(),
      });
    } else if (surgeMultiplier >= 1.3) {
      newAlerts.push({
        id: 'surge-medium',
        type: 'warning',
        message: `Surge pricing actif ×${surgeMultiplier.toFixed(2)}`,
        timestamp: new Date(),
      });
    }

    // Alert: no available drivers
    if (metrics.onlineDrivers === 0 && metrics.pendingRequests > 0) {
      newAlerts.push({
        id: 'no-drivers',
        type: 'error',
        message: 'Aucun chauffeur disponible — demandes non servies',
        timestamp: new Date(),
      });
    }

    // Alert: long wait for requests
    const oldRequests = requests.filter((r) => {
      if (!r.requestedAt) return false;
      const d = (r.requestedAt as any).toDate ? (r.requestedAt as any).toDate() : new Date(r.requestedAt);
      return Date.now() - d.getTime() > 5 * 60 * 1000; // > 5 minutes
    });
    if (oldRequests.length > 0) {
      newAlerts.push({
        id: 'long-wait',
        type: 'warning',
        message: `${oldRequests.length} demande(s) en attente depuis plus de 5 minutes`,
        timestamp: new Date(),
      });
    }

    // Success: good conditions
    if (metrics.pendingRequests === 0 && metrics.onlineDrivers > 0 && surgeMultiplier < 1.1) {
      newAlerts.push({
        id: 'good-conditions',
        type: 'success',
        message: 'Conditions optimales — offre et demande équilibrées',
        timestamp: new Date(),
      });
    }

    setAlerts(newAlerts.filter((a) => !dismissed.has(a.id)));
  }, [metrics, surgeMultiplier, requests, dismissed]);

  if (alerts.length === 0) return null;

  const typeConfig = {
    error:   { bg: 'bg-red-50 border-red-200',    text: 'text-red-700',   icon: '🔴' },
    warning: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: '🟡' },
    info:    { bg: 'bg-blue-50 border-blue-200',   text: 'text-blue-700',  icon: '🔵' },
    success: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', icon: '🟢' },
  };

  return (
    <div className="space-y-1.5">
      {alerts.map((alert) => {
        const cfg = typeConfig[alert.type];
        return (
          <div
            key={alert.id}
            className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${cfg.bg} ${cfg.text}`}
          >
            <span>
              {cfg.icon} {alert.message}
            </span>
            <button
              className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
              onClick={() => setDismissed((prev) => new Set([...prev, alert.id]))}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
