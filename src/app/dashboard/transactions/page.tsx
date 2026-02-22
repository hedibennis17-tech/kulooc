'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  CreditCard, Search, Download, Filter, RefreshCw,
  DollarSign, TrendingUp, CheckCircle, XCircle, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  passengerName: string;
  driverName: string;
  pickup: string;
  destination: string;
  amount: number;
  tax: number;
  total: number;
  status: string;
  paymentMethod: string;
  distance: number;
  duration: number;
  completedAt: any;
  surgeMultiplier: number;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filtered, setFiltered] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, today: 0, revenue: 0, avgAmount: 0 });

  useEffect(() => { loadTransactions(); }, []);

  useEffect(() => {
    let result = transactions;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(t =>
        t.passengerName?.toLowerCase().includes(s) ||
        t.driverName?.toLowerCase().includes(s) ||
        t.pickup?.toLowerCase().includes(s) ||
        t.destination?.toLowerCase().includes(s) ||
        t.id.includes(s)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(t => t.status === statusFilter);
    }
    setFiltered(result);
  }, [search, statusFilter, transactions]);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'completed_rides'), orderBy('completedAt', 'desc'), limit(200)));
      const txs: Transaction[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          passengerName: data.passengerName || 'Passager inconnu',
          driverName: data.driverName || 'Chauffeur inconnu',
          pickup: data.pickup?.address || 'N/A',
          destination: data.destination?.address || 'N/A',
          amount: data.pricing?.base || 0,
          tax: data.pricing?.tax || 0,
          total: data.pricing?.total || 0,
          status: data.status || 'completed',
          paymentMethod: data.paymentMethod || 'Carte',
          distance: data.distance || 0,
          duration: data.duration || 0,
          completedAt: data.completedAt,
          surgeMultiplier: data.pricing?.surgeMultiplier || 1,
        };
      });
      setTransactions(txs);
      setFiltered(txs);
      const revenue = txs.reduce((s, t) => s + t.total, 0);
      const today = txs.filter(t => {
        const d = t.completedAt?.toDate?.();
        if (!d) return false;
        const now = new Date();
        return d.toDateString() === now.toDateString();
      }).length;
      setStats({ total: txs.length, today, revenue, avgAmount: txs.length ? revenue / txs.length : 0 });
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const exportCSV = () => {
    const headers = ['ID', 'Passager', 'Chauffeur', 'Départ', 'Destination', 'Montant', 'Taxes', 'Total', 'Statut', 'Paiement', 'Date'];
    const rows = filtered.map(t => [
      t.id, t.passengerName, t.driverName, t.pickup, t.destination,
      t.amount.toFixed(2), t.tax.toFixed(2), t.total.toFixed(2),
      t.status, t.paymentMethod,
      t.completedAt?.toDate?.()?.toLocaleDateString('fr-CA') || 'N/A'
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'transactions-kulooc.csv'; a.click();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      completed: 'bg-green-900 text-green-300',
      pending: 'bg-yellow-900 text-yellow-300',
      refunded: 'bg-blue-900 text-blue-300',
      failed: 'bg-red-900 text-red-300',
      cancelled: 'bg-gray-800 text-gray-300',
    };
    return map[status] || 'bg-gray-800 text-gray-300';
  };

  const statusLabel: Record<string, string> = {
    completed: 'Complété', pending: 'En attente', refunded: 'Remboursé', failed: 'Échoué', cancelled: 'Annulé'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-gray-400 text-sm mt-1">Historique complet des paiements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:text-white" onClick={loadTransactions}>
            <RefreshCw className="w-4 h-4 mr-2" />Actualiser
          </Button>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />Export CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Transactions', value: stats.total, icon: <CreditCard className="w-4 h-4" />, color: 'text-blue-400' },
          { label: 'Aujourd\'hui', value: stats.today, icon: <Clock className="w-4 h-4" />, color: 'text-green-400' },
          { label: 'Revenus Totaux', value: `$${stats.revenue.toFixed(2)}`, icon: <DollarSign className="w-4 h-4" />, color: 'text-yellow-400' },
          { label: 'Montant Moyen', value: `$${stats.avgAmount.toFixed(2)}`, icon: <TrendingUp className="w-4 h-4" />, color: 'text-purple-400' },
        ].map((s, i) => (
          <Card key={i} className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className={cn('mb-1', s.color)}>{s.icon}</div>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-gray-400 text-xs">{s.label}</p>
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
                placeholder="Rechercher par passager, chauffeur, adresse..."
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
                <SelectItem value="completed" className="text-white">Complété</SelectItem>
                <SelectItem value="pending" className="text-white">En attente</SelectItem>
                <SelectItem value="refunded" className="text-white">Remboursé</SelectItem>
                <SelectItem value="failed" className="text-white">Échoué</SelectItem>
                <SelectItem value="cancelled" className="text-white">Annulé</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-gray-400 text-sm self-center">{filtered.length} résultats</p>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-400 font-medium p-4">ID</th>
                  <th className="text-left text-gray-400 font-medium p-4">Passager</th>
                  <th className="text-left text-gray-400 font-medium p-4">Chauffeur</th>
                  <th className="text-left text-gray-400 font-medium p-4">Trajet</th>
                  <th className="text-right text-gray-400 font-medium p-4">Montant</th>
                  <th className="text-right text-gray-400 font-medium p-4">Taxes</th>
                  <th className="text-right text-gray-400 font-medium p-4">Total</th>
                  <th className="text-left text-gray-400 font-medium p-4">Paiement</th>
                  <th className="text-left text-gray-400 font-medium p-4">Statut</th>
                  <th className="text-left text-gray-400 font-medium p-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={10} className="text-center text-gray-500 py-8">Chargement...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center text-gray-500 py-8">Aucune transaction trouvée</td></tr>
                ) : (
                  filtered.map(tx => (
                    <tr key={tx.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="p-4 text-gray-400 text-xs font-mono">{tx.id.slice(0, 8)}...</td>
                      <td className="p-4 text-white font-medium">{tx.passengerName}</td>
                      <td className="p-4 text-gray-300">{tx.driverName}</td>
                      <td className="p-4">
                        <p className="text-white text-xs truncate max-w-[150px]">{tx.pickup}</p>
                        <p className="text-gray-400 text-xs truncate max-w-[150px]">→ {tx.destination}</p>
                      </td>
                      <td className="p-4 text-right text-gray-300">${tx.amount.toFixed(2)}</td>
                      <td className="p-4 text-right text-gray-400">${tx.tax.toFixed(2)}</td>
                      <td className="p-4 text-right text-yellow-400 font-bold">${tx.total.toFixed(2)}</td>
                      <td className="p-4 text-gray-300">{tx.paymentMethod}</td>
                      <td className="p-4">
                        <Badge className={cn('text-xs', statusBadge(tx.status))}>
                          {statusLabel[tx.status] || tx.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-gray-400 text-xs">
                        {tx.completedAt?.toDate?.()?.toLocaleDateString('fr-CA') || 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
