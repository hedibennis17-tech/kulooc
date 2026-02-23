'use client';

import React, { useState } from 'react';
import { useUser } from '@/firebase/provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Wallet, CreditCard, Plus, DollarSign, Gift,
  ChevronRight, Shield, Smartphone, Building
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const PAYMENT_METHODS = [
  { id: 'visa', label: 'Visa •••• 4242', icon: <CreditCard className="w-5 h-5" />, type: 'card', isDefault: true },
  { id: 'apple', label: 'Apple Pay', icon: <Smartphone className="w-5 h-5" />, type: 'digital' },
  { id: 'paypal', label: 'PayPal', icon: <Building className="w-5 h-5" />, type: 'digital' },
];

export default function ClientWalletPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [balance] = useState(25.00);
  const [promoCode, setPromoCode] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('visa');

  const handleAddPromo = () => {
    if (!promoCode.trim()) return;
    toast({ title: 'Code promo appliqué !', description: `Code "${promoCode}" — 10$ de crédit ajouté.` });
    setPromoCode('');
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Portefeuille</h1>

      {/* Solde KULOOC Cash */}
      <Card className="bg-black text-white border-0 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-600 rounded-full -translate-y-8 translate-x-8 opacity-30" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-800 rounded-full translate-y-8 -translate-x-8 opacity-20" />
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-5 h-5 text-red-400" />
            <span className="text-gray-400 text-sm">KULOOC Cash</span>
          </div>
          <p className="text-4xl font-bold">${balance.toFixed(2)}</p>
          <p className="text-gray-400 text-xs mt-1">Crédit disponible</p>
          <Button className="mt-4 bg-red-600 hover:bg-red-700 text-white text-sm h-9">
            <Plus className="w-4 h-4 mr-1" />
            Ajouter des fonds
          </Button>
        </CardContent>
      </Card>

      {/* Méthodes de paiement */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Méthodes de paiement</h2>
        <div className="space-y-2">
          {PAYMENT_METHODS.map(method => (
            <button
              key={method.id}
              onClick={() => setSelectedMethod(method.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                selectedMethod === method.id ? 'border-black bg-gray-50' : 'border-gray-100 bg-white'
              )}
            >
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600">
                {method.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{method.label}</p>
                {method.isDefault && (
                  <Badge className="bg-green-100 text-green-700 text-xs mt-0.5">Par défaut</Badge>
                )}
              </div>
              {selectedMethod === method.id && (
                <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </button>
          ))}

          <button className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-all">
            <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm">Ajouter une méthode de paiement</span>
          </button>
        </div>
      </div>

      {/* Code promo */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Code promotionnel</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Entrez votre code"
              value={promoCode}
              onChange={e => setPromoCode(e.target.value.toUpperCase())}
              className="pl-9 border-gray-200 uppercase"
              onKeyDown={e => e.key === 'Enter' && handleAddPromo()}
            />
          </div>
          <Button
            onClick={handleAddPromo}
            disabled={!promoCode.trim()}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Appliquer
          </Button>
        </div>
      </div>

      {/* Sécurité */}
      <Card className="bg-gray-50 border-0">
        <CardContent className="p-4 flex items-center gap-3">
          <Shield className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900">Paiements sécurisés</p>
            <p className="text-xs text-gray-400">Vos informations sont protégées par chiffrement SSL</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
