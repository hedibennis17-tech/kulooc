import { db, initializeFirebase } from '@/firebase';
import {
  collection, doc, setDoc, getDoc, getDocs,
  query, where, updateDoc, serverTimestamp, onSnapshot, Unsubscribe
} from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocumentStatus = 'required' | 'pending' | 'approved' | 'rejected' | 'expiring';

export type DocumentType =
  // Identité & conduite
  | 'permis_conduire'
  | 'photo_profil'
  | 'piece_identite'
  // Véhicule
  | 'assurance_vehicule'
  | 'immatriculation'
  | 'inspection_mecanique'
  | 'certificat_propriete'
  // Antécédents judiciaires
  | 'antecedents_judiciaires'
  | 'verification_identite_tiers'
  // Formation taxi (par province)
  | 'attestation_formation_qc'
  | 'attestation_formation_on'
  | 'attestation_formation_bc'
  | 'attestation_formation_ab'
  | 'attestation_formation_mb'
  | 'attestation_formation_sk'
  | 'attestation_formation_ns'
  | 'attestation_formation_nb'
  | 'attestation_formation_pe'
  | 'attestation_formation_nl'
  // Fiscal
  | 'numero_tps_tvq'
  | 'assurance_responsabilite';

export interface DriverDocument {
  id: string;
  driverId: string;
  type: DocumentType;
  name: string;
  status: DocumentStatus;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  expiryDate?: string;
  rejectionReason?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  province?: string;
  // Pour vérification tiers
  thirdPartyRequestId?: string;
  thirdPartyProvider?: string;
  thirdPartyStatus?: 'not_started' | 'pending' | 'completed' | 'failed';
  thirdPartyResult?: string;
  consentGiven?: boolean;
  consentDate?: string;
}

export interface BackgroundCheckRequest {
  driverId: string;
  driverName: string;
  driverEmail: string;
  driverDOB: string;
  driverAddress: string;
  province: string;
  provider: 'certn' | 'checkr' | 'sterling' | 'kulooc_manual';
  consentGiven: boolean;
  consentDate: string;
  status: 'pending' | 'submitted' | 'in_progress' | 'completed' | 'failed';
  requestId?: string;
  result?: 'clear' | 'consider' | 'suspended';
  submittedAt: string;
  completedAt?: string;
  notes?: string;
}

// ─── Catalogue des documents requis ──────────────────────────────────────────

