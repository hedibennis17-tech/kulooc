'use client';

import { ChevronRight, User as UserIcon, FileText, Car, ShieldCheck, BarChart, Settings, LifeBuoy } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const menuItems = [
  { href: '/driver/profile', icon: UserIcon, label: 'Profil' },
  { href: '/driver/documents', icon: FileText, label: 'Documents' },
  { href: '/driver/vehicles', icon: Car, label: 'Véhicules' },
  { href: '/driver/verifications', icon: ShieldCheck, label: 'Vérifications' },
  { href: '/driver/performance', icon: BarChart, label: 'Performance' },
  { href: '/driver/settings', icon: Settings, label: 'Paramètres' },
  { href: '/help', icon: LifeBuoy, label: 'Aide & Support' },
];

export default function DriverAccountPage() {
  const driverAvatar = PlaceHolderImages.find(p => p.id === 'driver-avatar');

  return (
    <div className="p-4">
      <div className="flex items-center gap-4 mb-8">
        <Avatar className="h-16 w-16">
          {driverAvatar && <AvatarImage src={driverAvatar.imageUrl} data-ai-hint={driverAvatar.imageHint} />}
          <AvatarFallback>JP</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-bold">Jean-Pierre</h1>
          <p className="text-muted-foreground">Chauffeur Partenaire</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        {menuItems.map((item, index) => (
          <Link href={item.href} key={item.href}>
            <div className={`p-4 flex items-center gap-4 hover:bg-gray-50 ${index < menuItems.length - 1 ? 'border-b' : ''}`}>
              <item.icon className="h-5 w-5 text-gray-500" />
              <span className="flex-1 font-medium">{item.label}</span>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
