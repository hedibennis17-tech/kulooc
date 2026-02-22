
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MapleLeafIcon } from '@/lib/icons';

export default function HomePage() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-8 text-center p-8">
        <div className="flex items-center gap-4">
            <MapleLeafIcon className="h-16 w-16 text-primary" />
            <h1 className="text-6xl font-bold tracking-tighter text-primary">
              KULOOC
            </h1>
        </div>
        <p className="max-w-md text-lg text-muted-foreground">
          Votre partenaire de confiance. Bienvenue sur la plateforme de développement KULOOC.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild size="lg" className="h-12 text-base">
            <Link href="/ride">
              Commander une course (Interface Passager)
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 text-base">
            <Link href="/driver">
              Conduire avec KULOOC (Interface Chauffeur)
            </Link>
          </Button>
           <Button asChild size="lg" variant="secondary" className="h-12 text-base">
            <Link href="/dispatch">
              Accéder au Dispatch (Interface Répartiteur)
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
