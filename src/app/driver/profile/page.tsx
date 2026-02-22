'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function DriverProfilePage() {
    const driverAvatar = PlaceHolderImages.find(p => p.id === 'driver-avatar');

    // Mock data for now, would come from useUser() or a similar hook
    const driver = {
        name: 'Jean-Pierre',
        email: 'jean.pierre@kulooc.ca',
        phone: '+1 514-123-4567',
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Profil</h1>

            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                     <Avatar className="h-20 w-20">
                        {driverAvatar && <AvatarImage src={driverAvatar.imageUrl} data-ai-hint={driverAvatar.imageHint} />}
                        <AvatarFallback>JP</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-2xl">{driver.name}</CardTitle>
                        <p className="text-muted-foreground">Chauffeur Partenaire</p>
                    </div>
                </CardHeader>
                <CardContent>
                    <form className="space-y-6 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Nom complet</Label>
                            <Input id="fullName" defaultValue={driver.name} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" defaultValue={driver.email} disabled />
                             <p className="text-xs text-muted-foreground">Contactez le support pour changer votre adresse email.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Téléphone</Label>
                            <Input id="phone" type="tel" defaultValue={driver.phone} disabled />
                            <p className="text-xs text-muted-foreground">Contactez le support pour changer votre numéro de téléphone.</p>
                        </div>
                        <Button>Enregistrer les modifications</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
