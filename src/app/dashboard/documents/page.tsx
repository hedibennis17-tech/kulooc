'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/firebase';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw, ExternalLink, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  approved:  { label: 'Approuvé',       color: 'bg-green-900 text-green-300',   icon: <CheckCircle className="w-3 h-3" /> },
  pending:   { label: 'En attente',     color: 'bg-yellow-900 text-yellow-300', icon: <Clock className="w-3 h-3" /> },
  required:  { label: 'Requis',         color: 'bg-red-900 text-red-300',       icon: <AlertTriangle className="w-3 h-3" /> },
  rejected:  { label: 'Rejeté',         color: 'bg-red-900 text-red-300',       icon: <XCircle className="w-3 h-3" /> },
  standby:   { label: 'Standby',        color: 'bg-blue-900 text-blue-300',     icon: <AlertTriangle className="w-3 h-3" /> },
  expired:   { label: 'Expiré',         color: 'bg-orange-900 text-orange-300', icon: <AlertTriangle className="w-3 h-3" /> },
  expiring:  { label: 'Expire bientôt', color: 'bg-orange-900 text-orange-300', icon: <AlertTriangle className="w-3 h-3" /> },
};

interface DriverWithDocs {
  id: string;
  name: string;
  email: string;
  status: string;
  submittedDocs: { id: string; type: string; name: string; status: string; fileUrl?: string; submittedAt?: string; }[];
}

export default function DocumentsPage() {
  const [drivers, setDrivers] = useState<DriverWithDocs[]>([]);
  const [filtered, setFiltered] = useState<DriverWithDocs[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const driversSnap = await getDocs(query(collection(db, 'drivers'), orderBy('name'), limit(200)));
      const driversMap: Record<string, DriverWithDocs> = {};
      driversSnap.docs.forEach(d => {
        const data = d.data();
        driversMap[d.id] = {
          id: d.id,
          name: data.name || data.displayName || 'Chauffeur',
          email: data.email || '',
          status: data.status || 'inactive',
          submittedDocs: [],
        };
      });
      try {
        const docsSnap = await getDocs(query(collection(db, 'driver_documents'), limit(500)));
        docsSnap.docs.forEach(d => {
          const data = d.data();
          const driverId = data.driverId;
          if (!driverId) return;
          if (!driversMap[driverId]) {
            driversMap[driverId] = {
              id: driverId,
              name: data.driverName || 'Chauffeur',
              email: data.driverEmail || '',
              status: 'inactive',
              submittedDocs: [],
            };
          }
          driversMap[driverId].submittedDocs.push({
            id: d.id,
            type: data.type || '',
            name: data.name || data.type || 'Document',
            status: data.status || 'pending',
            fileUrl: data.fileUrl,
            submittedAt: data.submittedAt?.toDate?.()?.toLocaleDateString?.('fr-CA') || '',
          });
        });
      } catch (e) { console.warn('driver_documents:', e); }
      setDrivers(Object.values(driversMap).sort((a, b) => b.submittedDocs.length - a.submittedDocs.length));
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    let result = drivers;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(d => d.name?.toLowerCase().includes(s) || d.email?.toLowerCase().includes(s));
    }
    if (statusFilter !== 'all') {
      result = result.filter(d => d.submittedDocs.some(doc => doc.status === statusFilter));
    }
    setFiltered(result);
  }, [search, statusFilter, drivers]);

  const handleDocStatus = async (driverId: string, docId: string, status: string, docType?: string) => {
    try {
      await updateDoc(doc(db, 'driver_documents', docId), { status, reviewedAt: new Date().toISOString() });
      const typeMap: Record<string, string> = {
        permis_conduire: 'license', photo_profil: 'profile_photo',
        piece_identite: 'license', assurance_vehicule: 'insurance',
        immatriculation: 'registration', antecedents_judiciaires: 'criminal_check',
      };
      if (docType) {
        try { await updateDoc(doc(db, 'drivers', driverId), { [`documents.${typeMap[docType] || docType}`]: status }); } catch {}
      }
      toast({ title: 'Document mis à jour', description: statusConfig[status]?.label });
      loadData();
    } catch { toast({ title: 'Erreur', variant: 'destructive' }); }
  };

  const allDocs = drivers.flatMap(d => d.submittedDocs);
  const stats = {
    pending:  allDocs.filter(d => d.status === 'pending').length,
    approved: allDocs.filter(d => d.status === 'approved').length,
    rejected: allDocs.filter(d => d.status === 'rejected').length,
    expired:  allDocs.filter(d => d.status === 'expired' || d.status === 'expiring').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="text-gray-400 text-sm mt-1">Approbation et gestion des documents chauffeurs</p>
        </div>
        <Button onClick={loadData} variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
          <RefreshCw className="w-4 h-4 mr-2" />Actualiser
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'En attente', value: stats.pending,  color: 'text-yellow-400' },
          { label: 'Approuvés',  value: stats.approved, color: 'text-green-400' },
          { label: 'Rejetés',    value: stats.rejected, color: 'text-red-400' },
          { label: 'Expirés',    value: stats.expired,  color: 'text-orange-400' },
        ].map((s, i) => (
          <Card key={i} className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 text-center">
              <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
              <p className="text-gray-400 text-xs">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Rechercher un chauffeur..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all" className="text-white">Tous les statuts</SelectItem>
                {Object.entries(statusConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-white">{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-gray-500 text-center py-8">Chargement...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucun chauffeur trouvé</p>
        ) : (
          filtered.map(driver => (
            <Card key={driver.id} className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-800 rounded-full flex items-center justify-center text-white font-bold">
                    {driver.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold">{driver.name}</p>
                    <p className="text-gray-400 text-xs">{driver.email}</p>
                  </div>
                  <span className="text-gray-400 text-xs">{driver.submittedDocs.length} doc(s)</span>
                </div>
                {driver.submittedDocs.length === 0 ? (
                  <p className="text-gray-600 text-sm italic">Aucun document soumis</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {driver.submittedDocs.map(docItem => {
                      const s = statusConfig[docItem.status] || statusConfig.pending;
                      return (
                        <div key={docItem.id} className="bg-gray-800 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-gray-200 text-sm font-medium">{docItem.name}</p>
                              {docItem.submittedAt && <p className="text-gray-500 text-xs">Soumis le {docItem.submittedAt}</p>}
                            </div>
                            <Badge className={cn('text-xs flex items-center gap-1 shrink-0 ml-2', s.color)}>
                              {s.icon}{s.label}
                            </Badge>
                          </div>
                          <div className="flex gap-2 items-center">
                            <div className="flex gap-1 flex-1">
                              <Button size="sm" className="flex-1 h-7 text-xs bg-green-800 hover:bg-green-700 text-white"
                                onClick={() => handleDocStatus(driver.id, docItem.id, 'approved', docItem.type)}>
                                ✓ Approuver
                              </Button>
                              <Button size="sm" className="flex-1 h-7 text-xs bg-red-800 hover:bg-red-700 text-white"
                                onClick={() => handleDocStatus(driver.id, docItem.id, 'rejected', docItem.type)}>
                                ✗ Rejeter
                              </Button>
                            </div>
                            {docItem.fileUrl && (
                              <a href={docItem.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="outline" className="h-7 border-gray-600 text-gray-300 hover:bg-gray-700">
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