export const DOCUMENT_CATALOG: Record<DocumentType, {
  name: string;
  description: string;
  required: boolean;
  category: 'identite' | 'vehicule' | 'antecedents' | 'formation' | 'fiscal';
  hasExpiry: boolean;
  acceptedFormats: string;
  maxSizeMB: number;
  provinceSpecific?: string;
  tips: string[];
}> = {
  permis_conduire: {
    name: 'Permis de conduire',
    description: 'Permis de conduire valide de la province',
    required: true,
    category: 'identite',
    hasExpiry: true,
    acceptedFormats: 'JPG, PNG, PDF',
    maxSizeMB: 10,
    tips: ['Assurez-vous que le permis est en cours de validité', 'La photo doit être nette et lisible', 'Les 4 coins doivent être visibles'],
  },
  photo_profil: {
    name: 'Photo de profil',
    description: 'Photo récente, fond neutre, visage visible',
    required: true,
    category: 'identite',
    hasExpiry: false,
    acceptedFormats: 'JPG, PNG',
    maxSizeMB: 5,
    tips: ['Fond blanc ou neutre', 'Visage clairement visible', 'Pas de lunettes de soleil'],
  },
  piece_identite: {
    name: "Pièce d'identité",
    description: 'Passeport, carte de résident permanent ou carte de citoyenneté',
    required: true,
    category: 'identite',
    hasExpiry: true,
    acceptedFormats: 'JPG, PNG, PDF',
    maxSizeMB: 10,
    tips: ['Recto et verso requis', 'Document en cours de validité', 'Toutes les informations lisibles'],
  },
  assurance_vehicule: {
    name: 'Assurance du véhicule',
    description: 'Police d\'assurance commerciale ou de covoiturage',
    required: true,
    category: 'vehicule',
    hasExpiry: true,
    acceptedFormats: 'JPG, PNG, PDF',
    maxSizeMB: 10,
    tips: ['Doit couvrir le transport rémunéré', 'Minimum 2 000 000$ de responsabilité civile', 'Nom du propriétaire visible'],
  },
  immatriculation: {
    name: 'Immatriculation du véhicule',
    description: 'Certificat d\'immatriculation en cours de validité',
    required: true,
    category: 'vehicule',
    hasExpiry: true,
    acceptedFormats: 'JPG, PNG, PDF',
    maxSizeMB: 10,
    tips: ['Doit correspondre au véhicule utilisé', 'Plaque et numéro VIN visibles'],
  },
  inspection_mecanique: {
    name: 'Inspection mécanique',
    description: 'Rapport d\'inspection mécanique par un garage certifié',
    required: true,
    category: 'vehicule',
    hasExpiry: true,
    acceptedFormats: 'JPG, PNG, PDF',
    maxSizeMB: 10,
    tips: ['Inspection datant de moins de 12 mois', 'Effectuée par un garage certifié', 'Tous les points vérifiés'],
  },
  certificat_propriete: {
    name: 'Certificat de propriété',
    description: 'Preuve que vous êtes propriétaire ou locataire du véhicule',
    required: false,
    category: 'vehicule',
    hasExpiry: false,
    acceptedFormats: 'JPG, PNG, PDF',
    maxSizeMB: 10,
    tips: ['Requis si le véhicule n\'est pas à votre nom', 'Contrat de location accepté'],
  },
  antecedents_judiciaires: {
    name: 'Vérification des antécédents judiciaires',
    description: 'Vérification complète des antécédents criminels canadiens',
    required: true,
    category: 'antecedents',
    hasExpiry: true,
    acceptedFormats: 'PDF',
    maxSizeMB: 20,
    tips: ['Datant de moins de 6 mois', 'Vérification nationale requise', 'Vous pouvez soumettre votre propre document ou utiliser notre partenaire'],
  },
  verification_identite_tiers: {
    name: 'Vérification d\'identité (partenaire)',
    description: 'Vérification d\'identité via notre partenaire certifié Certn/Checkr',
    required: false,
    category: 'antecedents',
    hasExpiry: false,
    acceptedFormats: 'Formulaire en ligne',
    maxSizeMB: 0,
    tips: ['Processus 100% en ligne', 'Résultat en 24-48h', 'Requis pour les chauffeurs sans document existant'],
  },
  attestation_formation_qc: {
    name: 'Attestation de formation — Québec',
    description: 'Formation obligatoire SAAQ pour conducteurs de VTC au Québec',
    required: true,
    category: 'formation',
    hasExpiry: false,
    acceptedFormats: 'JPG, PNG, PDF',
    maxSizeMB: 10,
    provinceSpecific: 'QC',
    tips: ['Formation SAAQ obligatoire', '35 heures de cours', 'Certificat délivré par un établissement reconnu'],
  },
  attestation_formation_on: {
    name: 'Attestation de formation — Ontario',
    description: 'Licence de chauffeur privé délivrée par la ville ou la région',
    required: true,
    category: 'formation',
    hasExpiry: true,
    acceptedFormats: 'JPG, PNG, PDF',
    maxSizeMB: 10,
    provinceSpecific: 'ON',
    tips: ['Licence de la ville de Toronto ou région', 'Test de connaissance requis', 'Vérification des antécédents incluse'],
  },
  attestation_formation_bc: {
    name: 'Attestation de formation — Colombie-Britannique',
    description: 'Permis de chauffeur de taxi/VTC délivré par le Passenger Transportation Board',
    required: true,
    category: 'formation',
    hasExpiry: true,
    acceptedFormats: 'JPG, PNG, PDF',
    maxSizeMB: 10,
    provinceSpecific: 'BC',
    tips: ['Permis PTB obligatoire', 'Classe 4 ou 5 requis', 'Formation de sécurité incluse'],
  },
  attestation_formation_ab: {
    name: 'Attestation de formation — Alberta',
    description: 'Licence de chauffeur de taxi/VTC délivrée par la ville (Calgary/Edmonton)',
    required: true,
    category: 'formation',
    hasExpiry: true,
    acceptedFormats: 'JPG, PNG, PDF',
    maxSizeMB: 10,
    provinceSpecific: 'AB',
    tips: ['Licence municipale requise', 'Test de conduite requis', 'Connaissance de la ville obligatoire'],
  },
  attestation_formation_mb: {
    name: 'Attestation de formation — Manitoba',
    description: 'Permis de chauffeur de taxi délivré par la ville de Winnipeg',
    required: true,
    category: 'formation',
    hasExpiry: true,
    acceptedFormats: 'JPG, PNG, PDF',
    maxSizeMB: 10,
    provinceSpecific: 'MB',
    tips: ['Permis de la ville de Winnipeg', 'Test de connaissance requis'],
  },
  attestation_formation_sk: {
    name: 'Attestation de formation — Saskatchewan',
    description: 'Licence de chauffeur délivrée par SGI Saskatchewan',
    required: true,
    category: 'formation',
    hasExpiry: true,
    acceptedFormats: 'JPG, PNG, PDF',
    maxSizeMB: 10,
    provinceSpecific: 'SK',
    tips: ['Licence SGI requise', 'Classe 4 minimum'],
  },
  attestation_formation_ns: {
    name: 'Attestation de formation — Nouvelle-Écosse',
    description: 'Permis de chauffeur de taxi délivré par la province',
    required: true,
    category: 'formation',
    hasExpiry: true,
    acceptedFormats: 'JPG, PNG, PDF',
    maxSizeMB: 10,
    provinceSpecific: 'NS',
    tips: ['Permis provincial requis', 'Vérification des antécédents incluse'],
  },
  attestation_formation_nb: {
    name: 'Attestation de formation — Nouveau-Brunswick',
    description: 'Permis de chauffeur de taxi délivré par la ville',
    required: true,
    category: 'formation',
    hasExpiry: true,
    acceptedFormats: 'JPG, PNG, PDF',
    maxSizeMB: 10,
    provinceSpecific: 'NB',
    tips: ['Permis municipal requis'],
  },
  attestation_formation_pe: {
    name: 'Attestation de formation — Île-du-Prince-Édouard',
    description: 'Permis de chauffeur de taxi délivré par la province',
    required: true,
    category: 'formation',
    hasExpiry: true,
    acceptedFormats: 'JPG, PNG, PDF',
    maxSizeMB: 10,
    provinceSpecific: 'PE',
    tips: ['Permis provincial requis'],
  },
  attestation_formation_nl: {
    name: 'Attestation de formation — Terre-Neuve',
    description: 'Permis de chauffeur de taxi délivré par la ville de St. John\'s',
    required: true,
    category: 'formation',
    hasExpiry: true,
    acceptedFormats: 'JPG, PNG, PDF',
    maxSizeMB: 10,
    provinceSpecific: 'NL',
    tips: ['Permis de la ville requis'],
  },
  numero_tps_tvq: {
    name: 'Numéro TPS/TVQ',
    description: 'Numéro de taxe fédérale et provinciale pour les chauffeurs',
    required: false,
    category: 'fiscal',
    hasExpiry: false,
    acceptedFormats: 'JPG, PNG, PDF',
    maxSizeMB: 5,
    tips: ['Requis si revenus > 30 000$/an', 'Inscription gratuite auprès de l\'ARC', 'Numéro de 9 chiffres'],
  },
  assurance_responsabilite: {
    name: 'Assurance responsabilité civile',
    description: 'Assurance responsabilité civile professionnelle',
    required: false,
    category: 'fiscal',
    hasExpiry: true,
    acceptedFormats: 'JPG, PNG, PDF',
    maxSizeMB: 10,
    tips: ['Minimum 2M$ de couverture', 'Couvre les incidents pendant les courses'],
  },
};

