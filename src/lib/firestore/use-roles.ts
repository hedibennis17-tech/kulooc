/**
 * KULOOC — Système de rôles
 * Rôles : super-admin, admin, dispatcher, agent, user
 * Seul le super-admin peut assigner des rôles
 */
import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { useUser } from '@/firebase/provider';

// ── Types ──────────────────────────────────────────────────────────────────────

export type UserRole = 'super-admin' | 'admin' | 'dispatcher' | 'agent' | 'user';

export interface KuloocUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  assignedBy?: string; // uid du super-admin qui a assigné le rôle
  phone?: string;
  photoURL?: string;
}

// ── Permissions par rôle ───────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<UserRole, {
  label: string;
  description: string;
  color: string;
  badge: string;
  canAssignRoles: boolean;
  canViewDashboard: boolean;
  canDispatch: boolean;
  canManageDrivers: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  canViewFinancials: boolean;
  canManageSettings: boolean;
}> = {
  'super-admin': {
    label: 'Super Administrateur',
    description: 'Accès total — gestion des rôles, paramètres système, finances',
    color: 'red',
    badge: '👑',
    canAssignRoles: true,
    canViewDashboard: true,
    canDispatch: true,
    canManageDrivers: true,
    canViewReports: true,
    canManageUsers: true,
    canViewFinancials: true,
    canManageSettings: true,
  },
  'admin': {
    label: 'Administrateur',
    description: 'Accès complet sauf gestion des rôles et paramètres système',
    color: 'orange',
    badge: '🔐',
    canAssignRoles: false,
    canViewDashboard: true,
    canDispatch: true,
    canManageDrivers: true,
    canViewReports: true,
    canManageUsers: true,
    canViewFinancials: true,
    canManageSettings: false,
  },
  'dispatcher': {
    label: 'Dispatcher',
    description: 'Gestion des courses, assignation manuelle, suivi des chauffeurs',
    color: 'blue',
    badge: '🚦',
    canAssignRoles: false,
    canViewDashboard: true,
    canDispatch: true,
    canManageDrivers: false,
    canViewReports: false,
    canManageUsers: false,
    canViewFinancials: false,
    canManageSettings: false,
  },
  'agent': {
    label: 'Agent',
    description: 'Visualisation du tableau de bord, support client basique',
    color: 'green',
    badge: '👤',
    canAssignRoles: false,
    canViewDashboard: true,
    canDispatch: false,
    canManageDrivers: false,
    canViewReports: false,
    canManageUsers: false,
    canViewFinancials: false,
    canManageSettings: false,
  },
  'user': {
    label: 'Utilisateur',
    description: 'Accès client standard — réservation de courses',
    color: 'gray',
    badge: '🙂',
    canAssignRoles: false,
    canViewDashboard: false,
    canDispatch: false,
    canManageDrivers: false,
    canViewReports: false,
    canManageUsers: false,
    canViewFinancials: false,
    canManageSettings: false,
  },
};

// ── Super Admin UID ────────────────────────────────────────────────────────────
export const SUPER_ADMIN_EMAIL = 'hedibennis17@gmail.com';

// ── Hook useCurrentUserRole ────────────────────────────────────────────────────

export function useCurrentUserRole() {
  const { user } = useUser();
  const [role, setRole] = useState<UserRole>('user');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) { setIsLoading(false); return; }

    // Super admin par email
    if (user.email === SUPER_ADMIN_EMAIL) {
      setRole('super-admin');
      setIsLoading(false);
      return;
    }

    const ref = doc(db, 'users', user.uid);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        setRole((snap.data().role as UserRole) || 'user');
      } else {
        setRole('user');
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, [user?.uid, user?.email]);

  const permissions = ROLE_PERMISSIONS[role];
  return { role, permissions, isLoading };
}

// ── Hook useRolesManagement (super-admin seulement) ────────────────────────────

export function useRolesManagement() {
  const { user } = useUser();
  const { role } = useCurrentUserRole();
  const [users, setUsers] = useState<KuloocUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = role === 'super-admin' || user?.email === SUPER_ADMIN_EMAIL;

  // Écoute temps réel de tous les utilisateurs
  useEffect(() => {
    if (!isSuperAdmin) { setIsLoading(false); return; }

    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const list: KuloocUser[] = snap.docs.map(d => ({
        uid: d.id,
        email: d.data().email || '',
        displayName: d.data().displayName || d.data().name || d.data().email || 'Inconnu',
        role: (d.data().role as UserRole) || 'user',
        createdAt: d.data().createdAt?.toDate() || new Date(),
        updatedAt: d.data().updatedAt?.toDate() || new Date(),
        isActive: d.data().isActive !== false,
        assignedBy: d.data().assignedBy,
        phone: d.data().phone,
        photoURL: d.data().photoURL,
      }));
      setUsers(list);
      setIsLoading(false);
    }, err => {
      setError(err.message);
      setIsLoading(false);
    });
    return () => unsub();
  }, [isSuperAdmin]);

  // Assigner un rôle à un utilisateur
  const assignRole = useCallback(async (targetUid: string, newRole: UserRole) => {
    if (!isSuperAdmin) throw new Error('Permission refusée — Super Admin requis');
    if (!user?.uid) throw new Error('Non authentifié');

    // Empêcher de changer le rôle du super-admin
    const targetUser = users.find(u => u.uid === targetUid);
    if (targetUser?.email === SUPER_ADMIN_EMAIL) {
      throw new Error('Impossible de modifier le rôle du Super Administrateur');
    }

    await updateDoc(doc(db, 'users', targetUid), {
      role: newRole,
      assignedBy: user.uid,
      updatedAt: serverTimestamp(),
    });
  }, [isSuperAdmin, user?.uid, users]);

  // Activer / désactiver un utilisateur
  const toggleUserActive = useCallback(async (targetUid: string, isActive: boolean) => {
    if (!isSuperAdmin) throw new Error('Permission refusée');
    await updateDoc(doc(db, 'users', targetUid), {
      isActive,
      updatedAt: serverTimestamp(),
    });
  }, [isSuperAdmin]);

  // Statistiques par rôle
  const stats = {
    total: users.length,
    byRole: Object.fromEntries(
      (Object.keys(ROLE_PERMISSIONS) as UserRole[]).map(r => [
        r, users.filter(u => u.role === r).length,
      ])
    ) as Record<UserRole, number>,
    active: users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
  };

  return {
    users, isLoading, error, isSuperAdmin, stats,
    assignRole, toggleUserActive,
  };
}
