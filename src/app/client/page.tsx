'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/firebase/provider';
import { createRideRequest, watchActiveRide, cancelRideRequest } from '@/lib/client/client-service';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MapPin, Navigation, Car, Clock, DollarSign,
  Star, ChevronRight, X, Loader2, CheckCircle,
  Zap, Shield, Leaf
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SERVICE_TYPES = [
  {
    id: 'kulooc_x',
    name: 'KULOOC X',
    description: 'Économique',
    icon: <Car className="w-6 h-6" />,
    multiplier: 1.0,
    eta: '3-5 min',
    color: 'bg-gray-900',
  },
  {
    id: 'kulooc_comfort',
    name: 'Confort',
    description: 'Plus d\'espace',
    icon: <Star className="w-6 h-6" />,
    multiplier: 1.4,
    eta: '5-8 min',
    color: 'bg-blue-900',
  },
  {
    id: 'kulooc_xl',
    name: 'XL',
    description: 'Jusqu\'à 6 passagers',
    icon: <Shield className="w-6 h-6" />,
    multiplier: 1.8,
    eta: '6-10 min',
    color: 'bg-purple-900',
  },
  {
    id: 'kulooc_green',
    name: 'Green',
    description: 'Véhicule électrique',
    icon: <Leaf className="w-6 h-6" />,
    multiplier: 1.2,
    eta: '4-7 min',
    color: 'bg-green-900',
  },
];

const BASE_PRICE = 4.50;
const PRICE_PER_KM = 1.85;

function estimatePrice(serviceMultiplier: number): { price: number; distance: number; duration: number } {
  // Simulation d'une course typique à Montréal
  const distance = Math.random() * 10 + 2; // 2-12 km
  const duration = Math.round(distance * 3 + Math.random() * 5); // minutes
  const price = (BASE_PRICE + distance * PRICE_PER_KM) * serviceMultiplier;
  return { price, distance, duration };
}

