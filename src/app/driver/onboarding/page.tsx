'use client';

/**
 * KULOOC — Page d'onboarding chauffeur
 * Inscription complète en 4 étapes avec création du profil Firestore
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/provider';
import { db } from '@/firebase';
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { MapPin, Car, User, FileText, CheckCircle, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const STEPS = [
  { id: 1, title: 'Informations personnelles', icon: User },
  { id: 2, title: 'Véhicule', icon: Car },
  { id: 3, title: 'Documents', icon: FileText },
  { id: 4, title: 'Confirmation', icon: CheckCircle },
];

const PROVINCES = [
  'Alberta', 'Colombie-Britannique', 'Manitoba', 'Nouveau-Brunswick',
  'Terre-Neuve-et-Labrador', 'Nouvelle-Écosse', 'Ontario', 'Île-du-Prince-Édouard',
  'Québec', 'Saskatchewan',
];

const VEHICLE_TYPES = [
  { value: 'sedan', label: 'Berline' },
  { value: 'suv', label: 'VUS' },
  { value: 'minivan', label: 'Minifourgonnette' },
  { value: 'luxury', label: 'Luxe' },
  { value: 'electric', label: 'Électrique' },
];

export default function DriverOnboardingPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Personal info
  const [firstName, setFirstName] = useState(user?.displayName?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user?.displayName?.split(' ').slice(1).join(' ') || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('Québec');
  const [postalCode, setPostalCode] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [ssn, setSsn] = useState('');

  // Step 2: Vehicle
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('sedan');
  const [vehicleSeats, setVehicleSeats] = useState('4');

  // Step 3: Documents (just acknowledgment for now)
  const [hasLicense, setHasLicense] = useState(false);
  const [hasInsurance, setHasInsurance] = useState(false);
  const [hasRegistration, setHasRegistration] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!firstName.trim() || !lastName.trim()) {
          toast({ title: 'Erreur', description: 'Prénom et nom requis.', variant: 'destructive' });
          return false;
        }
        if (!email.trim() || !email.includes('@')) {
          toast({ title: 'Erreur', description: 'Email valide requis.', variant: 'destructive' });
          return false;
        }
        if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
          toast({ title: 'Erreur', description: 'Numéro de téléphone valide requis (10 chiffres).', variant: 'destructive' });
          return false;
        }
        if (!address.trim() || !city.trim() || !postalCode.trim()) {
          toast({ title: 'Erreur', description: 'Adresse complète requise.', variant: 'destructive' });
          return false;
        }
        if (!birthDate) {
          toast({ title: 'Erreur', description: 'Date de naissance requise.', variant: 'destructive' });
          return false;
        }
        return true;
      case 2:
        if (!vehicleMake.trim() || !vehicleModel.trim() || !vehicleYear.trim()) {
          toast({ title: 'Erreur', description: 'Informations du véhicule requises.', variant: 'destructive' });
          return false;
        }
        if (!vehiclePlate.trim()) {
          toast({ title: 'Erreur', description: 'Plaque d\'immatriculation requise.', variant: 'destructive' });
          return false;
        }
        const year = parseInt(vehicleYear);
        if (isNaN(year) || year < 2010 || year > new Date().getFullYear() + 1) {
          toast({ title: 'Erreur', description: 'Année du véhicule invalide (2010 ou plus récent).', variant: 'destructive' });
          return false;
        }
        return true;
      case 3:
        if (!hasLicense || !hasInsurance || !hasRegistration) {
          toast({ title: 'Erreur', description: 'Vous devez confirmer avoir tous les documents requis.', variant: 'destructive' });
          return false;
        }
        if (!agreeTerms) {
          toast({ title: 'Erreur', description: 'Vous devez accepter les conditions de service.', variant: 'destructive' });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!user?.uid) {
      toast({ title: 'Erreur', description: 'Vous devez être connecté pour vous inscrire.', variant: 'destructive' });
      router.push('/login?redirect=/driver/onboarding');
      return;
    }

    setIsSubmitting(true);
    try {
      // Vérifier si le chauffeur existe déjà
      const existingQuery = query(
        collection(db, 'drivers'),
        where('userId', '==', user.uid)
      );
      const existingDocs = await getDocs(existingQuery);
      
      if (!existingDocs.empty) {
        toast({ title: 'Compte existant', description: 'Vous avez déjà un profil chauffeur KULOOC.', variant: 'default' });
        router.push('/driver');
        return;
      }

      // Créer le document chauffeur avec userId = auth.uid (requis par les règles Firestore)
      const driverDocRef = doc(collection(db, 'drivers'));
      await setDoc(driverDocRef, {
        // Champ requis par les règles Firestore: userId doit correspondre à request.auth.uid
        userId: user.uid,
        
        // Informations personnelles
        name: `${firstName.trim()} ${lastName.trim()}`,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: {
          street: address.trim(),
          city: city.trim(),
          province: province,
          postalCode: postalCode.trim().toUpperCase(),
        },
        birthDate: birthDate,
        
        // Véhicule
        vehicle: {
          make: vehicleMake.trim(),
          model: vehicleModel.trim(),
          year: parseInt(vehicleYear),
          color: vehicleColor.trim(),
          plate: vehiclePlate.trim().toUpperCase(),
          type: vehicleType,
          seats: parseInt(vehicleSeats),
        },
        
        // Statut initial
        status: 'offline',
        isActive: false,
        isApproved: false, // En attente d'approbation par l'admin
        
        // Localisation (Montréal par défaut)
        location: {
          latitude: 45.5088,
          longitude: -73.5540,
          lastUpdated: serverTimestamp(),
        },
        
        // Métriques initiales
        averageRating: 0,
        totalRatings: 0,
        acceptanceRate: 100,
        completionRate: 100,
        totalRides: 0,
        earningsToday: 0,
        earningsWeek: 0,
        earningsTotal: 0,
        
        // Documents (à uploader)
        documents: {
          driverLicense: { status: 'pending', url: null },
          insurance: { status: 'pending', url: null },
          vehicleRegistration: { status: 'pending', url: null },
          profilePhoto: { status: 'pending', url: user.photoURL || null },
        },
        
        // Métadonnées
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        photoURL: user.photoURL || null,
        languages: ['fr', 'en'],
        serviceTypes: [vehicleType],
      });

      toast({
        title: '✅ Inscription réussie !',
        description: 'Votre profil chauffeur a été créé. Un administrateur examinera votre dossier sous 24-48h.',
      });

      // Rediriger vers le tableau de bord chauffeur
      setTimeout(() => router.push('/driver'), 2000);

    } catch (err: any) {
      console.error('Onboarding error:', err);
      toast({
        title: 'Erreur',
        description: err.message || 'Une erreur est survenue. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Connexion requise</h2>
          <p className="text-gray-500 mb-4">Vous devez être connecté pour vous inscrire comme chauffeur.</p>
          <Link href="/login?redirect=/driver/onboarding">
            <Button className="bg-primary text-white">Se connecter</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3">
        <Link href="/" className="text-2xl font-bold text-primary">KULOOC 🍁</Link>
        <span className="text-gray-400">|</span>
        <span className="text-gray-600 font-medium">Inscription chauffeur</span>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex flex-col items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    isCompleted ? 'bg-green-500 text-white' :
                    isCurrent ? 'bg-primary text-white' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-xs mt-1 hidden sm:block ${isCurrent ? 'text-primary font-semibold' : 'text-gray-400'}`}>
                    {step.title.split(' ')[0]}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-lg mx-auto p-4">
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-xl font-bold mb-1">{STEPS[currentStep - 1].title}</h2>
          <p className="text-gray-500 text-sm mb-6">Étape {currentStep} sur {STEPS.length}</p>

          {/* Step 1: Personal Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">Prénom *</Label>
                  <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jean" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="lastName">Nom *</Label>
                  <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Tremblay" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jean@email.com" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="phone">Téléphone *</Label>
                  <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="5141234567" className="mt-1" />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Adresse *</Label>
                <Input id="address" value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Rue Principale" className="mt-1" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="city">Ville *</Label>
                  <Input id="city" value={city} onChange={e => setCity(e.target.value)} placeholder="Montréal" className="mt-1" />
                </div>
                <div>
                  <Label>Province *</Label>
                  <Select value={province} onValueChange={setProvince}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="postalCode">Code postal *</Label>
                  <Input id="postalCode" value={postalCode} onChange={e => setPostalCode(e.target.value.toUpperCase())} placeholder="H7W 3G5" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="birthDate">Date de naissance *</Label>
                  <Input id="birthDate" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="ssn">Numéro NAS (optionnel)</Label>
                  <Input id="ssn" value={ssn} onChange={e => setSsn(e.target.value)} placeholder="123-456-789" className="mt-1" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Vehicle */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="vehicleMake">Marque *</Label>
                  <Input id="vehicleMake" value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} placeholder="Toyota" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="vehicleModel">Modèle *</Label>
                  <Input id="vehicleModel" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} placeholder="Camry" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="vehicleYear">Année *</Label>
                  <Input id="vehicleYear" type="number" value={vehicleYear} onChange={e => setVehicleYear(e.target.value)} placeholder="2022" min="2010" max="2026" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="vehicleColor">Couleur</Label>
                  <Input id="vehicleColor" value={vehicleColor} onChange={e => setVehicleColor(e.target.value)} placeholder="Noir" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="vehiclePlate">Plaque *</Label>
                  <Input id="vehiclePlate" value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value.toUpperCase())} placeholder="ABC 123" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type de véhicule *</Label>
                  <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nombre de sièges</Label>
                  <Select value={vehicleSeats} onValueChange={setVehicleSeats}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['2','3','4','5','6','7','8'].map(n => <SelectItem key={n} value={n}>{n} sièges</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-2">
                <div className="flex items-start gap-2">
                  <Car className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Exigences du véhicule KULOOC</p>
                    <ul className="text-xs text-blue-700 mt-1 space-y-0.5">
                      <li>• Véhicule de 2010 ou plus récent</li>
                      <li>• 4 portes minimum (sauf catégorie Luxe)</li>
                      <li>• Bon état général, propre et sans dommages visibles</li>
                      <li>• Assurance commerciale valide au Québec</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Documents */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-amber-800 mb-1">Documents requis</p>
                <p className="text-xs text-amber-700">Vous pourrez uploader vos documents depuis votre tableau de bord après l'inscription. Confirmez d'abord que vous les possédez.</p>
              </div>

              <div className="space-y-3">
                {[
                  { id: 'license', label: 'Permis de conduire valide (Classe 5)', state: hasLicense, setter: setHasLicense },
                  { id: 'insurance', label: 'Assurance automobile commerciale valide', state: hasInsurance, setter: setHasInsurance },
                  { id: 'registration', label: 'Certificat d\'immatriculation du véhicule', state: hasRegistration, setter: setHasRegistration },
                ].map(doc => (
                  <label key={doc.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${doc.state ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <input
                      type="checkbox"
                      checked={doc.state}
                      onChange={e => doc.setter(e.target.checked)}
                      className="w-5 h-5 accent-green-500"
                    />
                    <div>
                      <p className={`text-sm font-medium ${doc.state ? 'text-green-800' : 'text-gray-700'}`}>{doc.label}</p>
                      <p className="text-xs text-gray-400">Je confirme posséder ce document valide</p>
                    </div>
                    {doc.state && <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />}
                  </label>
                ))}
              </div>

              <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${agreeTerms ? 'border-primary bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={e => setAgreeTerms(e.target.checked)}
                  className="w-5 h-5 accent-red-600 mt-0.5"
                />
                <p className="text-sm text-gray-700">
                  J'accepte les{' '}
                  <Link href="/terms" className="text-primary underline">conditions de service</Link>
                  {' '}et la{' '}
                  <Link href="/privacy" className="text-primary underline">politique de confidentialité</Link>
                  {' '}de KULOOC. Je comprends que mon dossier sera examiné par l'équipe KULOOC.
                </p>
              </label>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="font-semibold text-green-800">Tout est prêt !</p>
                </div>
                <p className="text-sm text-green-700">Vérifiez vos informations avant de soumettre votre candidature.</p>
              </div>

              <div className="space-y-3">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Informations personnelles</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Nom :</span> <span className="font-medium">{firstName} {lastName}</span></div>
                    <div><span className="text-gray-500">Email :</span> <span className="font-medium">{email}</span></div>
                    <div><span className="text-gray-500">Téléphone :</span> <span className="font-medium">{phone}</span></div>
                    <div><span className="text-gray-500">Ville :</span> <span className="font-medium">{city}, {province}</span></div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Véhicule</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Véhicule :</span> <span className="font-medium">{vehicleYear} {vehicleMake} {vehicleModel}</span></div>
                    <div><span className="text-gray-500">Plaque :</span> <span className="font-medium">{vehiclePlate}</span></div>
                    <div><span className="text-gray-500">Type :</span> <span className="font-medium">{VEHICLE_TYPES.find(t => t.value === vehicleType)?.label}</span></div>
                    <div><span className="text-gray-500">Sièges :</span> <span className="font-medium">{vehicleSeats}</span></div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs text-amber-700">
                    <strong>Prochaines étapes :</strong> Après soumission, notre équipe examinera votre dossier sous 24-48h. Vous recevrez un email de confirmation à <strong>{email}</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-6">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
                className="flex-1"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
            )}
            {currentStep < 4 ? (
              <Button
                onClick={handleNext}
                className="flex-1 bg-primary text-white hover:bg-primary/90"
              >
                Continuer
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-primary text-white hover:bg-primary/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création du compte...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Soumettre ma candidature
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
