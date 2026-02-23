'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { User, Star, Car, Crown, Shield } from 'lucide-react';
import type { ConnectedClient } from '@/lib/realtime/realtime-service';

interface ClientsPanelProps {
  clients: ConnectedClient[];
  activeRideClientIds?: string[];
  onClientSelect?: (client: ConnectedClient) => void;
}

const tierConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  premium: { label: 'Premium', color: 'bg-purple-100 text-purple-700', icon: <Crown className="w-3 h-3" /> },
  gold:    { label: 'Gold',    color: 'bg-yellow-100 text-yellow-700', icon: <Star className="w-3 h-3" /> },
  subscription: { label: 'Abonnement', color: 'bg-blue-100 text-blue-700', icon: <Shield className="w-3 h-3" /> },
  regular: { label: 'Régulier', color: 'bg-gray-100 text-gray-600', icon: null },
};

function timeAgo(ts: any): string {
  if (!ts) return 'Jamais';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'À l\'instant';
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return `Il y a ${Math.floor(diff / 86400)} j`;
}

export function ClientsPanel({ clients, activeRideClientIds = [], onClientSelect }: ClientsPanelProps) {
  const [search, setSearch] = useState('');
  const [filterOnline, setFilterOnline] = useState<'all' | 'online' | 'riding'>('all');

  const filtered = clients.filter((c) => {
    const matchSearch =
      (c.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.phoneNumber || '').includes(search);

    const isRiding = activeRideClientIds.includes(c.uid);
    const matchFilter =
      filterOnline === 'all' ||
      (filterOnline === 'online' && c.isOnline) ||
      (filterOnline === 'riding' && isRiding);

    return matchSearch && matchFilter;
  });

  const onlineCount = clients.filter((c) => c.isOnline).length;
  const ridingCount = activeRideClientIds.length;

  return (
    <Card className="flex flex-col h-full border-0 shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <User className="w-4 h-4" />
          Clients
          <span className="ml-auto text-xs text-muted-foreground font-normal">
            {clients.length} total
          </span>
        </CardTitle>

        {/* Filtres */}
        <div className="flex gap-1 flex-wrap mt-2">
          <button
            onClick={() => setFilterOnline('all')}
            className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
              filterOnline === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border hover:bg-muted'
            }`}
          >
            Tous ({clients.length})
          </button>
          <button
            onClick={() => setFilterOnline('online')}
            className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
              filterOnline === 'online'
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-background border-border hover:bg-muted'
            }`}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />
            En ligne ({onlineCount})
          </button>
          <button
            onClick={() => setFilterOnline('riding')}
            className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
              filterOnline === 'riding'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-background border-border hover:bg-muted'
            }`}
          >
            <Car className="w-3 h-3 inline mr-1" />
            En course ({ridingCount})
          </button>
        </div>

        <Input
          placeholder="Rechercher un client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-2 h-7 text-xs"
        />
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Aucun client trouvé</p>
              <p className="text-xs mt-1 opacity-60">
                Les clients apparaissent ici dès qu'ils s'inscrivent
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((client) => {
                const tier = tierConfig[client.tier || 'regular'] || tierConfig.regular;
                const isRiding = activeRideClientIds.includes(client.uid);
                const initial = (client.displayName || client.email || 'U').charAt(0).toUpperCase();

                return (
                  <div
                    key={client.id}
                    className="p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => onClientSelect?.(client)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar avec indicateur de statut */}
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 text-sm font-bold">
                          {client.photoURL ? (
                            <img
                              src={client.photoURL}
                              alt={client.displayName}
                              className="w-9 h-9 rounded-full object-cover"
                            />
                          ) : (
                            initial
                          )}
                        </div>
                        {/* Badge statut */}
                        {isRiding ? (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                            <Car className="w-2 h-2 text-white" />
                          </div>
                        ) : client.isOnline ? (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                        ) : (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gray-300 rounded-full border-2 border-white" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-sm font-medium truncate">
                            {client.displayName || 'Utilisateur'}
                          </span>
                          {/* Badge tier */}
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 flex items-center gap-0.5 ${tier.color}`}>
                            {tier.icon}
                            {tier.label}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {client.email}
                        </p>

                        <div className="flex items-center gap-3 mt-1">
                          {/* Note */}
                          <span className="text-xs text-amber-500 flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-current" />
                            {(client.rating || 5).toFixed(1)}
                          </span>
                          {/* Courses */}
                          <span className="text-xs text-muted-foreground">
                            {client.totalRides || 0} course{(client.totalRides || 0) > 1 ? 's' : ''}
                          </span>
                          {/* Dernière activité */}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {timeAgo(client.lastSeen)}
                          </span>
                        </div>

                        {/* Badge en course */}
                        {isRiding && (
                          <div className="mt-1 text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
                            <Car className="w-3 h-3" />
                            En course actuellement
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
