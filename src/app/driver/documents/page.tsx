'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/provider';
import {
  subscribeDriverDocuments,
  initializeDriverDocuments,
  DOCUMENT_CATALOG,
  type DriverDocument,
  type DocumentType,
} from '@/lib/firestore/document-service';
import {
  CheckCircle2, Clock, AlertTriangle, Upload, ChevronRight,
  Shield, Car, FileText, GraduationCap, DollarSign, MapPin
} from 'lucide-react';

const PROVINCES = [
  { code: 'QC', name: 'Québec' },
  { code: 'ON', name: 'Ontario' },
  { code: 'BC', name: 'Colombie-Britannique' },
  { code: 'AB', name: 'Alberta' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'NS', name: 'Nouvelle-Écosse' },
  { code: 'NB', name: 'Nouveau-Brunswick' },
  { code: 'PE', name: 'Île-du-Prince-Édouard' },
  { code: 'NL', name: 'Terre-Neuve' },
];

const STATUS_CONFIG = {
  required: { label: 'Requis', bg: 'bg-red-600', text: 'text-white', icon: Upload },
  pending: { label: 'En attente', bg: 'bg-yellow-500', text: 'text-white', icon: Clock },
  approved: { label: 'Approuvé', bg: 'bg-gray-100', text: 'text-gray-700', icon: CheckCircle2 },
  rejected: { label: 'Rejeté', bg: 'bg-red-600', text: 'text-white', icon: AlertTriangle },
  expiring: { label: 'Expire bientôt', bg: 'bg-orange-100', text: 'text-orange-700', icon: AlertTriangle },
};

