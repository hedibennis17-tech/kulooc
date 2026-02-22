'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, DollarSign, Car, Users, Download, RefreshCw, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4'];

export default function ReportsPage() {
  const [period, setPeriod] = useState('7d');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0, totalRides: 0, totalDrivers: 0, totalClients: 0,
    avgRating: 0, avgRideValue: 0,
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [ridesData, setRidesData] = useState<any[]>([]);
  const [serviceData, setServiceData] = useState<any[]>([]);
  const [zoneData, setZoneData] = useState<any[]>([]);
  const [driverPerf, setDriverPerf] = useState<any[]>([]);

  useEffect(() => { loadReports(); }, [period]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const [ridesSnap, driversSnap, usersSnap] = await Promise.all([
        getDocs(query(collection(db, 'completed_rides'), orderBy('completedAt', 'desc'), limit(500))),
        getDocs(collection(db, 'drivers')),
        getDocs(collection(db, 'users')),
      ]);

      const rides = ridesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const drivers = driversSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Stats globales
      const totalRevenue = rides.reduce((s: number, r: any) => s + (r.pricing?.total || 0), 0);
      const avgRating = drivers.length ? drivers.reduce((s: number, d: any) => s + (d.stats?.rating || 5), 0) / drivers.length : 5;
      setStats({
        totalRevenue,
        totalRides: rides.length,
        totalDrivers: drivers.length,
        totalClients: users.length,
        avgRating,
        avgRideValue: rides.length ? totalRevenue / rides.length : 0,
      });

      // Données par jour (7 derniers jours)
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const dailyMap: Record<string, { revenue: number; rides: number }> = {};
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' });
        dailyMap[key] = { revenue: 0, rides: 0 };
      }
      rides.forEach((r: any) => {
        const d = r.completedAt?.toDate?.();
        if (!d) return;
        const key = d.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' });
        if (dailyMap[key]) {
          dailyMap[key].revenue += r.pricing?.total || 0;
          dailyMap[key].rides += 1;
        }
      });
      const dailyArr = Object.entries(dailyMap).map(([date, v]) => ({ date, ...v, revenue: Number(v.revenue.toFixed(2)) }));
      setRevenueData(dailyArr);
      setRidesData(dailyArr);

      // Par type de service
      const serviceMap: Record<string, number> = {};
      rides.forEach((r: any) => {
        const t = r.serviceType || 'Standard';
        serviceMap[t] = (serviceMap[t] || 0) + 1;
      });
      setServiceData(Object.entries(serviceMap).map(([name, value]) => ({ name, value })));

      // Par zone
      const zoneMap: Record<string, number> = {};
      rides.forEach((r: any) => {
        const z = r.pickup?.zone || 'Autre';
        zoneMap[z] = (zoneMap[z] || 0) + 1;
      });
      setZoneData(Object.entries(zoneMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6));

      // Performance chauffeurs (top 5)
      const driverMap: Record<string, { name: string; rides: number; revenue: number; rating: number }> = {};
      drivers.forEach((d: any) => {
        driverMap[d.id] = { name: d.name, rides: d.stats?.totalRides || 0, revenue: d.stats?.totalEarnings || 0, rating: d.stats?.rating || 5 };
      });
      setDriverPerf(Object.values(driverMap).sort((a, b) => b.rides - a.rides).slice(0, 5));

    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const exportReport = () => {
    const data = {
      generatedAt: new Date().toISOString(),
      period,
      stats,
      revenueData,
      serviceData,
      zoneData,
      driverPerf,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `rapport-kulooc-${period}.json`; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Rapports</h1>
          <p className="text-gray-400 text-sm mt-1">Statistiques et analyses opérationnelles</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="7d" className="text-white">7 jours</SelectItem>
              <SelectItem value="30d" className="text-white">30 jours</SelectItem>
              <SelectItem value="90d" className="text-white">90 jours</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:text-white" onClick={loadReports}>
            <RefreshCw className="w-4 h-4 mr-2" />
          </Button>
          <Button size="sm" className="bg-green-700 hover:bg-green-600 text-white" onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" />Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Revenus', value: `$${stats.totalRevenue.toFixed(0)}`, color: 'text-green-400', icon: <DollarSign className="w-4 h-4" /> },
          { label: 'Courses', value: stats.totalRides, color: 'text-blue-400', icon: <Car className="w-4 h-4" /> },
          { label: 'Chauffeurs', value: stats.totalDrivers, color: 'text-yellow-400', icon: <Users className="w-4 h-4" /> },
          { label: 'Clients', value: stats.totalClients, color: 'text-purple-400', icon: <Users className="w-4 h-4" /> },
          { label: 'Note Moy.', value: `${stats.avgRating.toFixed(1)}★`, color: 'text-yellow-400', icon: <TrendingUp className="w-4 h-4" /> },
          { label: 'Val. Moy.', value: `$${stats.avgRideValue.toFixed(2)}`, color: 'text-cyan-400', icon: <BarChart2 className="w-4 h-4" /> },
        ].map((s, i) => (
          <Card key={i} className="bg-gray-900 border-gray-800">
            <CardContent className="p-3">
              <div className={cn('mb-1', s.color)}>{s.icon}</div>
              <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
              <p className="text-gray-400 text-xs">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="revenue">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="revenue" className="text-sm">Revenus</TabsTrigger>
          <TabsTrigger value="rides" className="text-sm">Courses</TabsTrigger>
          <TabsTrigger value="distribution" className="text-sm">Distribution</TabsTrigger>
          <TabsTrigger value="drivers" className="text-sm">Chauffeurs</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="mt-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Revenus quotidiens ($)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="revenue" fill="#ef4444" radius={[4, 4, 0, 0]} name="Revenus ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rides" className="mt-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Nombre de courses par jour</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={ridesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                  <Line type="monotone" dataKey="rides" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} name="Courses" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Par type de service</CardTitle>
              </CardHeader>
              <CardContent>
                {serviceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={serviceData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {serviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8 text-sm">Aucune donnée disponible</p>
                )}
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Par zone (Top 6)</CardTitle>
              </CardHeader>
              <CardContent>
                {zoneData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={zoneData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} width={80} />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                      <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} name="Courses" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8 text-sm">Aucune donnée disponible</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="drivers" className="mt-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Top 5 Chauffeurs</CardTitle>
            </CardHeader>
            <CardContent>
              {driverPerf.length > 0 ? (
                <div className="space-y-3">
                  {driverPerf.map((d, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
                      <span className="text-gray-400 text-sm font-bold w-5">#{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{d.name}</p>
                        <p className="text-gray-400 text-xs">{d.rides} courses · ${d.revenue.toFixed(2)} · ★{d.rating.toFixed(1)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 text-sm font-bold">${d.revenue.toFixed(0)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8 text-sm">Aucune donnée disponible</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
