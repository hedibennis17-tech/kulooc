'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin/use-admin-auth';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/admin/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Car,
  Truck,
  FileText,
  Tag,
  Gift,
  BarChart3,
  MessageSquare,
  MessageCircle,
  Radio,
  Settings,
  LogOut,
  Bell,
  Mail,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase/provider';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/theme-toggle';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/transactions', label: 'Transactions', icon: CreditCard },
  { href: '/dashboard/clients', label: 'Clients', icon: Users },
  { href: '/dashboard/drivers', label: 'Chauffeurs', icon: Car },
  { href: '/dashboard/fleet', label: 'Flotte', icon: Truck },
  { href: '/dashboard/documents', label: 'Documents', icon: FileText },
  { href: '/dashboard/promotions', label: 'Promotions', icon: Tag },
  { href: '/dashboard/bonus', label: 'Bonus', icon: Gift },
  { href: '/dashboard/reports', label: 'Rapports', icon: BarChart3 },
  { href: '/dashboard/messages', label: 'Messagerie', icon: MessageSquare },
  { href: '/dashboard/sms', label: 'SMS', icon: MessageCircle },
  { href: '/dashboard/dispatch', label: 'Dispatch', icon: Radio },
  { href: '/dashboard/settings', label: 'Paramètres', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { adminUser, role, isLoading, isAuthorized, error } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  // Fix React #418 — date uniquement côté client
  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    );
  }, []);
  const [notifications] = useState(3);
  const [unreadMessages] = useState(5);

  useEffect(() => {
    if (!isLoading && !isAuthorized) {
      router.push('/login?redirect=/dashboard');
    }
  }, [isLoading, isAuthorized, router]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center text-white">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Accès Refusé</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <Button onClick={() => router.push('/login')} variant="outline">
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-gray-900 border-r border-gray-800 z-50 transition-all duration-300 flex flex-col',
          collapsed ? 'w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className={cn('flex items-center p-4 border-b border-gray-800', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-sm">K</span>
              </div>
              <div>
                <span className="text-white font-bold text-sm">KULOOC</span>
                <p className="text-gray-500 text-xs">Admin Panel</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">K</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hidden lg:flex"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* User info */}
        {!collapsed && adminUser && (
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <Avatar className="w-9 h-9">
                <AvatarImage src={adminUser.avatar} />
                <AvatarFallback className="bg-red-600 text-white text-xs">
                  {adminUser.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{adminUser.name}</p>
                {role && (
                  <Badge className={cn('text-xs border mt-0.5', ROLE_COLORS[role])}>
                    {ROLE_LABELS[role]}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  active
                    ? 'bg-red-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="p-2 border-t border-gray-800">
          <button
            onClick={handleSignOut}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-all w-full',
              collapsed && 'justify-center px-2'
            )}
            title={collapsed ? 'Déconnexion' : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn('flex-1 flex flex-col transition-all duration-300', collapsed ? 'lg:ml-16' : 'lg:ml-64')}>
        {/* Top bar */}
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-white font-semibold text-sm">
                {navItems.find(n => isActive(n.href, n.exact))?.label || 'Dashboard'}
              </h1>
              <p className="text-gray-500 text-xs">
                <span suppressHydrationWarning>{currentDate}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* SMS indicator */}
            <Button variant="ghost" size="icon" className="relative text-gray-400 hover:text-white" asChild>
              <Link href="/dashboard/sms">
                <MessageCircle className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full text-white text-xs flex items-center justify-center">2</span>
              </Link>
            </Button>

            {/* Messages */}
            <Button variant="ghost" size="icon" className="relative text-gray-400 hover:text-white" asChild>
              <Link href="/dashboard/messages">
                <Mail className="w-5 h-5" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full text-white text-xs flex items-center justify-center">
                    {unreadMessages}
                  </span>
                )}
              </Link>
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative text-gray-400 hover:text-white">
              <Bell className="w-5 h-5" />
              {notifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </Button>

            {/* Avatar */}
            {adminUser && (
              <Avatar className="w-8 h-8 cursor-pointer">
                <AvatarImage src={adminUser.avatar} />
                <AvatarFallback className="bg-red-600 text-white text-xs">
                  {adminUser.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-gray-950 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
