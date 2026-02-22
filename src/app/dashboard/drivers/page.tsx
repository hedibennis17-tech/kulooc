'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  Car, Search, RefreshCw, Star, DollarSign, TrendingUp,
  CheckCircle, XCircle, Ban, AlertTriangle, MapPin,
  Wallet, Award, FileText, Phone, Mail, Clock,
  Activity, Shield, MessageCircle, Eye, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  tier: string;
  vehicle: { make: string; model: string; year: number; plate: string; color: string; type: string };
  stats: { totalRides: number; rating: number; acceptanceRate: number; completionRate: number; totalEarnings: number; earningsToday: number; earningsThisWeek: number; earningsThisMonth: number };
  wallet: { balance: number; pendingPayout: number; totalPaidOut: number };
  rewards: { points: number; level: string; badges: string[] };
  documents: { license: string; insurance: string; registration: string; criminal_check: string; profile_photo: string };
  complaints: number;
  warnings: number;
  joinedAt: any;
  lastActive: any;
  location?: { lat: number; lng: number };
  photoURL?: string;
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  active: { label: 'Actif', color: 'bg-green-900 text-green-300', dot: 'bg-green-400' },
  inactive: { label: 'Inactif', color: 'bg-gray-800 text-gray-300', dot: 'bg-gray-400' },
  standby: { label: 'En attente', color: 'bg-yellow-900 text-yellow-300', dot: 'bg-yellow-400' },
  blocked: { label: 'Bloqué', color: 'bg-red-900 text-red-300', dot: 'bg-red-400' },
  deactivated: { label: 'Désactivé', color: 'bg-orange-900 text-orange-300', dot: 'bg-orange-400' },
  confirmed: { label: 'Confirmé', color: 'bg-blue-900 text-blue-300', dot: 'bg-blue-400' },
  investigating: { label: 'Enquête', color: 'bg-purple-900 text-purple-300', dot: 'bg-purple-400' },
  pending: { label: 'En attente', color: 'bg-yellow-900 text-yellow-300', dot: 'bg-yellow-400' },
};

const tierConfig: Record<string, { label: string; color: string }> = {
  standard: { label: 'Standard', color: 'bg-gray-800 text-gray-300' },
  gold: { label: 'Gold', color: 'bg-yellow-900 text-yellow-300' },
  premium: { label: 'Premium', color: 'bg-purple-900 text-purple-300' },
  platinum: { label: 'Platinum', color: 'bg-blue-900 text-blue-300' },
  diamond: { label: 'Diamond', color: 'bg-cyan-900 text-cyan-300' },
};

const docStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  approved: { label: 'Approuvé', color: 'text-green-400', icon: <CheckCircle className="w-3 h-3" /> },
  pending: { label: 'En attente', color: 'text-yellow-400', icon: <Clock className="w-3 h-3" /> },
  rejected: { label: 'Rejeté', color: 'text-red-400', icon: <XCircle className="w-3 h-3" /> },
  standby: { label: 'Standby', color: 'text-blue-400', icon: <AlertTriangle className="w-3 h-3" /> },
  expired: { label: 'Expiré', color: 'text-orange-400', icon: <AlertTriangle className="w-3 h-3" /> },
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filtered, setFiltered] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'drivers'), orderBy('name'), limit(200)),
      (snap) => {
        const list: Driver[] = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || 'Chauffeur',
            email: data.email || '',
            phone: data.phone || '',
            status: data.status || 'inactive',
            tier: data.tier || 'standard',
            vehicle: data.vehicle || { make: 'N/A', model: 'N/A', year: 0, plate: 'N/A', color: 'N/A', type: 'N/A' },
            stats: data.stats || { totalRides: 0, rating: 5, acceptanceRate: 0, completionRate: 0, totalEarnings: 0, earningsToday: 0, earningsThisWeek: 0, earningsThisMonth: 0 },
            wallet: data.wallet || { balance: 0, pendingPayout: 0, totalPaidOut: 0 },
            rewards: data.rewards || { points: 0, level: 'Bronze', badges: [] },
            documents: data.documents || { license: 'pending', insurance: 'pending', registration: 'pending', criminal_check: 'pending', profile_photo: 'pending' },
            complaints: data.complaints || 0,
            warnings: data.warnings || 0,
            joinedAt: data.joinedAt,
            lastActive: data.lastActive,
            location: data.location,
            photoURL: data.photoURL,
          };
        });
        setDrivers(list);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    let result = drivers;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(d =>
        d.name?.toLowerCase().includes(s) ||
        d.email?.toLowerCase().includes(s) ||
        d.phone?.includes(s) ||
        d.vehicle?.plate?.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== 'all') result = result.filter(d => d.status === statusFilter);
    if (tierFilter !== 'all') result = result.filter(d => d.tier === tierFilter);
    setFiltered(result);
  }, [search, statusFilter, tierFilter, drivers]);

  const handleStatusChange = async (driver: Driver, status: string) => {
    try {
      await updateDoc(doc(db, 'drivers', driver.id), { status });
      toast({ title: 'Statut mis à jour', description: `${driver.name} → ${statusConfig[status]?.label}` });
    } catch (err) { toast({ title: 'Erreur', variant: 'destructive' }); }
  };

  const handleTierChange = async (driver: Driver, tier: string) => {
    try {
      await updateDoc(doc(db, 'drivers', driver.id), { tier });
      toast({ title: 'Niveau mis à jour', description: `${driver.name} → ${tierConfig[tier]?.label}` });
    } catch (err) { toast({ title: 'Erreur', variant: 'destructive' }); }
  };

  const stats = {
    total: drivers.length,
    active: drivers.filter(d => d.status === 'active').length,
    standby: drivers.filter(d => d.status === 'standby').length,
    blocked: drivers.filter(d => d.status === 'blocked').length,
    pendingDocs: drivers.filter(d => Object.values(d.documents).some(s => s === 'pending')).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Chauffeurs</h1>
          <p className="text-gray-400 text-sm mt-1">Gestion avancée de la flotte de chauffeurs</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Actifs', value: stats.active, color: 'text-green-400' },
          { label: 'Standby', value: stats.standby, color: 'text-yellow-400' },
          { label: 'Bloqués', value: stats.blocked, color: 'text-red-400' },
          { label: 'Docs en attente', value: stats.pendingDocs, color: 'text-orange-400' },
        ].map((s, i) => (
          <Card key={i} className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 text-center">
              <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
              <p className="text-gray-400 text-xs mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher par nom, email, plaque..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all" className="text-white">Tous</SelectItem>
                {Object.entries(statusConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-white">{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-36 bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Niveau" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all" className="text-white">Tous</SelectItem>
                {Object.entries(tierConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-white">{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-gray-400 text-sm self-center">{filtered.length} chauffeurs</p>
          </div>
        </CardContent>
      </Card>

      {/* Driver Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <p className="text-gray-500 col-span-3 text-center py-8">Chargement...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 col-span-3 text-center py-8">Aucun chauffeur trouvé</p>
        ) : (
          filtered.map(driver => {
            const status = statusConfig[driver.status] || statusConfig.inactive;
            const tier = tierConfig[driver.tier] || tierConfig.standard;
            const docsOk = Object.values(driver.documents).filter(s => s === 'approved').length;
            const docsTotal = Object.values(driver.documents).length;
            return (
              <Card
                key={driver.id}
                className="bg-gray-900 border-gray-800 hover:border-gray-600 transition-all cursor-pointer"
                onClick={() => setSelectedDriver(driver)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="w-11 h-11">
                        <AvatarImage src={driver.photoURL} />
                        <AvatarFallback className="bg-red-700 text-white text-sm">
                          {driver.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900', status.dot)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-medium text-sm">{driver.name}</p>
                        <Badge className={cn('text-xs', tier.color)}>{tier.label}</Badge>
                        <Badge className={cn('text-xs', status.color)}>{status.label}</Badge>
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5">{driver.vehicle.year} {driver.vehicle.make} {driver.vehicle.model} · {driver.vehicle.plate}</p>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    <div className="text-center">
                      <p className="text-white text-sm font-bold">{driver.stats.totalRides}</p>
                      <p className="text-gray-500 text-xs">Courses</p>
                    </div>
                    <div className="text-center">
                      <p className="text-yellow-400 text-sm font-bold">{driver.stats.rating.toFixed(1)}★</p>
                      <p className="text-gray-500 text-xs">Note</p>
                    </div>
                    <div className="text-center">
                      <p className="text-green-400 text-sm font-bold">${driver.stats.earningsToday.toFixed(0)}</p>
                      <p className="text-gray-500 text-xs">Auj.</p>
                    </div>
                    <div className="text-center">
                      <p className="text-blue-400 text-sm font-bold">${driver.wallet.balance.toFixed(0)}</p>
                      <p className="text-gray-500 text-xs">Wallet</p>
                    </div>
                  </div>

                  {/* Docs Progress */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Documents</span>
                      <span className="text-gray-400">{docsOk}/{docsTotal}</span>
                    </div>
                    <Progress value={(docsOk / docsTotal) * 100} className="h-1.5 bg-gray-800" />
                  </div>

                  {/* Warnings/Complaints */}
                  {(driver.warnings > 0 || driver.complaints > 0) && (
                    <div className="flex gap-2 mt-2">
                      {driver.warnings > 0 && (
                        <Badge className="bg-yellow-900 text-yellow-300 text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />{driver.warnings} avert.
                        </Badge>
                      )}
                      {driver.complaints > 0 && (
                        <Badge className="bg-red-900 text-red-300 text-xs">
                          <XCircle className="w-3 h-3 mr-1" />{driver.complaints} plaintes
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <Select onValueChange={(s) => handleStatusChange(driver, s)}>
                      <SelectTrigger className="flex-1 h-7 text-xs bg-gray-800 border-gray-700 text-gray-300" onClick={e => e.stopPropagation()}>
                        <SelectValue placeholder="Changer statut" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700" onClick={e => e.stopPropagation()}>
                        {Object.entries(statusConfig).map(([k, v]) => (
                          <SelectItem key={k} value={k} className="text-white text-xs">{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white h-7 px-2" onClick={e => { e.stopPropagation(); setSelectedDriver(driver); }}>
                      <Eye className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Driver Detail Modal */}
      <Dialog open={!!selectedDriver} onOpenChange={() => setSelectedDriver(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedDriver && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedDriver.photoURL} />
                    <AvatarFallback className="bg-red-700 text-white">{selectedDriver.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white">{selectedDriver.name}</p>
                    <p className="text-gray-400 text-xs">{selectedDriver.email}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-gray-800 border-gray-700">
                  <TabsTrigger value="overview" className="text-xs">Aperçu</TabsTrigger>
                  <TabsTrigger value="wallet" className="text-xs">Wallet</TabsTrigger>
                  <TabsTrigger value="rewards" className="text-xs">Récompenses</TabsTrigger>
                  <TabsTrigger value="documents" className="text-xs">Documents</TabsTrigger>
                  <TabsTrigger value="actions" className="text-xs">Actions</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Total Courses', value: selectedDriver.stats.totalRides, color: 'text-blue-400' },
                      { label: 'Note Moyenne', value: `${selectedDriver.stats.rating.toFixed(1)}★`, color: 'text-yellow-400' },
                      { label: 'Taux Acceptation', value: `${selectedDriver.stats.acceptanceRate}%`, color: 'text-green-400' },
                      { label: 'Taux Complétion', value: `${selectedDriver.stats.completionRate}%`, color: 'text-purple-400' },
                    ].map((s, i) => (
                      <div key={i} className="bg-gray-800 rounded-lg p-3">
                        <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
                        <p className="text-gray-400 text-xs">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-2">Véhicule</p>
                    <p className="text-white text-sm">{selectedDriver.vehicle.year} {selectedDriver.vehicle.make} {selectedDriver.vehicle.model}</p>
                    <p className="text-gray-400 text-xs">{selectedDriver.vehicle.color} · {selectedDriver.vehicle.plate} · {selectedDriver.vehicle.type}</p>
                  </div>
                </TabsContent>

                <TabsContent value="wallet" className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Solde', value: `$${selectedDriver.wallet.balance.toFixed(2)}`, color: 'text-green-400' },
                      { label: 'En attente', value: `$${selectedDriver.wallet.pendingPayout.toFixed(2)}`, color: 'text-yellow-400' },
                      { label: 'Total versé', value: `$${selectedDriver.wallet.totalPaidOut.toFixed(2)}`, color: 'text-blue-400' },
                    ].map((s, i) => (
                      <div key={i} className="bg-gray-800 rounded-lg p-3 text-center">
                        <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
                        <p className="text-gray-400 text-xs">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Aujourd'hui", value: `$${selectedDriver.stats.earningsToday.toFixed(2)}` },
                      { label: 'Cette semaine', value: `$${selectedDriver.stats.earningsThisWeek.toFixed(2)}` },
                      { label: 'Ce mois', value: `$${selectedDriver.stats.earningsThisMonth.toFixed(2)}` },
                    ].map((s, i) => (
                      <div key={i} className="bg-gray-800 rounded-lg p-3 text-center">
                        <p className="text-white text-sm font-bold">{s.value}</p>
                        <p className="text-gray-400 text-xs">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="rewards" className="space-y-4 mt-4">
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <Award className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
                    <p className="text-white text-xl font-bold">{selectedDriver.rewards.points} pts</p>
                    <p className="text-gray-400 text-sm">Niveau : {selectedDriver.rewards.level}</p>
                  </div>
                  {selectedDriver.rewards.badges.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs mb-2">Badges</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedDriver.rewards.badges.map((b, i) => (
                          <Badge key={i} className="bg-yellow-900 text-yellow-300 text-xs">{b}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="documents" className="space-y-3 mt-4">
                  {Object.entries(selectedDriver.documents).map(([key, status]) => {
                    const s = docStatusConfig[status] || docStatusConfig.pending;
                    const labels: Record<string, string> = {
                      license: 'Permis de conduire',
                      insurance: 'Assurance',
                      registration: 'Immatriculation',
                      criminal_check: 'Vérification criminelle',
                      profile_photo: 'Photo de profil',
                    };
                    return (
                      <div key={key} className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-white text-sm">{labels[key] || key}</span>
                        </div>
                        <div className={cn('flex items-center gap-1 text-xs', s.color)}>
                          {s.icon}<span>{s.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>

                <TabsContent value="actions" className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      className="bg-green-700 hover:bg-green-600 text-white"
                      onClick={() => handleStatusChange(selectedDriver, 'active')}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />Activer
                    </Button>
                    <Button
                      className="bg-yellow-700 hover:bg-yellow-600 text-white"
                      onClick={() => handleStatusChange(selectedDriver, 'standby')}
                    >
                      <Clock className="w-4 h-4 mr-2" />Standby
                    </Button>
                    <Button
                      className="bg-orange-700 hover:bg-orange-600 text-white"
                      onClick={() => handleStatusChange(selectedDriver, 'deactivated')}
                    >
                      <XCircle className="w-4 h-4 mr-2" />Désactiver
                    </Button>
                    <Button
                      className="bg-red-700 hover:bg-red-600 text-white"
                      onClick={() => handleStatusChange(selectedDriver, 'blocked')}
                    >
                      <Ban className="w-4 h-4 mr-2" />Bloquer
                    </Button>
                    <Button
                      className="bg-purple-700 hover:bg-purple-600 text-white"
                      onClick={() => handleStatusChange(selectedDriver, 'investigating')}
                    >
                      <Shield className="w-4 h-4 mr-2" />Enquête
                    </Button>
                    <Button
                      className="bg-blue-700 hover:bg-blue-600 text-white"
                      onClick={() => handleStatusChange(selectedDriver, 'confirmed')}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />Confirmer
                    </Button>
                  </div>
                  <div className="mt-4">
                    <p className="text-gray-400 text-xs mb-2">Changer le niveau</p>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(tierConfig).map(([k, v]) => (
                        <Button
                          key={k}
                          size="sm"
                          variant="outline"
                          className="border-gray-700 text-gray-300 hover:text-white text-xs"
                          onClick={() => handleTierChange(selectedDriver, k)}
                        >
                          {v.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
