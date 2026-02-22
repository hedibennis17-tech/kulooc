'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDocument, type DriverDocument } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, Camera, UploadCloud, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const statusConfig = {
  Approved: { badgeVariant: 'secondary', badgeText: 'Approuvé' },
  Rejected: { badgeVariant: 'destructive', badgeText: 'Rejeté' },
  Pending: { badgeVariant: 'outline', badgeText: 'En attente' },
  Required: { badgeVariant: 'default', badgeText: 'Requis' },
  Expiring: { badgeVariant: 'outline', badgeText: 'Expire bientôt' },
} as const;

export default function DocumentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [document, setDocument] = useState<DriverDocument | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const docId = Array.isArray(params.doc_id) ? params.doc_id[0] : params.doc_id;

  useEffect(() => {
    if (!docId) return;

    const loadDocument = async () => {
      setIsLoading(true);
      const response = await getDocument(docId);
      if (response.success) {
        setDocument(response.data);
      } else {
        setDocument(null);
        toast({
          variant: 'destructive',
          title: 'Document non trouvé',
          description: response.error,
        });
      }
      setIsLoading(false);
    };

    loadDocument();
  }, [docId, toast]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real app, you'd handle the upload here.
      toast({
        title: "Fichier sélectionné",
        description: `${file.name} est prêt à être téléversé.`,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <Skeleton className="h-8 w-32 mb-4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (document === null) {
    return (
      <div className="p-4 text-center">
        <p className="mb-4">Le document demandé n'a pas pu être trouvé.</p>
        <Button onClick={() => router.push('/driver/documents')}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Retour à la liste
        </Button>
      </div>
    );
  }
  
  const config = statusConfig[document.status];

  return (
    <div className="p-4">
      <Button variant="ghost" onClick={() => router.push('/driver/documents')} className="mb-4 -ml-4">
        <ChevronLeft className="mr-2 h-4 w-4" />
        Retour aux documents
      </Button>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-2xl">{document.name}</CardTitle>
            <Badge variant={config.badgeVariant}>{config.badgeText}</Badge>
          </div>
          <CardDescription>
            {document.expiry_date 
                ? `Expire le ${format(new Date(document.expiry_date), "dd MMMM yyyy", { locale: fr })}`
                : 'Pas de date d\'expiration'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {document.status === 'Rejected' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Document rejeté</AlertTitle>
              <AlertDescription>
                {document.rejection_reason || "Votre document n'a pas pu être approuvé. Veuillez en soumettre un nouveau."}
              </AlertDescription>
            </Alert>
          )}

          {(document.status === 'Required' || document.status === 'Rejected' || document.status === 'Expiring') && (
            <div>
              <h3 className="font-semibold mb-2">Soumettre un nouveau document</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,application/pdf" />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Téléverser un fichier
                </Button>
                 <Button variant="outline">
                  <Camera className="mr-2 h-4 w-4" />
                  Prendre une photo
                </Button>
              </div>
               <p className="text-xs text-muted-foreground mt-2">Formats acceptés: PDF, JPG, PNG.</p>
            </div>
          )}

          {document.file_url && document.status === 'Approved' && (
             <div>
                <h3 className="font-semibold mb-2">Document approuvé</h3>
                <a href={document.file_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    Voir le document
                </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
