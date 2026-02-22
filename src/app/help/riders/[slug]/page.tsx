'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { helpHubs } from '@/lib/help-data';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

const riderHub = helpHubs.find(h => h.slug === 'riders');

export default function RiderSectionPage({ params }: { params: { slug: string } }) {
    const section = riderHub?.sections?.find(s => s.key === params.slug);

    return (
        <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
                <Link href="/help/riders" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-2">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Aide pour les passagers
                </Link>
                <h1 className="text-3xl font-bold">{section?.label || 'Sujets'}</h1>
            </div>
            <Card>
                <CardHeader>
                <CardTitle>Contenu à venir</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Les articles pour cette section seront bientôt disponibles.</p>
                </CardContent>
            </Card>
        </div>
    );
}
