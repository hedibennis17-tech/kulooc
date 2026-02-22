'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

const vehicles = [
  { make: "Tesla", model: "Model 3", plate: "XAD 123", status: "Actif" },
  { make: "Chevrolet", model: "Bolt", plate: "YBZ 456", status: "En attente" },
];

export default function DriverVehiclesPage() {
    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                 <h1 className="text-2xl font-bold">Véhicules</h1>
                 <Button>Ajouter</Button>
            </div>
           
            <div className="space-y-4">
                {vehicles.map(v => (
                     <Card key={v.plate}>
                        <CardHeader>
                            <CardTitle>{v.make} {v.model}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="font-mono text-lg">{v.plate}</p>
                        </CardContent>
                        <CardFooter>
                             <p className={`text-sm font-medium ${v.status === 'Actif' ? 'text-green-600' : 'text-yellow-600'}`}>
                                {v.status}
                            </p>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
