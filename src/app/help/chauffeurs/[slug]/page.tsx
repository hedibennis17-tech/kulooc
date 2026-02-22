'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import React from 'react';
import helpData from '@/lib/help-data-drivers-account.json';

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

export default function ChauffeurCategoryPage({ params }: { params: { slug: string } }) {
  const categoryLabel = Array.from(new Set(helpData.articles.map(a => a.category))).find(c => slugify(c) === params.slug);

  if (!categoryLabel) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8">Catégorie non trouvée</h1>
        <Link href="/help/chauffeurs" className="flex items-center text-primary hover:underline">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Retour à l'aide pour les chauffeurs
        </Link>
      </div>
    );
  }
  
  const articles = helpData.articles.filter(article => article.category === categoryLabel);

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link href="/help/chauffeurs" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-2">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Aide pour les chauffeurs
        </Link>
        <h1 className="text-3xl font-bold">{categoryLabel}</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Articles</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col">
            {articles.map((article, index) => (
              <React.Fragment key={article.id}>
                <Link href={`/help/chauffeurs/${params.slug}/${article.id}`} legacyBehavior>
                  <a className="flex items-center justify-between p-6 hover:bg-accent transition-colors">
                    <span className="font-medium">{article.title}</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </a>
                </Link>
                {index < articles.length - 1 && <div className="border-b mx-6" />}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
