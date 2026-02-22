'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { DispatchMetrics } from '@/lib/dispatch/types';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

function MetricCard({ title, value, subtitle, color = '#3b82f6', icon, trend }: MetricCardProps) {
  return (
    <Card className="border-0 shadow-sm bg-white dark:bg-gray-900 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            {icon}
          </div>
        </div>
        {trend && (
          <div className="mt-2 flex items-center gap-1">
            <span className={`text-xs font-medium ${
              trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500'
            }`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} En direct
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MetricsCardsProps {
  metrics: DispatchMetrics;
  surgeMultiplier: number;
}

export function MetricsCards({ metrics, surgeMultiplier }: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <MetricCard
        title="Chauffeurs actifs"
        value={metrics.activeDrivers}
        subtitle={`${metrics.onlineDrivers} disponibles`}
        color="#22c55e"
        trend="neutral"
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" />
          </svg>
        }
      />
      <MetricCard
        title="Demandes en attente"
        value={metrics.pendingRequests}
        subtitle="À assigner"
        color={metrics.pendingRequests > 5 ? '#ef4444' : '#f59e0b'}
        trend={metrics.pendingRequests > 0 ? 'up' : 'neutral'}
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
          </svg>
        }
      />
      <MetricCard
        title="Courses actives"
        value={metrics.activeRides}
        subtitle="En cours"
        color="#3b82f6"
        trend="neutral"
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
          </svg>
        }
      />
      <MetricCard
        title="Surge actuel"
        value={`×${surgeMultiplier.toFixed(2)}`}
        subtitle={surgeMultiplier > 1.5 ? 'Zone chaude !' : surgeMultiplier > 1.1 ? 'Demande élevée' : 'Normal'}
        color={surgeMultiplier > 1.5 ? '#ef4444' : surgeMultiplier > 1.1 ? '#f59e0b' : '#22c55e'}
        trend={surgeMultiplier > 1.1 ? 'up' : 'neutral'}
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M7 2v11h3v9l7-12h-4l4-8z" />
          </svg>
        }
      />
      <MetricCard
        title="Note moyenne"
        value={`★ ${metrics.avgRating > 0 ? metrics.avgRating.toFixed(1) : '—'}`}
        subtitle="Flotte active"
        color="#8b5cf6"
        trend="neutral"
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        }
      />
      <MetricCard
        title="Revenus estimés"
        value={`$${metrics.revenue.toFixed(0)}`}
        subtitle="Courses actives"
        color="#10b981"
        trend="up"
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
          </svg>
        }
      />
    </div>
  );
}
