'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, X } from 'lucide-react';
import { format, addDays, setHours, setMinutes, isBefore, addMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';

type DateTimePickerProps = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  onClose: () => void;
};

export function DateTimePicker({ value, onChange, onClose }: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(value || new Date());
  const [selectedTime, setSelectedTime] = useState<string>(
    value ? format(value, 'HH:mm') : '09:00'
  );

  // Generate next 7 days
  const dates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  // Generate time slots (every 30 minutes from 6:00 to 23:30)
  const timeSlots: string[] = [];
  for (let hour = 6; hour <= 23; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 23 && minute > 30) break;
      timeSlots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
  }

  const handleConfirm = () => {
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const finalDate = setMinutes(setHours(selectedDate, hours), minutes);
    
    // Vérifier que la date est au moins 60 minutes dans le futur
    const minDate = addMinutes(new Date(), 60);
    if (isBefore(finalDate, minDate)) {
      alert('La prise en charge doit être planifiée au moins 60 minutes à l\'avance.');
      return;
    }
    
    onChange(finalDate);
    onClose();
  };

  const handleCancel = () => {
    onChange(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:w-[500px] sm:rounded-lg rounded-t-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <button onClick={handleCancel} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold">Quand souhaitez-vous partir ?</h2>
          <div className="w-9" /> {/* Spacer */}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Date Selection */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-gray-600" />
              <span className="font-medium">Date</span>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {dates.map((date) => {
                const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-black text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
                  >
                    <span className="text-xs font-medium uppercase">
                      {format(date, 'EEE', { locale: fr }).slice(0, 3)}
                    </span>
                    <span className="text-lg font-semibold mt-1">
                      {format(date, 'd')}
                    </span>
                    {isToday && (
                      <span className="text-xs mt-1">
                        {isSelected ? "Auj." : "Auj."}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Selection */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-gray-600" />
              <span className="font-medium">Heure</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {timeSlots.map((time) => {
                const isSelected = time === selectedTime;
                
                return (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`py-3 px-4 rounded-lg text-center font-medium transition-colors ${
                      isSelected
                        ? 'bg-black text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cancellation Policy */}
          <div className="p-4 bg-gray-50 border-t">
            <h3 className="font-semibold mb-2">Conditions d'annulation</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Possibilité de choisir l'heure de prise en charge jusqu'à 90 jours à l'avance</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Temps d'attente supplémentaire inclus pour retrouver votre chauffeur</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="font-medium">Annulation sans frais jusqu'à 60 minutes à l'avance</span>
              </li>
            </ul>
            <button className="text-sm text-blue-600 hover:underline mt-3">
              Consulter les Conditions générales
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-white">
          <Button onClick={handleConfirm} className="w-full py-6 text-lg font-semibold">
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}
