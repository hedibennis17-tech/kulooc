import { SimpleCarIcon, ElectricCarIcon, ComfortCarIcon, PackageIcon, XLCarIcon, PremiumCarIcon, DeluxeCarIcon } from '@/lib/icons';

export type Driver = {
  id: number;
  name: string;
  rating: number;
  language: 'en' | 'fr' | 'both';
  vehicle: {
    type: 'electric' | 'gas';
    model: string;
  };
  location: {
    lat: number;
    lng: number;
  };
};

export const drivers: Driver[] = [
  { id: 1, name: 'Jean-Pierre', rating: 4.9, language: 'fr', vehicle: { type: 'electric', model: 'Tesla Model 3' }, location: { lat: 45.5088, lng: -73.554 } },
  { id: 2, name: 'Emily', rating: 4.8, language: 'en', vehicle: { type: 'gas', model: 'Honda Civic' }, location: { lat: 45.515, lng: -73.56 } },
  { id: 3, name: 'Mathieu', rating: 5.0, language: 'both', vehicle: { type: 'electric', model: 'Chevrolet Bolt' }, location: { lat: 45.495, lng: -73.57 } },
  { id: 4, name: 'Sarah', rating: 4.7, language: 'both', vehicle: { type: 'gas', model: 'Toyota Camry' }, location: { lat: 45.52, lng: -73.58 } },
  { id: 5, name: 'David', rating: 4.9, language: 'en', vehicle: { type: 'electric', model: 'Hyundai Ioniq 5' }, location: { lat: 45.50, lng: -73.59 } },
  { id: 6, name: 'Chloé', rating: 4.6, language: 'fr', vehicle: { type: 'gas', model: 'Mazda 3' }, location: { lat: 45.48, lng: -73.565 } },
];

export type Service = {
  id: string;
  name: string;
  description: string;
  multiplier: number;
  icon: React.ComponentType<{ className?: string }>;
};

export const services: Service[] = [
    { id: 'kulooc_x', name: 'KULOOC X', description: 'Courses abordables pour 4 personnes', multiplier: 1, icon: SimpleCarIcon },
    { id: 'kulooc_green', name: 'KULOOC Green', description: 'Courses en véhicules électriques', multiplier: 1.2, icon: ElectricCarIcon },
    { id: 'kulooc_confort', name: 'Confort', description: 'Voitures confortables et récentes', multiplier: 1.3, icon: ComfortCarIcon },
    { id: 'kulooc_coursier', name: 'Coursier', description: 'Envoyez et recevez des colis', multiplier: 0.9, icon: PackageIcon },
    { id: 'kulooc_xl', name: 'KULOOC XL', description: 'Pour les groupes jusqu\'à 6 personnes', multiplier: 1.5, icon: XLCarIcon },
    { id: 'kulooc_premier', name: 'Premier', description: 'Courses premium avec chauffeurs mieux notés', multiplier: 1.8, icon: PremiumCarIcon },
    { id: 'kulooc_deluxe', name: 'Deluxe', description: 'Le luxe à portée de main, VUS haut de gamme', multiplier: 2.2, icon: DeluxeCarIcon },
];

export const promotions = [
    { id: 'promo1', title: '20% off your next 3 rides', code: 'KULOOC20' },
    { id: 'promo2', title: 'Free ride up to $15', code: 'FREERIDE' },
];

export const userPreferences = {
    frequentAddresses: [
        { label: 'Home', address: '1234 Rue de la Montagne, Montréal, QC' },
        { label: 'Work', address: '5678 Avenue McGill College, Montréal, QC' },
    ],
    language: 'fr',
    preferEcoFriendly: false,
};
