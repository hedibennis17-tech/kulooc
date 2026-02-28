'use client';
/**
 * KULOOC Dispatch Engine v2
 * ─────────────────────────────────────────────────────────────────────────────
 * SOURCE UNIQUE DE VÉRITÉ pour l'assignation des courses.
 *
 * Règles fondamentales :
 *   1. Un seul moteur actif à la fois (singleton + flag `started`)
 *   2. Le moteur est la seule entité qui crée des documents `active_rides`
 *   3. Flux offre : pending → offered (60 s) → prochain chauffeur ou fallback
 *   4. Fallback : si aucun chauffeur dans le rayon, essayer TOUT chauffeur online
 *   5. directAssign : pour le panneau de dispatch manuel (bypass de l'offre)
 *   6. acceptOffer : appelé par use-driver.ts quand le chauffeur accepte
 *   7. declineOffer : appelé par use-driver.ts quand le chauffeur refuse
 */
import {
  collection, doc, query, where, onSnapshot,
  runTransaction, serverTimestamp, updateDoc,
  setDoc, getDoc, Timestamp,
  type Firestore,
} from 'firebase/firestore';

// ─── Helpers géographiques ────────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DispatchDriver {
  id: string;
  name: string;
  status: string;
  location?: { latitude: number; longitude: number };
  onlineSince?: Timestamp | null;
  averageRating?: number;
  vehicleType?: string;
  currentRideId?: string | null;
}

export interface DispatchRequest {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone?: string;
  pickup: { address: string; latitude: number; longitude: number };
  destination: { address: string; latitude: number; longitude: number };
  serviceType: string;
  estimatedPrice: number;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  surgeMultiplier: number;
  status: string;
  requestedAt?: Timestamp | null;
  assignedDriverId?: string | null;
  offeredToDriverId?: string | null;
  offerExpiresAt?: Timestamp | null;
}

// ─── Sélection du meilleur chauffeur ─────────────────────────────────────────
function selectBestDriver(
  request: DispatchRequest,
  drivers: DispatchDriver[],
  maxRadiusKm = 30
): DispatchDriver | null {
  // Filtrer les chauffeurs disponibles (online uniquement, sans course active)
  const available = drivers.filter((d) => {
    // Le chauffeur doit être online et ne pas avoir de course active
    const isAvailable = d.status === 'online' && !d.currentRideId;
    if (!isAvailable) return false;
    return true;
  });

  if (available.length === 0) {
    return null;
  }

  const pickupLat = request.pickup.latitude;
  const pickupLng = request.pickup.longitude;

  const scored = available.map((d) => {
    // GPS optionnel: si pas de position, distance neutre (5km)
    const distKm = d.location
      ? haversineKm(d.location.latitude, d.location.longitude, pickupLat, pickupLng)
      : 5;
    
    // Si le rayon max est dépassé et que le chauffeur a une position connue, exclure
    if (distKm > maxRadiusKm && d.location) {
      return null;
    }

    const waitSeconds = d.onlineSince
      ? (Date.now() / 1000) - (d.onlineSince as Timestamp).seconds
      : 0;

    const distScore = Math.max(0, 1 - distKm / 15);
    const waitScore = Math.min(1, waitSeconds / 3600);
    const ratingScore = (d.averageRating || 4.5) / 5;

    const total = 0.50 * waitScore + 0.30 * distScore + 0.20 * ratingScore;
    return { driver: d, distKm, score: total };
  }).filter(Boolean) as Array<{ driver: DispatchDriver; distKm: number; score: number }>;

  if (scored.length === 0) {
    return null;
  }
  
  scored.sort((a, b) => b.score - a.score);
  return scored[0].driver;
}

// ─── Moteur principal ─────────────────────────────────────────────────────────
export class DispatchEngine {
  private db: Firestore;
  private started = false;                                    // Guard singleton
  private unsubRequests: (() => void) | null = null;
  private unsubDrivers: (() => void) | null = null;
  private drivers: DispatchDriver[] = [];
  private processingIds = new Set<string>();
  private offerTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(db: Firestore) {
    this.db = db;
  }

