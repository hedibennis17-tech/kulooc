'use client';

import React, { useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import type { DispatchDriver, RideRequest, ActiveRide } from '@/lib/dispatch/types';

// ============================================================
// Driver Marker — color-coded by status
// ============================================================
const DriverMarker = ({ driver }: { driver: DispatchDriver }) => {
  const statusColors: Record<string, string> = {
    online: '#22c55e',     // green
    'en-route': '#f59e0b', // amber
    'on-trip': '#3b82f6',  // blue
    busy: '#ef4444',       // red
    offline: '#6b7280',    // gray
  };

  const color = statusColors[driver.status] ?? '#6b7280';
  const isMoving = driver.status === 'en-route' || driver.status === 'on-trip';

  return (
    <div className="relative flex items-center justify-center cursor-pointer group">
      {isMoving && (
        <div
          className="absolute w-8 h-8 rounded-full animate-ping opacity-40"
          style={{ backgroundColor: color }}
        />
      )}
      <div
        className="relative w-7 h-7 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold"
        style={{ backgroundColor: color }}
        title={`${driver.name} — ${driver.status}`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
        </svg>
      </div>
      {/* Tooltip */}
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {driver.name}
        <br />
        <span className="text-gray-300">{driver.vehicle.make} {driver.vehicle.model}</span>
        <br />
        <span style={{ color }}>● {driver.status}</span>
        <br />
        ★ {driver.averageRating}
      </div>
    </div>
  );
};

// ============================================================
// Pickup Marker
// ============================================================
const PickupMarker = ({ request }: { request: RideRequest }) => (
  <div className="relative group cursor-pointer">
    <div className="w-5 h-5 bg-green-500 border-2 border-white rounded-full shadow-md flex items-center justify-center">
      <div className="w-2 h-2 bg-white rounded-full" />
    </div>
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
      {request.passengerName || 'Passager'}
      <br />
      <span className="text-gray-300">{request.pickup.address}</span>
      <br />
      <span className="text-yellow-300">{request.status}</span>
    </div>
  </div>
);

// ============================================================
// Route Renderer for active rides
// ============================================================
const ActiveRideRenderer = ({ rides }: { rides: ActiveRide[] }) => {
  const map = useMap();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!map) return;

    // Clear previous polylines
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    rides.forEach((ride) => {
      if (ride.actualRoute?.polyline && window.google?.maps?.geometry) {
        const path = window.google.maps.geometry.encoding.decodePath(
          ride.actualRoute.polyline
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

// ============================================================
// Main Dispatch Map Component
// ============================================================
interface DispatchMapProps {
  apiKey: string;
  drivers: DispatchDriver[];
  rideRequests: RideRequest[];
  activeRides: ActiveRide[];
  onDriverClick?: (driver: DispatchDriver) => void;
  onRequestClick?: (request: RideRequest) => void;
}

export function DispatchMap({
  apiKey,
  drivers,
  rideRequests,
  activeRides,
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
          {/* Active ride routes */}
          <ActiveRideRenderer rides={activeRides} />

          {/* Driver markers */}
          {drivers.map((driver) =>
            driver.currentLocation ? (
              <AdvancedMarker
                key={driver.id}
                position={{
                  lat: driver.currentLocation.latitude,
                  lng: driver.currentLocation.longitude,
                }}
                onClick={() => onDriverClick?.(driver)}
              >
                <DriverMarker driver={driver} />
              </AdvancedMarker>
            ) : null
          )}

          {/* Pickup markers for pending requests */}
          {rideRequests.map((req) =>
            req.pickup?.location ? (
              <AdvancedMarker
                key={req.id}
                position={{
                  lat: req.pickup.location.latitude,
                  lng: req.pickup.location.longitude,
                }}
                onClick={() => onRequestClick?.(req)}
              >
                <PickupMarker request={req} />
              </AdvancedMarker>
            ) : null
          )}

          {/* Destination markers for active rides */}
          {activeRides.map((ride) =>
            ride.destination?.location ? (
              <AdvancedMarker
                key={`dest-${ride.id}`}
                position={{
                  lat: ride.destination.location.latitude,
                  lng: ride.destination.location.longitude,
                }}
              >
                <div className="w-5 h-5 bg-red-500 border-2 border-white rounded-full shadow-md flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              </AdvancedMarker>
            ) : null
          )}
        </Map>
      </div>
    </APIProvider>
  );
}
