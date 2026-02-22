'use client';

import { Button } from "@/components/ui/button";
import { 
    Car, 
    KeyRound, 
    ShoppingBasket, 
    Utensils, 
    User, 
    LogOut,
    LifeBuoy,
    Wallet,
    ClipboardList,
    Tag,
    Ticket
} from "lucide-react";
import Link from "next/link";
import { useUser } from "@/firebase/provider";
import { getAuth, signOut } from "firebase/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppHeader() {
  const { user, isUserLoading } = useUser();
  const auth = getAuth();

  const handleSignOut = () => {
    signOut(auth);
  };

  const userInitial = user?.email?.[0]?.toUpperCase() || user?.displayName?.[0]?.toUpperCase() || '?';

  return (
    <header className="bg-white shadow-sm p-4 flex items-center justify-between z-20">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <Link href="/" className="text-2xl font-bold tracking-tighter text-primary">KULOOC</Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="#" className="flex items-center gap-2 text-sm font-medium pb-2 border-b-2 border-primary">
            <Car className="h-5 w-5 text-primary" />
            <span>Course</span>
          </Link>
          <Link href="#" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <KeyRound className="h-5 w-5" />
            <span>Uber Rent</span>
          </Link>
          <Link href="#" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Utensils className="h-5 w-5" />
            <span>Uber Eats</span>
          </Link>
          <Link href="#" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ShoppingBasket className="h-5 w-5" />
            <span>Épicerie</span>
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        {isUserLoading ? (
          <div className="h-9 w-24 rounded-md bg-gray-200 animate-pulse" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
                  <AvatarFallback>{userInitial}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-0" align="end" forceMount>
              <div className="flex items-center justify-between p-4">
                  <p className="text-lg font-bold">{user.displayName || 'Utilisateur'}</p>
                  <Avatar className="h-12 w-12">
                      <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
                      <AvatarFallback>{userInitial}</AvatarFallback>
                  </Avatar>
              </div>
              
              <div className="grid grid-cols-3 gap-1 px-4 pb-2">
                  <Button asChild variant="ghost" className="flex-col h-auto py-2">
                      <Link href="/help">
                          <LifeBuoy className="h-5 w-5 mb-1"/>
                          <span className="text-xs">Aide</span>
                      </Link>
                  </Button>
                  <Button asChild variant="ghost" className="flex-col h-auto py-2">
                      <Link href="/wallet">
                          <Wallet className="h-5 w-5 mb-1"/>
                          <span className="text-xs">Wallet</span>
                      </Link>
                  </Button>
                  <Button asChild variant="ghost" className="flex-col h-auto py-2">
                      <Link href="/activity">
                          <ClipboardList className="h-5 w-5 mb-1"/>
                          <span className="text-xs">Activité</span>
                      </Link>
                  </Button>
              </div>
              
              <DropdownMenuSeparator />

              <div className="p-2">
                <DropdownMenuItem asChild>
                  <Link href="/account" className="w-full cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Gérer le compte</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/bonus" className="w-full cursor-pointer">
                    <Tag className="mr-2 h-4 w-4" />
                    <span>Bonus</span>
                  </Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                  <Link href="/promotions" className="w-full cursor-pointer">
                    <Ticket className="mr-2 h-4 w-4" />
                    <span>Promotions</span>
                  </Link>
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator />

              <div className="p-2">
                <DropdownMenuItem onClick={handleSignOut} className="focus:bg-muted cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Se déconnecter</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
              <Link href="/login">
                <User className="mr-2 h-4 w-4" />
                Connexion
              </Link>
            </Button>
            <Button variant="default" size="sm" className="rounded-full" asChild>
              <Link href="/login?signup=true">
                S'inscrire
              </Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
