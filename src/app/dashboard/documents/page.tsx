'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Search, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const DOC_TYPES = [
  { key: 'license', label: 'Permis de conduire' },
  { key: 'insurance', label: 'Assurance' },
  { key: 'registration', label: 'Immatriculation' },
  { key: 'criminal_check', label: 'Vérification criminelle' },
  { key: 'profile_photo', label: 'Photo de profil' },
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  approved: { label: 'Approuvé', color: 'bg-green-900 text-green-300', icon: <CheckCircle className="w-3 h-3" /> },
  pending: { label: 'En attente', color: 'bg-yellow-900 text-yellow-300', icon: <Clock className="w-3 h-3" /> },
  rejected: { label: 'Rejeté', color: 'bg-red-900 text-red-300', icon: <XCircle className="w-3 h-3" /> },
  standby: { label: 'Standby', color: 'bg-blue-900 text-blue-300', icon: <AlertTriangle className="w-3 h-3" /> },
  expired: { label: 'Expiré', color: 'bg-orange-900 text-orange-300', icon: <AlertTriangle className="w-3 h-3" /> },
};

export default function DocumentsPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { loadDrivers(); }, []);

  useEffect(() => {
    let result = drivers;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(d => d.name?.toLowerCase().includes(s) || d.email?.toLowerCase().includes(s));
    }
    if (statusFilter !== 'all') {
      result = result.filter(d => Object.values(d.documents || {}).includes(statusFilter));
    }
    setFiltered(result);
  }, [search, statusFilter, drivers]);

  const loadDrivers = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'drivers'), orderBy('name'), limit(200)));
      setDrivers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const handleDocStatus = async (driverId: string, docKey: string, status: string) => {
    try {
      await updateDoc(doc(db, 'drivers', driverId), { [`documents.${docKey}`]: status });
      toast({ title: 'Document mis à jour', description: `${statusConfig[status]?.label}` });
      loadDrivers();
    } catch (err) { toast({ title: 'Erreur', variant: 'destructive' }); }
  };

  const stats = {
    pending: drivers.reduce((acc, d) => acc + Object.values(d.documents || {}).filter((s: any) => s === 'pending').length, 0),
    approved: drivers.reduce((acc, d) => acc + Object.values(d.documents || {}).filter((s: any) => s === 'approved').length, 0),
    rejected: drivers.reduce((acc, d) => acc + Object.values(d.documents || {}).filter((s: any) => s === 'rejected').length, 0),
    expired: drivers.reduce((acc, d) => acc + Object.values(d.documents || {}).filter((s: any) => s === 'expired').length, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="text-gray-400 text-sm mt-1">Approbation et gestion des documents chauffeurs</p>
        </div>
        <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:text-white" onClick={loadDrivers}>
          <RefreshCw className="w-4 h-4 mr-2" />Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'En attente', value: stats.pending, color: 'text-yellow-400' },
          { label: 'Approuvés', value: stats.approved, color: 'text-green-400' },
          { label: 'Rejetés', value: stats.rejected, color: 'text-red-400' },
          { label: 'Expirés', value: stats.expired, color: 'text-orange-400' },
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
              <Input
                placeholder="Rechercher un chauffeur..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all" className="text-white">Tous</SelectItem>
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
          <p className="text-gray-500 text-center py-8">Aucun document trouvé</p>
        ) : (
          filtered.map(driver => (
            <Card key={driver.id} className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-red-800 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {driver.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-medium">{driver.name}</p>
                    <p className="text-gray-400 text-xs">{driver.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {DOC_TYPES.map(({ key, label }) => {
                    const status = driver.documents?.[key] || 'pending';
                    const s = statusConfig[status] || statusConfig.pending;
                    return (
                      <div key={key} className="bg-gray-800 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-300 text-xs font-medium">{label}</span>
                          <Badge className={cn('text-xs flex items-center gap-1', s.color)}>
                            {s.icon}{s.label}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="flex-1 h-6 text-xs bg-green-800 hover:bg-green-700 text-white"
                            onClick={() => handleDocStatus(driver.id, key, 'approved')}
                          >✓</Button>
                          <Button
                            size="sm"
                            className="flex-1 h-6 text-xs bg-red-800 hover:bg-red-700 text-white"
                            onClick={() => handleDocStatus(driver.id, key, 'rejected')}
                          >✗</Button>
                          <Button
                            size="sm"
                            className="flex-1 h-6 text-xs bg-orange-800 hover:bg-orange-700 text-white"
                            onClick={() => handleDocStatus(driver.id, key, 'expired')}
                          >!</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
