'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/firebase';
import { collection, query, limit, addDoc, onSnapshot, serverTimestamp, where } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Send, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  channel: string;
  createdAt: any;
  isRead: boolean;
}

const CHANNELS = [
  { id: 'general', label: 'Général', icon: '💬', color: 'text-blue-400' },
  { id: 'drivers', label: 'Chauffeurs', icon: '🚗', color: 'text-green-400' },
  { id: 'ops', label: 'Opérations', icon: '⚙️', color: 'text-yellow-400' },
  { id: 'support', label: 'Support', icon: '🆘', color: 'text-red-400' },
  { id: 'announcements', label: 'Annonces', icon: '📢', color: 'text-purple-400' },
];

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChannel, setActiveChannel] = useState('general');
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fix React #418 — monter côté client uniquement
  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!isMounted) return;

    // SANS orderBy pour éviter l'index composite manquant messages(channel+createdAt)
    // Tri effectué côté client après réception
    const q = query(
      collection(db, 'messages'),
      where('channel', '==', activeChannel),
      limit(100)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const msgs = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Message))
          // Tri côté client par createdAt croissant
          .sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() ?? 0;
            const bTime = b.createdAt?.toMillis?.() ?? 0;
            return aTime - bTime;
          });
        setMessages(msgs);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      },
      (err) => {
        console.warn('messages snapshot error (ignoré):', err.message);
        setMessages([]);
      }
    );
    return () => unsub();
  }, [activeChannel, isMounted]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setIsSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        senderId: 'admin',
        senderName: 'Admin KULOOC',
        senderRole: 'Super Admin',
        content: newMessage.trim(),
        channel: activeChannel,
        createdAt: serverTimestamp(),
        isRead: false,
      });
      setNewMessage('');
    } catch (err) {
      toast({ title: 'Erreur envoi', variant: 'destructive' });
    } finally { setIsSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const filteredMessages = search
    ? messages.filter(m =>
        m.content.toLowerCase().includes(search.toLowerCase()) ||
        m.senderName.toLowerCase().includes(search.toLowerCase())
      )
    : messages;

  // Formatage des dates uniquement côté client (fix React #418)
  const formatTime = (ts: any): string => {
    if (!isMounted || !ts?.toDate) return '';
    try {
      const d = ts.toDate();
      const now = new Date();
      if (d.toDateString() === now.toDateString())
        return d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
      return d.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const roleColors: Record<string, string> = {
    'Super Admin': 'text-red-400',
    'Admin': 'text-orange-400',
    'Agent': 'text-blue-400',
    'Dispatcher': 'text-green-400',
    'Driver': 'text-yellow-400',
  };

  // Attendre le montage côté client avant de rendre quoi que ce soit (fix React #418)
  if (!isMounted) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Messagerie Interne</h1>
          <p className="text-gray-400 text-sm mt-1">Chargement...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Messagerie Interne</h1>
        <p className="text-gray-400 text-sm mt-1">Communication en temps réel entre équipes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Channels Sidebar */}
        <Card className="bg-gray-900 border-gray-800 lg:col-span-1">
          <CardContent className="p-3">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">Canaux</p>
            <div className="space-y-1">
              {CHANNELS.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all',
                    activeChannel === ch.id
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <span className="text-base">{ch.icon}</span>
                  <span className="text-sm">{ch.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="bg-gray-900 border-gray-800 lg:col-span-3 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-lg">{CHANNELS.find(c => c.id === activeChannel)?.icon}</span>
              <div>
                <p className="text-white font-medium text-sm">
                  {CHANNELS.find(c => c.id === activeChannel)?.label}
                </p>
                <p className="text-gray-400 text-xs">{messages.length} messages</p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-7 h-7 text-xs bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 w-40"
              />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <MessageCircle className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">Aucun message dans ce canal</p>
                <p className="text-xs mt-1">Soyez le premier à écrire !</p>
              </div>
            ) : (
              filteredMessages.map(msg => (
                <div key={msg.id} className={cn('flex gap-3', msg.senderId === 'admin' && 'flex-row-reverse')}>
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback
                      className={cn(
                        'text-white text-xs',
                        msg.senderId === 'admin' ? 'bg-red-700' : 'bg-gray-700'
                      )}
                    >
                      {msg.senderName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn('max-w-[70%]', msg.senderId === 'admin' && 'items-end flex flex-col')}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('text-xs font-medium', roleColors[msg.senderRole] || 'text-gray-400')}>
                        {msg.senderName}
                      </span>
                      {/* suppressHydrationWarning sur le span de la date */}
                      <span suppressHydrationWarning className="text-gray-600 text-xs">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                    <div className={cn(
                      'rounded-2xl px-3 py-2 text-sm',
                      msg.senderId === 'admin'
                        ? 'bg-red-700 text-white rounded-tr-sm'
                        : 'bg-gray-800 text-gray-100 rounded-tl-sm'
                    )}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex gap-2">
              <Input
                placeholder={`Message dans #${CHANNELS.find(c => c.id === activeChannel)?.label}...`}
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 text-sm"
                disabled={isSending}
              />
              <Button
                onClick={sendMessage}
                disabled={isSending || !newMessage.trim()}
                className="bg-red-600 hover:bg-red-700 text-white px-3"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
