'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/provider';
import { collection, addDoc, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, storage } from '@/firebase/client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, CheckCircle2, FileText, AlertCircle, Wrench, Shield, Clipboard, CreditCard, Car, Camera } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const DOCUMENT_CATEGORIES = [
  {
    id: 'inspection',
    name: 'Inspection mecanique',
    description: 'Certificat inspection mecanique valide',
    icon: Wrench,
    required: true,
    hasExpiration: true,
  },
  {
    id: 'insurance',
    name: 'Assurance',
    description: 'Preuve assurance automobile',
    icon: Shield,
    required: true,
    hasExpiration: true,
  },
  {
    id: 'background_check',
    name: 'Verification des antecedents',
    description: 'Verification antecedents criminels et dossier de conduite',
    icon: Clipboard,
    required: true,
    hasExpiration: false,
  },
  {
    id: 'drivers_license',
    name: 'Permis de conduire',
    description: 'Photo recto et verso du permis',
    icon: CreditCard,
    required: true,
    hasExpiration: true,
  },
  {
    id: 'vehicle_registration',
    name: 'Enregistrement du vehicule',
    description: 'Certificat immatriculation',
    icon: FileText,
    required: true,
    hasExpiration: true,
  },
  {
    id: 'license_plate',
    name: 'Plaque immatriculation',
    description: 'Photo de la plaque du vehicule',
    icon: Car,
    required: true,
    hasExpiration: false,
  },
  {
    id: 'vehicle_photos',
    name: 'Photos du vehicule',
    description: 'Photos avant, arriere, cotes gauche/droit, interieur',
    icon: Camera,
    required: true,
    hasExpiration: false,
  },
];

const PROVINCIAL_REQUIREMENTS = {
  QC: {
    name: 'Quebec',
    licenseClass: 'Classe 4A',
    minInsurance: '2M$',
    inspectionFrequency: 'Annuelle',
  },
  ON: {
    name: 'Ontario',
    licenseClass: 'Classe G',
    minInsurance: '2M$',
    inspectionFrequency: 'Annuelle',
  },
  NB: {
    name: 'Nouveau-Brunswick',
    licenseClass: 'Classe 4',
    minInsurance: '1M$',
    inspectionFrequency: 'Annuelle',
  },
  NS: {
    name: 'Nouvelle-Ecosse',
    licenseClass: 'Classe 4',
    minInsurance: '1M$',
    inspectionFrequency: 'Annuelle',
  },
};

