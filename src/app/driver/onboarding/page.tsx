'use client';

/**
 * KULOOC -- Driver Onboarding Wizard
 * 3-step wizard: Personal Info -> Vehicle -> Terms & Confirmation
 * Uses real vehicle makes/models data, color palette, and generates a vehicle badge.
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/provider';
import { db } from '@/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Car, User, CheckCircle, ChevronRight, ChevronLeft, Loader2, Shield, MapPin, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { vehicleMakesAndModels } from '@/lib/data/vehicle-makes-and-models';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 1, title: 'Informations personnelles', icon: User },
  { id: 2, title: 'Vehicule', icon: Car },
  { id: 3, title: 'Confirmation', icon: CheckCircle },
];

const PROVINCES = [
  'Alberta', 'Colombie-Britannique', 'Manitoba', 'Nouveau-Brunswick',
  'Terre-Neuve-et-Labrador', 'Nouvelle-Ecosse', 'Ontario', 'Ile-du-Prince-Edouard',
  'Quebec', 'Saskatchewan',
];

const VEHICLE_COLORS = [
  { name: 'Noir', hex: '#000000' },
  { name: 'Blanc', hex: '#FFFFFF' },
  { name: 'Gris', hex: '#808080' },
  { name: 'Argent', hex: '#C0C0C0' },
  { name: 'Rouge', hex: '#DC2626' },
  { name: 'Bleu', hex: '#2563EB' },
  { name: 'Bleu fonce', hex: '#1E3A5F' },
  { name: 'Vert', hex: '#16A34A' },
  { name: 'Vert fonce', hex: '#14532D' },
  { name: 'Jaune', hex: '#EAB308' },
  { name: 'Orange', hex: '#EA580C' },
  { name: 'Brun', hex: '#78350F' },
  { name: 'Beige', hex: '#D4A574' },
  { name: 'Bourgogne', hex: '#722F37' },
  { name: 'Violet', hex: '#7C3AED' },
  { name: 'Rose', hex: '#EC4899' },
  { name: 'Champagne', hex: '#F7E7CE' },
  { name: 'Or', hex: '#B8860B' },
];

// Minimum year: current year - 10
const MIN_VEHICLE_YEAR = new Date().getFullYear() - 10 + 1; // e.g. 2017 in 2026
const MAX_VEHICLE_YEAR = new Date().getFullYear() + 1;

const VEHICLE_TYPES = [
  { value: 'sedan', label: 'Berline' },
  { value: 'suv', label: 'VUS' },
  { value: 'minivan', label: 'Minifourgonnette' },
  { value: 'luxury', label: 'Luxe' },
  { value: 'electric', label: 'Electrique' },
];

// Vehicle Badge Component - shows a mini card with make/model/color/plate
function VehicleBadge({ make, model, year, color, colorHex, plate }: {
  make: string; model: string; year: string; color: string; colorHex: string; plate: string;
}) {
  if (!make || !model) return null;
  return (
    <div className="bg-foreground rounded-2xl p-4 text-background">
      <p className="text-[10px] text-background/50 uppercase tracking-wider mb-2 font-semibold">Badge vehicule KULOOC</p>
      <div className="flex items-center gap-3">
        {/* Color swatch as car representation */}
        <div className="relative flex-shrink-0">
          <div
            className="w-14 h-10 rounded-lg border-2 border-background/20"
            style={{ backgroundColor: colorHex || '#000' }}
          />
          <div className="absolute -bottom-1 left-1 right-1 h-2 bg-background/10 rounded-full" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{year} {make} {model}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-background/60">{color}</span>
          </div>
        </div>
      </div>
      {plate && (
        <div className="mt-3 bg-background/10 rounded-lg px-3 py-1.5 text-center">
          <p className="font-mono font-bold text-sm tracking-widest">{plate}</p>
        </div>
      )}
    </div>
  );
}

