'use client';
import { Navigation, CheckCircle } from 'lucide-react';
import type { ActiveRide } from '@/lib/dispatch/types';

interface ActiveRidesPanelProps {
  rides: ActiveRide[];
  onUpdateStatus?: (rideId: string, status: string) => Promise<void>;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  'driver-assigned': { label: 'Chauffeur en route', color: 'text-amber-600 bg-amber-50' },
  'driver-arrived': { label: 'Chauffeur sur place', color: 'text-blue-600 bg-blue-50' },
  'in-progress': { label: 'En cours', color: 'text-green-600 bg-green-50' },
};

export function ActiveRidesPanel({ rides, onUpdateStatus }: ActiveRidesPanelProps) {
  if (rides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <Navigation className="w-10 h-10 mb-3" />
        <p className="text-sm">Aucune course active</p>
        <p className="text-xs mt-1">Les courses apparaissent ici en temps réel</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-y-auto h-full pr-1">
      {rides.map((ride) => {
        const statusInfo = STATUS_LABELS[ride.status] || { label: ride.status, color: 'text-gray-600 bg-gray-50' };
        return (
          <div key={ride.id} className="p-4 bg-white rounded-xl border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-sm">{ride.driverName}</p>
                <p className="text-xs text-gray-500">→ {ride.passengerName}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2 text-xs text-gray-600">
                <div className="w-2.5 h-2.5 rounded-full bg-black mt-0.5 flex-shrink-0" />
                <span className="truncate">{ride.pickup?.address}</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-600">
                <div className="w-2.5 h-2.5 rounded-sm bg-red-600 mt-0.5 flex-shrink-0" />
                <span className="truncate">{ride.destination?.address}</span>
              </div>
            </div>
            {ride.pricing?.total && (
              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">Tarif</span>
                <span className="text-sm font-bold text-green-600">{ride.pricing.total.toFixed(2)} $</span>
              </div>
            )}
            {onUpdateStatus && ride.id && (
              <div className="mt-2 flex gap-2">
                {ride.status === 'driver-assigned' && (
                  <button
                    onClick={() => onUpdateStatus(ride.id!, 'driver-arrived')}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-blue-50 text-blue-700 font-medium hover:bg-blue-100"
                  >
                    Marquer arrivé
                  </button>
                )}
                {ride.status === 'driver-arrived' && (
                  <button
                    onClick={() => onUpdateStatus(ride.id!, 'in-progress')}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-green-50 text-green-700 font-medium hover:bg-green-100"
                  >
                    Démarrer course
                  </button>
                )}
                {ride.status === 'in-progress' && (
                  <button
                    onClick={() => onUpdateStatus(ride.id!, 'completed')}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-gray-50 text-gray-700 font-medium hover:bg-gray-100 flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" /> Terminer
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
