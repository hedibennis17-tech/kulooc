'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import React from 'react';
import { helpSitemap } from '@/lib/help-data';
import helpData from '@/lib/help-data-drivers-account.json';

const driverHub = helpSitemap.hubs.find(h => h.key === 'drivers');

export default function DriverSectionPage({ params }: { params: { slug: string } }) {
  const section = driverHub?.sections.find(s => s.key === params.slug);

  if (!section) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8">Section non trouvée</h1>
        <Link href="/help/drivers" className="flex items-center text-primary hover:underline">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Retour à l'aide pour les chauffeurs
        </Link>
      </div>
    );
  }
  
  const articlesInSection = helpData.articles.filter(article => article.section === section.label);
  const categories = [...new Set(articlesInSection.map(a => a.category))];
  
  return (
     <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/help/drivers" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-2">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Aide pour les chauffeurs
          </Link>
          <h1 className="text-3xl font-bold">{section.label}</h1>
        </div>

        {categories.map(category => {
          const articlesInCategory = articlesInSection.filter(a => a.category === category);
          return (
            <Card key={category} className="mb-8">
              <CardHeader>
                <CardTitle>{category}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col">
                  {articlesInCategory.map((article, index) => (
                    <React.Fragment key={article.id}>
                      <Link href={`/help/drivers/${params.slug}/${article.id}`} legacyBehavior>
                        <a className="flex items-center justify-between p-6 hover:bg-accent transition-colors">
                          <span className="font-medium">{article.title}</span>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </a>
                      </Link>
                      {index < articlesInCategory.length - 1 && <div className="border-b mx-6" />}
                    </React.Fragment>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}
