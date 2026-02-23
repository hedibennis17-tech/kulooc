'use client';
import { AlertCircle, CheckCircle, Info, TrendingUp } from 'lucide-react';
import type { DispatchDriver, RideRequest } from '@/lib/dispatch/types';

interface CombinedMetrics {
  pendingRequests?: number;
  activeRides?: number;
  activeDrivers?: number;
  onlineDrivers?: number;
  connectedClients?: number;
  onlineClients?: number;
}

interface DispatchAlertsProps {
  drivers?: DispatchDriver[];
  requests?: RideRequest[];
  metrics?: CombinedMetrics;
  surgeMultiplier?: number;
}

export function DispatchAlerts({
  drivers = [],
  requests = [],
  metrics = {},
  surgeMultiplier = 1.0,
}: DispatchAlertsProps) {
  const alerts: Array<{ id: string; type: 'error' | 'warning' | 'success' | 'info'; message: string }> = [];

  const onlineDrivers = metrics.onlineDrivers ?? drivers.filter(d => d.status === 'online').length;
  const pending = metrics.pendingRequests ?? requests.length;

  if (pending > 0 && onlineDrivers === 0) {
    alerts.push({
      id: 'no-drivers',
      type: 'error',
      message: `⚠️ ${pending} demande${pending > 1 ? 's' : ''} en attente — Aucun chauffeur disponible !`,
    });
  } else if (surgeMultiplier >= 1.5) {
    alerts.push({
      id: 'surge',
      type: 'warning',
      message: `🔥 Forte demande — Majoration ×${surgeMultiplier.toFixed(1)} active (${pending} demandes / ${onlineDrivers} chauffeurs)`,
    });
  } else if (surgeMultiplier >= 1.2) {
    alerts.push({
      id: 'moderate-surge',
      type: 'info',
      message: `📈 Demande modérée — Majoration ×${surgeMultiplier.toFixed(1)} (${pending} demandes / ${onlineDrivers} chauffeurs)`,
    });
  } else if (onlineDrivers > 0 && pending === 0) {
    alerts.push({
      id: 'all-clear',
      type: 'success',
      message: `✅ ${onlineDrivers} chauffeur${onlineDrivers > 1 ? 's' : ''} disponible${onlineDrivers > 1 ? 's' : ''} — Aucune demande en attente`,
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const Icon = alert.type === 'success' ? CheckCircle :
                     alert.type === 'info' ? Info : AlertCircle;
        const colors = {
          warning: 'bg-orange-50 border-orange-200 text-orange-800',
          error: 'bg-red-50 border-red-200 text-red-800',
          success: 'bg-green-50 border-green-200 text-green-800',
          info: 'bg-blue-50 border-blue-200 text-blue-800',
        };
        return (
          <div key={alert.id} className={`flex items-start gap-2 p-3 rounded-xl border text-sm ${colors[alert.type]}`}>
            <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>{alert.message}</p>
          </div>
        );
      })}
    </div>
  );
}
