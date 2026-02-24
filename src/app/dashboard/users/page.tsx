'use client';

import { useState, useMemo } from 'react';
import {
  Crown, Shield, Radio, User, Users, Search, ChevronDown,
  CheckCircle, XCircle, AlertTriangle, RefreshCw, Lock,
  UserPlus, Eye, EyeOff, Loader2, Phone, Mail, KeyRound,
} from 'lucide-react';
import {
  useRolesManagement,
  useCurrentUserRole,
  ROLE_PERMISSIONS,
  UserRole,
  KuloocUser,
  SUPER_ADMIN_EMAIL,
} from '@/lib/firestore/use-roles';
import { db } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// ── Firebase API Key ───────────────────────────────────────────────────────────
const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyC6KnCmgzrgRjH4Cs5pXOm3P11EYuUwnXM';

// ── Types création staff ───────────────────────────────────────────────────────
type StaffType = 'driver' | 'dispatcher' | 'agent' | 'developer' | 'admin';

interface CreateForm {
  name: string;
  email: string;
  phone: string;
  staffType: StaffType;
  role: UserRole;
  password: string;
}

const STAFF_TYPE_OPTIONS: { value: StaffType; label: string; icon: string; defaultRole: UserRole }[] = [
  { value: 'dispatcher', label: 'Dispatcher',     icon: '🚦', defaultRole: 'dispatcher' },
  { value: 'agent',      label: 'Agent Support',  icon: '🎧', defaultRole: 'agent' },
  { value: 'driver',     label: 'Chauffeur',       icon: '🚗', defaultRole: 'agent' },
  { value: 'developer',  label: 'Développeur',    icon: '💻', defaultRole: 'agent' },
  { value: 'admin',      label: 'Administrateur', icon: '🛡️', defaultRole: 'admin' },
];

const ASSIGNABLE_ROLES: { value: UserRole; label: string; icon: string; desc: string; superAdminOnly?: boolean }[] = [
  { value: 'dispatcher', label: 'Dispatcher',       icon: '🚦', desc: 'Opérateur dispatch — gère les courses en temps réel' },
  { value: 'agent',      label: 'Agent Support',    icon: '🎧', desc: 'Support client, approbation de documents' },
  { value: 'admin',      label: 'Administrateur',   icon: '🛡️', desc: 'Accès complet sauf gestion des rôles', superAdminOnly: true },
];

