'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, TrendingUp, Users, DollarSign } from 'lucide-react';

export default function BonusPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Bonus</h1>
        <p className="text-gray-400 mt-2">Gestion des bonus et récompenses pour les chauffeurs</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Bonus</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">$12,450</div>
            <p className="text-xs text-gray-500 mt-1">+20.1% ce mois</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Chauffeurs Actifs</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">145</div>
            <p className="text-xs text-gray-500 mt-1">+12 cette semaine</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Bonus Moyens</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">$86</div>
            <p className="text-xs text-gray-500 mt-1">Par chauffeur</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Bonus Distribués</CardTitle>
            <Gift className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">328</div>
            <p className="text-xs text-gray-500 mt-1">Ce mois</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Programmes de Bonus</CardTitle>
          <CardDescription className="text-gray-400">
            Gérez les différents programmes de bonus pour vos chauffeurs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-gray-400 text-center py-8">
            <Gift className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p>Fonctionnalité en développement</p>
            <p className="text-sm mt-2">Les programmes de bonus seront bientôt disponibles</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
