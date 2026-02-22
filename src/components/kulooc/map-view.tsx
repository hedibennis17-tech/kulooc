'use client';
import { APIProvider, Map, AdvancedMarker, useMap, Pin } from '@vis.gl/react-google-maps';
import { drivers } from '@/lib/data';
import { CarMarkerIcon } from '@/lib/icons';
import React, { useEffect, useState } from 'react';
import type { RouteForMap } from './main-panel';

// This sub-component is needed to get access to the map instance
const RouteRenderer = ({ route }: { route: RouteForMap }) => {
    const map = useMap();

    useEffect(() => {
        if (!map || !route || !window.google?.maps?.geometry) {
            return;
        }

        const path = window.google.maps.geometry.encoding.decodePath(route.polyline);
        const bounds = new window.google.maps.LatLngBounds();
        path.forEach(latLng => bounds.extend(latLng));
        
        map.fitBounds(bounds, 100); // 100px padding

        const polyline = new window.google.maps.Polyline({
            path: path,
            strokeColor: 'hsl(var(--primary))',
            strokeOpacity: 0.8,
            strokeWeight: 6
        });

        polyline.setMap(map);

        return () => {
            polyline.setMap(null);
        };
    }, [map, route]);

    if (!route) return null;

    return (
      <>
        <AdvancedMarker position={route.start} title={'Origin'}>
            <Pin />
        </AdvancedMarker>
        <AdvancedMarker position={route.end} title={'Destination'}>
            <Pin background={'hsl(var(--primary))'} borderColor={'hsl(var(--primary))'} glyphColor={'hsl(var(--primary-foreground))'} />
        </AdvancedMarker>
      </>
    );
}

const UserLocationMarker = () => (
    <div className="relative flex items-center justify-center">
        <div className="absolute w-6 h-6 rounded-full bg-blue-500/50 animate-ping"></div>
        <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-md"></div>
    </div>
);

const defaultPosition = { lat: 45.5019, lng: -73.5674 }; // Montreal fallback

export function MapView({ apiKey, route }: { apiKey: string, route: RouteForMap }) {
  const [currentPosition, setCurrentPosition] = useState(defaultPosition);
  const [isLocationFound, setIsLocationFound] = useState(false);

  useEffect(() => {
    // This effect runs once on mount to get the user's location.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentPosition(newPosition);
          setIsLocationFound(true);
        },
        (error) => {
          console.error("Geolocation error:", error.message);
          setIsLocationFound(false);
          // If there's an error (e.g., permission denied), we keep the default Montreal position.
        }
      );
    }
  }, []); // Empty dependency array means it runs once.


  return (
    <APIProvider apiKey={apiKey} libraries={['geometry']}>
      <div className="absolute inset-0">
        <Map
          defaultCenter={defaultPosition}
          center={currentPosition}
          defaultZoom={12}
          mapId="a22506a8155b4369"
          disableDefaultUI={true}
          zoomControl={true}
          gestureHandling={'greedy'}
          className="h-full w-full"
        >
          {isLocationFound && (
            <AdvancedMarker position={currentPosition} title="Your Location">
                <UserLocationMarker />
            </AdvancedMarker>
          )}

          {/* Hide drivers when showing a route for clarity */}
          {!route && drivers.map((driver) => (
            <AdvancedMarker key={driver.id} position={driver.location}>
              <CarMarkerIcon isElectric={driver.vehicle.type === 'electric'} />
            </AdvancedMarker>
          ))}

          {route && <RouteRenderer route={route} />}

        </Map>
      </div>
    </APIProvider>
  );
}
