'use client';

import { AppHeader } from '@/components/kulooc/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { promotions } from '@/lib/data';
import { Ticket } from 'lucide-react';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';

export default function PromotionsPage() {
  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon" className="bg-white border-r p-0 shadow-lg z-10" />
      <SidebarInset>
        <div className="flex flex-col min-h-screen bg-neutral-50 font-sans">
          <AppHeader />
          <main className="flex-1 container mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold mb-8">Promotions</h1>
            
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Add a promo code</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Input placeholder="Enter promo code" />
                        <Button>Apply</Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Available Promotions</h2>
                {promotions.map(promo => (
                    <Card key={promo.id} className="flex items-center p-4 gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                            <Ticket className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <p className="font-bold">{promo.title}</p>
                            <p className="text-sm text-muted-foreground">Code: <span className="font-mono bg-muted p-1 rounded">{promo.code}</span></p>
                        </div>
                    </Card>
                ))}
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
