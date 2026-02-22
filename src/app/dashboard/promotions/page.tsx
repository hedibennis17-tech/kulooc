'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tag, Plus, Trash2, Edit, CheckCircle, XCircle, Gift, Award, Percent, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Promo {
  id: string;
  code: string;
  type: string;
  value: number;
  description: string;
  target: string;
  usageLimit: number;
  usageCount: number;
  minRides: number;
  isActive: boolean;
  expiresAt: string;
  createdAt: any;
}

interface Bonus {
  id: string;
  title: string;
  type: string;
  value: number;
  condition: string;
  conditionValue: number;
  target: string;
  isActive: boolean;
  createdAt: any;
}

export default function PromotionsPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPromoDialog, setShowPromoDialog] = useState(false);
  const [showBonusDialog, setShowBonusDialog] = useState(false);
  const [promoForm, setPromoForm] = useState({ code: '', type: 'percent', value: 10, description: '', target: 'all', usageLimit: 100, minRides: 0, expiresAt: '' });
  const [bonusForm, setBonusForm] = useState({ title: '', type: 'cash', value: 10, condition: 'rides', conditionValue: 10, target: 'drivers' });
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [promoSnap, bonusSnap] = await Promise.all([
        getDocs(collection(db, 'promotions')),
        getDocs(collection(db, 'bonuses')),
      ]);
      setPromos(promoSnap.docs.map(d => ({ id: d.id, ...d.data() } as Promo)));
      setBonuses(bonusSnap.docs.map(d => ({ id: d.id, ...d.data() } as Bonus)));
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const createPromo = async () => {
    try {
      await addDoc(collection(db, 'promotions'), {
        ...promoForm,
        usageCount: 0,
        isActive: true,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Promotion créée', description: `Code : ${promoForm.code}` });
      setShowPromoDialog(false);
      setPromoForm({ code: '', type: 'percent', value: 10, description: '', target: 'all', usageLimit: 100, minRides: 0, expiresAt: '' });
      loadData();
    } catch (err) { toast({ title: 'Erreur', variant: 'destructive' }); }
  };

  const createBonus = async () => {
    try {
      await addDoc(collection(db, 'bonuses'), {
        ...bonusForm,
        isActive: true,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Bonus créé', description: bonusForm.title });
      setShowBonusDialog(false);
      setBonusForm({ title: '', type: 'cash', value: 10, condition: 'rides', conditionValue: 10, target: 'drivers' });
      loadData();
    } catch (err) { toast({ title: 'Erreur', variant: 'destructive' }); }
  };

  const togglePromo = async (promo: Promo) => {
    await updateDoc(doc(db, 'promotions', promo.id), { isActive: !promo.isActive });
    loadData();
  };

  const deletePromo = async (id: string) => {
    await deleteDoc(doc(db, 'promotions', id));
    loadData();
  };

  const toggleBonus = async (bonus: Bonus) => {
    await updateDoc(doc(db, 'bonuses', bonus.id), { isActive: !bonus.isActive });
    loadData();
  };

  const deleteBonus = async (id: string) => {
    await deleteDoc(doc(db, 'bonuses', id));
    loadData();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Promotions & Bonus</h1>
        <p className="text-gray-400 text-sm mt-1">Codes promo, réductions et programmes de bonus</p>
      </div>

      <Tabs defaultValue="promotions">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="promotions" className="text-sm">Codes Promo ({promos.length})</TabsTrigger>
          <TabsTrigger value="bonuses" className="text-sm">Bonus Chauffeurs ({bonuses.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="promotions" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-3">
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center min-w-[80px]">
                <p className="text-green-400 font-bold text-lg">{promos.filter(p => p.isActive).length}</p>
                <p className="text-gray-400 text-xs">Actifs</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center min-w-[80px]">
                <p className="text-gray-400 font-bold text-lg">{promos.filter(p => !p.isActive).length}</p>
                <p className="text-gray-400 text-xs">Inactifs</p>
              </div>
            </div>
            <Button className="bg-red-700 hover:bg-red-600 text-white" onClick={() => setShowPromoDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />Nouveau Code
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {promos.map(promo => (
              <Card key={promo.id} className={cn('bg-gray-900 border-gray-800', !promo.isActive && 'opacity-60')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-red-400" />
                      <span className="text-white font-bold font-mono text-lg">{promo.code}</span>
                    </div>
                    <Badge className={promo.isActive ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-400'}>
                      {promo.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  <p className="text-gray-400 text-xs mb-2">{promo.description}</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-gray-800 rounded p-2 text-center">
                      <p className="text-yellow-400 font-bold text-sm">
                        {promo.type === 'percent' ? `${promo.value}%` : `$${promo.value}`}
                      </p>
                      <p className="text-gray-500 text-xs">Réduction</p>
                    </div>
                    <div className="bg-gray-800 rounded p-2 text-center">
                      <p className="text-blue-400 font-bold text-sm">{promo.usageCount}/{promo.usageLimit}</p>
                      <p className="text-gray-500 text-xs">Utilisations</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 border-gray-700 text-gray-300 hover:text-white text-xs" onClick={() => togglePromo(promo)}>
                      {promo.isActive ? <XCircle className="w-3 h-3 mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                      {promo.isActive ? 'Désactiver' : 'Activer'}
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-900 text-red-400 hover:text-red-300 text-xs" onClick={() => deletePromo(promo.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {promos.length === 0 && !isLoading && (
              <p className="text-gray-500 col-span-3 text-center py-8">Aucun code promo. Créez-en un !</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="bonuses" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button className="bg-red-700 hover:bg-red-600 text-white" onClick={() => setShowBonusDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />Nouveau Bonus
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {bonuses.map(bonus => (
              <Card key={bonus.id} className={cn('bg-gray-900 border-gray-800', !bonus.isActive && 'opacity-60')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-yellow-400" />
                      <span className="text-white font-medium">{bonus.title}</span>
                    </div>
                    <Badge className={bonus.isActive ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-400'}>
                      {bonus.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-gray-800 rounded p-2 text-center">
                      <p className="text-green-400 font-bold text-sm">
                        {bonus.type === 'cash' ? `$${bonus.value}` : `${bonus.value} pts`}
                      </p>
                      <p className="text-gray-500 text-xs">Récompense</p>
                    </div>
                    <div className="bg-gray-800 rounded p-2 text-center">
                      <p className="text-blue-400 font-bold text-sm">{bonus.conditionValue}</p>
                      <p className="text-gray-500 text-xs">{bonus.condition === 'rides' ? 'Courses' : 'Condition'}</p>
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs mb-3">Cible : {bonus.target === 'drivers' ? 'Chauffeurs' : 'Tous'}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 border-gray-700 text-gray-300 hover:text-white text-xs" onClick={() => toggleBonus(bonus)}>
                      {bonus.isActive ? 'Désactiver' : 'Activer'}
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-900 text-red-400 hover:text-red-300 text-xs" onClick={() => deleteBonus(bonus.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {bonuses.length === 0 && !isLoading && (
              <p className="text-gray-500 col-span-3 text-center py-8">Aucun bonus configuré.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Promo Dialog */}
      <Dialog open={showPromoDialog} onOpenChange={setShowPromoDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Nouveau Code Promo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300 text-sm">Code</Label>
              <Input value={promoForm.code} onChange={e => setPromoForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="KULOOC20" className="bg-gray-800 border-gray-700 text-white mt-1 font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300 text-sm">Type</Label>
                <Select value={promoForm.type} onValueChange={v => setPromoForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="percent" className="text-white">Pourcentage (%)</SelectItem>
                    <SelectItem value="fixed" className="text-white">Montant fixe ($)</SelectItem>
                    <SelectItem value="free_ride" className="text-white">Course gratuite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Valeur</Label>
                <Input type="number" value={promoForm.value} onChange={e => setPromoForm(p => ({ ...p, value: Number(e.target.value) }))}
                  className="bg-gray-800 border-gray-700 text-white mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-gray-300 text-sm">Description</Label>
              <Input value={promoForm.description} onChange={e => setPromoForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Ex: 20% de rabais sur votre prochaine course" className="bg-gray-800 border-gray-700 text-white mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300 text-sm">Limite d'utilisation</Label>
                <Input type="number" value={promoForm.usageLimit} onChange={e => setPromoForm(p => ({ ...p, usageLimit: Number(e.target.value) }))}
                  className="bg-gray-800 border-gray-700 text-white mt-1" />
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Expiration</Label>
                <Input type="date" value={promoForm.expiresAt} onChange={e => setPromoForm(p => ({ ...p, expiresAt: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white mt-1" />
              </div>
            </div>
            <Button className="w-full bg-red-700 hover:bg-red-600 text-white" onClick={createPromo}>
              Créer le code promo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bonus Dialog */}
      <Dialog open={showBonusDialog} onOpenChange={setShowBonusDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Nouveau Bonus Chauffeur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300 text-sm">Titre du bonus</Label>
              <Input value={bonusForm.title} onChange={e => setBonusForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Ex: Bonus 10 courses" className="bg-gray-800 border-gray-700 text-white mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300 text-sm">Type de récompense</Label>
                <Select value={bonusForm.type} onValueChange={v => setBonusForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="cash" className="text-white">Argent ($)</SelectItem>
                    <SelectItem value="points" className="text-white">Points</SelectItem>
                    <SelectItem value="badge" className="text-white">Badge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Valeur</Label>
                <Input type="number" value={bonusForm.value} onChange={e => setBonusForm(p => ({ ...p, value: Number(e.target.value) }))}
                  className="bg-gray-800 border-gray-700 text-white mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300 text-sm">Condition</Label>
                <Select value={bonusForm.condition} onValueChange={v => setBonusForm(p => ({ ...p, condition: v }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="rides" className="text-white">Nombre de courses</SelectItem>
                    <SelectItem value="rating" className="text-white">Note minimale</SelectItem>
                    <SelectItem value="earnings" className="text-white">Revenus ($)</SelectItem>
                    <SelectItem value="acceptance" className="text-white">Taux d'acceptation (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Valeur condition</Label>
                <Input type="number" value={bonusForm.conditionValue} onChange={e => setBonusForm(p => ({ ...p, conditionValue: Number(e.target.value) }))}
                  className="bg-gray-800 border-gray-700 text-white mt-1" />
              </div>
            </div>
            <Button className="w-full bg-red-700 hover:bg-red-600 text-white" onClick={createBonus}>
              Créer le bonus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