// ─── Service Firestore ────────────────────────────────────────────────────────

export async function getDriverDocuments(driverId: string): Promise<DriverDocument[]> {
  const { db } = await import('@/firebase').then(m => ({ db: m.db }));
  const q = query(collection(db, 'driver_documents'), where('driverId', '==', driverId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as DriverDocument));
}

export function subscribeDriverDocuments(
  driverId: string,
  callback: (docs: DriverDocument[]) => void
): Unsubscribe {
  const q = query(collection(db, 'driver_documents'), where('driverId', '==', driverId));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as DriverDocument)));
  });
}

export async function uploadDriverDocument(
  driverId: string,
  type: DocumentType,
  file: File,
  expiryDate?: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const { firebaseApp } = initializeFirebase();
  const storage = getStorage(firebaseApp);

  const ext = file.name.split('.').pop();
  const path = `driver_documents/${driverId}/${type}_${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      'state_changed',
      snap => onProgress && onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        // Sauvegarder dans Firestore
        const docRef = doc(collection(db, 'driver_documents'), `${driverId}_${type}`);
        await setDoc(docRef, {
          id: `${driverId}_${type}`,
          driverId,
          type,
          name: DOCUMENT_CATALOG[type]?.name || type,
          status: 'pending',
          fileUrl: url,
          fileName: file.name,
          fileSize: file.size,
          expiryDate: expiryDate || null,
          submittedAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
        resolve(url);
      }
    );
  });
}

export async function submitBackgroundCheck(data: Omit<BackgroundCheckRequest, 'submittedAt'>): Promise<string> {
  const docRef = doc(collection(db, 'background_checks'), `${data.driverId}_${Date.now()}`);
  await setDoc(docRef, {
    ...data,
    submittedAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
  // Mettre à jour le document antécédents judiciaires
  const docDocRef = doc(collection(db, 'driver_documents'), `${data.driverId}_antecedents_judiciaires`);
  await setDoc(docDocRef, {
    id: `${data.driverId}_antecedents_judiciaires`,
    driverId: data.driverId,
    type: 'antecedents_judiciaires',
    name: 'Vérification des antécédents judiciaires',
    status: 'pending',
    thirdPartyProvider: data.provider,
    thirdPartyStatus: 'pending',
    consentGiven: data.consentGiven,
    consentDate: data.consentDate,
    submittedAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return docRef.id;
}

export async function initializeDriverDocuments(driverId: string, province: string): Promise<void> {
  const provinceKey = province.toLowerCase() as string;
  const formationKey = `attestation_formation_${provinceKey}` as DocumentType;

  const requiredDocs: DocumentType[] = [
    'permis_conduire',
    'photo_profil',
    'piece_identite',
    'assurance_vehicule',
    'immatriculation',
    'inspection_mecanique',
    'antecedents_judiciaires',
    formationKey,
  ];

  for (const type of requiredDocs) {
    if (!DOCUMENT_CATALOG[type]) continue;
    const docRef = doc(collection(db, 'driver_documents'), `${driverId}_${type}`);
    const existing = await getDoc(docRef);
    if (!existing.exists()) {
      await setDoc(docRef, {
        id: `${driverId}_${type}`,
        driverId,
        type,
        name: DOCUMENT_CATALOG[type].name,
        status: 'required',
        province,
        submittedAt: null,
        fileUrl: null,
        updatedAt: serverTimestamp(),
      });
    }
  }
}
