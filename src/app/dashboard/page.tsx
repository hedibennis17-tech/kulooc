'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/firebase';
import {
  collection, query, orderBy, limit, getDocs, onSnapshot,
  where, Timestamp
} from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Car, Users, CreditCard, TrendingUp, Clock, MapPin,
  AlertTriangle, CheckCircle, MessageCircle, Mail,
  Calendar, Activity, DollarSign, Star, ArrowUpRight,
  ArrowDownRight, RefreshCw, Send, FileText, Bell,
  Navigation, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCard {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  href?: string;
}

interface QuickRide {
  id: string;
  passenger: string;
  pickup: string;
  destination: string;
  status: string;
  amount: number;
  time: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalRides: 0,
    ridesToday: 0,
    ridesInProgress: 0,
    scheduledRides: 0,
    revenueToday: 0,
    totalRevenue: 0,
    activeDrivers: 0,
    totalDrivers: 0,
    totalClients: 0,
    pendingDocuments: 0,
  });
  const [recentRides, setRecentRides] = useState<QuickRide[]>([]);
  const [activeRides, setActiveRides] = useState<QuickRide[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [recentClients, setRecentClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // Listener temps réel pour les courses actives
    const unsubActive = onSnapshot(
      query(collection(db, 'active_rides'), limit(10)),
      (snap) => {
        const rides = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            passenger: data.passengerId || 'Passager',
            pickup: data.pickup?.address || 'N/A',
            destination: data.destination?.address || 'N/A',
            status: data.status || 'in_progress',
            amount: data.pricing?.total || 0,
            time: data.startedAt?.toDate?.()?.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }) || 'N/A',
          };
        });
        setActiveRides(rides);
      }
    );
    return () => unsubActive();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Chauffeurs
      const driversSnap = await getDocs(collection(db, 'drivers'));
      const totalDrivers = driversSnap.size;
      const activeDrivers = driversSnap.docs.filter(d => ['online', 'en-route', 'on-trip'].includes(d.data().status)).length;

      // Documents en attente
      const docsSnap = await getDocs(query(collection(db, 'driver_documents'), where('status', '==', 'pending')));
      const pendingDocuments = docsSnap.size;

      // Courses récentes
      const ridesSnap = await getDocs(query(collection(db, 'completed_rides'), orderBy('completedAt', 'desc'), limit(10)));
      const rides = ridesSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          passenger: data.passengerName || 'Passager',
          pickup: data.pickup?.address || 'N/A',
          destination: data.destination?.address || 'N/A',
          status: 'completed',
          amount: data.pricing?.total || 0,
          time: data.completedAt?.toDate?.()?.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }) || 'N/A',
        };
      });
      setRecentRides(rides);

      // Transactions récentes
      const txSnap = await getDocs(query(collection(db, 'completed_rides'), orderBy('completedAt', 'desc'), limit(10)));
      setRecentTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Utilisateurs récents
      const usersSnap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(10)));
      setRecentClients(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const totalRevenue = ridesSnap.docs.reduce((sum, d) => sum + (d.data().pricing?.total || 0), 0);

      setStats({
        totalRides: ridesSnap.size,
        ridesToday: rides.length,
        ridesInProgress: 0,
        scheduledRides: 0,
        revenueToday: totalRevenue,
        totalRevenue,
        activeDrivers,
        totalDrivers,
        totalClients: usersSnap.size,
        pendingDocuments,
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards: StatCard[] = [
    {
      label: 'Courses Aujourd\'hui',
      value: stats.ridesToday,
      change: 12,
      icon: <Car className="w-5 h-5" />,
      color: 'text-blue-400',
      href: '/dashboard/transactions',
    },
    {
      label: 'En Route',
      value: activeRides.length,
      icon: <Navigation className="w-5 h-5" />,
      color: 'text-green-400',
      href: '/dashboard/dispatch',
    },
    {
      label: 'Revenus Aujourd\'hui',
      value: `$${stats.revenueToday.toFixed(2)}`,
      change: 8,
      icon: <DollarSign className="w-5 h-5" />,
      color: 'text-yellow-400',
      href: '/dashboard/transactions',
    },
    {
      label: 'Chauffeurs Actifs',
      value: `${stats.activeDrivers} / ${stats.totalDrivers}`,
      icon: <Car className="w-5 h-5" />,
      color: 'text-purple-400',
      href: '/dashboard/drivers',
    },
    {
      label: 'Total Clients',
      value: stats.totalClients,
      change: 3,
      icon: <Users className="w-5 h-5" />,
      color: 'text-cyan-400',
      href: '/dashboard/clients',
    },
    {
      label: 'Documents en Attente',
      value: stats.pendingDocuments,
      icon: <FileText className="w-5 h-5" />,
      color: stats.pendingDocuments > 0 ? 'text-red-400' : 'text-gray-400',
      href: '/dashboard/documents',
    },
  ];

  const quickActions = [
    { label: 'Envoyer SMS', icon: <MessageCircle className="w-4 h-4" />, href: '/dashboard/sms', color: 'bg-green-600 hover:bg-green-700' },
    { label: 'Envoyer Email', icon: <Mail className="w-4 h-4" />, href: '/dashboard/messages', color: 'bg-blue-600 hover:bg-blue-700' },
    { label: 'Nouvelle Promo', icon: <Zap className="w-4 h-4" />, href: '/dashboard/promotions', color: 'bg-yellow-600 hover:bg-yellow-700' },
    { label: 'Voir Dispatch', icon: <Activity className="w-4 h-4" />, href: '/dashboard/dispatch', color: 'bg-purple-600 hover:bg-purple-700' },
    { label: 'Transactions', icon: <CreditCard className="w-4 h-4" />, href: '/dashboard/transactions', color: 'bg-red-600 hover:bg-red-700' },
    { label: 'Rapport', icon: <FileText className="w-4 h-4" />, href: '/dashboard/reports', color: 'bg-gray-600 hover:bg-gray-700' },
  ];

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      'completed': 'bg-green-900 text-green-300',
      'in-progress': 'bg-blue-900 text-blue-300',
      'in_progress': 'bg-blue-900 text-blue-300',
      'pending': 'bg-yellow-900 text-yellow-300',
      'offered': 'bg-orange-900 text-orange-300',
      'cancelled': 'bg-red-900 text-red-300',
      'driver-assigned': 'bg-purple-900 text-purple-300',
      'driver-arrived': 'bg-indigo-900 text-indigo-300',
    };
    return map[status] || 'bg-gray-800 text-gray-300';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      'completed': 'Terminee',
      'in-progress': 'En course',
      'in_progress': 'En course',
      'pending': 'En attente',
      'offered': 'Offerte',
      'cancelled': 'Annulee',
      'driver-assigned': 'En route',
      'driver-arrived': 'Sur place',
    };
    return map[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tableau de Bord</h1>
          <p className="text-gray-400 text-sm mt-1">Vue d'ensemble en temps réel — KULOOC</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-gray-700 text-gray-300 hover:text-white"
          onClick={loadDashboardData}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card, i) => (
          <Link key={i} href={card.href || '#'}>
            <Card className="bg-gray-900 border-gray-800 hover:border-gray-600 transition-all cursor-pointer">
              <CardContent className="p-4">
                <div className={cn('mb-2', card.color)}>{card.icon}</div>
                <p className="text-2xl font-bold text-white">{card.value}</p>
                <p className="text-gray-400 text-xs mt-1">{card.label}</p>
                {card.change !== undefined && (
                  <div className={cn('flex items-center gap-1 text-xs mt-1', card.change >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {card.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(card.change)}% vs hier
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Actions Rapides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, i) => (
              <Button key={i} asChild size="sm" className={cn('text-white', action.color)}>
                <Link href={action.href}>
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Courses en route */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
              <Navigation className="w-4 h-4 text-green-400" />
              Courses en Route
              <Badge className="bg-green-900 text-green-300 text-xs">{activeRides.length}</Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" asChild>
              <Link href="/dashboard/dispatch">Voir tout</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {activeRides.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Aucune course en route</p>
            ) : (
              <div className="space-y-2">
                {activeRides.slice(0, 5).map((ride) => (
                  <div key={ride.id} className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{ride.passenger}</p>
                      <p className="text-gray-400 text-xs truncate">{ride.pickup} → {ride.destination}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-green-400 text-xs font-medium">${ride.amount.toFixed(2)}</span>
                      <Badge className={cn('text-xs', getStatusBadge(ride.status))}>
                        {getStatusLabel(ride.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 10 Dernières Transactions */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-yellow-400" />
              10 Dernières Transactions
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" asChild>
              <Link href="/dashboard/transactions">Voir tout</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Aucune transaction</p>
            ) : (
              <div className="space-y-2">
                {recentTransactions.slice(0, 10).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{tx.passengerName || 'Passager'}</p>
                      <p className="text-gray-400 text-xs">{tx.completedAt?.toDate?.()?.toLocaleDateString('fr-CA') || 'N/A'}</p>
                    </div>
                    <span className="text-yellow-400 text-xs font-bold ml-2">${(tx.pricing?.total || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 10 Derniers Clients */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              10 Derniers Clients
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" asChild>
              <Link href="/dashboard/clients">Voir tout</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentClients.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Aucun client</p>
            ) : (
              <div className="space-y-2">
                {recentClients.slice(0, 10).map((client) => (
                  <div key={client.id} className="flex items-center gap-3 p-2 bg-gray-800 rounded-lg">
                    <div className="w-7 h-7 bg-cyan-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(client.name || client.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{client.name || 'Utilisateur'}</p>
                      <p className="text-gray-400 text-xs truncate">{client.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 10 Dernières Courses */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
              <Car className="w-4 h-4 text-blue-400" />
              10 Dernières Courses
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" asChild>
              <Link href="/dashboard/transactions">Voir tout</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentRides.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Aucune course</p>
            ) : (
              <div className="space-y-2">
                {recentRides.slice(0, 10).map((ride) => (
                  <div key={ride.id} className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{ride.passenger}</p>
                      <p className="text-gray-400 text-xs truncate">{ride.pickup} → {ride.destination}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-blue-400 text-xs">{ride.time}</span>
                      <span className="text-yellow-400 text-xs font-bold">${ride.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Babillard / Annonces */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-400" />
            Babillard — Annonces & Alertes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-blue-950 border border-blue-800 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-blue-400" />
                <span className="text-blue-300 text-xs font-semibold">Système</span>
              </div>
              <p className="text-white text-xs">Firestore initialisé avec succès. 7 collections actives.</p>
              <p className="text-blue-400 text-xs mt-1">Aujourd'hui</p>
            </div>
            <div className="p-3 bg-yellow-950 border border-yellow-800 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-300 text-xs font-semibold">Documents</span>
              </div>
              <p className="text-white text-xs">{stats.pendingDocuments} document(s) en attente d'approbation.</p>
              <p className="text-yellow-400 text-xs mt-1">
                <Link href="/dashboard/documents" className="underline">Voir les documents</Link>
              </p>
            </div>
            <div className="p-3 bg-green-950 border border-green-800 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-green-400" />
                <span className="text-green-300 text-xs font-semibold">Dispatch</span>
              </div>
              <p className="text-white text-xs">{activeRides.length} course(s) en route. Système opérationnel.</p>
              <p className="text-green-400 text-xs mt-1">
                <Link href="/dashboard/dispatch" className="underline">Voir le dispatch</Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
