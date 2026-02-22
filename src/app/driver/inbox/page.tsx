import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

const messages = [
  {
    id: 1,
    title: "Votre document a été approuvé",
    preview: "Bonne nouvelle ! Votre assurance a été vérifiée et est maintenant active.",
    date: "Aujourd'hui",
    read: false,
  },
  {
    id: 2,
    title: "Résumé de vos gains hebdomadaires",
    preview: "Vos gains pour la semaine du 18 au 24 octobre sont prêts.",
    date: "Hier",
    read: true,
  },
  {
    id: 3,
    title: "Action requise : Mise à jour de l'application",
    preview: "Une nouvelle version de l'application KULOOC Driver est disponible.",
    date: "22 oct.",
    read: true,
  }
];

export default function InboxPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Boîte de réception</h1>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col">
            {messages.map((msg, index) => (
              <Link href="#" key={msg.id}>
                <div className={`p-4 flex items-start gap-4 hover:bg-gray-50 ${index < messages.length - 1 ? 'border-b' : ''}`}>
                    {!msg.read && <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1.5"></div>}
                    <div className={`flex-1 ${msg.read ? 'ml-4' : ''}`}>
                        <div className="flex justify-between items-center">
                            <p className={`font-semibold ${!msg.read ? 'text-gray-900' : 'text-gray-600'}`}>{msg.title}</p>
                            <p className="text-xs text-muted-foreground">{msg.date}</p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 truncate">{msg.preview}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 self-center" />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
