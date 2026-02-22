'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Users, Search, RefreshCw, Crown, Star, Shield,
  Ban, CheckCircle, MessageCircle, Mail, Phone,
  TrendingUp, DollarSign, Car
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: string;
  totalRides: number;
  totalSpent: number;
  rating: number;
  isBlocked: boolean;
  createdAt: any;
  lastRide: any;
  photoURL?: string;
}

const tierConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  premium: { label: 'Premium', color: 'bg-purple-900 text-purple-300', icon: <Crown className="w-3 h-3" /> },
  gold: { label: 'Gold', color: 'bg-yellow-900 text-yellow-300', icon: <Star className="w-3 h-3" /> },
  subscription: { label: 'Abonnement', color: 'bg-blue-900 text-blue-300', icon: <Shield className="w-3 h-3" /> },
  regular: { label: 'Régulier', color: 'bg-gray-800 text-gray-300', icon: null },
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filtered, setFiltered] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const { toast } = useToast();

  useEffect(() => { loadClients(); }, []);

  useEffect(() => {
    let result = clients;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(c =>
        c.name?.toLowerCase().includes(s) ||
        c.email?.toLowerCase().includes(s) ||
        c.phone?.includes(s)
      );
    }
    if (tierFilter !== 'all') result = result.filter(c => c.tier === tierFilter);
    setFiltered(result);
  }, [search, tierFilter, clients]);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(200)));
      const list: Client[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.displayName || data.name || 'Utilisateur',
          email: data.email || '',
          phone: data.phoneNumber || data.phone || '',
          tier: data.tier || 'regular',
          totalRides: data.totalRides || 0,
          totalSpent: data.totalSpent || 0,
          rating: data.rating || 5,
          isBlocked: data.isBlocked || false,
          createdAt: data.createdAt,
          lastRide: data.lastRide,
          photoURL: data.photoURL,
        };
      });
      setClients(list);
      setFiltered(list);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const handleBlock = async (client: Client) => {
    try {
      await updateDoc(doc(db, 'users', client.id), { isBlocked: !client.isBlocked });
      toast({ title: client.isBlocked ? 'Client débloqué' : 'Client bloqué', description: client.name });
      loadClients();
    } catch (err) { toast({ title: 'Erreur', variant: 'destructive' }); }
  };

  const handleUpgradeTier = async (client: Client, tier: string) => {
    try {
      await updateDoc(doc(db, 'users', client.id), { tier });
      toast({ title: 'Niveau mis à jour', description: `${client.name} → ${tierConfig[tier]?.label}` });
      loadClients();
    } catch (err) { toast({ title: 'Erreur', variant: 'destructive' }); }
  };

  const stats = {
    total: clients.length,
    premium: clients.filter(c => c.tier === 'premium').length,
    gold: clients.filter(c => c.tier === 'gold').length,
    subscription: clients.filter(c => c.tier === 'subscription').length,
    blocked: clients.filter(c => c.isBlocked).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-gray-400 text-sm mt-1">Gestion des passagers KULOOC</p>
        </div>
        <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:text-white" onClick={loadClients}>
          <RefreshCw className="w-4 h-4 mr-2" />Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Premium', value: stats.premium, color: 'text-purple-400' },
          { label: 'Gold', value: stats.gold, color: 'text-yellow-400' },
          { label: 'Abonnement', value: stats.subscription, color: 'text-blue-400' },
          { label: 'Bloqués', value: stats.blocked, color: 'text-red-400' },
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
                placeholder="Rechercher par nom, email, téléphone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Niveau" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all" className="text-white">Tous</SelectItem>
                <SelectItem value="premium" className="text-white">Premium</SelectItem>
                <SelectItem value="gold" className="text-white">Gold</SelectItem>
                <SelectItem value="subscription" className="text-white">Abonnement</SelectItem>
                <SelectItem value="regular" className="text-white">Régulier</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-gray-400 text-sm self-center">{filtered.length} clients</p>
          </div>
        </CardContent>
      </Card>

      {/* Client List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <p className="text-gray-500 col-span-3 text-center py-8">Chargement...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 col-span-3 text-center py-8">Aucun client trouvé</p>
        ) : (
          filtered.map(client => {
            const tier = tierConfig[client.tier] || tierConfig.regular;
            return (
              <Card key={client.id} className={cn('bg-gray-900 border-gray-800 hover:border-gray-600 transition-all', client.isBlocked && 'opacity-60 border-red-900')}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={client.photoURL} />
                      <AvatarFallback className="bg-cyan-700 text-white text-sm">
                        {client.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-medium text-sm truncate">{client.name}</p>
                        <Badge className={cn('text-xs flex items-center gap-1', tier.color)}>
                          {tier.icon}{tier.label}
                        </Badge>
                        {client.isBlocked && <Badge className="bg-red-900 text-red-300 text-xs">Bloqué</Badge>}
                      </div>
                      <p className="text-gray-400 text-xs truncate mt-0.5">{client.email}</p>
                      {client.phone && <p className="text-gray-400 text-xs">{client.phone}</p>}

                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Car className="w-3 h-3" />{client.totalRides} courses
                        </div>
                        <div className="flex items-center gap-1 text-xs text-yellow-400">
                          <DollarSign className="w-3 h-3" />${client.totalSpent.toFixed(2)}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-green-400">
                          <Star className="w-3 h-3" />{client.rating.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn('text-xs border-gray-700 flex-1', client.isBlocked ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300')}
                      onClick={() => handleBlock(client)}
                    >
                      {client.isBlocked ? <><CheckCircle className="w-3 h-3 mr-1" />Débloquer</> : <><Ban className="w-3 h-3 mr-1" />Bloquer</>}
                    </Button>
                    <Select onValueChange={(tier) => handleUpgradeTier(client, tier)}>
                      <SelectTrigger className="flex-1 h-8 text-xs bg-gray-800 border-gray-700 text-gray-300">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        <SelectValue placeholder="Niveau" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="regular" className="text-white text-xs">Régulier</SelectItem>
                        <SelectItem value="gold" className="text-white text-xs">Gold</SelectItem>
                        <SelectItem value="premium" className="text-white text-xs">Premium</SelectItem>
                        <SelectItem value="subscription" className="text-white text-xs">Abonnement</SelectItem>
                      </SelectContent>
                    </Select>
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
