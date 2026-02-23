'use client';
import { Car, Users, DollarSign, Activity, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface CombinedMetrics {
  pendingRequests?: number;
  activeRides?: number;
  activeDrivers?: number;
  onlineDrivers?: number;
  totalEarningsToday?: number;
  completedToday?: number;
  connectedClients?: number;
  onlineClients?: number;
}

interface MetricsCardsProps {
  metrics?: CombinedMetrics;
  surgeMultiplier?: number;
}

export function MetricsCards({
  metrics = {},
  surgeMultiplier = 1.0,
}: MetricsCardsProps) {
  const cards = [
    {
      title: 'Chauffeurs en ligne',
      value: metrics.onlineDrivers ?? 0,
      sub: `${metrics.activeDrivers ?? 0} actifs`,
      icon: Car,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Demandes en attente',
      value: metrics.pendingRequests ?? 0,
      sub: `Surge ×${surgeMultiplier.toFixed(1)}`,
      icon: Activity,
      color: surgeMultiplier > 1.2 ? 'text-orange-600' : 'text-gray-600',
      bg: surgeMultiplier > 1.2 ? 'bg-orange-50' : 'bg-gray-50',
    },
    {
      title: 'Courses actives',
      value: metrics.activeRides ?? 0,
      sub: `${metrics.completedToday ?? 0} terminées`,
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Clients connectés',
      value: metrics.connectedClients ?? 0,
      sub: `${metrics.onlineClients ?? 0} en ligne`,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Revenus du jour',
      value: `${(metrics.totalEarningsToday ?? 0).toFixed(2)} $`,
      sub: 'KULOOC 30%',
      icon: DollarSign,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((m) => (
        <Card key={m.title} className="overflow-hidden">
          <CardContent className="p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center flex-shrink-0`}>
              <m.icon className={`w-4 h-4 ${m.color}`} />
            </div>
            <div className="min-w-0">
              <p className={`text-xl font-black ${m.color}`}>{m.value}</p>
              <p className="text-[10px] text-gray-500 leading-tight">{m.title}</p>
              <p className="text-[10px] text-gray-400">{m.sub}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
