'use client';

import { AppHeader } from '@/components/kulooc/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, PlusCircle } from 'lucide-react';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';

export default function WalletPage() {
  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon" className="bg-white border-r p-0 shadow-lg z-10" />
      <SidebarInset>
        <div className="flex flex-col min-h-screen bg-background font-sans">
          <AppHeader />
          <main className="flex-1 container mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold mb-8">KULOOC Wallet</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Methods</CardTitle>
                    <CardDescription>Manage your saved payment methods.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <CreditCard className="h-6 w-6 text-muted-foreground" />
                          <div>
                            <p className="font-semibold">MasterCard **** 4242</p>
                            <p className="text-sm text-muted-foreground">Expires 12/25</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">Remove</Button>
                      </div>

                      <Button variant="outline" className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add payment method
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>KULOOC Cash</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold">$0.00</p>
                    <p className="text-sm text-muted-foreground mt-1">CAD Balance</p>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full">Add Funds</Button>
                  </CardFooter>
                </Card>
                
                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle>Promotions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">No active promotions.</p>
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
