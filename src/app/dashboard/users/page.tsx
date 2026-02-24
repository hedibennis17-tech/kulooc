'use client';

import { useState, useMemo } from 'react';
import {
  Crown, Shield, Radio, User, Users, Search, ChevronDown,
  CheckCircle, XCircle, AlertTriangle, RefreshCw, Lock,
} from 'lucide-react';
import {
  useRolesManagement,
  useCurrentUserRole,
  ROLE_PERMISSIONS,
  UserRole,
  KuloocUser,
  SUPER_ADMIN_EMAIL,
} from '@/lib/firestore/use-roles';

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

  // Accès refusé si pas super-admin
  if (!isSuperAdmin && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Lock size={48} className="text-red-400" />
        <h2 className="text-xl font-bold text-gray-800">Accès restreint</h2>
        <p className="text-gray-500 text-center max-w-sm">
          Cette page est réservée au <strong>Super Administrateur</strong>.<br />
          Votre rôle actuel : <RoleBadge role={currentRole} />
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Crown size={24} className="text-red-500" /> Gestion des utilisateurs
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Super Administrateur — assignez les rôles et gérez les accès
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Connecté en tant que</p>
          <RoleBadge role="super-admin" />
        </div>
      </div>

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
                      <RefreshCw size={16} className="animate-spin text-blue-400" />
                    ) : (
                      <RoleSelector
                        currentRole={u.role}
                        onSelect={newRole => handleRoleChange(u, newRole)}
                        disabled={isSuperAdminUser}
                      />
                    )}
                  </div>

                  {/* Activer / Désactiver */}
                  {!isSuperAdminUser && (
                    <button
                      onClick={() => handleToggleActive(u)}
                      disabled={isUpdating}
                      className={`p-1.5 rounded-lg transition-colors ${
                        u.isActive
                          ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                          : 'text-green-500 hover:bg-green-50'
                      }`}
                      title={u.isActive ? 'Désactiver' : 'Activer'}
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
