'use client';

import React, { useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import type { DispatchDriver, RideRequest, ActiveRide } from '@/lib/dispatch/types';
import type { ConnectedClient } from '@/lib/realtime/realtime-service';

// ─── Icône voiture SVG (dispatch) ────────────────────────────────────────────

const DriverMarker = ({ driver }: { driver: DispatchDriver }) => {
  const statusColors: Record<string, string> = {
    online:     '#22c55e',
    'en-route': '#f59e0b',
    'on-trip':  '#3b82f6',
    busy:       '#ef4444',
    offline:    '#6b7280',
  };
  const statusLabels: Record<string, string> = {
    online:     'Disponible',
    'en-route': 'En route',
    'on-trip':  'En course',
    busy:       'Occupé',
    offline:    'Hors ligne',
  };

  const color = statusColors[driver.status] ?? '#6b7280';
  const isMoving = driver.status === 'en-route' || driver.status === 'on-trip';
  const isTruck = driver.vehicle?.type === 'truck' || driver.vehicle?.type === 'van';

  return (
    <div className="relative flex items-center justify-center cursor-pointer group">
      {isMoving && (
        <div
          className="absolute w-10 h-10 rounded-full animate-ping opacity-30"
          style={{ backgroundColor: color }}
        />
      )}

      {/* Icône voiture ou truck SVG */}
      <div
        className="relative flex items-center justify-center"
        style={{ filter: `drop-shadow(0 2px 6px ${color}88)` }}
        title={`${driver.name} — ${statusLabels[driver.status] ?? driver.status}`}
      >
        {isTruck ? (
          <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
            <rect x="1" y="6" width="20" height="12" rx="2" fill={color} stroke="white" strokeWidth="1.5" />
            <rect x="21" y="9" width="9" height="9" rx="1.5" fill={color} stroke="white" strokeWidth="1.5" />
            <rect x="27" y="11" width="4" height="5" rx="0.5" fill={color} opacity="0.7" />
            <circle cx="6" cy="21" r="3" fill="#1f2937" stroke="white" strokeWidth="1.5" />
            <circle cx="16" cy="21" r="3" fill="#1f2937" stroke="white" strokeWidth="1.5" />
            <circle cx="26" cy="21" r="3" fill="#1f2937" stroke="white" strokeWidth="1.5" />
            <rect x="3" y="8" width="7" height="5" rx="0.5" fill="white" opacity="0.55" />
            {/* Plaque */}
            <rect x="8" y="14" width="6" height="3" rx="0.5" fill="white" opacity="0.9" />
            <text x="11" y="16.5" fontSize="2.5" fill="#1f2937" textAnchor="middle" fontFamily="monospace">
              {driver.vehicle?.licensePlate?.slice(-4) || 'QC'}
            </text>
          </svg>
        ) : (
          <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
            <path d="M4 9 L7 4 L21 4 L24 9 L26 10 L26 17 L2 17 L2 10 Z" fill={color} stroke="white" strokeWidth="1.5" />
            <path d="M8 4 L9.5 9 L18.5 9 L20 4 Z" fill="white" opacity="0.5" />
            <circle cx="7" cy="19" r="2.5" fill="#1f2937" stroke="white" strokeWidth="1.5" />
            <circle cx="21" cy="19" r="2.5" fill="#1f2937" stroke="white" strokeWidth="1.5" />
            <rect x="2" y="11" width="3.5" height="2.5" rx="0.5" fill="#fbbf24" />
            <rect x="22.5" y="11" width="3.5" height="2.5" rx="0.5" fill="#fbbf24" />
            {/* Plaque */}
            <rect x="10" y="13" width="8" height="3" rx="0.5" fill="white" opacity="0.9" />
            <text x="14" y="15.5" fontSize="2.5" fill="#1f2937" textAnchor="middle" fontFamily="monospace">
              {driver.vehicle?.licensePlate?.slice(-4) || 'QC'}
            </text>
          </svg>
        )}
      </div>

      {/* Tooltip hover */}
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/85 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
        <p className="font-semibold">{driver.name}</p>
        <p className="text-gray-300">{driver.vehicle?.make} {driver.vehicle?.model} {driver.vehicle?.year}</p>
        <p className="text-gray-300">{driver.vehicle?.licensePlate}</p>
        <p style={{ color }}>● {statusLabels[driver.status] ?? driver.status}</p>
        <p className="text-yellow-300">★ {(driver.averageRating || 0).toFixed(1)}</p>
      </div>
    </div>
  );
};

// ─── Marqueur passager (demande en attente) ───────────────────────────────────

const PickupMarker = ({ request }: { request: RideRequest }) => (
  <div className="relative group cursor-pointer">
    <div className="absolute w-8 h-8 rounded-full bg-green-400/30 animate-ping -m-1.5" />
    <div className="relative w-5 h-5 bg-green-500 border-2 border-white rounded-full shadow-md flex items-center justify-center">
      {/* Icône personne */}
      <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
        <circle cx="5" cy="3" r="2" />
        <path d="M1 9 C1 6.5 3 5.5 5 5.5 C7 5.5 9 6.5 9 9" strokeWidth="0" />
      </svg>
    </div>
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/85 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
      <p className="font-semibold">{request.passengerName || 'Passager'}</p>
      <p className="text-gray-300 max-w-40 truncate">{request.pickup?.address}</p>
      <p className="text-green-300">● En attente</p>
    </div>
  </div>
);

// ─── Marqueur client connecté (sans course active) ───────────────────────────

const ClientMarker = ({ client }: { client: ConnectedClient }) => {
  const initial = (client.displayName || client.email || 'U').charAt(0).toUpperCase();
  return (
    <div className="relative group cursor-pointer">
      <div className="w-6 h-6 rounded-full bg-gray-700 border-2 border-white shadow flex items-center justify-center text-white text-xs font-bold">
        {initial}
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-white" />
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/85 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
        <p className="font-semibold">{client.displayName || 'Client'}</p>
        <p className="text-green-300">● En ligne</p>
      </div>
    </div>
  );
};

// ─── Renderer de routes pour les courses actives ─────────────────────────────

const ActiveRideRenderer = ({ rides }: { rides: ActiveRide[] }) => {
  const map = useMap();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!map) return;
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    rides.forEach((ride) => {
      if ((ride as any).actualRoute?.polyline && window.google?.maps?.geometry) {
        const path = window.google.maps.geometry.encoding.decodePath(
          (ride as any).actualRoute.polyline
        );
        const polyline = new window.google.maps.Polyline({
          path,
          strokeColor: '#3b82f6',
          strokeOpacity: 0.7,
          strokeWeight: 4,
        });
        polyline.setMap(map);
        polylinesRef.current.push(polyline);
      }
    });

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
    };
  }, [map, rides]);

  return null;
};

