'use client';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/provider';
import { getAuth, signOut } from 'firebase/auth';
import { useActiveRide } from '@/app/driver/layout';
import { useToast } from '@/hooks/use-toast';
import {
  ChevronRight, Car, FileText, Wallet, BarChart2, MessageSquare,
  HelpCircle, Gift, Settings, Shield, LogOut, Star, Bell, User,
  CreditCard, Receipt, Phone, Mail
} from 'lucide-react';
import Link from 'next/link';

const menuSections = [
  {
    title: 'Mon compte',
    items: [
      { icon: User, label: 'Profil', href: '/driver/profile', badge: null },
      { icon: Star, label: 'Note et statistiques', href: '/driver/performance', badge: '4.92' },
      { icon: Car, label: 'Véhicules', href: '/driver/vehicles', badge: null },
      { icon: FileText, label: 'Documents', href: '/driver/documents', badge: '1 requis', badgeColor: 'red' },
    ]
  },
  {
    title: 'Finances',
    items: [
      { icon: Wallet, label: 'Portefeuille', href: '/driver/wallet', badge: '247.50 $' },
      { icon: CreditCard, label: 'Paiement', href: '/driver/payment', badge: null },
      { icon: Receipt, label: 'Résumé fiscal', href: '/driver/tax', badge: null },
      { icon: BarChart2, label: 'Revenus détaillés', href: '/driver/earnings', badge: null },
    ]
  },
  {
    title: 'Promotions',
    items: [
      { icon: Gift, label: 'Promotions et bonus', href: '/driver/promotions', badge: '2 actives', badgeColor: 'green' },
      { icon: Star, label: 'Programme KULOOC Pro', href: '/driver/pro', badge: 'Or', badgeColor: 'yellow' },
    ]
  },
  {
    title: 'Communication',
    items: [
      { icon: MessageSquare, label: 'Messages', href: '/driver/messages', badge: '3', badgeColor: 'red' },
      { icon: Bell, label: 'Notifications', href: '/driver/notifications', badge: null },
      { icon: Mail, label: 'Emails', href: '/driver/emails', badge: null },
    ]
  },
  {
    title: 'Support',
    items: [
      { icon: HelpCircle, label: 'Aide et support', href: '/driver/help', badge: null },
      { icon: Phone, label: 'Contacter KULOOC', href: '/driver/contact', badge: null },
    ]
  },
  {
    title: 'Paramètres',
    items: [
      { icon: Settings, label: 'Paramètres de l\'app', href: '/driver/settings', badge: null },
      { icon: Shield, label: 'Confidentialité et sécurité', href: '/driver/security', badge: null },
    ]
  },
];

export default function DriverMenuPage() {
  const { user } = useUser();
  const router = useRouter();

  const { hasActiveRide } = useActiveRide();
  const { toast } = useToast();

  const handleSignOut = async () => {
    // FEATURE 2: Impossible de se déconnecter pendant une course active
    if (hasActiveRide) {
      toast({
        title: '🚗 Course en cours',
        description: 'Vous ne pouvez pas vous déconnecter pendant une course. Terminez la course d\'abord.',
        variant: 'destructive',
      });
      return;
    }
    const auth = getAuth();
    await signOut(auth);
    router.push('/driver/auth');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header profil */}
      <div className="bg-white px-4 pt-12 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white text-2xl font-black">
            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'C'}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-black">{user?.displayName || 'Chauffeur KULOOC'}</h2>
            <p className="text-gray-500 text-sm">{user?.email}</p>
            <div className="flex items-center gap-1 mt-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-bold">4.92</span>
              <span className="text-gray-400 text-xs">· 168 courses</span>
            </div>
          </div>
          <Link href="/driver/profile">
            <ChevronRight className="h-6 w-6 text-gray-400" />
          </Link>
        </div>

        {/* Badge Pro */}
        <div className="mt-4 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-white fill-white" />
            <div>
              <p className="text-white font-bold text-sm">KULOOC Pro — Niveau Or</p>
              <p className="text-yellow-100 text-xs">8 courses pour atteindre Platine</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-white" />
        </div>
      </div>

      {/* Sections du menu */}
      <div className="px-4 py-4 space-y-4">
        {menuSections.map(section => (
          <div key={section.title} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-2">{section.title}</p>
            {section.items.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors ${
                    idx < section.items.length - 1 ? 'border-b border-gray-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-gray-700" />
                    </div>
                    <span className="font-medium text-gray-900">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        item.badgeColor === 'red' ? 'bg-red-100 text-red-600' :
                        item.badgeColor === 'green' ? 'bg-green-100 text-green-600' :
                        item.badgeColor === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </div>
                </Link>
              );
            })}
          </div>
        ))}

        {/* Déconnexion */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
              <LogOut className="h-5 w-5 text-red-600" />
            </div>
            <span className="font-bold text-red-600">Se déconnecter</span>
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">KULOOC v1.0.0 · Canada 🍁</p>
      </div>
    </div>
  );
}