  start() {
    if (this.started) return;                                 // Empêche double-démarrage
    this.started = true;

    // Écouter les chauffeurs en ligne
    const driversQ = query(
      collection(this.db, 'drivers'),
      where('status', 'in', ['online', 'en-route', 'on-trip'])
    );
    this.unsubDrivers = onSnapshot(driversQ, (snap) => {
      this.drivers = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DispatchDriver));
    });

    // Écouter les nouvelles demandes pending
    const requestsQ = query(
      collection(this.db, 'ride_requests'),
      where('status', '==', 'pending')
    );
    this.unsubRequests = onSnapshot(requestsQ, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const req = { id: change.doc.id, ...change.doc.data() } as DispatchRequest;
          if (!this.processingIds.has(req.id)) {
            // Délai court pour laisser Firestore se stabiliser
            setTimeout(() => this.processRequest(req), 500);
          }
        }
      });
    });
  }

  stop() {
    this.unsubRequests?.();
    this.unsubDrivers?.();
    this.offerTimeouts.forEach((t) => clearTimeout(t));
    this.offerTimeouts.clear();
    this.processingIds.clear();
    this.started = false;
  }

  /** Déclencher manuellement le traitement d'une demande (ex: depuis useDispatch) */
  public async processRequest(request: DispatchRequest) {
    if (this.processingIds.has(request.id)) {
      return;
    }
    this.processingIds.add(request.id);
    await this.offerToNextDriver(request.id, []);
  }

  private async offerToNextDriver(requestId: string, excludedDriverIds: string[]) {
    // Recharger la demande pour vérifier son statut actuel
    const reqSnap = await getDoc(doc(this.db, 'ride_requests', requestId));
    if (!reqSnap.exists() || reqSnap.data().status !== 'pending') {
      this.processingIds.delete(requestId);
      return;
    }
    const request = { id: reqSnap.id, ...reqSnap.data() } as DispatchRequest;

    // Filtrer les chauffeurs déjà exclus
    const availableDrivers = this.drivers.filter(
      (d) => !excludedDriverIds.includes(d.id)
    );

    // 1er essai : rayon 30 km
    let best = selectBestDriver(request, availableDrivers, 30);

    // Fallback : si aucun dans le rayon, prendre n'importe quel chauffeur online
    if (!best) {
      best = selectBestDriver(request, availableDrivers, 99999);
    }

    if (!best) {
      // Aucun chauffeur disponible — laisser en pending, réessayer dans 30s
      setTimeout(() => {
        this.processingIds.delete(requestId);
        // Re-vérifier si toujours pending
        getDoc(doc(this.db, 'ride_requests', requestId)).then((snap) => {
          if (snap.exists() && snap.data().status === 'pending') {
            this.processRequest({ id: snap.id, ...snap.data() } as DispatchRequest);
          }
        });
      }, 30000);
      return;
    }

    // Directive 4 : compte à rebours 15s pour l'offre (document workflow p.488)
    const offerExpiresAt = new Date(Date.now() + 15000); // 15 secondes
    try {
      await updateDoc(doc(this.db, 'ride_requests', requestId), {
        offeredToDriverId: best.id,
        offeredToDriverName: (best as any).driverName || best.name || 'Chauffeur',
        offerExpiresAt: Timestamp.fromDate(offerExpiresAt),
        offerSentAt: serverTimestamp(),
        status: 'offered',
        updatedAt: serverTimestamp(),
      });

      // Notification dans driver_offers
      await setDoc(doc(this.db, 'driver_offers', `${requestId}_${best.id}`), {
        requestId,
        driverId: best.id,
        passengerId: request.passengerId,
        passengerName: request.passengerName,
        pickup: request.pickup,
        destination: request.destination,
        serviceType: request.serviceType,
        estimatedPrice: request.estimatedPrice,
        estimatedDistanceKm: request.estimatedDistanceKm,
        estimatedDurationMin: request.estimatedDurationMin,
        status: 'pending',
        expiresAt: Timestamp.fromDate(offerExpiresAt),
        createdAt: serverTimestamp(),
      });

      // Timeout 15s : si pas de réponse → chauffeur suivant
      const timeout = setTimeout(async () => {
        this.offerTimeouts.delete(requestId);
        const snap = await getDoc(doc(this.db, 'ride_requests', requestId));
        if (snap.exists() && snap.data().status === 'offered') {
          await updateDoc(doc(this.db, 'ride_requests', requestId), {
            status: 'pending',
            offeredToDriverId: null,
            offerExpiresAt: null,
            updatedAt: serverTimestamp(),
          });
          await updateDoc(doc(this.db, 'driver_offers', `${requestId}_${best!.id}`), {
            status: 'expired',
          }).catch(() => {});
          await this.offerToNextDriver(requestId, [...excludedDriverIds, best!.id]);
        }
      }, 15000); // 15 secondes comme dans le workflow

      this.offerTimeouts.set(requestId, timeout);
    } catch {
      this.processingIds.delete(requestId);
    }
  }

  /**
   * Appelé par use-driver.ts quand le chauffeur accepte l'offre.
   * C'est la SEULE méthode qui crée un document active_rides via transaction atomique.
   */
  async acceptOffer(
    requestId: string,
    driverId: string,
    driverName: string | undefined | null,
    driverLocation: { latitude: number; longitude: number } | null | undefined
  ): Promise<{ success: boolean; error?: string }> {
    const safeName = driverName || 'Chauffeur';
    const safeLocation = driverLocation ?? null;

    // Annuler le timeout d'expiration
    const timeout = this.offerTimeouts.get(requestId);
    if (timeout) {
      clearTimeout(timeout);
      this.offerTimeouts.delete(requestId);
    }

    try {
      await runTransaction(this.db, async (tx) => {
        const reqRef = doc(this.db, 'ride_requests', requestId);
        const drvRef = doc(this.db, 'drivers', driverId);
        const [reqSnap, drvSnap] = await Promise.all([tx.get(reqRef), tx.get(drvRef)]);

        if (!reqSnap.exists()) throw new Error('Demande introuvable');
        const reqData = reqSnap.data();

        // Accepter si statut est offered OU pending (robustesse)
        if (!['offered', 'pending'].includes(reqData.status)) {
          throw new Error('Demande déjà assignée');
        }
        if (reqData.offeredToDriverId && reqData.offeredToDriverId !== driverId) {
          throw new Error('Offre destinée à un autre chauffeur');
        }

        const rideRef = doc(collection(this.db, 'active_rides'));
        tx.set(rideRef, {
          requestId,
          passengerId: reqData.passengerId,
          passengerName: reqData.passengerName,
          passengerPhone: reqData.passengerPhone || '',
          driverId,
          driverName: safeName,
          driverLocation: safeLocation,
          pickup: reqData.pickup,
          destination: reqData.destination,
          serviceType: reqData.serviceType,
          estimatedPrice: reqData.estimatedPrice,
          estimatedDistanceKm: reqData.estimatedDistanceKm,
          estimatedDurationMin: reqData.estimatedDurationMin,
          surgeMultiplier: reqData.surgeMultiplier || 1.0,
          status: 'driver-assigned',
          pricing: {
            subtotal: +(reqData.estimatedPrice / 1.14975).toFixed(2),
            tax: +(reqData.estimatedPrice - reqData.estimatedPrice / 1.14975).toFixed(2),
            total: reqData.estimatedPrice,
            surgeMultiplier: reqData.surgeMultiplier || 1.0,
          },
          assignedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          rideStartedAt: null,
          rideCompletedAt: null,
          finalPrice: null,
          driverRating: null,
          passengerRating: null,
        });

        tx.update(reqRef, {
          status: 'driver-assigned',
          driverId,
          driverName: safeName,
          assignedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          activeRideId: rideRef.id,
        });

        if (drvSnap.exists()) {
          tx.update(drvRef, {
            status: 'en-route',
            currentRideId: rideRef.id,
            updatedAt: serverTimestamp(),
          });
        }
      });

      await updateDoc(doc(this.db, 'driver_offers', `${requestId}_${driverId}`), {
        status: 'accepted',
      }).catch(() => {});

      this.processingIds.delete(requestId);
      console.log('[v0] acceptOffer SUCCESS: active_ride created for driver', driverId, 'request', requestId);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Appelé par use-driver.ts quand le chauffeur refuse l'offre.
   */
  async declineOffer(requestId: string, driverId: string): Promise<void> {
    const timeout = this.offerTimeouts.get(requestId);
    if (timeout) {
      clearTimeout(timeout);
      this.offerTimeouts.delete(requestId);
    }

    await updateDoc(doc(this.db, 'driver_offers', `${requestId}_${driverId}`), {
      status: 'declined',
    }).catch(() => {});

    await updateDoc(doc(this.db, 'ride_requests', requestId), {
      status: 'pending',
      offeredToDriverId: null,
      offerExpiresAt: null,
      updatedAt: serverTimestamp(),
    });

    const reqSnap = await getDoc(doc(this.db, 'ride_requests', requestId));
    if (reqSnap.exists()) {
      const excludedFromPrev: string[] = reqSnap.data().declinedByDriverIds || [];
      const newExcluded = [...excludedFromPrev, driverId];
      await updateDoc(doc(this.db, 'ride_requests', requestId), {
        declinedByDriverIds: newExcluded,
      });
      await this.offerToNextDriver(requestId, newExcluded);
    }
  }

  /**
   * Assignation directe depuis le panneau de dispatch (bypass de l'offre).
   * Utilisé par useDispatch.assignDriver() pour l'assignation manuelle.
   */
  async directAssign(
    requestId: string,
    driverId: string,
    driverName: string,
    driverLocation: { latitude: number; longitude: number } | null
  ): Promise<{ success: boolean; error?: string }> {
    // Annuler toute offre en cours
    const timeout = this.offerTimeouts.get(requestId);
    if (timeout) {
      clearTimeout(timeout);
      this.offerTimeouts.delete(requestId);
    }

    try {
      await runTransaction(this.db, async (tx) => {
        const reqRef = doc(this.db, 'ride_requests', requestId);
        const drvRef = doc(this.db, 'drivers', driverId);
        const [reqSnap, drvSnap] = await Promise.all([tx.get(reqRef), tx.get(drvRef)]);

        if (!reqSnap.exists()) throw new Error('Demande introuvable');
        const reqData = reqSnap.data();

        if (!['pending', 'offered', 'searching'].includes(reqData.status)) {
          throw new Error(`Demande déjà assignée (statut: ${reqData.status})`);
        }

        const rideRef = doc(collection(this.db, 'active_rides'));
        tx.set(rideRef, {
          requestId,
          passengerId: reqData.passengerId || '',
          passengerName: reqData.passengerName || 'Passager',
          passengerPhone: reqData.passengerPhone || '',
          driverId,
          driverName,
          driverLocation,
          pickup: reqData.pickup,
          destination: reqData.destination,
          serviceType: reqData.serviceType || 'KULOOC X',
          estimatedPrice: reqData.estimatedPrice || 0,
          estimatedDistanceKm: reqData.estimatedDistanceKm || 0,
          estimatedDurationMin: reqData.estimatedDurationMin || 0,
          surgeMultiplier: reqData.surgeMultiplier || 1.0,
          status: 'driver-assigned',
          pricing: {
            subtotal: +((reqData.estimatedPrice || 0) / 1.14975).toFixed(2),
            tax: +((reqData.estimatedPrice || 0) - (reqData.estimatedPrice || 0) / 1.14975).toFixed(2),
            total: reqData.estimatedPrice || 0,
            surgeMultiplier: reqData.surgeMultiplier || 1.0,
          },
          assignedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          rideStartedAt: null,
          rideCompletedAt: null,
          finalPrice: null,
          driverRating: null,
          passengerRating: null,
          assignedManually: true,
        });

        tx.update(reqRef, {
          status: 'driver-assigned',
          driverId,
          driverName,
          assignedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          activeRideId: rideRef.id,
        });

        if (drvSnap.exists()) {
          tx.update(drvRef, {
            status: 'en-route',
            currentRideId: rideRef.id,
            updatedAt: serverTimestamp(),
          });
        }
      });

      this.processingIds.delete(requestId);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}

// ─── Singleton global ─────────────────────────────────────────────────────────
let engineInstance: DispatchEngine | null = null;

export function getDispatchEngine(db: Firestore): DispatchEngine {
  if (!engineInstance) {
    engineInstance = new DispatchEngine(db);
  }
  return engineInstance;
}
