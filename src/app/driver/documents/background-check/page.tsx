'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/provider';
import {
  ChevronLeft, Shield, CheckCircle2, Clock, ExternalLink,
  AlertTriangle, FileText, Info, ChevronRight, Lock
} from 'lucide-react';

type CheckStatus = 'not_started' | 'in_progress' | 'approved' | 'rejected';

type Partner = {
  id: string;
  name: string;
  logo: string;
  description: string;
  turnaround: string;
  price: string;
  provinces: string[];
  url: string;
  features: string[];
};

const PARTNERS: Partner[] = [
  {
    id: 'sterling',
    name: 'Sterling Backcheck',
    logo: '🔵',
    description: 'Leader canadien de la vérification d\'antécédents. Partenaire officiel de nombreux services de transport.',
    turnaround: '24-48 heures',
    price: 'Gratuit pour les chauffeurs KULOOC',
    provinces: ['QC', 'ON', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'PE', 'NL', 'YT', 'NT', 'NU'],
    url: 'https://www.sterlingbackcheck.ca',
    features: ['Vérification casier judiciaire national', 'Vérification permis de conduire', 'Vérification identité', 'Rapport en ligne sécurisé'],
  },
  {
    id: 'certn',
    name: 'Certn',
    logo: '🟢',
    description: 'Plateforme de vérification d\'antécédents 100% canadienne, rapide et sécurisée.',
    turnaround: '15 minutes - 24 heures',
    price: 'Gratuit pour les chauffeurs KULOOC',
    provinces: ['QC', 'ON', 'BC', 'AB', 'MB', 'SK'],
    url: 'https://certn.co',
    features: ['Vérification instantanée', 'Casier judiciaire + CRTC', 'Vérification crédit (optionnel)', 'Interface en français'],
  },
  {
    id: 'garda',
    name: 'GardaWorld',
    logo: '🔴',
    description: 'Vérification complète incluant les antécédents criminels provinciaux et fédéraux.',
    turnaround: '3-5 jours ouvrables',
    price: '29,99 $ CAD',
    provinces: ['QC', 'ON', 'BC', 'AB'],
    url: 'https://www.garda.com',
    features: ['Vérification RCMP nationale', 'Vérification provinciale', 'Vérification internationale', 'Rapport certifié'],
  },
];

const PROVINCE_REQUIREMENTS: Record<string, { name: string; requirement: string; link: string }> = {
  QC: {
    name: 'Québec',
    requirement: 'Vérification des antécédents judiciaires via le DPCP (Directeur des poursuites criminelles et pénales). Obligatoire pour tout chauffeur de taxi ou VTC.',
    link: 'https://www.dpcp.gouv.qc.ca',
  },
  ON: {
    name: 'Ontario',
    requirement: 'Police Record Check (PRC) de niveau 2 requis. Doit être effectué via un corps de police accrédité en Ontario.',
    link: 'https://www.ontario.ca/fr/page/verification-des-antecedents-judiciaires',
  },
  BC: {
    name: 'Colombie-Britannique',
    requirement: 'Criminal Record Check via le BC Ministry of Public Safety. Requis pour tous les chauffeurs de VTC.',
    link: 'https://www2.gov.bc.ca/gov/content/safety/crime-prevention/criminal-record-check',
  },
  AB: {
    name: 'Alberta',
    requirement: 'Police Information Check (PIC) via la GRC ou un corps de police local. Niveau Enhanced requis.',
    link: 'https://www.alberta.ca/police-information-check.aspx',
  },
  MB: {
    name: 'Manitoba',
    requirement: 'Criminal Record Check via la GRC Manitoba. Obligatoire pour les chauffeurs de transport rémunéré.',
    link: 'https://www.rcmp-grc.gc.ca/en/criminal-record-checks',
  },
  SK: {
    name: 'Saskatchewan',
    requirement: 'Criminal Record Check via la GRC Saskatchewan ou un corps de police local.',
    link: 'https://www.rcmp-grc.gc.ca/en/criminal-record-checks',
  },
  NS: {
    name: 'Nouvelle-Écosse',
    requirement: 'Criminal Record Check via la GRC Nova Scotia ou la Halifax Regional Police.',
    link: 'https://www.rcmp-grc.gc.ca/en/criminal-record-checks',
  },
  NB: {
    name: 'Nouveau-Brunswick',
    requirement: 'Vérification des antécédents judiciaires via la GRC Nouveau-Brunswick.',
    link: 'https://www.rcmp-grc.gc.ca/en/criminal-record-checks',
  },
};

