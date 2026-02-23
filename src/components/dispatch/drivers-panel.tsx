'use client';
import { Car, MapPin, Star } from 'lucide-react';
import type { DispatchDriver } from '@/lib/dispatch/types';

interface DriversPanelProps {
  drivers: DispatchDriver[];
  onDriverSelect?: (driver: DispatchDriver) => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  online: { label: 'Disponible', color: 'bg-green-100 text-green-700' },
  'en-route': { label: 'En route', color: 'bg-amber-100 text-amber-700' },
  'on-trip': { label: 'En course', color: 'bg-blue-100 text-blue-700' },
  busy: { label: 'Occupé', color: 'bg-red-100 text-red-700' },
  offline: { label: 'Hors ligne', color: 'bg-gray-100 text-gray-500' },
};

export function DriversPanel({ drivers, onDriverSelect }: DriversPanelProps) {
  if (drivers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <Car className="w-10 h-10 mb-3" />
        <p className="text-sm">Aucun chauffeur actif</p>
        <p className="text-xs mt-1">Les chauffeurs apparaissent ici quand ils sont en ligne</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-y-auto h-full pr-1">
      {drivers.map((driver) => {
        const statusInfo = STATUS_LABELS[driver.status] || STATUS_LABELS.offline;
        return (
          <button
            key={driver.id}
            onClick={() => onDriverSelect?.(driver)}
            className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all text-left"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700 flex-shrink-0">
              {driver.name?.charAt(0).toUpperCase() || 'C'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate">{driver.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                {driver.averageRating !== undefined && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    {driver.averageRating.toFixed(1)}
                  </span>
                )}
                {driver.vehicle && (
                  <span className="text-xs text-gray-400 truncate">
                    {driver.vehicle.make} {driver.vehicle.model} · {driver.vehicle.licensePlate}
                  </span>
                )}
              </div>
            </div>
            {driver.location && (
              <MapPin className="w-4 h-4 text-gray-300 flex-shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}
