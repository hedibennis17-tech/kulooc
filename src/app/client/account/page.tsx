'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/firebase/provider';
import { useRouter } from 'next/navigation';
import { getClientProfile, updateClientProfile } from '@/lib/client/client-service';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase/provider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  User, Phone, Mail, MapPin, Star, Car, DollarSign,
  Crown, Shield, LogOut, ChevronRight, Bell, Lock,
  HelpCircle, FileText, Loader2, CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const tierConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  premium: { label: 'Premium', color: 'bg-purple-100 text-purple-700', icon: <Crown className="w-3 h-3" /> },
  gold: { label: 'Gold', color: 'bg-yellow-100 text-yellow-700', icon: <Star className="w-3 h-3" /> },
  subscription: { label: 'Abonnement', color: 'bg-blue-100 text-blue-700', icon: <Shield className="w-3 h-3" /> },
  regular: { label: 'Régulier', color: 'bg-gray-100 text-gray-600', icon: null },
};

export default function ClientAccountPage() {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ displayName: '', phoneNumber: '', homeAddress: '', workAddress: '' });

  useEffect(() => {
    if (user) {
      getClientProfile(user.uid).then(p => {
        if (p) {
          setProfile(p);
          setForm({
            displayName: p.displayName || '',
            phoneNumber: p.phoneNumber || '',
            homeAddress: p.homeAddress || '',
            workAddress: p.workAddress || '',
          });
        }
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateClientProfile(user.uid, form);
      setProfile((prev: any) => ({ ...prev, ...form }));
      setIsEditing(false);
      toast({ title: 'Profil mis à jour', description: 'Vos informations ont été sauvegardées.' });
    } catch (err) {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const tier = tierConfig[profile.tier] || tierConfig.regular;
  const initial = (profile.displayName || user.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Profil header */}
      <div className="flex items-center gap-4 py-2">
        <Avatar className="w-16 h-16 border-2 border-gray-200">
          <AvatarImage src={user.photoURL || ''} />
          <AvatarFallback className="bg-red-600 text-white text-xl font-bold">{initial}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-lg font-bold text-gray-900">{profile.displayName}</p>
          <p className="text-sm text-gray-400">{user.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={cn('text-xs flex items-center gap-1', tier.color)}>
              {tier.icon}{tier.label}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Star className="w-3 h-3 text-yellow-400 fill-current" />
              {(profile.rating || 5).toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Car className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">{profile.totalRides || 0}</p>
          <p className="text-xs text-gray-400">Courses</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <DollarSign className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">${(profile.totalSpent || 0).toFixed(2)}</p>
          <p className="text-xs text-gray-400">Dépensé</p>
        </div>
      </div>

      {/* Informations personnelles */}
      <Card className="border-gray-100">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Informations personnelles</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 text-xs h-7"
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : isEditing ? (
                <><CheckCircle className="w-3 h-3 mr-1" />Sauvegarder</>
              ) : (
                'Modifier'
              )}
            </Button>
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-500">Nom complet</Label>
                <Input
                  value={form.displayName}
                  onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                  className="h-9 text-sm border-gray-200 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Téléphone</Label>
                <Input
                  value={form.phoneNumber}
                  onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
                  className="h-9 text-sm border-gray-200 mt-1"
                  placeholder="+1 514 000 0000"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Adresse domicile</Label>
                <Input
                  value={form.homeAddress}
                  onChange={e => setForm(f => ({ ...f, homeAddress: e.target.value }))}
                  className="h-9 text-sm border-gray-200 mt-1"
                  placeholder="123 Rue Principale, Montréal"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Adresse travail</Label>
                <Input
                  value={form.workAddress}
                  onChange={e => setForm(f => ({ ...f, workAddress: e.target.value }))}
                  className="h-9 text-sm border-gray-200 mt-1"
                  placeholder="456 Avenue du Bureau, Montréal"
                />
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setIsEditing(false)}>
                Annuler
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {[
                { icon: <User className="w-4 h-4" />, label: 'Nom', value: profile.displayName },
                { icon: <Mail className="w-4 h-4" />, label: 'Email', value: user.email },
                { icon: <Phone className="w-4 h-4" />, label: 'Téléphone', value: profile.phoneNumber || 'Non renseigné' },
                { icon: <MapPin className="w-4 h-4" />, label: 'Domicile', value: profile.homeAddress || 'Non renseigné' },
                { icon: <MapPin className="w-4 h-4" />, label: 'Travail', value: profile.workAddress || 'Non renseigné' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-1">
                  <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 flex-shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-sm text-gray-900 truncate">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Menu options */}
      <div className="space-y-1">
        {[
          { icon: <Bell className="w-4 h-4" />, label: 'Notifications', href: '#' },
          { icon: <Lock className="w-4 h-4" />, label: 'Sécurité & confidentialité', href: '#' },
          { icon: <FileText className="w-4 h-4" />, label: 'Historique des paiements', href: '/client/activity' },
          { icon: <HelpCircle className="w-4 h-4" />, label: 'Aide & support', href: '/help' },
        ].map((item, i) => (
          <button
            key={i}
            onClick={() => router.push(item.href)}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600">
              {item.icon}
            </div>
            <span className="flex-1 text-sm text-gray-900">{item.label}</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
        ))}
      </div>

      {/* Déconnexion */}
      <Button
        variant="outline"
        className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
        onClick={handleSignOut}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Se déconnecter
      </Button>

      <p className="text-center text-xs text-gray-300 pb-2">KULOOC v1.0 · Montréal, Canada</p>
    </div>
  );
}
