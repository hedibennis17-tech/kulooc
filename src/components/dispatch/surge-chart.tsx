'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface SurgeDataPoint {
  time: string;
  surge: number;
  demand: number;
  supply: number;
}

interface SurgeChartProps {
  currentSurge: number;
  pendingRequests: number;
  onlineDrivers: number;
}

export function SurgeChart({ currentSurge, pendingRequests, onlineDrivers }: SurgeChartProps) {
  const [history, setHistory] = useState<SurgeDataPoint[]>([]);
  const maxPoints = 20;

  useEffect(() => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setHistory((prev) => {
      const next = [
        ...prev,
        {
          time: timeStr,
          surge: +currentSurge.toFixed(2),
          demand: pendingRequests,
          supply: onlineDrivers,
        },
      ].slice(-maxPoints);
      return next;
    });
  }, [currentSurge, pendingRequests, onlineDrivers]);

  const surgeColor =
    currentSurge >= 2.0 ? '#ef4444' :
    currentSurge >= 1.5 ? '#f97316' :
    currentSurge >= 1.2 ? '#f59e0b' :
    '#22c55e';

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Surge Pricing en temps réel</CardTitle>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: surgeColor }}
            />
            <span className="text-lg font-bold" style={{ color: surgeColor }}>
              ×{currentSurge.toFixed(2)}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {currentSurge >= 2.0 ? '🔴 Demande très élevée — tarification maximale active' :
           currentSurge >= 1.5 ? '🟠 Demande élevée — tarification dynamique active' :
           currentSurge >= 1.2 ? '🟡 Légère hausse de demande' :
           '🟢 Conditions normales — tarif standard'}
        </p>
      </CardHeader>
      <CardContent className="pt-3 pb-2">
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9 }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0.9, 3.1]}
              tick={{ fontSize: 9 }}
              tickCount={5}
            />
            <Tooltip
              contentStyle={{ fontSize: 11, padding: '4px 8px' }}
              formatter={(value: number, name: string) => [
                name === 'surge' ? `×${value}` : value,
                name === 'surge' ? 'Surge' : name === 'demand' ? 'Demandes' : 'Chauffeurs',
              ]}
            />
            <ReferenceLine y={1.0} stroke="#22c55e" strokeDasharray="4 2" strokeWidth={1} />
            <ReferenceLine y={1.5} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1} />
            <ReferenceLine y={2.0} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1} />
            <Line
              type="monotone"
              dataKey="surge"
              stroke={surgeColor}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
