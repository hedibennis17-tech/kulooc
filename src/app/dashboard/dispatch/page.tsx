'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Radio } from 'lucide-react';
import Link from 'next/link';

export default function DashboardDispatchPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dispatch</h1>
          <p className="text-gray-400 text-sm mt-1">Centre de dispatch KULOOC en temps réel</p>
        </div>
        <Link href="/dispatch" target="_blank">
          <Button className="bg-red-700 hover:bg-red-600 text-white">
            <ExternalLink className="w-4 h-4 mr-2" />Ouvrir en plein écran
          </Button>
        </Link>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-0">
          <iframe
            src="/dispatch"
            className="w-full rounded-lg"
            style={{ height: 'calc(100vh - 200px)', minHeight: '600px', border: 'none' }}
            title="KULOOC Dispatch"
          />
        </CardContent>
      </Card>
    </div>
  );
}
