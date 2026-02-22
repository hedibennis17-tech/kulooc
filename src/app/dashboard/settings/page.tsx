'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Bell, Shield, Palette, Globe, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Paramètres</h1>
        <p className="text-gray-400 mt-2">Configurez votre tableau de bord et vos préférences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-white">Notifications</CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              Gérez vos préférences de notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notif" className="text-gray-300">Notifications par email</Label>
              <Switch id="email-notif" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="push-notif" className="text-gray-300">Notifications push</Label>
              <Switch id="push-notif" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sms-notif" className="text-gray-300">Notifications SMS</Label>
              <Switch id="sms-notif" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-500" />
              <CardTitle className="text-white">Apparence</CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              Personnalisez l'apparence de votre interface
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode" className="text-gray-300">Mode sombre</Label>
              <Switch id="dark-mode" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="compact-mode" className="text-gray-300">Mode compact</Label>
              <Switch id="compact-mode" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="animations" className="text-gray-300">Animations</Label>
              <Switch id="animations" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              <CardTitle className="text-white">Sécurité</CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              Gérez la sécurité de votre compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="2fa" className="text-gray-300">Authentification à deux facteurs</Label>
              <Switch id="2fa" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="session-timeout" className="text-gray-300">Déconnexion automatique</Label>
              <Switch id="session-timeout" defaultChecked />
            </div>
            <Button variant="outline" className="w-full mt-4">
              Changer le mot de passe
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-yellow-500" />
              <CardTitle className="text-white">Langue et Région</CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              Configurez vos préférences linguistiques
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Langue</Label>
              <select className="w-full bg-gray-800 border-gray-700 text-white rounded-md p-2">
                <option>Français</option>
                <option>English</option>
                <option>Español</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Fuseau horaire</Label>
              <select className="w-full bg-gray-800 border-gray-700 text-white rounded-md p-2">
                <option>America/Montreal (EST)</option>
                <option>America/Toronto (EST)</option>
                <option>America/Vancouver (PST)</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-red-500" />
            <CardTitle className="text-white">Données et Confidentialité</CardTitle>
          </div>
          <CardDescription className="text-gray-400">
            Gérez vos données et votre confidentialité
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 font-medium">Exporter mes données</p>
              <p className="text-sm text-gray-500">Téléchargez une copie de vos données</p>
            </div>
            <Button variant="outline">Exporter</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 font-medium">Supprimer mon compte</p>
              <p className="text-sm text-gray-500">Supprimez définitivement votre compte</p>
            </div>
            <Button variant="destructive">Supprimer</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