export default function DriverDocumentsUploadPage() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [expirationDate, setExpirationDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [driverProvince, setDriverProvince] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadDriverProfile();
      loadUploadedDocuments();
    }
  }, [user]);

  const loadDriverProfile = async () => {
    if (!user) return;
    
    try {
      const driverRef = doc(db, 'drivers', user.uid);
      const driverSnap = await getDoc(driverRef);
      
      if (driverSnap.exists()) {
        const data = driverSnap.data();
        setDriverProvince(data.address?.province || data.vehicle?.province || '');
      }
    } catch (error) {
      console.error('Error loading driver profile:', error);
    }
  };

  const loadUploadedDocuments = async () => {
    if (!user) return;
    
    try {
      const q = query(
        collection(db, 'driver_documents'),
        where('driverId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUploadedDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          title: 'Type de fichier non supporte',
          description: 'Veuillez uploader une image (JPG, PNG) ou un PDF.',
          variant: 'destructive',
        });
        return;
      }
      
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: 'Fichier trop volumineux',
          description: 'La taille maximale est de 10 MB.',
          variant: 'destructive',
        });
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const uploadDocument = async () => {
    if (!selectedCategory || !file || !user) {
      toast({
        title: 'Informations manquantes',
        description: 'Veuillez selectionner une categorie et un fichier.',
        variant: 'destructive',
      });
      return;
    }
    
    const category = DOCUMENT_CATEGORIES.find(c => c.id === selectedCategory);
    if (category?.hasExpiration && !expirationDate) {
      toast({
        title: 'Date expiration requise',
        description: 'Veuillez entrer la date expiration du document.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const fileExtension = file.name.split('.').pop();
      const fileName = `${selectedCategory}_${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage, `drivers/${user.uid}/documents/${fileName}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      await addDoc(collection(db, 'driver_documents'), {
        driverId: user.uid,
        type: selectedCategory,
        fileUrl: downloadURL,
        fileName: file.name,
        status: 'pending',
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        uploadedAt: new Date(),
      });
      
      toast({
        title: 'Document uploade',
        description: 'Votre document est en cours de verification.',
      });
      
      setSelectedCategory('');
      setFile(null);
      setExpirationDate('');
      
      await loadUploadedDocuments();
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

  const getCategoryStatus = (categoryId: string) => {
    const doc = uploadedDocuments.find(d => d.type === categoryId);
    if (!doc) return { status: 'missing', label: 'Manquant', color: 'bg-gray-500' };
    
    switch (doc.status) {
      case 'approved':
        return { status: 'approved', label: 'Approuve', color: 'bg-green-500' };
      case 'pending':
        return { status: 'pending', label: 'En attente', color: 'bg-yellow-500' };
      case 'rejected':
        return { status: 'rejected', label: 'Rejete', color: 'bg-red-500' };
      case 'expired':
        return { status: 'expired', label: 'Expire', color: 'bg-red-600' };
      default:
        return { status: 'missing', label: 'Manquant', color: 'bg-gray-500' };
    }
  };

  const completedDocuments = uploadedDocuments.filter(d => d.status === 'approved').length;
  const totalDocuments = DOCUMENT_CATEGORIES.length;
  const progress = (completedDocuments / totalDocuments) * 100;

  const provincialReq = driverProvince ? PROVINCIAL_REQUIREMENTS[driverProvince as keyof typeof PROVINCIAL_REQUIREMENTS] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-5xl">🇨🇦</span>
            <h1 className="text-3xl font-bold text-red-600">KULOOC</h1>
          </div>
          <p className="text-gray-600 font-medium">Gestion des documents</p>
          <p className="text-sm text-gray-500">100% Canadian Production</p>
        </div>

        <Card className="mb-6 border-2 border-red-100">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Documents approuves: {completedDocuments} / {totalDocuments}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {provincialReq && (
          <Card className="mb-6 border-2 border-blue-100 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-2xl">📍</span>
                Exigences pour {provincialReq.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Permis requis</p>
                  <p className="font-semibold">{provincialReq.licenseClass}</p>
                </div>
                <div>
                  <p className="text-gray-600">Assurance minimale</p>
                  <p className="font-semibold">{provincialReq.minInsurance}</p>
                </div>
                <div>
                  <p className="text-gray-600">Inspection</p>
                  <p className="font-semibold">{provincialReq.inspectionFrequency}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6 border-2 border-red-100">
          <CardHeader>
            <CardTitle>Documents requis</CardTitle>
            <CardDescription>
              Cliquez sur une categorie pour uploader un document
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DOCUMENT_CATEGORIES.map((category) => {
                const status = getCategoryStatus(category.id);
                const IconComponent = category.icon;
                return (
                  <div
                    key={category.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedCategory === category.id
                        ? 'border-red-600 bg-red-50'
                        : 'border-gray-200 hover:border-red-300'
                    }`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-6 w-6 text-red-600" />
                        <div>
                          <h3 className="font-semibold text-sm">{category.name}</h3>
                          <p className="text-xs text-gray-600">{category.description}</p>
                        </div>
                      </div>
                      <Badge className={`${status.color} text-white text-xs`}>
                        {status.label}
                      </Badge>
                    </div>
                    {category.required && (
                      <p className="text-xs text-red-600 font-medium">* Obligatoire</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {selectedCategory && (
          <Card className="border-2 border-red-100 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-lg">
              <CardTitle className="text-xl flex items-center gap-2">
                {(() => {
                  const category = DOCUMENT_CATEGORIES.find(c => c.id === selectedCategory);
                  if (!category) return null;
                  const IconComponent = category.icon;
                  return (
                    <>
                      <IconComponent className="h-6 w-6" />
                      {category.name}
                    </>
                  );
                })()}
              </CardTitle>
              <CardDescription className="text-red-100">
                {DOCUMENT_CATEGORIES.find(c => c.id === selectedCategory)?.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="file">Fichier (JPG, PNG ou PDF - Max 10MB)</Label>
                <Input
                  id="file"
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                {file && (
                  <p className="text-sm text-green-600 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {DOCUMENT_CATEGORIES.find(c => c.id === selectedCategory)?.hasExpiration && (
                <div className="space-y-2">
                  <Label htmlFor="expiration">Date expiration *</Label>
                  <Input
                    id="expiration"
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCategory('');
                    setFile(null);
                    setExpirationDate('');
                  }}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={uploadDocument}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  disabled={isLoading || !file}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Upload en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-5 w-5" />
                      Uploader
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 flex gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/driver')}
            className="flex-1"
          >
            Retour au tableau de bord
          </Button>
          {completedDocuments === totalDocuments && (
            <Button
              onClick={() => router.push('/driver')}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Tous les documents sont uploades
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
