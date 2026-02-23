'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/firebase/provider';
import {
  subscribeDriverDocuments,
  uploadDriverDocument as uploadDocument,
  DOCUMENT_CATALOG,
  type DriverDocument,
  type DocumentType,
} from '@/lib/firestore/document-service';
import {
  ChevronLeft, Upload, Camera, CheckCircle2, Clock, AlertTriangle,
  FileText, Eye, RefreshCw, Info, Shield, X
} from 'lucide-react';

const STATUS_CONFIG = {
  required: { label: 'Requis', color: 'text-gray-500', bg: 'bg-gray-100' },
  pending: { label: 'En cours de vérification', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  approved: { label: 'Approuvé', color: 'text-green-600', bg: 'bg-green-50' },
  rejected: { label: 'Rejeté', color: 'text-red-600', bg: 'bg-red-50' },
  expiring: { label: 'Expire bientôt', color: 'text-orange-600', bg: 'bg-orange-50' },
};

export default function DocumentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docRecord, setDocRecord] = useState<DriverDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const docType = (Array.isArray(params.doc_id) ? params.doc_id[0] : params.doc_id) as DocumentType;
  const catalog = DOCUMENT_CATALOG[docType];

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeDriverDocuments(user.uid, (docs) => {
      const found = docs.find(d => d.type === docType);
      setDocRecord(found || null);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid, docType]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];
    if (file.size > maxSize) { setError('Le fichier ne doit pas dépasser 10 Mo.'); return; }
    if (!allowedTypes.includes(file.type)) { setError('Format non accepté. Utilisez JPG, PNG, HEIC ou PDF.'); return; }
    setError(null);
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user?.uid) return;
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    try {
      const interval = setInterval(() => setUploadProgress(p => Math.min(p + 10, 90)), 200);
      await uploadDocument(user.uid, docType, selectedFile);
      clearInterval(interval);
      setUploadProgress(100);
      setSuccess(true);
      setSelectedFile(null);
      setPreviewUrl(null);
      setTimeout(() => { setSuccess(false); setUploadProgress(0); }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du téléversement. Réessayez.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Document non trouvé.</p>
          <button onClick={() => router.back()} className="text-red-600 font-bold">← Retour</button>
        </div>
      </div>
    );
  }

  const status = docRecord?.status || 'required';
  const statusCfg = STATUS_CONFIG[status];
  const canUpload = status === 'required' || status === 'rejected' || status === 'expiring';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm">
        <button onClick={() => router.push('/driver/documents')} className="flex items-center gap-1 text-gray-500 mb-4 -ml-1">
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm">Retour aux documents</span>
        </button>
        <div className="flex items-start justify-between">
          <div className="flex-1 mr-3">
            <h1 className="text-xl font-black">{catalog.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{catalog.description}</p>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 ${statusCfg.bg} ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {status === 'rejected' && docRecord?.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-red-700">Document rejeté</p>
                <p className="text-sm text-red-600 mt-1">{docRecord.rejectionReason}</p>
                <p className="text-xs text-red-500 mt-2">Veuillez soumettre un nouveau document — image nette et lisible.</p>
              </div>
            </div>
          </div>
        )}

        {status === 'approved' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-bold text-sm text-green-700">Document approuvé</p>
                {docRecord?.expiryDate && (
                  <p className="text-xs text-green-600 mt-0.5">
                    Expire le {new Date(docRecord.expiryDate).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
            {docRecord?.fileUrl && (
              <a href={docRecord.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-3 text-green-700 font-bold text-sm">
                <Eye className="h-4 w-4" />Voir le document
              </a>
            )}
          </div>
        )}

        {status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-bold text-sm text-yellow-700">En cours de vérification</p>
                <p className="text-xs text-yellow-600 mt-0.5">Délai habituel : 1-2 jours ouvrables.</p>
              </div>
            </div>
          </div>
        )}

        {canUpload && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="font-black text-base mb-4">
              {status === 'rejected' ? 'Soumettre un nouveau document' : 'Téléverser votre document'}
            </h2>

            <div className="bg-blue-50 rounded-xl p-3 mb-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-blue-700 mb-1">Conseils pour une bonne photo :</p>
                  <ul className="text-xs text-blue-600 space-y-0.5">
                    <li>• Image nette, bien éclairée, sans reflets</li>
                    <li>• Tout le document visible dans le cadre</li>
                    <li>• Texte lisible, pas de flou</li>
                    <li>• Formats : JPG, PNG, HEIC, PDF (max 10 Mo)</li>
                  </ul>
                </div>
              </div>
            </div>

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
                  <p className="text-sm text-green-600 font-bold">Document soumis ! En cours de vérification.</p>
                </div>
              </div>
            )}

            {uploading && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Téléversement en cours...</span>
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
                  <span className="text-xs text-gray-400">Depuis la galerie</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-red-300 transition-colors">
                  <Camera className="h-6 w-6 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-600">Prendre une photo</span>
                  <span className="text-xs text-gray-400">Caméra</span>
                </button>
              </div>
            ) : (
              <button onClick={handleUpload} disabled={uploading}
                className="w-full bg-red-600 text-white font-bold py-4 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                {uploading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Téléversement...</> : <><Upload className="h-4 w-4" /> Soumettre le document</>}
              </button>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-black text-sm mb-3">À propos de ce document</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Shield className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-gray-700">Pourquoi ce document est requis</p>
                <p className="text-xs text-gray-400 mt-0.5">{catalog.description}</p>
              </div>
            </div>
            {catalog.expiryMonths && (
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-gray-700">Durée de validité</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {catalog.expiryMonths >= 12 ? `${Math.floor(catalog.expiryMonths / 12)} an(s)` : `${catalog.expiryMonths} mois`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 mb-2">Problème avec ce document ?</p>
          <button onClick={() => router.push('/driver/inbox')} className="text-red-600 text-sm font-bold">Contacter le support</button>
        </div>
      </div>
    </div>
  );
}
