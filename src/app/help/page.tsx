'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { helpHubs, type HelpHub } from '@/lib/help-data';
import { MapleLeafIcon } from '@/lib/icons';
import { Search } from 'lucide-react';
import { useUser } from '@/firebase/provider';

function HubCard({ hub }: { hub: HelpHub }) {
  return (
    <Link href={`/help/${hub.slug}`}>
      <Card className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
        <CardHeader className="flex flex-col items-center justify-center text-center gap-4">
          <hub.icon className="h-10 w-10 text-primary transition-colors" />
          <CardTitle className="text-lg">{hub.name}</CardTitle>
        </CardHeader>
      </Card>
    </Link>
  );
}

export default function HelpPage() {
    const { user } = useUser();
    const userName = user?.displayName?.split(' ')[0] || 'there';

  return (
    <div className="flex-1 bg-background">
      <header className="relative bg-muted py-16 md:py-24">
        <div className="absolute inset-0 opacity-[0.02] text-primary">
           <MapleLeafIcon className="w-full h-full" />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Bonjour {userName}, comment pouvons-nous vous aider?
          </h1>
          <div className="mt-8 max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher de l'aide"
              className="w-full h-14 pl-12 pr-4 text-lg rounded-full shadow-md focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2"
            />
          </div>
        </div>
      </header>

      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold mb-8 text-center">Parcourir les sujets d'aide</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {helpHubs.map((hub) => (
            <HubCard key={hub.slug} hub={hub} />
          ))}
        </div>
      </div>
    </div>
  );
}
