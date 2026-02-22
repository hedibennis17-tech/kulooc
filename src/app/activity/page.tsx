'use client';

import { AppHeader } from '@/components/kulooc/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, Circle, MoreVertical } from 'lucide-react';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';

const pastRides = [
  {
    id: 1,
    date: 'Today',
    time: '4:35 PM',
    origin: '1234 Rue de la Montagne, Montréal',
    destination: '5678 Avenue McGill College, Montréal',
    price: '18.45',
    service: 'KULOOC X'
  },
  {
    id: 2,
    date: 'Yesterday',
    time: '9:12 AM',
    origin: 'Aéroport international Pierre-Elliott-Trudeau',
    destination: 'Centre-ville, Montréal',
    price: '41.00',
    service: 'Confort'
  },
  {
    id: 3,
    date: 'Oct 28, 2023',
    time: '8:00 PM',
    origin: 'Plateau Mont-Royal, Montréal',
    destination: 'Vieux-Port de Montréal',
    price: '14.50',
    service: 'KULOOC Green'
  }
];

export default function ActivityPage() {
  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon" className="bg-white border-r p-0 shadow-lg z-10" />
      <SidebarInset>
        <div className="flex flex-col min-h-screen bg-neutral-50 font-sans">
          <AppHeader />
          <main className="flex-1 bg-white">
            <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <h1 className="text-4xl font-bold mb-8">Activity</h1>

                <Card>
                    <CardHeader>
                        <CardTitle>Past Rides</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {pastRides.map(ride => (
                                <div key={ride.id} className="flex items-start gap-4">
                                    <Car className="h-6 w-6 text-muted-foreground mt-1" />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold">{ride.service}</p>
                                                <p className="text-sm text-muted-foreground">{ride.date} at {ride.time}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold">${ride.price}</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex items-start">
                                            <div className="flex flex-col items-center mr-4">
                                                <Circle className="h-3 w-3 fill-current" />
                                                <div className="h-10 w-px bg-border my-1"></div>
                                                <div className="h-3 w-3 border-2 rounded-full"></div>
                                            </div>
                                            <div className="space-y-4 text-sm">
                                                <p>{ride.origin}</p>
                                                <p>{ride.destination}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <MoreVertical className="h-5 w-5 text-muted-foreground" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
