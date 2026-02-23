'use client';
import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CreditCard, ChevronRight, Plus, Wallet } from 'lucide-react';

type Tab = 'transactions' | 'retrait';

const transactions = [
  { id: '1', type: 'credit', label: 'Paiement hebdomadaire', date: 'Aujourd\'hui, 09h00', amount: 611.70 },
  { id: '2', type: 'credit', label: 'Bonus défi hebdomadaire', date: 'Hier, 23h59', amount: 75.00 },
  { id: '3', type: 'debit', label: 'Retrait vers Interac', date: 'Lun 18 fév, 10h30', amount: -500.00 },
  { id: '4', type: 'credit', label: 'Bonus heure de pointe', date: 'Ven 14 fév, 19h00', amount: 12.50 },
  { id: '5', type: 'credit', label: 'Paiement hebdomadaire', date: 'Lun 11 fév, 09h00', amount: 548.30 },
  { id: '6', type: 'debit', label: 'Retrait vers Interac', date: 'Lun 4 fév, 10h30', amount: -600.00 },
];

const paymentMethods = [
  { id: '1', type: 'interac', label: 'Interac e-Transfer', detail: 'hedibennis17@gmail.com', default: true },
  { id: '2', type: 'bank', label: 'Compte bancaire', detail: '****4521 · Banque Nationale', default: false },
];

export default function WalletPage() {
  const [tab, setTab] = useState<Tab>('transactions');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec solde */}
      <div className="bg-black px-4 pt-12 pb-8 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="h-5 w-5 text-red-400" />
          <span className="text-gray-400 text-sm">Portefeuille KULOOC</span>
        </div>
        <p className="text-5xl font-black">247.50 $</p>
        <p className="text-gray-400 text-sm mt-1">Solde disponible</p>

        <div className="flex gap-3 mt-6">
          <button className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Retirer
          </button>
          <button className="flex-1 bg-white/10 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
            <ArrowDownLeft className="h-4 w-4" />
            Historique
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-white border-b border-gray-100 flex">
        {(['transactions', 'retrait'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-4 text-sm font-bold relative ${tab === t ? 'text-black' : 'text-gray-400'}`}
          >
            {t === 'transactions' ? 'Transactions' : 'Retrait'}
            {tab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {tab === 'transactions' ? (
          <div className="space-y-2">
            {transactions.map(tx => (
              <div key={tx.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === 'credit' ? 'bg-green-100' : 'bg-red-100'}`}>
                  {tx.type === 'credit' ? (
                    <ArrowDownLeft className="h-5 w-5 text-green-600" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-black">{tx.label}</p>
                  <p className="text-xs text-gray-400">{tx.date}</p>
                </div>
                <p className={`font-black text-base ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'credit' ? '+' : ''}{tx.amount.toFixed(2)} $
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Montant retrait */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-black text-lg mb-4">Montant à retirer</h3>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-400">$</span>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-4 text-2xl font-black border-2 border-gray-200 rounded-xl focus:border-black outline-none"
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">Solde disponible : 247.50 $</p>
              {/* Montants rapides */}
              <div className="flex gap-2 mt-3">
                {[50, 100, 200, 247.50].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setWithdrawAmount(String(amt))}
                    className="flex-1 py-2 rounded-xl bg-gray-100 text-sm font-bold text-gray-700"
                  >
                    {amt} $
                  </button>
                ))}
              </div>
            </div>

            {/* Méthodes de paiement */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-2">Méthode de retrait</p>
              {paymentMethods.map((method, idx) => (
                <div
                  key={method.id}
                  className={`flex items-center gap-3 px-4 py-3.5 ${idx < paymentMethods.length - 1 ? 'border-b border-gray-50' : ''}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{method.label}</p>
                    <p className="text-xs text-gray-400">{method.detail}</p>
                  </div>
                  {method.default ? (
                    <span className="text-xs bg-black text-white font-bold px-2 py-0.5 rounded-full">Par défaut</span>
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  )}
                </div>
              ))}
              <button className="w-full flex items-center gap-3 px-4 py-3.5 text-red-600 border-t border-gray-50">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-red-600" />
                </div>
                <span className="font-semibold text-sm">Ajouter une méthode</span>
              </button>
            </div>

            <button className="w-full py-4 rounded-full bg-red-600 text-white font-bold text-lg shadow-lg">
              Retirer {withdrawAmount ? `${parseFloat(withdrawAmount).toFixed(2)} $` : ''}
            </button>

            <p className="text-center text-xs text-gray-400">Les retraits sont traités en 1-2 jours ouvrables</p>
          </div>
        )}
      </div>
    </div>
  );
}
