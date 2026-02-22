import { db } from '@/firebase/config';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';

export type RideStatus = 
  | 'pending' // En attente d'acceptation par un chauffeur
  | 'accepted' // Acceptée par un chauffeur
  | 'en_route' // Chauffeur en route vers le client
  | 'in_progress' // Course en cours
  | 'completed' // Course terminée
  | 'cancelled' // Annulée
  | 'cancelled_by_driver'; // Annulée par le chauffeur

export type ServiceType = 'course' | 'uber_rent' | 'uber_eats' | 'epicerie';

export type Ride = {
  id: string;
  // Client info
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  
  // Ride details
  origin: string;
  originCoords?: { lat: number; lng: number };
  destination: string;
  destinationCoords?: { lat: number; lng: number };
  distance?: number; // en km
  duration?: number; // en minutes
  
  // Service type
  serviceType: ServiceType;
  
  // Scheduling
  scheduledTime?: Timestamp; // null = immédiat
  isImmediate: boolean;
  
  // Pricing
  estimatedPrice: number;
  finalPrice?: number;
  
  // Driver info (null si pas encore assigné)
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  
  // Status
  status: RideStatus;
  
  // Cancellation
  cancellationReason?: string;
  cancellationFee?: number;
  cancelledAt?: Timestamp;
  cancelledBy?: 'client' | 'driver' | 'admin';
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  acceptedAt?: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  
  // Notes
  notes?: string;
  
  // For someone else
  rideFor: 'me' | 'someone';
  recipientName?: string;
  recipientPhone?: string;
};

const ridesCollection = collection(db, 'rides');

/**
 * Créer une nouvelle course
 */
export async function createRide(data: Omit<Ride, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<string> {
  const rideData = {
    ...data,
    status: 'pending' as RideStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(ridesCollection, rideData);
  
  // Notifier les chauffeurs disponibles (TODO: implement push notifications)
  await notifyAvailableDrivers(docRef.id, rideData);
  
  return docRef.id;
}

/**
 * Récupérer une course par ID
 */
export async function getRide(rideId: string): Promise<Ride | null> {
  const docRef = doc(db, 'rides', rideId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return { id: docSnap.id, ...docSnap.data() } as Ride;
}

/**
 * Récupérer toutes les courses d'un client
 */
export async function getClientRides(clientId: string): Promise<Ride[]> {
  const q = query(
    ridesCollection,
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride));
}

/**
 * Récupérer toutes les courses d'un chauffeur
 */
export async function getDriverRides(driverId: string): Promise<Ride[]> {
  const q = query(
    ridesCollection,
    where('driverId', '==', driverId),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride));
}

/**
 * Récupérer toutes les courses en attente (pour les chauffeurs)
 */
export async function getPendingRides(): Promise<Ride[]> {
  const q = query(
    ridesCollection,
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride));
}

/**
 * Accepter une course (chauffeur)
 */
export async function acceptRide(rideId: string, driverId: string, driverName: string, driverPhone: string): Promise<void> {
  const docRef = doc(db, 'rides', rideId);
  await updateDoc(docRef, {
    status: 'accepted',
    driverId,
    driverName,
    driverPhone,
    acceptedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  // Notifier le client (TODO: implement push notifications)
  await notifyClient(rideId, 'Votre chauffeur arrive !');
}

/**
 * Démarrer une course (chauffeur en route)
 */
export async function startRide(rideId: string): Promise<void> {
  const docRef = doc(db, 'rides', rideId);
  await updateDoc(docRef, {
    status: 'en_route',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Marquer la course comme en cours (client à bord)
 */
export async function markRideInProgress(rideId: string): Promise<void> {
  const docRef = doc(db, 'rides', rideId);
  await updateDoc(docRef, {
    status: 'in_progress',
    startedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Terminer une course
 */
export async function completeRide(rideId: string, finalPrice: number): Promise<void> {
  const docRef = doc(db, 'rides', rideId);
  await updateDoc(docRef, {
    status: 'completed',
    finalPrice,
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Annuler une course
 */
export async function cancelRide(
  rideId: string,
  cancelledBy: 'client' | 'driver' | 'admin',
  reason: string
): Promise<{ success: boolean; fee: number; message: string }> {
  const ride = await getRide(rideId);
  
  if (!ride) {
    return { success: false, fee: 0, message: 'Course introuvable' };
  }
  
  if (ride.status === 'completed' || ride.status === 'cancelled') {
    return { success: false, fee: 0, message: 'Cette course ne peut pas être annulée' };
  }
  
  // Calculer les frais d'annulation
  let cancellationFee = 0;
  
  if (cancelledBy === 'client' && ride.scheduledTime) {
    const now = new Date();
    const scheduledDate = ride.scheduledTime.toDate();
    const minutesUntilRide = (scheduledDate.getTime() - now.getTime()) / (1000 * 60);
    
    // Annulation gratuite jusqu'à 60 minutes avant
    if (minutesUntilRide < 60) {
      cancellationFee = ride.estimatedPrice * 0.5; // 50% de frais
    }
  } else if (cancelledBy === 'client' && ride.isImmediate && ride.status === 'accepted') {
    // Si le chauffeur a déjà accepté, frais de 50%
    cancellationFee = ride.estimatedPrice * 0.5;
  }
  
  const docRef = doc(db, 'rides', rideId);
  await updateDoc(docRef, {
    status: cancelledBy === 'driver' ? 'cancelled_by_driver' : 'cancelled',
    cancellationReason: reason,
    cancellationFee,
    cancelledBy,
    cancelledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  // Notifier l'autre partie
  if (cancelledBy === 'client' && ride.driverId) {
    await notifyDriver(ride.driverId, 'Course annulée par le client');
  } else if (cancelledBy === 'driver') {
    await notifyClient(rideId, 'Votre course a été annulée par le chauffeur');
  }
  
  return {
    success: true,
    fee: cancellationFee,
    message: cancellationFee > 0
      ? `Frais d'annulation: ${cancellationFee.toFixed(2)}$`
      : 'Annulation gratuite',
  };
}

/**
 * Notifier les chauffeurs disponibles (placeholder)
 */
async function notifyAvailableDrivers(rideId: string, rideData: any): Promise<void> {
  // TODO: Implement push notifications to drivers
  console.log('Notifying available drivers for ride:', rideId);
}

/**
 * Notifier un client (placeholder)
 */
async function notifyClient(rideId: string, message: string): Promise<void> {
  // TODO: Implement push notifications to client
  console.log('Notifying client for ride:', rideId, message);
}

/**
 * Notifier un chauffeur (placeholder)
 */
async function notifyDriver(driverId: string, message: string): Promise<void> {
  // TODO: Implement push notifications to driver
  console.log('Notifying driver:', driverId, message);
}
