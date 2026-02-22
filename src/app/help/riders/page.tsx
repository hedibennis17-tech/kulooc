'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { helpHubs } from '@/lib/help-data';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import React from 'react';

const riderHub = helpHubs.find(h => h.slug === 'riders');

export default function RidersHelpPage() {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-2">Aide pour les passagers</h1>
      <p className="text-muted-foreground mb-8">Trouvez des réponses à vos questions sur l'utilisation de KULOOC.</p>
      
      <Card>
        <CardHeader>
          <CardTitle>Tous les sujets</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
           {riderHub?.sections ? (
            <div className="flex flex-col">
              {riderHub.sections.map((section, index) => (
                <React.Fragment key={section.key}>
                  <Link href={`/help/riders/${section.key}`} legacyBehavior>
                    <a className="flex items-center justify-between p-6 hover:bg-accent transition-colors">
                      <span className="font-medium">{section.label}</span>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </a>
                  </Link>
                  {index < riderHub.sections.length - 1 && <div className="border-b mx-6" />}
                </React.Fragment>
              ))}
            </div>
          ) : (
            <p className="p-6 text-muted-foreground">Contenu à venir.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
