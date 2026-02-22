'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';
import React from 'react';
import helpData from '@/lib/help-data-drivers-account.json';

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
};

// Get unique categories from the articles
const driverHelpCategories = Array.from(new Set(helpData.articles.map(article => article.category)))
    .map(category => ({
        key: slugify(category),
        label: category,
    }));


export default function ChauffeursHelpPage() {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-2">Aide pour les chauffeurs et livreurs</h1>
      <p className="text-muted-foreground mb-8">Trouvez des réponses à vos questions sur la conduite avec KULOOC.</p>
      
      <Card>
        <CardHeader>
          <CardTitle>Tous les sujets</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col">
            {driverHelpCategories.map((section, index) => (
              <React.Fragment key={section.key}>
                <Link href={`/help/chauffeurs/${section.key}`} legacyBehavior>
                  <a className="flex items-center justify-between p-6 hover:bg-accent transition-colors">
                    <span className="font-medium">{section.label}</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </a>
                </Link>
                {index < driverHelpCategories.length - 1 && <div className="border-b mx-6" />}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
