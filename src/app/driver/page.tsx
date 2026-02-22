'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { goOnlineAttempt } from './actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { MapView } from '@/components/kulooc/map-view';

// This type is now aligned with OpenAPI spec
export type GoOnlineBlocker = {
    code: string;
    title: string;
    detail: string;
    action: {
        cta: string;
        deeplink: string;
    };
};

export default function DriverHomePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [blocker, setBlocker] = useState<GoOnlineBlocker | null>(null);
  const [showBlockerSheet, setShowBlockerSheet] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const handleGoOnlineToggle = async () => {
    if (isOnline) {
      setIsOnline(false);
      return;
    }

    setIsLoading(true);
    const response = await goOnlineAttempt();
    setIsLoading(false);

    if (response.success) {
      if (response.data.allowed) {
        setIsOnline(true);
        setBlocker(null);
        toast({ title: 'Vous êtes maintenant en ligne !' });
      } else if (response.data.blockers && response.data.blockers.length > 0) {
        setBlocker(response.data.blockers[0]);
      } else {
         toast({
            variant: 'destructive',
            title: 'Impossible de passer en ligne',
            description: 'Aucune raison spécifique n\'a été fournie. Veuillez contacter le support.',
        });
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Erreur de communication',
        description: response.error,
      });
    }
  };
  
  const resolveBlocker = () => {
      if (!blocker) return;
      router.push(blocker.action.deeplink);
      setShowBlockerSheet(false);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Map */}
      <div className="flex-1 bg-gray-300 relative">
        {apiKey ? (
            <MapView apiKey={apiKey} route={null} />
        ) : (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Clé API Google Maps manquante.</p>
            </div>
        )}
      </div>

      <div className="p-4 bg-white">
        <Card className="mb-4">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Statut</p>
              <p className={`text-lg font-bold ${isOnline ? 'text-green-600' : 'text-gray-800'}`}>
                {isOnline ? 'En ligne' : 'Hors ligne'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-muted-foreground">Temps de conduite</p>
              <p className="text-lg font-bold">0h 00m</p>
            </div>
          </CardContent>
        </Card>
        
        <Button 
          size="lg" 
          className={`w-full h-16 text-xl rounded-lg ${isOnline ? 'bg-gray-800 hover:bg-gray-900' : 'bg-primary hover:bg-primary/90'}`}
          onClick={handleGoOnlineToggle}
          disabled={isLoading || (!!blocker && !isOnline)}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLoading ? 'Vérification...' : (isOnline ? 'Passer hors ligne' : 'Passer en ligne')}
        </Button>
      </div>

      {blocker && (
        <div 
          className="fixed bottom-[65px] left-0 right-0 bg-yellow-400 p-4 border-t border-yellow-500 flex items-center gap-4 cursor-pointer"
          onClick={() => setShowBlockerSheet(true)}
        >
          <AlertTriangle className="h-6 w-6 text-yellow-900" />
          <div className="flex-1">
            <p className="font-bold text-yellow-900">{blocker.title}</p>
            <p className="text-sm text-yellow-800">{blocker.action.cta}</p>
          </div>
        </div>
      )}

      <Sheet open={showBlockerSheet} onOpenChange={setShowBlockerSheet}>
        <SheetContent side="bottom" className="rounded-t-lg">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              {blocker?.title}
            </SheetTitle>
            <SheetDescription className="pt-2">
              {blocker?.detail}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2 pt-4">
              <Button onClick={resolveBlocker}>Résoudre maintenant</Button>
              <Button variant="secondary" onClick={() => setShowBlockerSheet(false)}>Contacter le support</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
