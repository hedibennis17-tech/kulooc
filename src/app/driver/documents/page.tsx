'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, Clock, Upload, ChevronRight, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { getDocuments, type DriverDocument } from './actions';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const statusConfig = {
  Approved: { icon: CheckCircle, color: 'text-green-600', badgeVariant: 'secondary', badgeText: 'Approuvé' },
  Rejected: { icon: AlertCircle, color: 'text-red-600', badgeVariant: 'destructive', badgeText: 'Rejeté' },
  Pending: { icon: Clock, color: 'text-yellow-600', badgeVariant: 'outline', badgeText: 'En attente' },
  Required: { icon: Upload, color: 'text-blue-600', badgeVariant: 'default', badgeText: 'Requis' },
  Expiring: { icon: AlertTriangle, color: 'text-orange-500', badgeVariant: 'outline', badgeText: 'Expire bientôt' },
} as const;

type StatusKey = keyof typeof statusConfig;

const getExpiryText = (doc: DriverDocument): string => {
    if (doc.status === 'Rejected') return `Document rejeté`;
    if (doc.status === 'Pending') return `En cours de vérification`;
    if (doc.status === 'Required') return `Téléversement requis`;
    if (doc.expiry_date) {
        try {
            const expiry = new Date(doc.expiry_date);
            const formattedDate = format(expiry, "dd/MM/yyyy", { locale: fr });
            if (doc.status === 'Expiring') {
                return `Expire le ${formattedDate}`;
            }
            return `Expire le ${formattedDate}`;
        } catch (e) {
            return "Date d'expiration invalide";
        }
    }
    return 'Pas de date d\'expiration';
}

export default function DriverDocumentsPage() {
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoading(true);
      const response = await getDocuments();
      if (response.success) {
        setDocuments(response.data);
      } else {
        toast({
          variant: 'destructive',
          title: 'Erreur de chargement',
          description: response.error,
        });
      }
      setIsLoading(false);
    };
    loadDocuments();
  }, [toast]);

  const getFilteredDocs = (filter: string) => {
    if (filter === "Tous") return documents;
    
    const statusMap: { [key: string]: StatusKey } = {
      'Requis': 'Required',
      'En attente': 'Pending',
      'Rejetés': 'Rejected',
      'Expirant': 'Expiring',
    };
    const statusKey = statusMap[filter];
    if (!statusKey) return [];
    
    return documents.filter(doc => doc.status === statusKey);
  };
  
  const tabs = ["Tous", "Requis", "En attente", "Rejetés", "Expirant"];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Documents</h1>

      <Tabs defaultValue="Tous">
        <TabsList className={`grid w-full grid-cols-${tabs.length} mb-4`}>
          {tabs.map(tab => (
              <TabsTrigger value={tab} key={tab}>{tab}</TabsTrigger>
          ))}
        </TabsList>
        
        {isLoading ? (
            <div className="space-y-3 mt-4">
                <Skeleton className="h-[74px] w-full" />
                <Skeleton className="h-[74px] w-full" />
                <Skeleton className="h-[74px] w-full" />
            </div>
        ) : (
            tabs.map(filter => (
            <TabsContent value={filter} key={filter}>
                <div className="space-y-3">
                {getFilteredDocs(filter).length > 0 ? getFilteredDocs(filter).map((doc) => {
                    const config = statusConfig[doc.status as StatusKey];
                    return (
                    <Card key={doc.id} className="overflow-hidden">
                        <Link href={`/driver/documents/${doc.id}`}>
                            <div className="flex items-center p-4 hover:bg-gray-50">
                                {config?.icon && <config.icon className={`h-6 w-6 mr-4 ${config.color}`} />}
                                <div className="flex-1">
                                    <p className="font-semibold">{doc.name}</p>
                                    <p className="text-sm text-muted-foreground">{getExpiryText(doc)}</p>
                                    {doc.status === 'Rejected' && doc.rejection_reason && (
                                        <p className="text-xs text-red-600">{doc.rejection_reason}</p>
                                    )}
                                </div>
                                {config?.badgeVariant && <Badge variant={config.badgeVariant}>{config.badgeText}</Badge>}
                                <ChevronRight className="h-5 w-5 text-gray-400 ml-2" />
                            </div>
                        </Link>
                    </Card>
                    );
                }) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>Aucun document dans cette catégorie.</p>
                    </div>
                )}
                </div>
            </TabsContent>
            ))
        )}
      </Tabs>
    </div>
  );
}
