'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase/provider';
import { db } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { AdminRole, AdminUser, ROLE_PERMISSIONS, RolePermissions, SUPER_ADMIN_EMAIL } from './types';

export interface AdminAuthState {
  adminUser: AdminUser | null;
  role: AdminRole | null;
  permissions: RolePermissions | null;
  isLoading: boolean;
  isAuthorized: boolean;
  error: string | null;
}

export function useAdminAuth(): AdminAuthState {
  const { user, isUserLoading } = useUser();
  const [state, setState] = useState<AdminAuthState>({
    adminUser: null,
    role: null,
    permissions: null,
    isLoading: true,
    isAuthorized: false,
    error: null,
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      setState(prev => {
        if (prev.isLoading) {
          return {
            adminUser: null, role: null, permissions: null,
            isLoading: false, isAuthorized: false,
            error: 'Erreur de connexion Firebase - Timeout',
          };
        }
        return prev;
      });
    }, 10000);

    if (isUserLoading) return () => clearTimeout(timeout);

    if (!user) {
      clearTimeout(timeout);
      setState({
        adminUser: null, role: null, permissions: null,
        isLoading: false, isAuthorized: false, error: 'Non connecté',
      });
      return;
    }

    const checkAdminRole = async () => {
      try {
        // ── Super Admin : accès immédiat sans dépendre des règles Firestore ──
        if (user.email === SUPER_ADMIN_EMAIL) {
          clearTimeout(timeout);
          const adminUser: AdminUser = {
            uid: user.uid,
            email: user.email!,
            name: user.displayName || 'HEDI BENNIS',
            role: 'super_admin',
            avatar: user.photoURL || undefined,
            createdAt: new Date(),
            isActive: true,
          };

          // Mettre à jour Firestore en arrière-plan (silencieux si erreur de permission)
          setDoc(doc(db, 'admin_users', user.uid), {
            ...adminUser,
            role: 'super_admin',
            lastLogin: serverTimestamp(),
          }, { merge: true }).catch(() => {
            // Ignoré — le document existe déjà dans Firestore via Admin SDK
          });

          setState({
            adminUser,
            role: 'super_admin',
            permissions: ROLE_PERMISSIONS['super_admin'],
            isLoading: false,
            isAuthorized: true,
            error: null,
          });
          return;
        }

        // ── Autres utilisateurs : vérifier le rôle dans Firestore ──
        const adminDoc = await getDoc(doc(db, 'admin_users', user.uid));

        if (!adminDoc.exists()) {
          clearTimeout(timeout);
          setState({
            adminUser: null, role: null, permissions: null,
            isLoading: false, isAuthorized: false,
            error: 'Accès refusé — Vous n\'avez pas les permissions admin',
          });
          return;
        }

        const data = adminDoc.data();
        const role = data.role as AdminRole;

        if (!data.isActive) {
          clearTimeout(timeout);
          setState({
            adminUser: null, role: null, permissions: null,
            isLoading: false, isAuthorized: false,
            error: 'Compte admin désactivé',
          });
          return;
        }

        const adminUser: AdminUser = {
          uid: user.uid,
          email: user.email!,
          name: data.name || user.displayName || 'Admin',
          role,
          avatar: user.photoURL || undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          isActive: data.isActive,
        };

        // Mettre à jour lastLogin en arrière-plan
        setDoc(doc(db, 'admin_users', user.uid), {
          lastLogin: serverTimestamp(),
        }, { merge: true }).catch(() => {});

        clearTimeout(timeout);
        setState({
          adminUser,
          role,
          permissions: ROLE_PERMISSIONS[role],
          isLoading: false,
          isAuthorized: true,
          error: null,
        });
      } catch (err: unknown) {
        clearTimeout(timeout);
        setState({
          adminUser: null, role: null, permissions: null,
          isLoading: false, isAuthorized: false,
          error: err instanceof Error ? err.message : 'Erreur inconnue',
        });
      }
    };

    checkAdminRole();
    return () => clearTimeout(timeout);
  }, [user, isUserLoading]);

  return state;
}
