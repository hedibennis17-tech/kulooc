'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Send, Users, CheckCircle, XCircle, Clock, Phone, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface SMSLog {
  id: string;
  to: string;
  recipientName: string;
  message: string;
  status: string;
  type: string;
  sentAt: any;
  error?: string;
}

const SMS_TEMPLATES = [
  { id: 'welcome_driver', label: 'Bienvenue chauffeur', message: 'Bienvenue dans la famille KULOOC ! Votre compte a été approuvé. Connectez-vous et commencez à conduire dès maintenant.' },
  { id: 'doc_approved', label: 'Document approuvé', message: 'Bonne nouvelle ! Votre document a été approuvé par notre équipe. Votre profil est maintenant complet.' },
  { id: 'doc_rejected', label: 'Document rejeté', message: 'Votre document a été refusé. Veuillez soumettre un document valide et lisible. Contactez le support si besoin.' },
  { id: 'promo_code', label: 'Code promo', message: 'Profitez de 20% de rabais sur votre prochaine course avec le code KULOOC20. Valide jusqu\'au 31 mars 2026.' },
  { id: 'ride_reminder', label: 'Rappel course', message: 'Votre chauffeur KULOOC est en route ! Soyez prêt à l\'adresse de prise en charge.' },
  { id: 'account_suspended', label: 'Compte suspendu', message: 'Votre compte KULOOC a été temporairement suspendu. Contactez notre support au support@kulooc.ca pour plus d\'informations.' },
];

