'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/provider';
import {
  ChevronLeft, GraduationCap, Upload, ExternalLink, CheckCircle2,
  Clock, Info, ChevronRight, FileText, X, Camera, RefreshCw
} from 'lucide-react';

type Province = {
  code: string;
  name: string;
  certName: string;
  authority: string;
  description: string;
  requirements: string[];
  duration: string;
  cost: string;
  renewalYears: number;
  onlineAvailable: boolean;
  registrationUrl: string;
  infoUrl: string;
};

const PROVINCES: Province[] = [
  {
    code: 'QC',
    name: 'Québec',
    certName: 'Attestation de formation en transport de personnes (AFTP)',
    authority: 'Commission des transports du Québec (CTQ)',
    description: 'Formation obligatoire pour tous les chauffeurs de VTC et taxi au Québec. Couvre la sécurité routière, le service à la clientèle et la réglementation provinciale.',
    requirements: ['Permis de conduire classe 5 valide', 'Dossier de conduite propre (moins de 4 points)', 'Être âgé de 18 ans ou plus', 'Réussir l\'examen théorique'],
    duration: '35 heures (théorie + pratique)',
    cost: '250-400 $ CAD',
    renewalYears: 3,
    onlineAvailable: true,
    registrationUrl: 'https://www.ctq.gouv.qc.ca/transport-de-personnes/formation',
    infoUrl: 'https://www.ctq.gouv.qc.ca',
  },
  {
    code: 'ON',
    name: 'Ontario',
    certName: 'Taxi and Limousine Operator Licence',
    authority: 'Ministry of Transportation Ontario (MTO)',
    description: 'Certification requise pour opérer un service de transport rémunéré en Ontario. Inclut formation sur les lois provinciales et municipales.',
    requirements: ['Permis de conduire classe G valide', 'Vérification des antécédents judiciaires', 'Inspection du véhicule', 'Formation approuvée par la ville'],
    duration: '20-40 heures selon la ville',
    cost: '150-350 $ CAD',
    renewalYears: 2,
    onlineAvailable: false,
    registrationUrl: 'https://www.ontario.ca/fr/page/conduire-un-taxi-ou-un-vehicule-de-location',
    infoUrl: 'https://www.ontario.ca/fr/page/conduire-un-taxi-ou-un-vehicule-de-location',
  },
  {
    code: 'BC',
    name: 'Colombie-Britannique',
    certName: 'Passenger Transportation Licence',
    authority: 'Passenger Transportation Board (PTB)',
    description: 'Licence de transport de passagers délivrée par le PTB. Formation en ligne disponible via le programme approuvé.',
    requirements: ['Permis de conduire classe 4 ou 5', 'Vérification des antécédents', 'Connaissance du Code de la route BC', 'Assurance commerciale'],
    duration: '16-24 heures',
    cost: '200-300 $ CAD',
    renewalYears: 3,
    onlineAvailable: true,
    registrationUrl: 'https://www.ptboard.bc.ca',
    infoUrl: 'https://www.ptboard.bc.ca/applications.htm',
  },
  {
    code: 'AB',
    name: 'Alberta',
    certName: 'Transportation Network Company Driver Certification',
    authority: 'Alberta Transportation',
    description: 'Certification spécifique aux chauffeurs de VTC en Alberta. Formation axée sur la sécurité et le service client.',
    requirements: ['Permis de conduire classe 5 ou supérieur', 'Vérification des antécédents', 'Véhicule de moins de 10 ans', 'Assurance commerciale approuvée'],
    duration: '12-20 heures',
    cost: '100-250 $ CAD',
    renewalYears: 2,
    onlineAvailable: true,
    registrationUrl: 'https://www.alberta.ca/transportation-network-companies.aspx',
    infoUrl: 'https://www.alberta.ca/transportation-network-companies.aspx',
  },
  {
    code: 'MB',
    name: 'Manitoba',
    certName: 'Taxi Driver Licence',
    authority: 'Taxi Board of Manitoba',
    description: 'Licence de chauffeur de taxi délivrée par le Taxi Board of Manitoba. Formation obligatoire avant l\'examen.',
    requirements: ['Permis de conduire classe 5 valide', 'Résidence au Manitoba', 'Vérification des antécédents', 'Connaissance de Winnipeg'],
    duration: '20 heures',
    cost: '150-200 $ CAD',
    renewalYears: 1,
    onlineAvailable: false,
    registrationUrl: 'https://www.winnipeg.ca/publicworks/transit/taxi',
    infoUrl: 'https://www.winnipeg.ca/publicworks/transit/taxi',
  },
  {
    code: 'SK',
    name: 'Saskatchewan',
    certName: 'Taxi Driver Permit',
    authority: 'Saskatchewan Government Insurance (SGI)',
    description: 'Permis de chauffeur de taxi délivré par SGI. Inclut formation sur la réglementation provinciale.',
    requirements: ['Permis de conduire classe 5 ou 4', 'Vérification des antécédents', 'Examen médical', 'Formation approuvée'],
    duration: '15 heures',
    cost: '100-175 $ CAD',
    renewalYears: 2,
    onlineAvailable: false,
    registrationUrl: 'https://www.sgi.sk.ca',
    infoUrl: 'https://www.sgi.sk.ca',
  },
  {
    code: 'NS',
    name: 'Nouvelle-Écosse',
    certName: 'Taxi and Limousine Driver Permit',
    authority: 'Nova Scotia Utility and Review Board (NSUARB)',
    description: 'Permis de transport de passagers délivré par le NSUARB. Formation en service client et réglementation.',
    requirements: ['Permis de conduire valide', 'Vérification des antécédents', 'Connaissance de la région', 'Véhicule inspecté'],
    duration: '10-15 heures',
    cost: '75-150 $ CAD',
    renewalYears: 2,
    onlineAvailable: false,
    registrationUrl: 'https://www.nsuarb.ca',
    infoUrl: 'https://www.nsuarb.ca',
  },
  {
    code: 'NB',
    name: 'Nouveau-Brunswick',
    certName: 'Taxi Driver Licence',
    authority: 'Service Nouveau-Brunswick',
    description: 'Licence de chauffeur de taxi délivrée par Service NB. Bilingue (français/anglais).',
    requirements: ['Permis de conduire valide', 'Vérification des antécédents', 'Connaissance bilingue', 'Formation approuvée'],
    duration: '12 heures',
    cost: '100-150 $ CAD',
    renewalYears: 2,
    onlineAvailable: false,
    registrationUrl: 'https://www2.gnb.ca/content/gnb/fr/services/services_renderer.201453.html',
    infoUrl: 'https://www2.gnb.ca',
  },
];

