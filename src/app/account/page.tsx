'use client';

import { AppHeader } from '@/components/kulooc/header';
import { useUser } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';

export default function AccountPage() {
  const { user, isUserLoading } = useUser();

  const userInitial = user?.email?.[0]?.toUpperCase() || user?.displayName?.[0]?.toUpperCase() || '?';

  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon" className="bg-white border-r p-0 shadow-lg z-10" />
      <SidebarInset>
        <div className="flex flex-col min-h-screen bg-neutral-50 font-sans">
          <AppHeader />
          <main className="flex-1 container mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold mb-8">Manage Account</h1>
            
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                {isUserLoading ? (
                  <Skeleton className="h-16 w-16 rounded-full" />
                ) : (
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user?.photoURL ?? ''} alt={user?.displayName ?? 'User'} />
                    <AvatarFallback>{userInitial}</AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <CardTitle className="text-2xl">
                    {isUserLoading ? <Skeleton className="h-8 w-40" /> : user?.displayName || 'KULOOC User'}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {isUserLoading ? (
                  <div className="space-y-6 mt-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <form className="space-y-6 mt-4 max-w-lg">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Full Name</Label>
                      <Input id="displayName" defaultValue={user?.displayName ?? ''} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue={user?.email ?? ''} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" type="tel" defaultValue={user?.phoneNumber ?? ''} disabled />
                    </div>
                    <Button>Save Changes</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