const CATEGORY_CONFIG = {
  identite: { label: 'Identité & Conduite', icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50' },
  vehicule: { label: 'Véhicule', icon: Car, color: 'text-purple-600', bg: 'bg-purple-50' },
  antecedents: { label: 'Antécédents judiciaires', icon: FileText, color: 'text-red-600', bg: 'bg-red-50' },
  formation: { label: 'Formation & Certification', icon: GraduationCap, color: 'text-green-600', bg: 'bg-green-50' },
  fiscal: { label: 'Fiscal & Assurance', icon: DollarSign, color: 'text-yellow-600', bg: 'bg-yellow-50' },
};

type FilterTab = 'all' | 'required' | 'pending' | 'approved' | 'rejected';

export default function DocumentsPage() {
  const router = useRouter();
  const { user } = useUser();
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [province, setProvince] = useState('QC');
  const [showProvinceSelector, setShowProvinceSelector] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeDriverDocuments(user.uid, (docs) => {
      setDocuments(docs);
      setLoading(false);
      setInitialized(docs.length > 0);
    });
    return () => unsub();
  }, [user?.uid]);

  const handleInitialize = async () => {
    if (!user?.uid) return;
    setLoading(true);
    await initializeDriverDocuments(user.uid, province);
    setLoading(false);
  };

  const getDocumentForType = (type: DocumentType): DriverDocument | null => {
    return documents.find(d => d.type === type) || null;
  };

  const getRelevantTypes = (): DocumentType[] => {
    const all = Object.keys(DOCUMENT_CATALOG) as DocumentType[];
    return all.filter(type => {
      const cat = DOCUMENT_CATALOG[type];
      if (cat.category === 'formation') return cat.provinceSpecific === province;
      return true;
    });
  };

  const relevantTypes = getRelevantTypes();
  const grouped = Object.keys(CATEGORY_CONFIG).reduce((acc, cat) => {
    acc[cat] = relevantTypes.filter(t => DOCUMENT_CATALOG[t].category === cat);
    return acc;
  }, {} as Record<string, DocumentType[]>);

  const stats = {
    total: relevantTypes.length,
    approved: documents.filter(d => d.status === 'approved').length,
    pending: documents.filter(d => d.status === 'pending').length,
    required: documents.filter(d => d.status === 'required').length + Math.max(0, relevantTypes.length - documents.length),
    rejected: documents.filter(d => d.status === 'rejected').length,
  };
  const completionPct = Math.round((stats.approved / Math.max(stats.total, 1)) * 100);

  const filterDocuments = (types: DocumentType[]) => {
    if (activeTab === 'all') return types;
    return types.filter(type => {
      const docData = getDocumentForType(type);
      if (!docData) return activeTab === 'required';
      return docData.status === activeTab;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Chargement des documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black">Documents</h1>
          <button onClick={() => setShowProvinceSelector(!showProvinceSelector)}
            className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 text-sm font-semibold">
            <MapPin className="h-3.5 w-3.5 text-red-600" />{province}
          </button>
        </div>
        {showProvinceSelector && (
          <div className="mb-3 p-3 bg-gray-50 rounded-2xl">
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Sélectionnez votre province</p>
            <div className="grid grid-cols-5 gap-1.5">
              {PROVINCES.map(p => (
                <button key={p.code} onClick={() => { setProvince(p.code); setShowProvinceSelector(false); }}
                  className={"py-1.5 px-2 rounded-lg text-xs font-bold transition-all " + (province === p.code ? 'bg-red-600 text-white' : 'bg-white text-gray-600 border border-gray-200')}>
                  {p.code}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Profil complété</span>
            <span className="text-xs font-bold text-red-600">{completionPct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-red-600 rounded-full transition-all duration-500" style={{ width: completionPct + '%' }} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: 'Approuvés', count: stats.approved, color: 'text-green-600' },
            { label: 'En attente', count: stats.pending, color: 'text-yellow-600' },
            { label: 'Requis', count: stats.required, color: 'text-red-600' },
            { label: 'Rejetés', count: stats.rejected, color: 'text-gray-500' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className={"text-lg font-black " + s.color}>{s.count}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {(['all', 'required', 'pending', 'approved', 'rejected'] as FilterTab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={"flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all " + (activeTab === tab ? 'bg-black text-white' : 'bg-gray-100 text-gray-600')}>
              {tab === 'all' ? 'Tous' : tab === 'required' ? 'Requis' : tab === 'pending' ? 'En attente' : tab === 'approved' ? 'Approuvés' : 'Rejetés'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {!initialized && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">Initialisez vos documents</p>
                <p className="text-xs text-gray-500 mt-0.5">Créez votre liste de documents requis pour {PROVINCES.find(p => p.code === province)?.name}.</p>
                <button onClick={handleInitialize} className="mt-3 bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-xl">
                  Initialiser mes documents
                </button>
              </div>
            </div>
          </div>
        )}

        {Object.entries(grouped).map(([cat, types]) => {
          const filtered = filterDocuments(types);
          if (filtered.length === 0) return null;
          const catConfig = CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG];
          const CatIcon = catConfig.icon;
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <div className={"w-7 h-7 rounded-lg " + catConfig.bg + " flex items-center justify-center"}>
                  <CatIcon className={"h-4 w-4 " + catConfig.color} />
                </div>
                <p className="font-black text-sm text-gray-700">{catConfig.label}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {filtered.map((type, idx) => {
                  const docData = getDocumentForType(type);
                  const catalog = DOCUMENT_CATALOG[type];
                  const status = docData?.status || 'required';
                  const statusCfg = STATUS_CONFIG[status];
                  const StatusIcon = statusCfg.icon;
                  return (
                    <button key={type} onClick={() => router.push('/driver/documents/' + type)}
                      className={"w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 " + (idx < filtered.length - 1 ? 'border-b border-gray-50' : '')}>
                      <div className={"w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 " + (status === 'approved' ? 'bg-green-100' : status === 'pending' ? 'bg-yellow-100' : status === 'rejected' ? 'bg-red-100' : status === 'expiring' ? 'bg-orange-100' : 'bg-gray-100')}>
                        <StatusIcon className={"h-5 w-5 " + (status === 'approved' ? 'text-green-600' : status === 'pending' ? 'text-yellow-600' : status === 'rejected' ? 'text-red-600' : status === 'expiring' ? 'text-orange-600' : 'text-gray-400')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{catalog.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {status === 'rejected' && docData?.rejectionReason ? docData.rejectionReason : status === 'pending' ? 'En cours de vérification' : status === 'approved' && docData?.expiryDate ? 'Expire le ' + new Date(docData.expiryDate).toLocaleDateString('fr-CA') : catalog.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={"text-xs font-bold px-2.5 py-1 rounded-full " + statusCfg.bg + " " + statusCfg.text}>{statusCfg.label}</span>
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-5 text-white">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-black text-base">Vérification des antécédents</p>
              <p className="text-gray-300 text-xs mt-1">Téléversez vos documents ou utilisez notre partenaire certifié.</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => router.push('/driver/documents/antecedents_judiciaires')} className="bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-xl">
                  Téléverser mes documents
                </button>
                <button onClick={() => router.push('/driver/background-check')} className="bg-white/10 text-white text-xs font-bold px-3 py-2 rounded-xl border border-white/20">
                  Via partenaire
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
