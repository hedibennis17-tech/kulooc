'use client';
/**
 * KULOOC Dispatch Engine
 * Moteur d'assignation automatique en temps réel
 * - File d'attente par zone (H3-like grid 1km²)
 * - Chauffeur le plus proche + le plus longtemps en attente
 * - Timeout 60s → chauffeur suivant
 * - Notification push au chauffeur via Firestore
 */
import {
  collection, doc, query, where, onSnapshot,
  runTransaction, serverTimestamp, updateDoc,
  addDoc, getDoc, setDoc, Timestamp,
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
  drivers: DispatchDriver[]
): DispatchDriver | null {
  const available = drivers.filter(
    (d) =>
      (d.status === 'online') &&
      d.location &&
      !d.currentRideId
  );
  if (available.length === 0) return null;

  const pickupLat = request.pickup.latitude;
  const pickupLng = request.pickup.longitude;

  // Score = 50% temps d'attente + 30% distance + 20% note
  const scored = available.map((d) => {
    const distKm = haversineKm(
      d.location!.latitude, d.location!.longitude,
      pickupLat, pickupLng
    );
    if (distKm > 30) return null; // Trop loin

    // Temps en ligne (en secondes depuis onlineSince)
    const waitSeconds = d.onlineSince
      ? (Date.now() / 1000) - (d.onlineSince as Timestamp).seconds
      : 0;

    const distScore = Math.max(0, 1 - distKm / 15);        // 15km max
    const waitScore = Math.min(1, waitSeconds / 3600);       // 1h = score max
    const ratingScore = (d.averageRating || 4.5) / 5;

    const total = 0.50 * waitScore + 0.30 * distScore + 0.20 * ratingScore;
    return { driver: d, distKm, waitSeconds, score: total };
  }).filter(Boolean) as Array<{ driver: DispatchDriver; distKm: number; waitSeconds: number; score: number }>;

  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0].driver;
}

// ─── Moteur principal ─────────────────────────────────────────────────────────
export class DispatchEngine {
  private db: Firestore;
  private unsubRequests: (() => void) | null = null;
  private unsubDrivers: (() => void) | null = null;
  private drivers: DispatchDriver[] = [];
  private requests: DispatchRequest[] = [];
  private processingIds = new Set<string>(); // Éviter double-traitement
  private offerTimeouts = new Map<string, NodeJS.Timeout>(); // requestId → timeout

  constructor(db: Firestore) {
    this.db = db;
  }

