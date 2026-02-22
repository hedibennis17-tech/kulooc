'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppHeader } from '@/components/kulooc/header';
import { Sidebar, SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { MapView } from '@/components/kulooc/map-view';

const activeTrips = [
    { id: 'TRIP-001', rider: 'Alice', driver: 'Jean-Pierre', status: 'EN_ROUTE' },
    { id: 'TRIP-002', rider: 'Bob', driver: 'Emily', status: 'ARRIVED' },
];

const availableDrivers = [
    { id: 'DRV-003', name: 'Mathieu', status: 'IDLE', zone: 'Plateau' },
    { id: 'DRV-004', name: 'Sarah', status: 'IDLE', zone: 'Centre-ville' },
];

export default function DispatcherDashboardPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <SidebarProvider>
        <Sidebar side="left" collapsible="icon" className="bg-white border-r p-0 shadow-lg z-10" />
        <SidebarInset>
            <div className="flex flex-col min-h-screen bg-background font-sans">
                <AppHeader />
                <main className="flex-1 container mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold mb-8">Tableau de Bord du Dispatcher</h1>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <Card className="h-[600px] flex flex-col">
                                <CardHeader>
                                    <CardTitle>Carte en direct</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 p-0 relative">
                                    {apiKey ? (
                                        <MapView apiKey={apiKey} route={null} />
                                    ) : (
                                        <div className="bg-muted h-full w-full flex items-center justify-center">
                                            <p className="text-muted-foreground">Clé API Google Maps manquante.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                        <div>
                            <Card className="mb-8">
                                <CardHeader>
                                    <CardTitle>Courses Actives ({activeTrips.length})</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {activeTrips.map(trip => (
                                        <div key={trip.id} className="p-3 border rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <p className="font-semibold">{trip.id}</p>
                                                <Badge>{trip.status}</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">Passager: {trip.rider} / Chauffeur: {trip.driver}</p>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader>
                                    <CardTitle>Chauffeurs Disponibles ({availableDrivers.length})</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {availableDrivers.map(driver => (
                                        <div key={driver.id} className="p-3 border rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <p className="font-semibold">{driver.name}</p>
                                                 <Badge variant="secondary">{driver.status}</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">Zone: {driver.zone}</p>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </main>
            </div>
        </SidebarInset>
    </SidebarProvider>
  );
}
