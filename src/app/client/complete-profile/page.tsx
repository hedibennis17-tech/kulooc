'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useAuth } from '@/firebase/provider';
import { updateClientProfile, getClientProfile } from '@/lib/client/client-service';
import { updateProfile } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Phone, MapPin, Calendar, CheckCircle, ArrowLeft, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Suspense } from 'react';

function CompleteProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  const redirect = searchParams.get('redirect') || '/client';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    birthDate: '',
    photoURL: '',
    communicationPref: 'both' as 'phone' | 'email' | 'both',
  });

  // Pre-fill from existing user data
  useEffect(() => {
    if (user) {
      const nameParts = (user.displayName || '').split(' ');
      setForm(f => ({
        ...f,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        phone: user.phoneNumber || '',
        photoURL: user.photoURL || '',
      }));
      // Load existing profile data
      getClientProfile(user.uid).then(profile => {
        if (profile) {
          setForm(f => ({
            ...f,
            firstName: f.firstName || (profile.displayName || '').split(' ')[0] || '',
            lastName: f.lastName || (profile.displayName || '').split(' ').slice(1).join(' ') || '',
            phone: f.phone || profile.phoneNumber || '',
            address: (profile as any).address || '',
            birthDate: (profile as any).birthDate || '',
            photoURL: f.photoURL || profile.photoURL || '',
          }));
        }
      });
    }
  }, [user]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/client/login');
    }
  }, [user, isUserLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast({ title: 'Nom et prenom requis', variant: 'destructive' });
      return;
    }
    if (!form.phone.trim()) {
      toast({ title: 'Numero de telephone requis', variant: 'destructive' });
      return;
    }
    if (!form.address.trim()) {
      toast({ title: 'Adresse requise', variant: 'destructive' });
      return;
    }
    if (!form.birthDate) {
      toast({ title: 'Date de naissance requise', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`;

      // Update Firebase Auth profile
      await updateProfile(user, { displayName: fullName });

      // Update Firestore profile
      await updateClientProfile(user.uid, {
        displayName: fullName,
        phoneNumber: form.phone,
        photoURL: form.photoURL,
      } as any);

      // Additional fields via direct update
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/firebase');
      await updateDoc(doc(db, 'users', user.uid), {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        displayName: fullName,
        phoneNumber: form.phone,
        address: form.address,
        birthDate: form.birthDate,
        photoURL: form.photoURL,
        communicationPref: form.communicationPref,
        profileCompleted: true,
        updatedAt: serverTimestamp(),
      });

      toast({ title: 'Profil complete !', description: `Bienvenue ${form.firstName} !` });
      router.push(redirect);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="bg-black px-6 pt-10 pb-6 text-white">
        <button onClick={() => router.back()} className="p-1 -ml-1 mb-4 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Completez votre profil</h1>
        <p className="text-gray-400 text-sm mt-1">Ces informations sont necessaires pour commander une course</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-6 py-6 space-y-5 overflow-y-auto pb-32">
        {/* Photo */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative group"
          >
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
              {form.photoURL ? (
                <img src={form.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-7 h-7 bg-red-600 rounded-full flex items-center justify-center border-2 border-background">
              <Camera className="w-3.5 h-3.5 text-white" />
            </div>
          </button>
        </div>

        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Prenom *</Label>
            <Input
              placeholder="Jean"
              value={form.firstName}
              onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
              className="h-11 mt-1"
              required
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Nom *</Label>
            <Input
              placeholder="Tremblay"
              value={form.lastName}
              onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
              className="h-11 mt-1"
              required
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Phone className="w-3 h-3" /> Telephone *
          </Label>
          <Input
            type="tel"
            placeholder="+1 (514) 123-4567"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            className="h-11 mt-1"
            required
          />
        </div>

        {/* Address */}
        <div>
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Adresse *
          </Label>
          <Input
            placeholder="123 Rue Principale, Montreal, QC"
            value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            className="h-11 mt-1"
            required
          />
        </div>

        {/* Birth date */}
        <div>
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Date de naissance *
          </Label>
          <Input
            type="date"
            value={form.birthDate}
            onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
            className="h-11 mt-1"
            required
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
          />
        </div>

        {/* Communication preference */}
        <div>
          <Label className="text-xs text-muted-foreground">Preference de communication</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {(['phone', 'email', 'both'] as const).map(pref => (
              <button
                key={pref}
                type="button"
                onClick={() => setForm(f => ({ ...f, communicationPref: pref }))}
                className={cn(
                  'py-2.5 px-3 rounded-lg text-xs font-medium border transition-colors',
                  form.communicationPref === pref
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-background text-foreground border-border hover:bg-muted'
                )}
              >
                {pref === 'phone' && 'Telephone'}
                {pref === 'email' && 'Email'}
                {pref === 'both' && 'Les deux'}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-background border-t border-border">
          <Button
            type="submit"
            className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Confirmer et continuer
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <CompleteProfileContent />
    </Suspense>
  );
}
