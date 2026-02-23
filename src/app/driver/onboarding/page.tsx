'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/provider';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, initializeFirebase } from '@/firebase';
import { getStorage } from 'firebase/storage';

const { firebaseApp } = initializeFirebase();
const storage = getStorage(firebaseApp);
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, CheckCircle2, Camera } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const PROVINCES = [
  { value: 'QC', label: 'Québec' },
  { value: 'ON', label: 'Ontario' },
  { value: 'NB', label: 'Nouveau-Brunswick' },
  { value: 'NS', label: 'Nouvelle-Écosse' },
  { value: 'BC', label: 'Colombie-Britannique' },
  { value: 'AB', label: 'Alberta' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'PE', label: 'Île-du-Prince-Édouard' },
  { value: 'NL', label: 'Terre-Neuve-et-Labrador' },
];

const CAR_MAKES = [
  'Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan', 'Mazda', 'Hyundai', 'Kia',
  'Volkswagen', 'BMW', 'Mercedes-Benz', 'Audi', 'Tesla', 'Subaru', 'Jeep', 'Ram',
  'GMC', 'Dodge', 'Lexus', 'Acura', 'Infiniti', 'Volvo', 'Porsche', 'Autre'
];

const COLORS = [
  'Noir', 'Blanc', 'Gris', 'Argent', 'Bleu', 'Rouge', 'Vert', 'Beige', 'Brun', 'Orange', 'Jaune', 'Autre'
];

