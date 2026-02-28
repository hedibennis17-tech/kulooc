import { db } from '@/firebase';
import {
  doc, setDoc, getDoc, updateDoc, collection,
  query, where, orderBy, limit, getDocs, addDoc,
  serverTimestamp, onSnapshot, Unsubscribe
} from 'firebase/firestore';

export interface ClientProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
  tier: 'regular' | 'gold' | 'premium' | 'subscription';
  totalRides: number;
  totalSpent: number;
  rating: number;
  isBlocked: boolean;
  createdAt: any;
  updatedAt: any;
  homeAddress?: string;
  workAddress?: string;
  preferredPayment?: string;
}

export interface RideRequest {
  passengerId: string;
  passengerName: string;
  passengerPhone?: string;
  pickup: {
    address: string;
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
  };
  destination: {
    address: string;
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
  };
  serviceType: string;
  estimatedPrice: number;
  estimatedDuration?: number;
  estimatedDurationMin?: number;
  estimatedDistance?: number;
  estimatedDistanceKm?: number;
  surgeMultiplier?: number;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: any;
  notes?: string;
}

/**
 * Crée ou met à jour le profil client dans Firestore.
 * Appelé à chaque connexion pour s'assurer que le document existe.
 */
export async function upsertClientProfile(
  uid: string,
  data: Partial<ClientProfile>
): Promise<void> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // Nouvelle inscription — créer le profil complet
    await setDoc(ref, {
      uid,
      email: data.email || '',
      displayName: data.displayName || 'Utilisateur KULOOC',
      phoneNumber: data.phoneNumber || '',
      photoURL: data.photoURL || '',
      tier: 'regular',
      totalRides: 0,
      totalSpent: 0,
      rating: 5.0,
      isBlocked: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...data,
    });
  } else {
    // Mise à jour de la dernière connexion
    await updateDoc(ref, {
      updatedAt: serverTimestamp(),
      displayName: data.displayName || snap.data().displayName,
      photoURL: data.photoURL || snap.data().photoURL,
      email: data.email || snap.data().email,
    });
  }
}

/**
 * Récupère le profil client depuis Firestore.
 */
export async function getClientProfile(uid: string): Promise<ClientProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data() as ClientProfile;
}

/**
 * Met à jour le profil client.
 */
export async function updateClientProfile(
  uid: string,
  data: Partial<ClientProfile>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Crée une demande de course dans Firestore.
 * IMPORTANT: Le dispatch engine écoute `ride_requests` avec status='pending'
 * et utilise `requestedAt` pour le tri, pas `createdAt`.
 */
export async function createRideRequest(request: Omit<RideRequest, 'createdAt' | 'status'>): Promise<string> {
  // Normaliser les coordonnées pour le dispatch engine
  const normalizedRequest = {
    ...request,
    pickup: {
      address: request.pickup.address,
      latitude: request.pickup.latitude ?? request.pickup.lat ?? 0,
      longitude: request.pickup.longitude ?? request.pickup.lng ?? 0,
    },
    destination: {
      address: request.destination.address,
      latitude: request.destination.latitude ?? request.destination.lat ?? 0,
      longitude: request.destination.longitude ?? request.destination.lng ?? 0,
    },
    estimatedDistanceKm: request.estimatedDistanceKm ?? request.estimatedDistance ?? 0,
    estimatedDurationMin: request.estimatedDurationMin ?? request.estimatedDuration ?? 0,
    surgeMultiplier: request.surgeMultiplier ?? 1.0,
    status: 'pending',
    requestedAt: serverTimestamp(), // Pour le dispatch engine
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const ref = await addDoc(collection(db, 'ride_requests'), normalizedRequest);
  console.log('[v0] ride_request created:', ref.id, 'status: pending');
  return ref.id;
}

/**
 * Écoute en temps réel les courses actives d'un passager.
 */
export function watchActiveRide(
  passengerId: string,
  callback: (ride: any | null) => void
): Unsubscribe {
  const q = query(
    collection(db, 'active_rides'),
    where('passengerId', '==', passengerId)
  );
  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      callback(null);
    } else {
      callback({ id: snap.docs[0].id, ...snap.docs[0].data() });
    }
  });
}

/**
 * Récupère l'historique des courses d'un passager.
 * Utilise un index composite (passengerId ASC + completedAt DESC).
 * En cas d'erreur d'index manquant, retourne un tableau vide sans bloquer l'UI.
 */
export async function getClientRideHistory(passengerId: string, maxRides = 20) {
  try {
    const q = query(
      collection(db, 'completed_rides'),
      where('passengerId', '==', passengerId),
      orderBy('completedAt', 'desc'),
      limit(maxRides)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err: any) {
    // Index en cours de construction ou permissions — retourner vide sans crasher
    console.warn('getClientRideHistory:', err?.message || err);
    return [];
  }
}

/**
 * Annule une demande de course.
 */
export async function cancelRideRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, 'ride_requests', requestId), {
    status: 'cancelled',
    cancelledAt: serverTimestamp(),
  });
}
