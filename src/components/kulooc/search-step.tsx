'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { autocompleteAddress, type AutocompletePrediction } from '@/app/actions/places';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Circle, Square, Clock, User, Loader2 } from 'lucide-react';

type SearchStepProps = {
  onSearch: (origin: string, destination: string) => void;
};

export function SearchStep({ onSearch }: SearchStepProps) {
  const [origin, setOrigin] = useState('Centre-ville, Montréal, QC, Canada');
  const [originSuggestions, setOriginSuggestions] = useState<AutocompletePrediction[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isOriginActive, setIsOriginActive] = useState(false);

  const [destination, setDestination] = useState('');
  const [destinationSuggestions, setDestinationSuggestions] = useState<AutocompletePrediction[]>([]);
  const [isSearchingDestination, setIsSearchingDestination] = useState(false);
  const [isDestinationActive, setIsDestinationActive] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (origin.length > 2 && isOriginActive) {
        setIsSearchingOrigin(true);
        const response = await autocompleteAddress(origin);
        if (response.success) {
            setOriginSuggestions(response.predictions);
        } else {
            toast({ variant: 'destructive', title: "Erreur de recherche d'adresse", description: response.error });
            setOriginSuggestions([]);
        }
        setIsSearchingOrigin(false);
      } else {
        setOriginSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [origin, isOriginActive, toast]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (destination.length > 2 && isDestinationActive) {
        setIsSearchingDestination(true);
        const response = await autocompleteAddress(destination);
        if (response.success) {
            setDestinationSuggestions(response.predictions);
        } else {
            toast({ variant: 'destructive', title: "Erreur de recherche d'adresse", description: response.error });
            setDestinationSuggestions([]);
        }
        setIsSearchingDestination(false);
      } else {
        setDestinationSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [destination, isDestinationActive, toast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) {
      toast({
        variant: 'destructive',
        title: 'Champs manquants',
        description: 'Veuillez renseigner un lieu de prise en charge et une destination.',
      });
      return;
    }
    onSearch(origin, destination);
  };
  
  return (
    <div className="flex flex-col h-full">
      <h1 className="text-3xl font-medium mb-8">Commander une course</h1>
      <form onSubmit={handleSubmit} className="space-y-3 flex-1 flex flex-col">
        <div className="space-y-2">
            <div className="relative">
                <Circle className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                    placeholder="Lieu de prise en charge"
                    className="pl-11 py-6 bg-muted border-transparent rounded-md text-base focus:bg-muted focus:border-gray-300 focus-visible:ring-primary"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    onFocus={() => setIsOriginActive(true)}
                    onBlur={() => setTimeout(() => setIsOriginActive(false), 200)}
                    autoComplete="off"
                />
                {isSearchingOrigin && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />}
                {isOriginActive && originSuggestions.length > 0 && (
                    <div className="absolute top-full mt-1 w-full rounded-md border bg-white text-card-foreground shadow-lg z-20 max-h-60 overflow-y-auto">
                        <ul>
                            {originSuggestions.map((s) => (
                                <li key={s.place_id} onMouseDown={() => { setOrigin(s.description); setOriginSuggestions([]); }} className="cursor-pointer px-4 py-3 text-sm hover:bg-muted">
                                    <div className="font-medium">{s.structured_formatting.main_text}</div>
                                    <div className="text-gray-500">{s.structured_formatting.secondary_text}</div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            <div className="relative">
                <Square className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                    placeholder="Destination"
                    className="pl-11 py-6 bg-muted border-transparent rounded-md text-base focus:bg-muted focus:border-gray-300 focus-visible:ring-primary"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    onFocus={() => setIsDestinationActive(true)}
                    onBlur={() => setTimeout(() => setIsDestinationActive(false), 200)}
                    autoComplete="off"
                />
                {isSearchingDestination && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />}
                 {isDestinationActive && destinationSuggestions.length > 0 && (
                    <div className="absolute top-full mt-1 w-full rounded-md border bg-white text-card-foreground shadow-lg z-20 max-h-60 overflow-y-auto">
                        <ul>
                            {destinationSuggestions.map((s) => (
                                <li key={s.place_id} onMouseDown={() => { setDestination(s.description); setDestinationSuggestions([]); }} className="cursor-pointer px-4 py-3 text-sm hover:bg-muted">
                                    <div className="font-medium">{s.structured_formatting.main_text}</div>
                                    <div className="text-gray-500">{s.structured_formatting.secondary_text}</div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>

        <div className="flex-grow" />

        <div className="space-y-3">
            <Select defaultValue="now">
                <SelectTrigger className="w-full bg-muted border-none rounded-md py-6 text-base focus:ring-primary">
                    <div className="flex items-center gap-4">
                        <Clock className="h-5 w-5 text-gray-500" />
                        <SelectValue />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="now">Prise en charge immédiate</SelectItem>
                    <SelectItem value="later">Planifier une course</SelectItem>
                </SelectContent>
            </Select>

            <Select defaultValue="me">
                <SelectTrigger className="w-full bg-muted border-none rounded-md py-6 text-base focus:ring-primary">
                    <div className="flex items-center gap-4">
                        <User className="h-5 w-5 text-gray-500" />
                        <SelectValue />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="me">Pour moi</SelectItem>
                    <SelectItem value="someone">Pour quelqu'un d'autre</SelectItem>
                </SelectContent>
            </Select>

            <Button type="submit" size="lg" className="w-full h-14 text-lg rounded-lg">
                Rechercher
            </Button>
        </div>
      </form>
    </div>
  );
}