export default function DriverOnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  
  // Étape 1: Profil personnel
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [ssn, setSsn] = useState('');
  
  // Étape 2: Véhicule
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [mileage, setMileage] = useState('');
  const [vehicleProvince, setVehicleProvince] = useState('');

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setPhone(user.phoneNumber || '');
    }
  }, [user]);

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadProfilePhoto = async (): Promise<string | null> => {
    if (!profilePhotoFile || !user) return null;
    
    try {
      const storageRef = ref(storage, `drivers/${user.uid}/profile-photo.jpg`);
      await uploadBytes(storageRef, profilePhotoFile);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      return null;
    }
  };

  const handleStep1Submit = async () => {
    if (!firstName || !lastName || !phone || !email || !street || !city || !province || !postalCode || !dateOfBirth) {
      toast({
        title: 'Champs manquants',
        description: 'Veuillez remplir tous les champs obligatoires.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!profilePhotoFile) {
      toast({
        title: 'Photo requise',
        description: 'Veuillez ajouter une photo de profil.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const profilePhotoURL = await uploadProfilePhoto();
      
      if (!user) return;
      
      const driverRef = doc(db, 'drivers', user.uid);
      await updateDoc(driverRef, {
        firstName,
        lastName,
        phone,
        email,
        address: {
          street,
          city,
          province,
          postalCode,
        },
        dateOfBirth: new Date(dateOfBirth),
        ssn: ssn || null,
        profilePhoto: profilePhotoURL,
        updatedAt: new Date(),
      });
      
      toast({
        title: '✅ Profil enregistré !',
        description: 'Passons maintenant à votre véhicule.',
      });
      
      setCurrentStep(2);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2Submit = async () => {
    if (!make || !model || !year || !color || !licensePlate || !mileage || !vehicleProvince) {
      toast({
        title: 'Champs manquants',
        description: 'Veuillez remplir tous les champs du véhicule.',
        variant: 'destructive',
      });
      return;
    }
    
    const currentYear = new Date().getFullYear();
    const vehicleYear = parseInt(year);
    
    if (currentYear - vehicleYear > 10) {
      toast({
        title: 'Véhicule trop ancien',
        description: 'Votre véhicule doit avoir moins de 10 ans.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      if (!user) return;
      
      const driverRef = doc(db, 'drivers', user.uid);
      await updateDoc(driverRef, {
        vehicle: {
          make,
          model,
          year: parseInt(year),
          color,
          licensePlate,
          mileage: parseInt(mileage),
          province: vehicleProvince,
        },
        updatedAt: new Date(),
      });
      
      toast({
        title: '✅ Véhicule enregistré !',
        description: 'Passons maintenant aux documents.',
      });
      
      setCurrentStep(3);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalizeOnboarding = async () => {
    setIsLoading(true);
    try {
      if (!user) return;
      
      const driverRef = doc(db, 'drivers', user.uid);
      await updateDoc(driverRef, {
        onboardingCompleted: true,
        status: 'pending',
        updatedAt: new Date(),
      });
      
      toast({
        title: '🎉 Inscription terminée !',
        description: 'Votre dossier est en cours de vérification.',
      });
      
      router.push('/driver/documents');
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const progress = (currentStep / 3) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-5xl">🇨🇦</span>
            <h1 className="text-3xl font-bold text-red-600">KULOOC</h1>
          </div>
          <p className="text-gray-600 font-medium">Configuration de votre compte chauffeur</p>
          <p className="text-sm text-gray-500">100% Canadian Production 🍁</p>
        </div>

        {/* Progress */}
        <Card className="mb-6 border-2 border-red-100">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Étape {currentStep} sur 3</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Étape 1: Profil personnel */}
        {currentStep === 1 && (
          <Card className="border-2 border-red-100 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-lg">
              <CardTitle className="text-2xl">Étape 1: Profil personnel</CardTitle>
              <CardDescription className="text-red-100">
                Remplissez vos informations personnelles
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-6 space-y-6">
              {/* Photo de profil */}
              <div className="space-y-2">
                <Label className="text-red-600 font-semibold">Photo de profil *</Label>
                <div className="flex flex-col items-center gap-4">
                  {profilePhotoPreview ? (
                    <div className="relative">
                      <img
                        src={profilePhotoPreview}
                        alt="Profile"
                        className="w-32 h-32 rounded-full object-cover border-4 border-red-600"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="absolute bottom-0 right-0 rounded-full"
                        onClick={() => document.getElementById('profile-photo-input')?.click()}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-dashed border-gray-300">
                      <Upload className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <input
                    id="profile-photo-input"
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhotoChange}
                    className="hidden"
                  />
                  {!profilePhotoPreview && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('profile-photo-input')?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Ajouter une photo
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Photo réelle obligatoire (pas d'avatar)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jean"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Dupont"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jean@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (514) 123-4567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="street">Adresse *</Label>
                <Input
                  id="street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="123 Rue Principale"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Ville *</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Montréal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">Province *</Label>
                  <Select value={province} onValueChange={setProvince}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVINCES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Code postal *</Label>
                  <Input
                    id="postalCode"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="H1A 1A1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date de naissance *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ssn">Numéro SSN (optionnel)</Label>
                  <Input
                    id="ssn"
                    value={ssn}
                    onChange={(e) => setSsn(e.target.value)}
                    placeholder="123-456-789"
                  />
                </div>
              </div>

              <Button
                onClick={handleStep1Submit}
                className="w-full h-12 text-base bg-red-600 hover:bg-red-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    Continuer
                    <CheckCircle2 className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Étape 2: Véhicule */}
        {currentStep === 2 && (
          <Card className="border-2 border-red-100 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-lg">
              <CardTitle className="text-2xl">Étape 2: Informations du véhicule</CardTitle>
              <CardDescription className="text-red-100">
                Véhicule de moins de 10 ans obligatoire
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="make">Marque *</Label>
                  <Select value={make} onValueChange={setMake}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAR_MAKES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Modèle *</Label>
                  <Input
                    id="model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Camry"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Année *</Label>
                  <Input
                    id="year"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="2022"
                    min={new Date().getFullYear() - 10}
                    max={new Date().getFullYear()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Couleur *</Label>
                  <Select value={color} onValueChange={setColor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {COLORS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mileage">Kilométrage *</Label>
                  <Input
                    id="mileage"
                    type="number"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                    placeholder="50000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="licensePlate">Plaque d'immatriculation *</Label>
                  <Input
                    id="licensePlate"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder="ABC123"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleProvince">Province *</Label>
                  <Select value={vehicleProvince} onValueChange={setVehicleProvince}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVINCES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1"
                >
                  ← Retour
                </Button>
                <Button
                  onClick={handleStep2Submit}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      Continuer
                      <CheckCircle2 className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Étape 3: Documents */}
        {currentStep === 3 && (
          <Card className="border-2 border-red-100 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-lg">
              <CardTitle className="text-2xl">Étape 3: Documents requis</CardTitle>
              <CardDescription className="text-red-100">
                Vous allez maintenant uploader vos documents
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-6 space-y-6">
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
                <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-green-800 mb-2">
                  Profil créé avec succès !
                </h3>
                <p className="text-green-700 mb-4">
                  Vous allez maintenant être redirigé vers la page de gestion des documents.
                </p>
                <p className="text-sm text-gray-600">
                  Documents requis :
                </p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• Inspection mécanique</li>
                  <li>• Assurance</li>
                  <li>• Vérification des antécédents</li>
                  <li>• Permis de conduire</li>
                  <li>• Enregistrement du véhicule</li>
                  <li>• Photo de la plaque</li>
                  <li>• Photos du véhicule (4 angles + intérieur)</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1"
                >
                  ← Retour
                </Button>
                <Button
                  onClick={handleFinalizeOnboarding}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Finalisation...
                    </>
                  ) : (
                    <>
                      Aller aux documents
                      <CheckCircle2 className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