export default function DriverOnboardingPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Personal info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('Quebec');
  const [postalCode, setPostalCode] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [ssn, setSsn] = useState('');

  // Step 2: Vehicle
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleColorHex, setVehicleColorHex] = useState('#000000');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('sedan');
  const [vehicleSeats, setVehicleSeats] = useState('4');

  // Step 3: Terms
  const [hasLicense, setHasLicense] = useState(false);
  const [hasInsurance, setHasInsurance] = useState(false);
  const [hasRegistration, setHasRegistration] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Pre-fill from user
  useEffect(() => {
    if (user) {
      const parts = (user.displayName || '').split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
      setEmail(user.email || '');
      setPhone(user.phoneNumber || '');
    }
  }, [user]);

  // Get models for selected make
  const availableModels = useMemo(() => {
    if (!vehicleMake) return [];
    const entry = vehicleMakesAndModels.find(v => v.make === vehicleMake);
    return entry?.models || [];
  }, [vehicleMake]);

  // Year options
  const yearOptions = useMemo(() => {
    const years: string[] = [];
    for (let y = MAX_VEHICLE_YEAR; y >= MIN_VEHICLE_YEAR; y--) {
      years.push(String(y));
    }
    return years;
  }, []);

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!firstName.trim() || !lastName.trim()) {
          toast({ title: 'Erreur', description: 'Prenom et nom requis.', variant: 'destructive' });
          return false;
        }
        if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
          toast({ title: 'Erreur', description: 'Numero de telephone valide requis.', variant: 'destructive' });
          return false;
        }
        if (!address.trim()) {
          toast({ title: 'Erreur', description: 'Adresse requise.', variant: 'destructive' });
          return false;
        }
        if (!birthDate) {
          toast({ title: 'Erreur', description: 'Date de naissance requise.', variant: 'destructive' });
          return false;
        }
        return true;
      case 2:
        if (!vehicleMake || !vehicleModel || !vehicleYear) {
          toast({ title: 'Erreur', description: 'Marque, modele et annee requis.', variant: 'destructive' });
          return false;
        }
        if (!vehiclePlate.trim()) {
          toast({ title: 'Erreur', description: 'Plaque d\'immatriculation requise.', variant: 'destructive' });
          return false;
        }
        if (!vehicleColor) {
          toast({ title: 'Erreur', description: 'Couleur du vehicule requise.', variant: 'destructive' });
          return false;
        }
        return true;
      case 3:
        if (!hasLicense || !hasInsurance || !hasRegistration) {
          toast({ title: 'Erreur', description: 'Vous devez confirmer posseder tous les documents.', variant: 'destructive' });
          return false;
        }
        if (!agreeTerms) {
          toast({ title: 'Erreur', description: 'Vous devez accepter les conditions.', variant: 'destructive' });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = async () => {
    if (!user?.uid) {
      toast({ title: 'Erreur', description: 'Connexion requise.', variant: 'destructive' });
      router.push('/driver/signup');
      return;
    }
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    try {
      const driverRef = doc(db, 'drivers', user.uid);
      const existing = await getDoc(driverRef);
      if (existing.exists() && existing.data().onboardingCompleted) {
        toast({ title: 'Compte existant', description: 'Vous avez deja un profil chauffeur.' });
        router.push('/driver');
        return;
      }

      await setDoc(driverRef, {
        userId: user.uid,
        name: `${firstName.trim()} ${lastName.trim()}`,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: { street: address.trim(), city: city.trim(), province, postalCode: postalCode.trim().toUpperCase() },
        birthDate,
        ssn: ssn || null,
        vehicle: {
          make: vehicleMake,
          model: vehicleModel,
          year: parseInt(vehicleYear),
          color: vehicleColor,
          colorHex: vehicleColorHex,
          plate: vehiclePlate.trim().toUpperCase(),
          type: vehicleType,
          seats: parseInt(vehicleSeats),
        },
        status: 'offline',
        isActive: false,
        isApproved: false,
        onboardingCompleted: true,
        location: { latitude: 45.5088, longitude: -73.5540 },
        averageRating: 0,
        totalRatings: 0,
        totalRides: 0,
        earningsTotal: 0,
        documents: {
          driverLicense: { status: 'pending', url: null },
          insurance: { status: 'pending', url: null },
          vehicleRegistration: { status: 'pending', url: null },
          profilePhoto: { status: 'pending', url: user.photoURL || null },
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        photoURL: user.photoURL || null,
        languages: ['fr', 'en'],
      }, { merge: true });

      toast({ title: 'Inscription reussie !', description: 'Votre profil chauffeur a ete cree.' });
      setTimeout(() => router.push('/driver'), 1500);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2 text-foreground">Connexion requise</h2>
          <p className="text-muted-foreground mb-4">Connectez-vous d'abord pour creer votre profil chauffeur.</p>
          <Link href="/driver/signup">
            <Button className="bg-red-600 hover:bg-red-700 text-white">S'inscrire</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-black text-white px-4 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-black text-sm">K</span>
        </div>
        <span className="font-bold text-lg">KULOOC</span>
        <span className="text-white/40 mx-1">|</span>
        <span className="text-white/70 text-sm font-medium">Inscription chauffeur</span>
      </div>

      {/* Progress */}
      <div className="bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
                    isCompleted ? 'bg-green-500 text-white' :
                    isCurrent ? 'bg-red-600 text-white' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={cn('text-[10px] mt-1', isCurrent ? 'text-red-600 font-semibold' : 'text-muted-foreground')}>
                    {step.title.split(' ')[0]}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={cn('h-0.5 flex-1 mx-2', currentStep > step.id ? 'bg-green-500' : 'bg-border')} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form */}
      <div className="max-w-lg mx-auto p-4 pb-32">
        <div className="bg-background rounded-2xl shadow-sm border border-border p-6">
          <h2 className="text-xl font-bold mb-1 text-foreground">{STEPS[currentStep - 1].title}</h2>
          <p className="text-muted-foreground text-sm mb-6">Etape {currentStep} sur {STEPS.length}</p>

          {/* Step 1: Personal Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prenom *</Label>
                  <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jean" className="mt-1" />
                </div>
                <div>
                  <Label>Nom *</Label>
                  <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Tremblay" className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Adresse *</Label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Rue Principale, Montreal, QC" className="mt-1" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Ville</Label>
                  <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Montreal" className="mt-1" />
                </div>
                <div>
                  <Label>Province</Label>
                  <Select value={province} onValueChange={setProvince}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Code postal</Label>
                  <Input value={postalCode} onChange={e => setPostalCode(e.target.value.toUpperCase())} placeholder="H7W 3G5" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Telephone *</Label>
                  <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (514) 123-4567" className="mt-1" />
                </div>
                <div>
                  <Label>Date de naissance *</Label>
                  <Input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="mt-1"
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]} />
                </div>
              </div>
              <div>
                <Label>NAS (optionnel)</Label>
                <Input value={ssn} onChange={e => setSsn(e.target.value)} placeholder="123-456-789" className="mt-1" />
                <p className="text-[10px] text-muted-foreground mt-1">Le NAS est optionnel et sera utilise uniquement pour la declaration fiscale.</p>
              </div>
            </div>
          )}

          {/* Step 2: Vehicle with real makes/models/colors */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {/* Make */}
              <div>
                <Label>Marque du vehicule *</Label>
                <Select value={vehicleMake} onValueChange={(v) => { setVehicleMake(v); setVehicleModel(''); }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selectionnez la marque" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {vehicleMakesAndModels.map(v => (
                      <SelectItem key={v.make} value={v.make}>{v.make}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Model */}
              <div>
                <Label>Modele *</Label>
                <Select value={vehicleModel} onValueChange={setVehicleModel} disabled={!vehicleMake}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={vehicleMake ? 'Selectionnez le modele' : 'Choisissez d\'abord la marque'} /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {availableModels.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Year dropdown */}
                <div>
                  <Label>Annee * (min {MIN_VEHICLE_YEAR})</Label>
                  <Select value={vehicleYear} onValueChange={setVehicleYear}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Annee" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {yearOptions.map(y => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Type */}
                <div>
                  <Label>Type</Label>
                  <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Color palette */}
              <div>
                <Label>Couleur du vehicule *</Label>
                <div className="grid grid-cols-6 gap-2 mt-2">
                  {VEHICLE_COLORS.map(c => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => { setVehicleColor(c.name); setVehicleColorHex(c.hex); }}
                      className={cn(
                        'flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 transition-all',
                        vehicleColor === c.name
                          ? 'border-red-600 bg-red-50 scale-105'
                          : 'border-transparent hover:border-border'
                      )}
                      title={c.name}
                    >
                      <div
                        className="w-8 h-8 rounded-full border border-border shadow-sm"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="text-[9px] text-muted-foreground leading-tight text-center">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Plate */}
              <div>
                <Label>Plaque d'immatriculation *</Label>
                <Input
                  value={vehiclePlate}
                  onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
                  placeholder="ABC 123"
                  className="mt-1 font-mono tracking-wider"
                />
              </div>

              {/* Seats */}
              <div>
                <Label>Nombre de sieges</Label>
                <Select value={vehicleSeats} onValueChange={setVehicleSeats}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['2','3','4','5','6','7','8'].map(n => <SelectItem key={n} value={n}>{n} sieges</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Vehicle Badge Preview */}
              {vehicleMake && vehicleModel && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Apercu du badge vehicule (visible par le client)</Label>
                  <VehicleBadge
                    make={vehicleMake}
                    model={vehicleModel}
                    year={vehicleYear}
                    color={vehicleColor}
                    colorHex={vehicleColorHex}
                    plate={vehiclePlate}
                  />
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <Car className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Exigences KULOOC</p>
                    <ul className="text-xs text-blue-700 mt-1 space-y-0.5">
                      <li>Vehicule de {MIN_VEHICLE_YEAR} ou plus recent</li>
                      <li>4 portes minimum</li>
                      <li>Bon etat general, propre et sans dommages</li>
                      <li>Assurance commerciale valide</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Terms + Review */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {/* Review summary */}
              <div className="bg-muted rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resume</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Nom :</span> <span className="font-medium text-foreground">{firstName} {lastName}</span></div>
                  <div><span className="text-muted-foreground">Tel :</span> <span className="font-medium text-foreground">{phone}</span></div>
                </div>
              </div>

              {/* Badge */}
              <VehicleBadge make={vehicleMake} model={vehicleModel} year={vehicleYear} color={vehicleColor} colorHex={vehicleColorHex} plate={vehiclePlate} />

              {/* Documents checkboxes */}
              <div className="space-y-3">
                {[
                  { id: 'license', label: 'Permis de conduire valide (Classe 5)', state: hasLicense, setter: setHasLicense },
                  { id: 'insurance', label: 'Assurance automobile commerciale valide', state: hasInsurance, setter: setHasInsurance },
                  { id: 'registration', label: 'Certificat d\'immatriculation du vehicule', state: hasRegistration, setter: setHasRegistration },
                ].map(item => (
                  <label key={item.id} className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors',
                    item.state ? 'border-green-500 bg-green-50' : 'border-border bg-background hover:border-muted-foreground/30'
                  )}>
                    <input type="checkbox" checked={item.state} onChange={e => item.setter(e.target.checked)} className="w-5 h-5 accent-green-500" />
                    <span className={cn('text-sm', item.state ? 'text-green-800 font-medium' : 'text-foreground')}>{item.label}</span>
                    {item.state && <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />}
                  </label>
                ))}
              </div>

              {/* Terms */}
              <label className={cn(
                'flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors',
                agreeTerms ? 'border-red-500 bg-red-50' : 'border-border bg-background hover:border-muted-foreground/30'
              )}>
                <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} className="w-5 h-5 accent-red-600 mt-0.5" />
                <p className="text-sm text-foreground">
                  J'accepte les{' '}
                  <Link href="/help" className="text-red-600 underline">conditions de service</Link>
                  {' '}et la{' '}
                  <Link href="/help" className="text-red-600 underline">politique de confidentialite</Link>
                  {' '}de KULOOC.
                </p>
              </label>
            </div>
          )}

          {/* Nav Buttons */}
          <div className="flex gap-3 mt-6">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack} disabled={isSubmitting} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" /> Retour
              </Button>
            )}
            {currentStep < 3 ? (
              <Button onClick={handleNext} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                Continuer <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creation...</>
                ) : (
                  <><CheckCircle className="h-4 w-4 mr-2" /> Soumettre</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