export default function SMSPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Form state
  const [target, setTarget] = useState('individual');
  const [recipientType, setRecipientType] = useState('drivers');
  const [selectedId, setSelectedId] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [template, setTemplate] = useState('');

  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [driversSnap, usersSnap, logsSnap] = await Promise.all([
        getDocs(collection(db, 'drivers')),
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'sms_logs'), orderBy('sentAt', 'desc'), limit(100))),
      ]);
      setDrivers(driversSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSmsLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() } as SMSLog)));
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const handleTemplateSelect = (id: string) => {
    const t = SMS_TEMPLATES.find(t => t.id === id);
    if (t) { setMessage(t.message); setTemplate(id); }
  };

  const handleRecipientSelect = (id: string) => {
    setSelectedId(id);
    const list = recipientType === 'drivers' ? drivers : users;
    const person = list.find(p => p.id === id);
    if (person) setPhone(person.phone || person.phoneNumber || '');
  };

  const sendSMS = async () => {
    if (!message.trim()) { toast({ title: 'Message requis', variant: 'destructive' }); return; }

    const recipients: { phone: string; name: string }[] = [];

    if (target === 'individual') {
      if (!phone) { toast({ title: 'Numéro de téléphone requis', variant: 'destructive' }); return; }
      const list = recipientType === 'drivers' ? drivers : users;
      const person = list.find(p => p.id === selectedId);
      recipients.push({ phone, name: person?.name || person?.displayName || phone });
    } else if (target === 'all_drivers') {
      drivers.filter(d => d.phone).forEach(d => recipients.push({ phone: d.phone, name: d.name }));
    } else if (target === 'all_clients') {
      users.filter(u => u.phone || u.phoneNumber).forEach(u => recipients.push({ phone: u.phone || u.phoneNumber, name: u.displayName || u.name || u.phone }));
    } else if (target === 'active_drivers') {
      drivers.filter(d => d.phone && d.status === 'active').forEach(d => recipients.push({ phone: d.phone, name: d.name }));
    }

    if (recipients.length === 0) { toast({ title: 'Aucun destinataire avec numéro de téléphone', variant: 'destructive' }); return; }

    setIsSending(true);
    let successCount = 0;
    let failCount = 0;

    for (const r of recipients) {
      try {
        // Log the SMS in Firestore (Twilio integration would go here)
        await addDoc(collection(db, 'sms_logs'), {
          to: r.phone,
          recipientName: r.name,
          message: message.trim(),
          status: 'sent', // In production: call Twilio API
          type: target,
          sentAt: serverTimestamp(),
        });
        successCount++;
      } catch (err) {
        failCount++;
      }
    }

    toast({
      title: `SMS envoyé${successCount > 1 ? 's' : ''}`,
      description: `${successCount} envoyé${successCount > 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} échoué${failCount > 1 ? 's' : ''}` : ''}`,
    });

    setIsSending(false);
    setMessage('');
    setTemplate('');
    loadData();
  };

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    sent: { label: 'Envoyé', color: 'bg-green-900 text-green-300', icon: <CheckCircle className="w-3 h-3" /> },
    failed: { label: 'Échoué', color: 'bg-red-900 text-red-300', icon: <XCircle className="w-3 h-3" /> },
    pending: { label: 'En attente', color: 'bg-yellow-900 text-yellow-300', icon: <Clock className="w-3 h-3" /> },
    delivered: { label: 'Livré', color: 'bg-blue-900 text-blue-300', icon: <CheckCircle className="w-3 h-3" /> },
  };

  const stats = {
    total: smsLogs.length,
    sent: smsLogs.filter(s => s.status === 'sent' || s.status === 'delivered').length,
    failed: smsLogs.filter(s => s.status === 'failed').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">SMS</h1>
          <p className="text-gray-400 text-sm mt-1">Envoi de messages SMS aux chauffeurs et clients</p>
        </div>
        <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:text-white" onClick={loadData}>
          <RefreshCw className="w-4 h-4 mr-2" />Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total envoyés', value: stats.total, color: 'text-white' },
          { label: 'Succès', value: stats.sent, color: 'text-green-400' },
          { label: 'Échecs', value: stats.failed, color: 'text-red-400' },
        ].map((s, i) => (
          <Card key={i} className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 text-center">
              <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
              <p className="text-gray-400 text-xs">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="compose">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="compose" className="text-sm">Composer</TabsTrigger>
          <TabsTrigger value="logs" className="text-sm">Historique ({smsLogs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 space-y-5">
              {/* Target */}
              <div>
                <Label className="text-gray-300 text-sm mb-2 block">Destinataire</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { id: 'individual', label: 'Individuel' },
                    { id: 'all_drivers', label: 'Tous les chauffeurs' },
                    { id: 'active_drivers', label: 'Chauffeurs actifs' },
                    { id: 'all_clients', label: 'Tous les clients' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTarget(t.id)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm border transition-all',
                        target === t.id ? 'bg-red-700 border-red-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Individual recipient */}
              {target === 'individual' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300 text-sm mb-1 block">Type</Label>
                    <Select value={recipientType} onValueChange={setRecipientType}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="drivers" className="text-white">Chauffeur</SelectItem>
                        <SelectItem value="users" className="text-white">Client</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm mb-1 block">Sélectionner</Label>
                    <Select value={selectedId} onValueChange={handleRecipientSelect}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Choisir..." />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {(recipientType === 'drivers' ? drivers : users).map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-white">
                            {p.name || p.displayName || p.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-gray-300 text-sm mb-1 block">Numéro de téléphone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+1 (514) 555-0000"
                        className="pl-9 bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Template */}
              <div>
                <Label className="text-gray-300 text-sm mb-1 block">Modèle (optionnel)</Label>
                <Select value={template} onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Choisir un modèle..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {SMS_TEMPLATES.map(t => (
                      <SelectItem key={t.id} value={t.id} className="text-white">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Message */}
              <div>
                <Label className="text-gray-300 text-sm mb-1 block">Message</Label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Tapez votre message SMS..."
                  rows={4}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 resize-none"
                />
                <p className="text-gray-500 text-xs mt-1">{message.length}/160 caractères</p>
              </div>

              <Button
                className="w-full bg-red-700 hover:bg-red-600 text-white"
                onClick={sendSMS}
                disabled={isSending || !message.trim()}
              >
                {isSending ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Envoi en cours...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" />Envoyer le SMS</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left text-gray-400 font-medium p-4">Destinataire</th>
                      <th className="text-left text-gray-400 font-medium p-4">Téléphone</th>
                      <th className="text-left text-gray-400 font-medium p-4">Message</th>
                      <th className="text-left text-gray-400 font-medium p-4">Statut</th>
                      <th className="text-left text-gray-400 font-medium p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {smsLogs.length === 0 ? (
                      <tr><td colSpan={5} className="text-center text-gray-500 py-8">Aucun SMS envoyé</td></tr>
                    ) : (
                      smsLogs.map(sms => {
                        const s = statusConfig[sms.status] || statusConfig.pending;
                        return (
                          <tr key={sms.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                            <td className="p-4 text-white font-medium">{sms.recipientName}</td>
                            <td className="p-4 text-gray-400 font-mono text-xs">{sms.to}</td>
                            <td className="p-4 text-gray-300 max-w-[200px]">
                              <p className="truncate text-xs">{sms.message}</p>
                            </td>
                            <td className="p-4">
                              <Badge className={cn('text-xs flex items-center gap-1 w-fit', s.color)}>
                                {s.icon}{s.label}
                              </Badge>
                            </td>
                            <td className="p-4 text-gray-400 text-xs">
                              {sms.sentAt?.toDate?.()?.toLocaleDateString('fr-CA') || 'N/A'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
