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
    if (isUserLoading) return;

    if (!user) {
      setState({
        adminUser: null,
        role: null,
        permissions: null,
        isLoading: false,
        isAuthorized: false,
        error: 'Non connecté',
      });
      return;
    }

    const checkAdminRole = async () => {
      try {
        // Super admin automatique pour hedibennis17@gmail.com
        if (user.email === SUPER_ADMIN_EMAIL) {
          const adminUser: AdminUser = {
            uid: user.uid,
            email: user.email!,
            name: user.displayName || 'Super Admin',
            role: 'super_admin',
            avatar: user.photoURL || undefined,
            createdAt: new Date(),
            isActive: true,
          };

          // Sauvegarder/mettre à jour dans Firestore
          await setDoc(doc(db, 'admin_users', user.uid), {
            ...adminUser,
            role: 'super_admin',
            lastLogin: serverTimestamp(),
          }, { merge: true });

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

        // Vérifier le rôle dans Firestore pour les autres utilisateurs
        const adminDoc = await getDoc(doc(db, 'admin_users', user.uid));

        if (!adminDoc.exists()) {
          setState({
            adminUser: null,
            role: null,
            permissions: null,
            isLoading: false,
            isAuthorized: false,
            error: 'Accès refusé — Vous n\'avez pas les permissions admin',
          });
          return;
        }

        const data = adminDoc.data();
        const role = data.role as AdminRole;

        if (!data.isActive) {
          setState({
            adminUser: null,
            role: null,
            permissions: null,
            isLoading: false,
            isAuthorized: false,
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

        // Mettre à jour lastLogin
        await setDoc(doc(db, 'admin_users', user.uid), {
          lastLogin: serverTimestamp(),
        }, { merge: true });

        setState({
          adminUser,
          role,
          permissions: ROLE_PERMISSIONS[role],
          isLoading: false,
          isAuthorized: true,
          error: null,
        });
      } catch (err: any) {
        setState({
          adminUser: null,
          role: null,
          permissions: null,
          isLoading: false,
          isAuthorized: false,
          error: err.message,
        });
      }
    };

    checkAdminRole();
  }, [user, isUserLoading]);

  return state;
}
