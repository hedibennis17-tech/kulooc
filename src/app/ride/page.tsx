
'use client';

import { useState } from 'react';
import { MainPanel, type RouteForMap } from '@/components/kulooc/main-panel';
import { MapView } from '@/components/kulooc/map-view';
import { AppHeader } from '@/components/kulooc/header';

export default function RidePage() {
  const [route, setRoute] = useState<RouteForMap>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <div className="flex flex-col h-screen font-sans">
      <AppHeader />
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4">
        <div className="lg:col-span-1 xl:col-span-1 p-4 sm:p-6 lg:p-8 bg-white shadow-lg z-10 overflow-y-auto">
          <MainPanel onRouteUpdated={setRoute} />
        </div>
        <div className="hidden lg:block lg:col-span-2 xl:col-span-3 relative">
          {apiKey ? (
            <MapView apiKey={apiKey} route={route} />
          ) : (
            <div className="flex items-center justify-center h-full bg-muted">
              <p className="text-muted-foreground">Google Maps API Key is missing.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