// ── Modal de création de compte staff ─────────────────────────────────────────
function CreateStaffModal({
  onClose, onSuccess, isSuperAdmin,
}: {
  onClose: () => void;
  onSuccess: (msg: string) => void;
  isSuperAdmin: boolean;
}) {
  const [form, setForm] = useState<CreateForm>({
    name: '', email: '', phone: '',
    staffType: 'dispatcher', role: 'dispatcher', password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleTypeChange = (type: StaffType) => {
    const opt = STAFF_TYPE_OPTIONS.find(o => o.value === type);
    setForm(f => ({ ...f, staffType: type, role: opt?.defaultRole || 'agent' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      // 1. Créer le compte Firebase Auth via REST API
      const authRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            displayName: form.name,
            returnSecureToken: false,
          }),
        }
      );
      const authData = await authRes.json();
      if (authData.error) {
        const msg = authData.error.message as string;
        if (msg === 'EMAIL_EXISTS') throw new Error('Cet email est déjà utilisé.');
        if (msg === 'INVALID_EMAIL') throw new Error('Adresse email invalide.');
        throw new Error(msg);
      }
      const uid: string = authData.localId;

      // 2. Créer le document Firestore dans `users`
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: form.email,
        displayName: form.name,
        name: form.name,
        phone: form.phone || '',
        role: form.role,
        staffType: form.staffType,
        isActive: true,
        isStaff: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 3. Créer aussi dans `admin_users` pour les accès dashboard
      await setDoc(doc(db, 'admin_users', uid), {
        uid,
        email: form.email,
        name: form.name,
        phone: form.phone || '',
        role: form.role,
        staffType: form.staffType,
        isActive: true,
        createdAt: serverTimestamp(),
      });

      onSuccess(`✓ Compte créé pour ${form.name} — ${ROLE_PERMISSIONS[form.role].badge} ${ROLE_PERMISSIONS[form.role].label}`);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du compte.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <UserPlus size={20} className="text-red-500" />
                Créer un compte staff
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Ce compte aura accès au tableau de bord KULOOC</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">×</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Type de membre */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Type de membre</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {STAFF_TYPE_OPTIONS.filter(o => o.value !== 'admin' || isSuperAdmin).map(opt => (
                  <button key={opt.value} type="button" onClick={() => handleTypeChange(opt.value)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-sm font-medium transition-all ${
                      form.staffType === opt.value
                        ? 'border-red-500 bg-red-50 text-red-700 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}>
                    <span className="text-xl">{opt.icon}</span>
                    <span className="text-xs">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rôle dashboard */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Rôle dans le dashboard</label>
              <div className="space-y-2">
                {ASSIGNABLE_ROLES.filter(r => !r.superAdminOnly || isSuperAdmin).map(r => (
                  <label key={r.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    form.role === r.value ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}>
                    <input type="radio" name="role" value={r.value} checked={form.role === r.value}
                      onChange={() => setForm(f => ({ ...f, role: r.value }))} className="mt-0.5 accent-red-600" />
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{r.icon} {r.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{r.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Informations personnelles */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">Informations personnelles</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nom complet *"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400" />
              </div>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="Adresse email *"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400" />
              </div>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Téléphone (optionnel)"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400" />
              </div>
              <div className="relative">
                <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type={showPassword ? 'text' : 'password'} required minLength={8}
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Mot de passe temporaire * (min. 8 car.)"
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 -mt-1">L'utilisateur devra changer son mot de passe à la première connexion.</p>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm">
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-sm">
                Annuler
              </button>
              <button type="submit" disabled={creating}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white py-2.5 rounded-xl font-semibold transition-colors text-sm flex items-center justify-center gap-2">
                {creating
                  ? <><Loader2 size={15} className="animate-spin" /> Création en cours...</>
                  : <><UserPlus size={15} /> Créer le compte</>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Icône par rôle ─────────────────────────────────────────────────────────────
const RoleIcon = ({ role, size = 16 }: { role: UserRole; size?: number }) => {
  const icons: Record<UserRole, React.ReactNode> = {
    'super-admin': <Crown size={size} className="text-red-500" />,
    'admin': <Shield size={size} className="text-orange-500" />,
    'dispatcher': <Radio size={size} className="text-blue-500" />,
    'agent': <User size={size} className="text-green-500" />,
    'user': <Users size={size} className="text-gray-400" />,
  };
  return <>{icons[role]}</>;
};

// ── Badge de rôle ──────────────────────────────────────────────────────────────
const RoleBadge = ({ role }: { role: UserRole }) => {
  const p = ROLE_PERMISSIONS[role];
  const colors: Record<UserRole, string> = {
    'super-admin': 'bg-red-100 text-red-700 border-red-200',
    'admin': 'bg-orange-100 text-orange-700 border-orange-200',
    'dispatcher': 'bg-blue-100 text-blue-700 border-blue-200',
    'agent': 'bg-green-100 text-green-700 border-green-200',
    'user': 'bg-gray-100 text-gray-500 border-gray-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colors[role]}`}>
      {p.badge} {p.label}
    </span>
  );
};

// ── Sélecteur de rôle ──────────────────────────────────────────────────────────
const RoleSelector = ({
  currentRole, onSelect, disabled,
}: {
  currentRole: UserRole;
  onSelect: (r: UserRole) => void;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const roles: UserRole[] = ['super-admin', 'admin', 'dispatcher', 'agent', 'user'];

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
          disabled
            ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400'
            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm cursor-pointer'
        }`}
      >
        <RoleIcon role={currentRole} />
        <span>{ROLE_PERMISSIONS[currentRole].label}</span>
        {!disabled && <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden">
            {roles.map(r => (
              <button
                key={r}
                onClick={() => { onSelect(r); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                  r === currentRole ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'
                }`}
              >
                <RoleIcon role={r} />
                <div className="text-left">
                  <div className="font-medium">{ROLE_PERMISSIONS[r].badge} {ROLE_PERMISSIONS[r].label}</div>
                </div>
                {r === currentRole && <CheckCircle size={14} className="ml-auto text-blue-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── Page principale ────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { role: currentRole } = useCurrentUserRole();
  const { users, isLoading, error, isSuperAdmin, stats, assignRole, toggleUserActive } = useRolesManagement();

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ uid: string; msg: string; ok: boolean } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Admin peut aussi accéder à cette page
  const canAccess = isSuperAdmin || currentRole === 'admin';
  const canCreate = isSuperAdmin || currentRole === 'admin';

  // Filtrage
  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchSearch = !search ||
        u.displayName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = filterRole === 'all' || u.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [users, search, filterRole]);

  const handleRoleChange = async (user: KuloocUser, newRole: UserRole) => {
    if (user.role === newRole) return;
    setUpdating(user.uid);
    try {
      await assignRole(user.uid, newRole);
      setFeedback({ uid: user.uid, msg: `Rôle mis à jour → ${ROLE_PERMISSIONS[newRole].label}`, ok: true });
    } catch (e: unknown) {
      setFeedback({ uid: user.uid, msg: e instanceof Error ? e.message : 'Erreur', ok: false });
    } finally {
      setUpdating(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleToggleActive = async (user: KuloocUser) => {
    setUpdating(user.uid);
    try {
      await toggleUserActive(user.uid, !user.isActive);
      setFeedback({ uid: user.uid, msg: user.isActive ? 'Compte désactivé' : 'Compte activé', ok: true });
    } catch (e: unknown) {
      setFeedback({ uid: user.uid, msg: e instanceof Error ? e.message : 'Erreur', ok: false });
    } finally {
      setUpdating(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // Accès refusé si pas super-admin ni admin
  if (!canAccess && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Lock size={48} className="text-red-400" />
        <h2 className="text-xl font-bold text-gray-800">Accès restreint</h2>
        <p className="text-gray-500 text-center max-w-sm">
          Cette page est réservée aux <strong>Administrateurs</strong> et au <strong>Super Administrateur</strong>.<br />
          Votre rôle actuel : <RoleBadge role={currentRole} />
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Modal de création */}
      {showCreateModal && (
        <CreateStaffModal
          isSuperAdmin={isSuperAdmin}
          onClose={() => setShowCreateModal(false)}
          onSuccess={msg => {
            setSuccessMsg(msg);
            setTimeout(() => setSuccessMsg(''), 5000);
          }}
        />
      )}

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Crown size={24} className="text-red-500" /> Gestion des utilisateurs
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isSuperAdmin ? 'Super Administrateur' : 'Administrateur'} — assignez les rôles et gérez les accès
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors shadow-sm"
            >
              <UserPlus size={16} />
              <span className="hidden sm:inline">Créer un compte</span>
              <span className="sm:hidden">Créer</span>
            </button>
          )}
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-400">Connecté en tant que</p>
            <RoleBadge role={isSuperAdmin ? 'super-admin' : currentRole} />
          </div>
        </div>
      </div>

      {/* Message de succès */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm">
          <CheckCircle size={16} className="flex-shrink-0" />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="ml-auto text-green-600 hover:text-green-800 text-lg leading-none">×</button>
        </div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'bg-gray-50 border-gray-200', icon: <Users size={16} className="text-gray-500" /> },
          { label: 'Super Admin', value: stats.byRole['super-admin'] || 0, color: 'bg-red-50 border-red-100', icon: <Crown size={16} className="text-red-500" /> },
          { label: 'Admins', value: stats.byRole['admin'] || 0, color: 'bg-orange-50 border-orange-100', icon: <Shield size={16} className="text-orange-500" /> },
          { label: 'Dispatchers', value: stats.byRole['dispatcher'] || 0, color: 'bg-blue-50 border-blue-100', icon: <Radio size={16} className="text-blue-500" /> },
          { label: 'Agents', value: stats.byRole['agent'] || 0, color: 'bg-green-50 border-green-100', icon: <User size={16} className="text-green-500" /> },
          { label: 'Utilisateurs', value: stats.byRole['user'] || 0, color: 'bg-gray-50 border-gray-200', icon: <Users size={16} className="text-gray-400" /> },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 ${s.color}`}>
            <div className="flex items-center gap-1.5 mb-1">{s.icon}<span className="text-xs text-gray-500">{s.label}</span></div>
            <p className="text-2xl font-black text-gray-800">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tableau des rôles */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou email..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value as UserRole | 'all')}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          >
            <option value="all">Tous les rôles</option>
            {(Object.keys(ROLE_PERMISSIONS) as UserRole[]).map(r => (
              <option key={r} value={r}>{ROLE_PERMISSIONS[r].badge} {ROLE_PERMISSIONS[r].label}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <RefreshCw size={20} className="animate-spin text-gray-400" />
            <span className="text-gray-400">Chargement des utilisateurs...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 gap-3 text-red-500">
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
            <Users size={32} />
            <p>Aucun utilisateur trouvé</p>
            {canCreate && (
              <button onClick={() => setShowCreateModal(true)}
                className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1">
                <UserPlus size={14} /> Créer le premier compte staff
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(u => {
              const isSuperAdminUser = u.email === SUPER_ADMIN_EMAIL;
              const isUpdating = updating === u.uid;
              const fb = feedback?.uid === u.uid ? feedback : null;

              return (
                <div key={u.uid} className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50/50 transition-colors ${!u.isActive ? 'opacity-50' : ''}`}>
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center flex-shrink-0 text-sm font-bold text-gray-600">
                    {u.displayName.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800 truncate">{u.displayName}</p>
                      {isSuperAdminUser && <Crown size={12} className="text-red-400 flex-shrink-0" />}
                      {!u.isActive && <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Désactivé</span>}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>

                  {/* Feedback */}
                  {fb && (
                    <div className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1 ${fb.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {fb.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {fb.msg}
                    </div>
                  )}

                  {/* Sélecteur de rôle */}
                  <div className="flex-shrink-0">
                    {isUpdating ? (
                      <Loader2 size={16} className="animate-spin text-red-400" />
                    ) : (
                      <RoleSelector
                        currentRole={u.role}
                        onSelect={newRole => handleRoleChange(u, newRole)}
                        disabled={isSuperAdminUser || !isSuperAdmin}
                      />
                    )}
                  </div>

                  {/* Activer / Désactiver */}
                  {!isSuperAdminUser && canAccess && (
                    <button
                      onClick={() => handleToggleActive(u)}
                      disabled={isUpdating}
                      className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                        u.isActive
                          ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                          : 'text-green-500 hover:bg-green-50'
                      }`}
                      title={u.isActive ? 'Désactiver le compte' : 'Activer le compte'}
                    >
                      {u.isActive ? <XCircle size={16} /> : <CheckCircle size={16} />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Légende des rôles */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-4">Permissions par rôle</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(['super-admin', 'admin', 'dispatcher', 'agent'] as UserRole[]).map(r => {
            const p = ROLE_PERMISSIONS[r];
            return (
              <div key={r} className="bg-white rounded-xl border border-gray-100 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <RoleIcon role={r} size={18} />
                  <span className="font-semibold text-sm text-gray-800">{p.badge} {p.label}</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">{p.description}</p>
                <div className="space-y-1">
                  {[
                    { key: 'canAssignRoles', label: 'Assigner des rôles' },
                    { key: 'canDispatch', label: 'Dispatch courses' },
                    { key: 'canManageDrivers', label: 'Gérer chauffeurs' },
                    { key: 'canViewFinancials', label: 'Voir finances' },
                    { key: 'canManageSettings', label: 'Paramètres système' },
                  ].map(perm => (
                    <div key={perm.key} className="flex items-center gap-1.5">
                      {p[perm.key as keyof typeof p] ? (
                        <CheckCircle size={11} className="text-green-500" />
                      ) : (
                        <XCircle size={11} className="text-gray-300" />
                      )}
                      <span className={`text-xs ${p[perm.key as keyof typeof p] ? 'text-gray-700' : 'text-gray-300'}`}>
                        {perm.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
