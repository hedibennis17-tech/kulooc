'use client';

import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';

export interface PlaceResult {
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
}

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: PlaceResult) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function PlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Rechercher une adresse...',
  icon,
  className = '',
}: PlacesAutocompleteProps) {
  const places = useMapsLibrary('places');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!places) return;
    serviceRef.current = new places.AutocompleteService();
    geocoderRef.current = new google.maps.Geocoder();
  }, [places]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    if (!serviceRef.current || inputValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    serviceRef.current.getPlacePredictions(
      {
        input: inputValue,
        componentRestrictions: { country: 'ca' },
        types: ['geocode', 'establishment'],
      },
      (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
        }
      }
    );
  };

  const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    const address = prediction.description;
    onChange(address);
    setShowSuggestions(false);
    setSuggestions([]);

    if (!geocoderRef.current) return;

    geocoderRef.current.geocode({ placeId: prediction.place_id }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
        const location = results[0].geometry.location;
        onPlaceSelect({
          address,
          latitude: location.lat(),
          longitude: location.lng(),
          placeId: prediction.place_id,
        });
      }
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            {icon}
          </div>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
          placeholder={placeholder}
          className={`w-full h-12 border border-gray-200 bg-gray-50 rounded-md text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
            icon ? 'pl-8' : 'pl-3'
          } pr-3 ${className}`}
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSelect(prediction)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left transition-colors border-b border-gray-50 last:border-0"
            >
              <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="w-3.5 h-3.5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {prediction.structured_formatting.main_text}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {prediction.structured_formatting.secondary_text}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