// ─── Composant principal DispatchMap ─────────────────────────────────────────

interface DispatchMapProps {
  apiKey: string;
  drivers: DispatchDriver[];
  rideRequests: RideRequest[];
  activeRides: ActiveRide[];
  connectedClients?: ConnectedClient[];
  showClientMarkers?: boolean;
  onDriverClick?: (driver: DispatchDriver) => void;
  onRequestClick?: (request: RideRequest) => void;
}

export function DispatchMap({
  apiKey,
  drivers,
  rideRequests,
  activeRides,
  connectedClients = [],
  showClientMarkers = false,
  onDriverClick,
  onRequestClick,
}: DispatchMapProps) {
  const defaultCenter = { lat: 45.5017, lng: -73.5674 }; // Montréal

  return (
    <APIProvider apiKey={apiKey} libraries={['geometry']}>
      <div className="absolute inset-0">
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={13}
          mapId="a22506a8155b4369"
          disableDefaultUI={false}
          zoomControl={true}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={true}
          gestureHandling="greedy"
          className="h-full w-full"
        >
          {/* Routes des courses actives */}
          <ActiveRideRenderer rides={activeRides} />

          {/* Marqueurs chauffeurs (voiture/truck SVG) */}
          {drivers.map((driver) => {
            const loc = driver.currentLocation || (driver as any).location;
            if (!loc) return null;
            return (
              <AdvancedMarker
                key={driver.id}
                position={{ lat: loc.latitude, lng: loc.longitude }}
                onClick={() => onDriverClick?.(driver)}
              >
                <DriverMarker driver={driver} />
              </AdvancedMarker>
            );
          })}

          {/* Marqueurs demandes en attente (passagers) */}
          {rideRequests.map((req) => {
            const loc = req.pickup?.location || (req.pickup as any);
            if (!loc?.latitude) return null;
            return (
              <AdvancedMarker
                key={req.id}
                position={{ lat: loc.latitude, lng: loc.longitude }}
                onClick={() => onRequestClick?.(req)}
              >
                <PickupMarker request={req} />
              </AdvancedMarker>
            );
          })}

          {/* Marqueurs destinations des courses actives */}
          {activeRides.map((ride) => {
            const loc = (ride.destination as any)?.location || ride.destination;
            if (!loc?.latitude) return null;
            return (
              <AdvancedMarker
                key={`dest-${ride.id}`}
                position={{ lat: loc.latitude, lng: loc.longitude }}
              >
                <div className="w-5 h-5 bg-red-500 border-2 border-white rounded-sm shadow-md flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-sm" />
                </div>
              </AdvancedMarker>
            );
          })}

          {/* Marqueurs clients connectés (optionnel) */}
          {showClientMarkers &&
            connectedClients
              .filter((c) => c.isOnline && !(activeRides.some((r) => r.passengerId === c.uid)))
              .map((client) => (
                <AdvancedMarker
                  key={`client-${client.id}`}
                  position={defaultCenter} // Position approximative — pas de GPS client
                >
                  <ClientMarker client={client} />
                </AdvancedMarker>
              ))}
        </Map>
      </div>
    </APIProvider>
  );
}
