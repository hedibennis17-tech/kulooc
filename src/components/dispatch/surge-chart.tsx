'use client';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SurgeChartProps {
  currentSurge?: number;
  surgeMultiplier?: number; // Alias
  pendingRequests?: number;
  onlineDrivers?: number;
  activeDrivers?: number;   // Alias
}

export function SurgeChart({
  currentSurge,
  surgeMultiplier,
  pendingRequests = 0,
  onlineDrivers,
  activeDrivers,
}: SurgeChartProps) {
  const surge = currentSurge ?? surgeMultiplier ?? 1.0;
  const drivers = onlineDrivers ?? activeDrivers ?? 0;
  const ratio = drivers > 0 ? pendingRequests / drivers : 0;
  const surgeLevel = surge > 1.5 ? 'Forte demande' : surge > 1.2 ? 'Demande modérée' : 'Demande normale';
  const surgeColor = surge > 1.5 ? 'text-red-600' : surge > 1.2 ? 'text-orange-500' : 'text-green-600';
  const barColor = surge > 1.5 ? 'bg-red-500' : surge > 1.2 ? 'bg-orange-400' : 'bg-green-500';
  const barWidth = Math.min(100, Math.max(0, (surge - 1) * 100));

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Indice de demande
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className={`text-3xl font-black ${surgeColor}`}>×{surge.toFixed(1)}</p>
            <p className="text-xs text-gray-500">{surgeLevel}</p>
          </div>
          <div className="text-right text-xs text-gray-500 space-y-0.5">
            <p>{drivers} chauffeurs disponibles</p>
            <p>{pendingRequests} demandes en attente</p>
            <p className="text-gray-400">Ratio : {ratio.toFixed(2)}</p>
          </div>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