export default function TrainingCertificatePage() {
  const router = useRouter();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const province = PROVINCES.find(p => p.code === selectedProvince);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('Le fichier ne doit pas dépasser 10 Mo.'); return; }
    setError(null);
    setSelectedFile(file);
    if (file.type.startsWith('image/')) setPreviewUrl(URL.createObjectURL(file));
    else setPreviewUrl(null);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user?.uid || !selectedProvince) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const interval = setInterval(() => setUploadProgress(p => Math.min(p + 15, 90)), 200);
      // Simulated upload — in production, use uploadDocument service
      await new Promise(resolve => setTimeout(resolve, 2000));
      clearInterval(interval);
      setUploadProgress(100);
      setSuccess(true);
      setSelectedFile(null);
      setPreviewUrl(null);
      setTimeout(() => { setSuccess(false); setUploadProgress(0); }, 3000);
    } catch {
      setError('Erreur lors du téléversement. Réessayez.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm">
        <button onClick={() => selectedProvince ? setSelectedProvince(null) : router.push('/driver/documents')}
          className="flex items-center gap-1 text-gray-500 mb-4 -ml-1">
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm">{selectedProvince ? 'Retour aux provinces' : 'Retour aux documents'}</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-black">Attestation de formation</h1>
            <p className="text-xs text-gray-400">Formation taxi/VTC par province canadienne</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Sélection province */}
        {!selectedProvince && (
          <>
            <div className="bg-blue-50 rounded-2xl p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-600">
                  Chaque province canadienne a ses propres exigences de formation. Sélectionnez votre province pour voir les détails et téléverser votre attestation.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="font-black text-base mb-4">Sélectionnez votre province</h2>
              <div className="space-y-2">
                {PROVINCES.map(prov => (
                  <button key={prov.code} onClick={() => setSelectedProvince(prov.code)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-red-200 hover:bg-red-50 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
                        <span className="text-white text-xs font-black">{prov.code}</span>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-gray-800">{prov.name}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[200px]">{prov.certName}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Détail province sélectionnée */}
        {selectedProvince && province && (
          <>
            {/* Info certification */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-black">{province.code}</span>
                </div>
                <div>
                  <h2 className="font-black text-base">{province.name}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{province.certName}</p>
                  <p className="text-xs text-red-600 font-semibold mt-0.5">{province.authority}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">{province.description}</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Durée</p>
                  <p className="text-sm font-bold text-gray-700 mt-0.5">{province.duration}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Coût estimé</p>
                  <p className="text-sm font-bold text-gray-700 mt-0.5">{province.cost}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Renouvellement</p>
                  <p className="text-sm font-bold text-gray-700 mt-0.5">Tous les {province.renewalYears} ans</p>
                </div>
                <div className={`rounded-xl p-3 ${province.onlineAvailable ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-400">Formation en ligne</p>
                  <p className={`text-sm font-bold mt-0.5 ${province.onlineAvailable ? 'text-green-600' : 'text-gray-500'}`}>
                    {province.onlineAvailable ? 'Disponible ✓' : 'En personne'}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs font-bold text-gray-700 mb-2">Conditions requises :</p>
                <div className="space-y-1.5">
                  {province.requirements.map(req => (
                    <div key={req} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-red-600 rounded-full mt-1.5 flex-shrink-0" />
                      <p className="text-xs text-gray-600">{req}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <a href={province.registrationUrl} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white font-bold py-3 rounded-xl text-sm">
                  <ExternalLink className="h-4 w-4" />
                  S'inscrire
                </a>
                <a href={province.infoUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 border border-gray-200 text-gray-600 font-bold py-3 px-4 rounded-xl text-sm">
                  <Info className="h-4 w-4" />
                  Info
                </a>
              </div>
            </div>

            {/* Upload attestation */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="font-black text-base mb-2">Téléverser votre attestation</h2>
              <p className="text-xs text-gray-400 mb-4">
                Vous avez déjà complété la formation ? Téléversez votre attestation officielle ici.
              </p>

              {previewUrl && (
                <div className="relative mb-4 rounded-xl overflow-hidden">
                  <img src={previewUrl} alt="Prévisualisation" className="w-full h-48 object-cover" />
                  <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              )}

              {selectedFile && !previewUrl && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
                  <FileText className="h-8 w-8 text-red-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{selectedFile.name}</p>
                    <p className="text-xs text-gray-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} Mo</p>
                  </div>
                  <button onClick={() => setSelectedFile(null)}><X className="h-4 w-4 text-gray-400" /></button>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <p className="text-sm text-green-600 font-bold">Attestation soumise ! En cours de vérification.</p>
                  </div>
                </div>
              )}

              {uploading && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Téléversement...</span>
                    <span className="text-xs font-bold text-red-600">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-600 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden"
                accept="image/jpeg,image/png,image/heic,application/pdf" />

              {!selectedFile ? (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-red-300 transition-colors">
                    <Upload className="h-6 w-6 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-600">Téléverser</span>
                    <span className="text-xs text-gray-400">PDF, JPG, PNG</span>
                  </button>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-red-300 transition-colors">
                    <Camera className="h-6 w-6 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-600">Photo</span>
                    <span className="text-xs text-gray-400">Caméra</span>
                  </button>
                </div>
              ) : (
                <button onClick={handleUpload} disabled={uploading}
                  className="w-full bg-red-600 text-white font-bold py-4 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                  {uploading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Téléversement...</> : <><Upload className="h-4 w-4" /> Soumettre l'attestation</>}
                </button>
              )}

              <p className="text-xs text-gray-400 text-center mt-3">
                Formats acceptés : PDF, JPG, PNG, HEIC — Max 10 Mo
              </p>
            </div>

            {/* Aide */}
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-gray-700">Délai de vérification</p>
                  <p className="text-xs text-gray-400 mt-0.5">Notre équipe vérifie votre attestation sous 1-3 jours ouvrables. Vous serez notifié par email.</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