export default function BackgroundCheckPage() {
  const router = useRouter();
  const { user } = useUser();
  const [status] = useState<CheckStatus>('not_started');
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string>('QC');
  const [step, setStep] = useState<'intro' | 'province' | 'partner' | 'form'>('intro');

  const provinceReq = PROVINCE_REQUIREMENTS[selectedProvince];
  const availablePartners = PARTNERS.filter(p => p.provinces.includes(selectedProvince));

  const handleStartCheck = () => {
    setStep('province');
  };

  const handleSelectProvince = (province: string) => {
    setSelectedProvince(province);
    setStep('partner');
  };

  const handleSelectPartner = (partnerId: string) => {
    setSelectedPartner(partnerId);
    setStep('form');
  };

  const handleOpenPartner = () => {
    const partner = PARTNERS.find(p => p.id === selectedPartner);
    if (partner) {
      window.open(partner.url, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm">
        <button onClick={() => {
          if (step === 'intro') router.push('/driver/documents');
          else if (step === 'province') setStep('intro');
          else if (step === 'partner') setStep('province');
          else if (step === 'form') setStep('partner');
        }} className="flex items-center gap-1 text-gray-500 mb-4 -ml-1">
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm">Retour</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <Shield className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-black">Antécédents judiciaires</h1>
            <p className="text-xs text-gray-400">Vérification obligatoire pour conduire avec KULOOC</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Statut actuel */}
        {status === 'not_started' && step === 'intro' && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-orange-700">Vérification requise</p>
                <p className="text-xs text-orange-600 mt-1">
                  Vous devez compléter une vérification d'antécédents judiciaires avant de pouvoir accepter des courses avec KULOOC.
                </p>
              </div>
            </div>
          </div>
        )}

        {status === 'in_progress' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-bold text-sm text-yellow-700">Vérification en cours</p>
                <p className="text-xs text-yellow-600 mt-0.5">Délai estimé : 24-48 heures. Vous serez notifié par email.</p>
              </div>
            </div>
          </div>
        )}

        {status === 'approved' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-bold text-sm text-green-700">Antécédents approuvés ✓</p>
                <p className="text-xs text-green-600 mt-0.5">Votre vérification est valide pour 2 ans.</p>
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 1 : Introduction */}
        {step === 'intro' && (
          <>
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="font-black text-base mb-4">Comment ça fonctionne</h2>
              <div className="space-y-4">
                {[
                  { num: '1', title: 'Choisissez votre province', desc: 'Sélectionnez la province où vous conduisez principalement.' },
                  { num: '2', title: 'Sélectionnez un partenaire', desc: 'Choisissez parmi nos partenaires accrédités de vérification.' },
                  { num: '3', title: 'Remplissez le formulaire', desc: 'Complétez le formulaire en ligne de notre partenaire.' },
                  { num: '4', title: 'Résultats automatiques', desc: 'Les résultats sont transmis directement à KULOOC.' },
                ].map(item => (
                  <div key={item.num} className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-black">{item.num}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{item.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 rounded-2xl p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-blue-700 mb-1">Informations importantes</p>
                  <ul className="text-xs text-blue-600 space-y-1">
                    <li>• La vérification est obligatoire dans toutes les provinces canadiennes</li>
                    <li>• Les résultats sont valides pour 2 ans</li>
                    <li>• KULOOC couvre les frais pour la plupart des partenaires</li>
                    <li>• Vos données sont protégées et chiffrées</li>
                    <li>• Vous pouvez aussi soumettre un document obtenu directement à votre corps de police local</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-xs font-bold text-gray-700 mb-2">Vous avez déjà un document officiel ?</p>
              <p className="text-xs text-gray-400 mb-3">Si vous avez obtenu votre vérification directement auprès d'un corps de police, vous pouvez le téléverser ici.</p>
              <button onClick={() => router.push('/driver/documents/background_check_document')}
                className="flex items-center justify-between w-full p-3 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">Téléverser mon document</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            <button onClick={handleStartCheck}
              className="w-full bg-red-600 text-white font-black py-4 rounded-2xl text-base">
              Commencer la vérification en ligne
            </button>
          </>
        )}

        {/* ÉTAPE 2 : Sélection province */}
        {step === 'province' && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="font-black text-base mb-1">Votre province de conduite</h2>
            <p className="text-xs text-gray-400 mb-4">Les exigences varient selon la province.</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PROVINCE_REQUIREMENTS).map(([code, prov]) => (
                <button key={code} onClick={() => handleSelectProvince(code)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${selectedProvince === code ? 'border-red-600 bg-red-50' : 'border-gray-100 hover:border-gray-200'}`}>
                  <p className="text-sm font-black text-gray-800">{code}</p>
                  <p className="text-xs text-gray-400">{prov.name}</p>
                </button>
              ))}
            </div>
            {provinceReq && (
              <div className="mt-4 bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-bold text-gray-700 mb-1">Exigences — {provinceReq.name}</p>
                <p className="text-xs text-gray-500">{provinceReq.requirement}</p>
                <a href={provinceReq.link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-red-600 text-xs font-bold mt-2">
                  <ExternalLink className="h-3 w-3" />En savoir plus
                </a>
              </div>
            )}
          </div>
        )}

        {/* ÉTAPE 3 : Sélection partenaire */}
        {step === 'partner' && (
          <>
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="font-black text-base mb-1">Choisissez un partenaire</h2>
              <p className="text-xs text-gray-400 mb-4">Partenaires accrédités disponibles pour {PROVINCE_REQUIREMENTS[selectedProvince]?.name}</p>
              <div className="space-y-3">
                {availablePartners.map(partner => (
                  <button key={partner.id} onClick={() => handleSelectPartner(partner.id)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedPartner === partner.id ? 'border-red-600 bg-red-50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{partner.logo}</span>
                        <div>
                          <p className="font-black text-sm text-gray-800">{partner.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{partner.turnaround}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${partner.price.includes('Gratuit') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {partner.price.includes('Gratuit') ? 'Gratuit' : partner.price}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{partner.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {partner.features.map(f => (
                        <span key={f} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{f}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ÉTAPE 4 : Formulaire / Redirection */}
        {step === 'form' && selectedPartner && (
          <>
            {(() => {
              const partner = PARTNERS.find(p => p.id === selectedPartner)!;
              return (
                <>
                  <div className="bg-white rounded-2xl shadow-sm p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{partner.logo}</span>
                      <div>
                        <h2 className="font-black text-base">{partner.name}</h2>
                        <p className="text-xs text-gray-400">Partenaire accrédité KULOOC</p>
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-xl p-3 mb-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <p className="text-xs font-bold text-green-700">
                          {partner.price.includes('Gratuit') ? 'Gratuit pour vous — KULOOC couvre les frais' : `Coût : ${partner.price}`}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-5">
                      <p className="text-sm font-bold text-gray-700">Ce que vous aurez besoin :</p>
                      <div className="space-y-2">
                        {['Pièce d\'identité valide (passeport ou permis)', 'Numéro d\'assurance sociale (NAS)', 'Adresse actuelle et historique sur 5 ans', 'Date de naissance'].map(item => (
                          <div key={item} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                            <p className="text-xs text-gray-600">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-3 mb-5">
                      <div className="flex items-start gap-2">
                        <Lock className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-600">
                          Vos informations sont transmises de façon sécurisée et chiffrée. KULOOC ne reçoit que le résultat (approuvé/refusé), jamais le détail de vos antécédents.
                        </p>
                      </div>
                    </div>

                    <button onClick={handleOpenPartner}
                      className="w-full bg-red-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Commencer avec {partner.name}
                    </button>

                    <p className="text-xs text-gray-400 text-center mt-3">
                      Vous serez redirigé vers le site sécurisé de {partner.name}. Les résultats nous seront transmis automatiquement.
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm p-4">
                    <p className="text-xs font-bold text-gray-700 mb-2">Délai estimé</p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <p className="text-sm font-semibold text-gray-600">{partner.turnaround}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Vous recevrez une notification par email et dans l'application dès que les résultats seront disponibles.</p>
                  </div>
                </>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
