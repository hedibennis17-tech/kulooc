'use client';

import { AppHeader } from '@/components/kulooc/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Star, Users, Car } from 'lucide-react';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';

export default function BonusPage() {
  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon" className="bg-white border-r p-0 shadow-lg z-10" />
      <SidebarInset>
        <div className="flex flex-col min-h-screen bg-background font-sans">
          <AppHeader />
          <main className="flex-1 container mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <Gift className="mx-auto h-16 w-16 text-primary" />
                <h1 className="text-4xl font-bold mt-4">KULOOC Bonus</h1>
                <p className="mt-2 text-lg text-muted-foreground">Earn rewards for riding with KULOOC.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="text-center">
                    <CardHeader>
                        <Star className="mx-auto h-10 w-10 text-yellow-500" />
                        <CardTitle className="mt-2">Your Points</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-5xl font-bold">1,250</p>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>How to Earn</CardTitle>
                    <CardDescription>Complete challenges to earn bonus points.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div className="flex items-center gap-4 p-4 border rounded-lg">
                        <Users className="h-8 w-8 text-primary" />
                        <div>
                            <p className="font-semibold">Refer a Friend</p>
                            <p className="text-sm text-muted-foreground">Get 500 points when your friend takes their first ride.</p>
                        </div>
                        <p className="ml-auto font-bold text-green-600">+500 pts</p>
                      </div>
                      <div className="flex items-center gap-4 p-4 border rounded-lg">
                        <Car className="h-8 w-8 text-primary" />
                        <div>
                            <p className="font-semibold">Take 5 rides in a week</p>
                            <p className="text-sm text-muted-foreground">Ride frequently to earn bonus points.</p>
                        </div>
                        <p className="ml-auto font-bold text-green-600">+200 pts</p>
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