export default function ClientHomePage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedService, setSelectedService] = useState('kulooc_x');
  const [step, setStep] = useState<'search' | 'select' | 'waiting' | 'active'>('search');
  const [activeRide, setActiveRide] = useState<any>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const selectedServiceData = SERVICE_TYPES.find(s => s.id === selectedService)!;
  const estimate = estimatePrice(selectedServiceData.multiplier);

  // Écouter les courses actives en temps réel
  useEffect(() => {
    if (!user) return;
    const unsub = watchActiveRide(user.uid, (ride) => {
      setActiveRide(ride);
      if (ride) setStep('active');
    });
    return () => unsub();
  }, [user]);

  const handleSearch = () => {
    if (!pickup.trim() || !destination.trim()) {
      toast({ title: 'Adresses requises', description: 'Entrez un départ et une destination.', variant: 'destructive' });
      return;
    }
    setStep('select');
  };

  const handleRequestRide = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const est = estimatePrice(selectedServiceData.multiplier);
      const requestId = await createRideRequest({
        passengerId: user.uid,
        passengerName: user.displayName || user.email || 'Passager',
        passengerPhone: user.phoneNumber || '',
        pickup: { address: pickup },
        destination: { address: destination },
        serviceType: selectedService,
        estimatedPrice: Math.round(est.price * 100) / 100,
        estimatedDuration: est.duration,
        estimatedDistance: Math.round(est.distance * 10) / 10,
      });
      setCurrentRequestId(requestId);
      setStep('waiting');
      toast({ title: 'Course demandée !', description: 'Recherche d\'un chauffeur en cours...' });
    } catch (err) {
      toast({ title: 'Erreur', description: 'Impossible de créer la course.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (currentRequestId) {
      await cancelRideRequest(currentRequestId).catch(() => {});
    }
    setStep('search');
    setCurrentRequestId(null);
    setPickup('');
    setDestination('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Map placeholder */}
      <div className="relative bg-gray-100 h-56 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-200 to-gray-100" />
        <div className="relative z-10 text-center">
          <MapPin className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Carte interactive</p>
          <p className="text-gray-400 text-xs">Montréal, QC</p>
        </div>
        {/* Grille de rue simulée */}
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 200">
          {[0,50,100,150,200].map(y => <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#666" strokeWidth="1"/>)}
          {[0,80,160,240,320,400].map(x => <line key={x} x1={x} y1="0" x2={x} y2="200" stroke="#666" strokeWidth="1"/>)}
        </svg>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 bg-white px-4 pt-4 pb-2">

        {/* ── ÉTAPE 1 : Recherche ── */}
        {step === 'search' && (
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900">Où allez-vous ?</h2>

            {/* Départ */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 bg-black rounded-full" />
              <Input
                placeholder="Votre position actuelle"
                value={pickup}
                onChange={e => setPickup(e.target.value)}
                className="pl-8 h-12 border-gray-200 bg-gray-50 text-sm"
              />
            </div>

            {/* Destination */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-sm" />
              <Input
                placeholder="Entrez votre destination"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                className="pl-8 h-12 border-gray-200 bg-gray-50 text-sm"
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>

            {/* Suggestions rapides */}
            <div className="space-y-1">
              {['Aéroport YUL', 'Gare Centrale', 'Vieux-Montréal', 'McGill Université'].map(place => (
                <button
                  key={place}
                  onClick={() => setDestination(place)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{place}</p>
                    <p className="text-xs text-gray-400">Montréal, QC</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                </button>
              ))}
            </div>

            <Button
              className="w-full h-12 bg-black hover:bg-gray-800 text-white font-semibold rounded-xl mt-2"
              onClick={handleSearch}
              disabled={!pickup || !destination}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Voir les options
            </Button>
          </div>
        )}

        {/* ── ÉTAPE 2 : Sélection du service ── */}
        {step === 'select' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setStep('search')} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <p className="text-xs text-gray-400">{pickup}</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{destination}</p>
              </div>
            </div>

            <h3 className="font-bold text-gray-900">Choisir un service</h3>

            <div className="space-y-2">
              {SERVICE_TYPES.map(service => {
                const est = estimatePrice(service.multiplier);
                const isSelected = selectedService === service.id;
                return (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                      isSelected ? 'border-black bg-gray-50' : 'border-gray-100 bg-white hover:border-gray-200'
                    )}
                  >
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0', service.color)}>
                      {service.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900">{service.name}</p>
                      <p className="text-xs text-gray-400">{service.description} · {service.eta}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">${est.price.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">{Math.round(est.distance * 10) / 10} km</p>
                    </div>
                    {isSelected && <CheckCircle className="w-5 h-5 text-black flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Arrivée estimée : {selectedServiceData.eta}</span>
              </div>
              <div className="flex items-center gap-1 text-sm font-bold">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span>{estimate.price.toFixed(2)} CAD</span>
              </div>
            </div>

            <Button
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
              onClick={handleRequestRide}
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Recherche en cours...</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" />Commander {selectedServiceData.name}</>
              )}
            </Button>
          </div>
        )}

        {/* ── ÉTAPE 3 : En attente d'un chauffeur ── */}
        {step === 'waiting' && (
          <div className="space-y-4 text-center py-4">
            <div className="relative mx-auto w-20 h-20">
              <div className="w-20 h-20 border-4 border-red-100 rounded-full" />
              <div className="absolute inset-0 w-20 h-20 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
              <Car className="absolute inset-0 m-auto w-8 h-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Recherche d'un chauffeur</h3>
              <p className="text-gray-400 text-sm mt-1">Connexion avec un chauffeur KULOOC proche...</p>
            </div>

            <Card className="bg-gray-50 border-0">
              <CardContent className="p-4 space-y-2 text-left">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-black rounded-full" />
                  <span className="text-gray-600 truncate">{pickup}</span>
                </div>
                <div className="w-px h-4 bg-gray-300 ml-1" />
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-red-600 rounded-sm" />
                  <span className="text-gray-900 font-medium truncate">{destination}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />{selectedServiceData.eta}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-green-600" />{estimate.price.toFixed(2)} CAD
              </span>
            </div>

            <Button
              variant="outline"
              className="w-full border-red-200 text-red-600 hover:bg-red-50"
              onClick={handleCancel}
            >
              <X className="w-4 h-4 mr-2" />
              Annuler la course
            </Button>
          </div>
        )}

        {/* ── ÉTAPE 4 : Course active ── */}
        {step === 'active' && activeRide && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-800 text-sm">Chauffeur en route !</p>
                <p className="text-green-600 text-xs">Votre chauffeur arrive dans {selectedServiceData.eta}</p>
              </div>
            </div>

            {/* Info chauffeur */}
            <Card className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <Car className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{activeRide.driverName || 'Chauffeur KULOOC'}</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-current" />
                      <span className="text-xs text-gray-500">{activeRide.driverRating || '4.9'}</span>
                    </div>
                  </div>
                  <Badge className="bg-gray-900 text-white text-xs">
                    {activeRide.vehiclePlate || 'ABC-123'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Button
              variant="outline"
              className="w-full border-red-200 text-red-600 hover:bg-red-50"
              onClick={handleCancel}
            >
              <X className="w-4 h-4 mr-2" />
              Annuler
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
