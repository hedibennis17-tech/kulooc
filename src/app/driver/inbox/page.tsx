'use client';
import { useState } from 'react';
import { Bell, HelpCircle, MessageSquare, ChevronRight, Star, DollarSign, AlertTriangle, Gift, Car } from 'lucide-react';

type Tab = 'notifications' | 'aide';

const notifications = [
  {
    id: '1', icon: DollarSign, iconBg: 'bg-green-100', iconColor: 'text-green-600',
    title: 'Paiement reçu',
    message: 'Votre paiement hebdomadaire de 611.70 $ a été déposé dans votre portefeuille.',
    time: 'Il y a 2h', unread: true,
  },
  {
    id: '2', icon: Star, iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600',
    title: 'Nouvelle évaluation',
    message: 'Un passager vous a donné 5 étoiles : "Excellent chauffeur, très professionnel !"',
    time: 'Il y a 4h', unread: true,
  },
  {
    id: '3', icon: Gift, iconBg: 'bg-red-100', iconColor: 'text-red-600',
    title: 'Bonus débloqué !',
    message: 'Félicitations ! Vous avez complété le défi hebdomadaire. 75 $ ajoutés à votre portefeuille.',
    time: 'Hier', unread: true,
  },
  {
    id: '4', icon: AlertTriangle, iconBg: 'bg-orange-100', iconColor: 'text-orange-600',
    title: 'Document à renouveler',
    message: 'Votre assurance automobile expire dans 30 jours. Veuillez la renouveler.',
    time: 'Il y a 2 jours', unread: false,
  },
  {
    id: '5', icon: Car, iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
    title: 'Mise à jour disponible',
    message: 'Une nouvelle version de KULOOC est disponible avec des améliorations de performance.',
    time: 'Il y a 3 jours', unread: false,
  },
];

const helpTopics = [
  { id: '1', title: 'Problème avec un paiement', desc: 'Signaler un problème avec votre paiement', icon: DollarSign, status: null },
  { id: '2', title: 'Signaler un incident', desc: 'Problème survenu lors d\'une course', icon: AlertTriangle, status: null },
  { id: '3', title: 'Problème avec un document', desc: 'Aide pour télécharger vos documents', icon: MessageSquare, status: 'En cours' },
  { id: '4', title: 'Questions sur les bonus', desc: 'Comprendre les promotions disponibles', icon: Gift, status: null },
  { id: '5', title: 'Problème technique', desc: 'Signaler un bug dans l\'application', icon: Bell, status: null },
];

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState<Tab>('notifications');
  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-4 pt-12 pb-0">
        <h1 className="text-3xl font-black text-black mb-4">Boîte de réception</h1>
        <div className="flex border-b border-gray-100">
          {(['notifications', 'aide'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 pb-3 text-sm font-bold relative ${activeTab === tab ? 'text-black' : 'text-gray-400'}`}
            >
              <span className="flex items-center justify-center gap-2">
                {tab === 'notifications' ? <Bell className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
                {tab === 'notifications' ? 'Notifications' : 'Aide'}
                {tab === 'notifications' && unreadCount > 0 && (
                  <span className="bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{unreadCount}</span>
                )}
              </span>
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {activeTab === 'notifications' ? (
          <div className="space-y-2">
            {notifications.map(notif => {
              const Icon = notif.icon;
              return (
                <div key={notif.id} className={`bg-white rounded-2xl p-4 shadow-sm flex items-start gap-3 ${notif.unread ? 'border-l-4 border-red-600' : ''}`}>
                  <div className={`w-10 h-10 rounded-full ${notif.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`h-5 w-5 ${notif.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-sm text-black">{notif.title}</p>
                      <span className="text-xs text-gray-400 flex-shrink-0">{notif.time}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5 leading-snug">{notif.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-red-600 rounded-2xl p-4 text-white">
              <h3 className="font-black text-lg">Besoin d&apos;aide ?</h3>
              <p className="text-red-100 text-sm mt-1">Notre équipe est disponible 24h/7j pour vous aider.</p>
              <button className="mt-3 bg-white text-red-600 font-bold text-sm px-4 py-2 rounded-full">Contacter le support</button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-2">Sujets fréquents</p>
              {helpTopics.map((topic, idx) => {
                const Icon = topic.icon;
                return (
                  <button key={topic.id} className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors text-left ${idx < helpTopics.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{topic.title}</p>
                        <p className="text-xs text-gray-400">{topic.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {topic.status && <span className="text-xs bg-blue-100 text-blue-600 font-bold px-2 py-0.5 rounded-full">{topic.status}</span>}
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h3 className="font-black text-base mb-3">Questions fréquentes</h3>
              {['Comment fonctionne le surge pricing ?', 'Quand est-ce que je reçois mon paiement ?', 'Comment améliorer ma note ?', 'Comment contester une évaluation ?'].map((q, i) => (
                <button key={i} className="w-full flex items-center justify-between py-3 border-b border-gray-50 last:border-0 text-left">
                  <span className="text-sm text-gray-700">{q}</span>
                  <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
