'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';
import React from 'react';
import helpData from '@/lib/help-data-drivers-account.json';
import { Badge } from '@/components/ui/badge';

export default function ChauffeurArticlePage({ params }: { params: { slug: string, articleId: string } }) {
    const article = helpData.articles.find(a => a.id === params.articleId);

    if (!article) {
        return (
            <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold mb-8">Article non trouvé</h1>
                <Link href={`/help/chauffeurs/${params.slug}`} className="flex items-center text-primary hover:underline">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Retour à la catégorie
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
                <Link href={`/help/chauffeurs/${params.slug}`} className="flex items-center text-sm text-muted-foreground hover:text-primary mb-2">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Retour à {article.category}
                </Link>
                <h1 className="text-3xl font-bold">{article.title}</h1>
                <p className="text-muted-foreground mt-2">{article.summary}</p>
            </div>

            <div className="space-y-6">
                {article.beforeYouStart && article.beforeYouStart.length > 0 && (
                    <Card className="bg-blue-50 border-blue-200">
                        <CardHeader>
                            <CardTitle className="text-lg text-blue-800">Avant de commencer</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="list-disc pl-5 space-y-2 text-blue-700">
                                {article.beforeYouStart.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                        </CardContent>
                    </Card>
                )}

                {article.steps && article.steps.length > 0 && (
                     <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Étapes à suivre</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ol className="list-decimal pl-5 space-y-4">
                                {article.steps.map((step, i) => (
                                    <li key={i} className="pl-2 space-y-1">
                                        <p className="font-semibold">Étape {i + 1}</p>
                                        <p className="text-muted-foreground">{step}</p>
                                    </li>
                                ))}
                            </ol>
                        </CardContent>
                    </Card>
                )}
                
                {article.troubleshooting && article.troubleshooting.length > 0 && (
                    <Card className="bg-yellow-50 border-yellow-200">
                         <CardHeader>
                            <CardTitle className="text-lg text-yellow-800">Dépannage</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="list-disc pl-5 space-y-2 text-yellow-700">
                                {article.troubleshooting.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </div>

            {article.keywords && article.keywords.length > 0 &&
                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle className="text-base">Mots-clés</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        {article.keywords.map(kw => <Badge key={kw} variant="secondary">{kw}</Badge>)}
                    </CardContent>
                </Card>
            }
        </div>
    );
}