  start() {
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
      const newRequests = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DispatchRequest));
      this.requests = newRequests;
      // Traiter chaque nouvelle demande
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const req = { id: change.doc.id, ...change.doc.data() } as DispatchRequest;
          if (!this.processingIds.has(req.id)) {
            setTimeout(() => this.processRequest(req), 500); // Petit délai pour laisser Firestore se stabiliser
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
  }

  public async processRequest(request: DispatchRequest) {
    if (this.processingIds.has(request.id)) return;
    this.processingIds.add(request.id);

    await this.offerToNextDriver(request.id, []);
  }

  private async offerToNextDriver(requestId: string, excludedDriverIds: string[]) {
    // Recharger la demande pour vérifier son statut
    const reqSnap = await getDoc(doc(this.db, 'ride_requests', requestId));
    if (!reqSnap.exists() || reqSnap.data().status !== 'pending') {
      this.processingIds.delete(requestId);
      return;
    }
    const request = { id: reqSnap.id, ...reqSnap.data() } as DispatchRequest;

    // Filtrer les chauffeurs déjà refusés
    const availableDrivers = this.drivers.filter(
      (d) => !excludedDriverIds.includes(d.id)
    );

    const best = selectBestDriver(request, availableDrivers);
    if (!best) {
      // Aucun chauffeur disponible — laisser en pending
      this.processingIds.delete(requestId);
      return;
    }

    // Offrir la course au chauffeur via Firestore
    const offerExpiresAt = new Date(Date.now() + 60000); // 60 secondes
    try {
      await updateDoc(doc(this.db, 'ride_requests', requestId), {
        offeredToDriverId: best.id,
        offeredToDriverName: (best as any).driverName || best.name || 'Chauffeur',
        offerExpiresAt: Timestamp.fromDate(offerExpiresAt),
        offerSentAt: serverTimestamp(),
        status: 'offered', // Nouveau statut : offre envoyée
        updatedAt: serverTimestamp(),
      });

      // Créer une notification dans la collection du chauffeur
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
        status: 'pending', // pending → accepted / declined
        expiresAt: Timestamp.fromDate(offerExpiresAt),
        createdAt: serverTimestamp(),
      });

      // Timeout 60s : si pas de réponse → chauffeur suivant
      const timeout = setTimeout(async () => {
        this.offerTimeouts.delete(requestId);
        // Vérifier si toujours en attente
        const snap = await getDoc(doc(this.db, 'ride_requests', requestId));
        if (snap.exists() && snap.data().status === 'offered') {
          // Remettre en pending et essayer le prochain
          await updateDoc(doc(this.db, 'ride_requests', requestId), {
            status: 'pending',
            offeredToDriverId: null,
            offerExpiresAt: null,
            updatedAt: serverTimestamp(),
          });
          // Marquer l'offre comme expirée
          await updateDoc(doc(this.db, 'driver_offers', `${requestId}_${best.id}`), {
            status: 'expired',
          }).catch(() => {});
          // Réessayer avec le prochain chauffeur
          await this.offerToNextDriver(requestId, [...excludedDriverIds, best.id]);
        }
      }, 60000);

      this.offerTimeouts.set(requestId, timeout);
    } catch (e) {
      this.processingIds.delete(requestId);
    }
  }

  // Appelé quand un chauffeur accepte
  async acceptOffer(requestId: string, driverId: string, driverName: string | undefined | null, driverLocation: { latitude: number; longitude: number } | null | undefined) {
    // Protéger contre les valeurs undefined qui causent une erreur Firestore
    const safeName = driverName || 'Chauffeur';
    const safeLocation = driverLocation ?? null;
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
        if (reqData.status !== 'offered' && reqData.status !== 'pending') throw new Error('Demande déjà assignée');
        if (reqData.offeredToDriverId && reqData.offeredToDriverId !== driverId) throw new Error('Offre destinée à un autre chauffeur');

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

      // Marquer l'offre comme acceptée
      await updateDoc(doc(this.db, 'driver_offers', `${requestId}_${driverId}`), {
        status: 'accepted',
      }).catch(() => {});

      this.processingIds.delete(requestId);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // Appelé quand un chauffeur refuse
  async declineOffer(requestId: string, driverId: string) {
    const timeout = this.offerTimeouts.get(requestId);
    if (timeout) {
      clearTimeout(timeout);
      this.offerTimeouts.delete(requestId);
    }

    // Marquer l'offre comme refusée
    await updateDoc(doc(this.db, 'driver_offers', `${requestId}_${driverId}`), {
      status: 'declined',
    }).catch(() => {});

    // Remettre en pending et chercher le prochain
    await updateDoc(doc(this.db, 'ride_requests', requestId), {
      status: 'pending',
      offeredToDriverId: null,
      offerExpiresAt: null,
      updatedAt: serverTimestamp(),
    });

    // Chercher le prochain chauffeur (exclure celui qui a refusé)
    const reqSnap = await getDoc(doc(this.db, 'ride_requests', requestId));
    if (reqSnap.exists()) {
      const excludedFromPrev = reqSnap.data().declinedByDriverIds || [];
      const newExcluded = [...excludedFromPrev, driverId];
      await updateDoc(doc(this.db, 'ride_requests', requestId), {
        declinedByDriverIds: newExcluded,
      });
      await this.offerToNextDriver(requestId, newExcluded);
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
