'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Truck, Search, RefreshCw, CheckCircle, AlertTriangle, XCircle, Car, Calendar, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function FleetPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { loadFleet(); }, []);

  useEffect(() => {
    let result = drivers;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(d =>
        d.vehicle?.make?.toLowerCase().includes(s) ||
        d.vehicle?.model?.toLowerCase().includes(s) ||
        d.vehicle?.plate?.toLowerCase().includes(s) ||
        d.name?.toLowerCase().includes(s)
      );
    }
    if (typeFilter !== 'all') result = result.filter(d => d.vehicle?.type === typeFilter);
    setFiltered(result);
  }, [search, typeFilter, drivers]);

  const loadFleet = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'drivers'), orderBy('name'), limit(200)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setDrivers(list);
      setFiltered(list);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const conditionConfig: Record<string, { label: string; color: string }> = {
    excellent: { label: 'Excellent', color: 'text-green-400' },
    good: { label: 'Bon', color: 'text-blue-400' },
    fair: { label: 'Passable', color: 'text-yellow-400' },
    poor: { label: 'Mauvais', color: 'text-red-400' },
  };

  const docStatusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle className="w-3 h-3 text-green-400" />;
    if (status === 'pending') return <AlertTriangle className="w-3 h-3 text-yellow-400" />;
    if (status === 'expired') return <XCircle className="w-3 h-3 text-red-400" />;
    return <XCircle className="w-3 h-3 text-gray-400" />;
  };

  const vehicleTypes = [...new Set(drivers.map(d => d.vehicle?.type).filter(Boolean))];

  const stats = {
    total: drivers.length,
    active: drivers.filter(d => d.status === 'active').length,
    docsExpired: drivers.filter(d => Object.values(d.documents || {}).some((s: any) => s === 'expired')).length,
    docsPending: drivers.filter(d => Object.values(d.documents || {}).some((s: any) => s === 'pending')).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Flotte</h1>
          <p className="text-gray-400 text-sm mt-1">Gestion des véhicules et documents</p>
        </div>
        <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:text-white" onClick={loadFleet}>
          <RefreshCw className="w-4 h-4 mr-2" />Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Véhicules', value: stats.total, color: 'text-white', icon: <Truck className="w-4 h-4" /> },
          { label: 'En Service', value: stats.active, color: 'text-green-400', icon: <Activity className="w-4 h-4" /> },
          { label: 'Docs Expirés', value: stats.docsExpired, color: 'text-red-400', icon: <XCircle className="w-4 h-4" /> },
          { label: 'Docs en Attente', value: stats.docsPending, color: 'text-yellow-400', icon: <AlertTriangle className="w-4 h-4" /> },
        ].map((s, i) => (
          <Card key={i} className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className={cn('mb-1', s.color)}>{s.icon}</div>
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
                placeholder="Rechercher par marque, modèle, plaque, chauffeur..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all" className="text-white">Tous les types</SelectItem>
                {vehicleTypes.map(t => (
                  <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-gray-400 text-sm self-center">{filtered.length} véhicules</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <p className="text-gray-500 col-span-3 text-center py-8">Chargement...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 col-span-3 text-center py-8">Aucun véhicule trouvé</p>
        ) : (
          filtered.map(driver => {
            const v = driver.vehicle || {};
            const docs = driver.documents || {};
            const docsOk = Object.values(docs).filter((s: any) => s === 'approved').length;
            const docsTotal = Object.keys(docs).length || 5;
            const condition = conditionConfig[v.condition] || conditionConfig.good;
            return (
              <Card key={driver.id} className="bg-gray-900 border-gray-800 hover:border-gray-600 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                      <Car className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">{v.year} {v.make} {v.model}</p>
                      <p className="text-gray-400 text-xs">{v.color} · {v.plate} · {v.type}</p>
                    </div>
                    <Badge className={cn('text-xs', condition.color, 'bg-transparent border-0')}>{condition.label}</Badge>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-2 mb-3">
                    <p className="text-gray-400 text-xs mb-1">Chauffeur</p>
                    <p className="text-white text-sm font-medium">{driver.name}</p>
                    <p className="text-gray-400 text-xs">{driver.email}</p>
                  </div>

                  {v.mileage !== undefined && (
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-400 text-xs">Kilométrage</span>
                      <span className="text-white text-xs font-medium">{(v.mileage || 0).toLocaleString()} km</span>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Documents</span>
                      <span className="text-gray-400">{docsOk}/{docsTotal}</span>
                    </div>
                    <Progress value={(docsOk / docsTotal) * 100} className="h-1.5 bg-gray-800 mb-2" />
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(docs).map(([key, status]: [string, any]) => {
                        const labels: Record<string, string> = {
                          license: 'Permis', insurance: 'Assurance',
                          registration: 'Immat.', criminal_check: 'Criminel', profile_photo: 'Photo'
                        };
                        return (
                          <div key={key} className="flex items-center gap-1 text-xs text-gray-400">
                            {docStatusIcon(status)}
                            <span>{labels[key] || key}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
