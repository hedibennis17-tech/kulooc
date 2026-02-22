'use client';

import React, { useState, useEffect } from 'react';
import { Home, Briefcase, Heart, Plus, X, MapPin } from 'lucide-react';
import { useUser } from '@/firebase/provider';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type FavoriteAddress = {
  id: string;
  label: string;
  address: string;
  icon: 'home' | 'work' | 'heart';
};

type FavoriteAddressesProps = {
  onSelect: (address: string) => void;
};

export function FavoriteAddresses({ onSelect }: FavoriteAddressesProps) {
  const { user } = useUser();
  const [favorites, setFavorites] = useState<FavoriteAddress[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: '', address: '', icon: 'heart' as const });

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;
    
    try {
      const docRef = doc(db, 'users', user.uid, 'preferences', 'favoriteAddresses');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setFavorites(docSnap.data().addresses || []);
      }
    } catch (error) {
      console.error('Error loading favorite addresses:', error);
    }
  };

  const saveFavorites = async (updatedFavorites: FavoriteAddress[]) => {
    if (!user) return;
    
    try {
      const docRef = doc(db, 'users', user.uid, 'preferences', 'favoriteAddresses');
      await setDoc(docRef, { addresses: updatedFavorites });
      setFavorites(updatedFavorites);
    } catch (error) {
      console.error('Error saving favorite addresses:', error);
    }
  };

  const addFavorite = () => {
    if (!newAddress.label || !newAddress.address) return;
    
    const favorite: FavoriteAddress = {
      id: Date.now().toString(),
      ...newAddress,
    };
    
    saveFavorites([...favorites, favorite]);
    setNewAddress({ label: '', address: '', icon: 'heart' });
    setIsAdding(false);
  };

  const removeFavorite = (id: string) => {
    saveFavorites(favorites.filter(f => f.id !== id));
  };

  const getIcon = (icon: string) => {
    switch (icon) {
      case 'home':
        return <Home className="h-5 w-5" />;
      case 'work':
        return <Briefcase className="h-5 w-5" />;
      default:
        return <Heart className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-2">
      {favorites.map((fav) => (
        <button
          key={fav.id}
          onClick={() => onSelect(fav.address)}
          className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-left group"
        >
          <div className="flex-shrink-0 text-gray-600">
            {getIcon(fav.icon)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{fav.label}</div>
            <div className="text-xs text-gray-500 truncate">{fav.address}</div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeFavorite(fav.id);
            }}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-300 rounded transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </button>
      ))}

      {isAdding ? (
        <div className="p-3 rounded-lg bg-gray-100 space-y-2">
          <Input
            placeholder="Label (ex: Maison, Travail)"
            value={newAddress.label}
            onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
            className="bg-white"
          />
          <Input
            placeholder="Adresse complète"
            value={newAddress.address}
            onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
            className="bg-white"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setNewAddress({ ...newAddress, icon: 'home' })}
              className={`flex-1 p-2 rounded ${newAddress.icon === 'home' ? 'bg-black text-white' : 'bg-white'}`}
            >
              <Home className="h-5 w-5 mx-auto" />
            </button>
            <button
              onClick={() => setNewAddress({ ...newAddress, icon: 'work' })}
              className={`flex-1 p-2 rounded ${newAddress.icon === 'work' ? 'bg-black text-white' : 'bg-white'}`}
            >
              <Briefcase className="h-5 w-5 mx-auto" />
            </button>
            <button
              onClick={() => setNewAddress({ ...newAddress, icon: 'heart' })}
              className={`flex-1 p-2 rounded ${newAddress.icon === 'heart' ? 'bg-black text-white' : 'bg-white'}`}
            >
              <Heart className="h-5 w-5 mx-auto" />
            </button>
          </div>
          <div className="flex gap-2">
            <Button onClick={addFavorite} className="flex-1">Ajouter</Button>
            <Button onClick={() => setIsAdding(false)} variant="outline" className="flex-1">Annuler</Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors text-gray-600"
        >
          <Plus className="h-5 w-5" />
          <span className="text-sm font-medium">Ajouter une adresse favorite</span>
        </button>
      )}
    </div>
  );
}
