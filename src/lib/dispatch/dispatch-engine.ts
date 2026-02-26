'use client';
/**
 * KULOOC Dispatch Engine v2
 * Single source of truth for ride assignment.
 *
 * Flow:
 * 1. Client creates ride_request (status: 'pending')
 * 2. Engine detects new pending request
 * 3. Engine finds best available driver
 * 4. Engine creates driver_offer (status: 'pending', 60s timeout)
 * 5. Driver accepts → Engine runs atomic transaction:
 *    - ride_request → 'driver-assigned'
 *    - active_rides → created
 *    - driver → 'en-route'
 * 6. Driver completes ride → Engine creates transaction record
 *
 * AUTO-ASSIGN MODE: If no driver_offers system is needed (e.g. closest driver
 * gets auto-assigned), the engine directly assigns without an offer step.
 */
import {
  collection, doc, query, where, onSnapshot,
  runTransaction, serverTimestamp, updateDoc,
  getDoc, setDoc, Timestamp, getDocs, limit,
  type Firestore,
} from 'firebase/firestore';
import { calculateFare } from '@/lib/services/fare-service';

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Best Driver Selection ───────────────────────────────────────────────────
function selectBestDriver(
  request: DispatchRequest,
  drivers: DispatchDriver[],
  excludeIds: string[] = []
): DispatchDriver | null {
  const available = drivers.filter(
    (d) =>
      d.status === 'online' &&
      d.location &&
      !d.currentRideId &&
      !excludeIds.includes(d.id)
  );
  if (available.length === 0) return null;

  const pickupLat = request.pickup.latitude;
  const pickupLng = request.pickup.longitude;

  const scored = available.map((d) => {
    const distKm = haversineKm(
      d.location!.latitude, d.location!.longitude,
      pickupLat, pickupLng
    );
    // Accept drivers up to 30km (generous radius for testing)
    if (distKm > 30) return null;

    const waitSeconds = d.onlineSince
      ? (Date.now() / 1000) - (d.onlineSince as Timestamp).seconds
      : 0;

    const distScore = Math.max(0, 1 - distKm / 15);
    const waitScore = Math.min(1, waitSeconds / 3600);
    const ratingScore = (d.averageRating || 4.5) / 5;

    const total = 0.50 * distScore + 0.30 * waitScore + 0.20 * ratingScore;
    return { driver: d, distKm, score: total };
  }).filter(Boolean) as Array<{ driver: DispatchDriver; distKm: number; score: number }>;

  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0].driver;
}

// ─── Main Engine ──────────────────────────────────────────────────────────────
export class DispatchEngine {
  private db: Firestore;
  private unsubRequests: (() => void) | null = null;
  private unsubDrivers: (() => void) | null = null;
  private drivers: DispatchDriver[] = [];
  private processingIds = new Set<string>();
  private offerTimeouts = new Map<string, NodeJS.Timeout>();
  private started = false;

  constructor(db: Firestore) {
    this.db = db;
  }

  start() {
    if (this.started) return; // Prevent double-start
    this.started = true;
    console.log('[Dispatch] Engine started');
    this.setupListeners();
  }

  private setupListeners() {
    // Cleanup any existing listeners first
    this.unsubDrivers?.();
    this.unsubRequests?.();

    // Listen to active drivers
    const driversQ = query(
      collection(this.db, 'drivers'),
      where('status', 'in', ['online', 'en-route', 'on-trip'])
    );
    this.unsubDrivers = onSnapshot(driversQ, (snap) => {
      this.drivers = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DispatchDriver));
    }, (err) => {
      console.error('[Dispatch] Drivers listener error:', err.message);
      // Auto-recover: re-establish listeners after 3s
      setTimeout(() => this.setupListeners(), 3000);
    });

    // Listen to pending requests and auto-process new ones
    const requestsQ = query(
      collection(this.db, 'ride_requests'),
      where('status', '==', 'pending')
    );
    this.unsubRequests = onSnapshot(requestsQ, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const req = { id: change.doc.id, ...change.doc.data() } as DispatchRequest;
          if (!this.processingIds.has(req.id)) {
            // Small delay to let driver list update
            setTimeout(() => this.processRequest(req), 800);
          }
        }
      });
    }, (err) => {
      console.error('[Dispatch] Requests listener error:', err.message);
      // Auto-recover: re-establish listeners after 3s
      setTimeout(() => this.setupListeners(), 3000);
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

  /**
   * Process a pending request: find best driver and create an offer.
   * If no drivers available yet (listener still loading), retries up to 3 times.
   */
  public async processRequest(request: DispatchRequest, retryCount = 0) {
    if (this.processingIds.has(request.id) && retryCount === 0) return;
    this.processingIds.add(request.id);

    const onlineDrivers = this.drivers.filter(d => d.status === 'online' && !d.currentRideId);
    console.log('[Dispatch] Processing request:', request.id, 'online drivers:', onlineDrivers.length, 'retry:', retryCount);

    // If no online drivers and we haven't retried too many times, wait and retry
    if (onlineDrivers.length === 0 && retryCount < 3) {
      console.log('[Dispatch] No online drivers yet, retrying in 3s...');
      setTimeout(() => this.processRequest(request, retryCount + 1), 3000);
      return;
    }

    await this.offerToNextDriver(request.id, []);
  }

  /**
   * Find next available driver and send them an offer
   */
  private async offerToNextDriver(requestId: string, excludedDriverIds: string[]) {
    // Re-read the request to verify it's still pending
    const reqSnap = await getDoc(doc(this.db, 'ride_requests', requestId));
    if (!reqSnap.exists()) {
      this.processingIds.delete(requestId);
      return;
    }
    const reqData = reqSnap.data();
    // Only process if still pending (not already assigned/cancelled)
    if (reqData.status !== 'pending') {
      this.processingIds.delete(requestId);
      return;
    }
    const request = { id: reqSnap.id, ...reqData } as DispatchRequest;

    // Find best driver excluding previously declined ones
    const best = selectBestDriver(request, this.drivers, excludedDriverIds);

    if (!best) {
      console.log('[Dispatch] No driver available for request:', requestId);
      // If we can't find any driver, also try ANY online driver as fallback
      const anyOnline = this.drivers.find(
        (d) => d.status === 'online' && !d.currentRideId && !excludedDriverIds.includes(d.id)
      );
      if (!anyOnline) {
        this.processingIds.delete(requestId);
        return;
      }
      // Use fallback driver
      console.log('[Dispatch] Fallback to any online driver:', anyOnline.name);
      await this.sendOffer(requestId, request, anyOnline, excludedDriverIds);
      return;
    }

    console.log('[Dispatch] Best driver for', requestId, ':', best.name, best.id);
    await this.sendOffer(requestId, request, best, excludedDriverIds);
  }

  /**
   * Send an offer to a specific driver
   */
  private async sendOffer(
    requestId: string,
    request: DispatchRequest,
    driver: DispatchDriver,
    excludedDriverIds: string[]
  ) {
    const offerExpiresAt = new Date(Date.now() + 60000); // 60 seconds

    try {
      // Update request to 'offered' status
      await updateDoc(doc(this.db, 'ride_requests', requestId), {
        offeredToDriverId: driver.id,
        offeredToDriverName: driver.name,
        offerExpiresAt: Timestamp.fromDate(offerExpiresAt),
        offerSentAt: serverTimestamp(),
        status: 'offered',
        updatedAt: serverTimestamp(),
      });

      // Create offer document for the driver
      await setDoc(doc(this.db, 'driver_offers', `${requestId}_${driver.id}`), {
        requestId,
        driverId: driver.id,
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

      // Set timeout: if driver doesn't respond in 60s, try next driver
      const timeout = setTimeout(async () => {
        this.offerTimeouts.delete(requestId);
        try {
          const snap = await getDoc(doc(this.db, 'ride_requests', requestId));
          if (snap.exists() && snap.data().status === 'offered') {
            // Reset to pending
            await updateDoc(doc(this.db, 'ride_requests', requestId), {
              status: 'pending',
              offeredToDriverId: null,
              offerExpiresAt: null,
              updatedAt: serverTimestamp(),
            });
            // Mark offer as expired
            await updateDoc(doc(this.db, 'driver_offers', `${requestId}_${driver.id}`), {
              status: 'expired',
            }).catch(() => {});
            // Try next driver
            await this.offerToNextDriver(requestId, [...excludedDriverIds, driver.id]);
          }
        } catch (e) {
          console.error('[Dispatch] Offer timeout handling error:', e);
          this.processingIds.delete(requestId);
        }
      }, 60000);

      this.offerTimeouts.set(requestId, timeout);
    } catch (e: any) {
      console.error('[Dispatch] Error sending offer:', e.message);
      this.processingIds.delete(requestId);
    }
  }

  /**
   * Called when a driver accepts an offer.
   * Runs an atomic Firestore transaction to:
   * 1. Verify request is still offered/pending
   * 2. Create the active_ride
   * 3. Update ride_request status
   * 4. Update driver status
   */
  async acceptOffer(
    requestId: string,
    driverId: string,
    driverName: string,
    driverLocation: { latitude: number; longitude: number } | null
  ): Promise<{ success: boolean; error?: string }> {
    // Clear offer timeout
    const timeout = this.offerTimeouts.get(requestId);
    if (timeout) {
      clearTimeout(timeout);
      this.offerTimeouts.delete(requestId);
    }

    try {
      let createdRideId = '';

      await runTransaction(this.db, async (tx) => {
        const reqRef = doc(this.db, 'ride_requests', requestId);
        const drvRef = doc(this.db, 'drivers', driverId);
        const [reqSnap, drvSnap] = await Promise.all([tx.get(reqRef), tx.get(drvRef)]);

        if (!reqSnap.exists()) throw new Error('Demande introuvable');
        const reqData = reqSnap.data();

        // Allow both 'offered' and 'pending' status
        if (reqData.status !== 'offered' && reqData.status !== 'pending') {
          throw new Error(`Demande deja traitee (status: ${reqData.status})`);
        }

        // If offered to someone else, reject
        if (reqData.status === 'offered' && reqData.offeredToDriverId && reqData.offeredToDriverId !== driverId) {
          throw new Error('Offre destinee a un autre chauffeur');
        }

        // Compute fare
        const fare = calculateFare(
          reqData.estimatedDistanceKm || 5,
          reqData.estimatedDurationMin || 10,
          reqData.surgeMultiplier || 1.0,
          reqData.serviceType || 'KULOOC X'
        );

        // Create active ride
        const rideRef = doc(collection(this.db, 'active_rides'));
        createdRideId = rideRef.id;

        tx.set(rideRef, {
          requestId,
          passengerId: reqData.passengerId,
          passengerName: reqData.passengerName,
          passengerPhone: reqData.passengerPhone || '',
          driverId,
          driverName,
          driverLocation: driverLocation || null,
          pickup: reqData.pickup,
          destination: reqData.destination,
          serviceType: reqData.serviceType,
          estimatedPrice: fare.total,
          estimatedDistanceKm: fare.distanceKm,
          estimatedDurationMin: fare.durationMin,
          surgeMultiplier: fare.surgeMultiplier,
          status: 'driver-assigned',
          pricing: fare,
          assignedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          rideStartedAt: null,
          rideCompletedAt: null,
          finalPrice: null,
          driverRating: null,
          passengerRating: null,
        });

        // Update request
        tx.update(reqRef, {
          status: 'driver-assigned',
          driverId,
          driverName,
          assignedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          activeRideId: rideRef.id,
        });

        // Update driver
        if (drvSnap.exists()) {
          tx.update(drvRef, {
            status: 'en-route',
            currentRideId: rideRef.id,
            updatedAt: serverTimestamp(),
          });
        }
      });

      // Mark offer as accepted (outside transaction, non-critical)
      await updateDoc(doc(this.db, 'driver_offers', `${requestId}_${driverId}`), {
        status: 'accepted',
      }).catch(() => {});

      this.processingIds.delete(requestId);
      console.log('[Dispatch] Offer accepted, active_ride created:', createdRideId);
      return { success: true };
    } catch (e: any) {
      console.error('[Dispatch] acceptOffer error:', e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * Called when a driver declines an offer.
   * Resets the request to pending and tries the next driver.
   */
  async declineOffer(requestId: string, driverId: string) {
    // Clear timeout
    const timeout = this.offerTimeouts.get(requestId);
    if (timeout) {
      clearTimeout(timeout);
      this.offerTimeouts.delete(requestId);
    }

    // Mark offer as declined
    await updateDoc(doc(this.db, 'driver_offers', `${requestId}_${driverId}`), {
      status: 'declined',
    }).catch(() => {});

    // Read current declined list
    const reqSnap = await getDoc(doc(this.db, 'ride_requests', requestId));
    if (!reqSnap.exists()) return;

    const declinedByDriverIds = reqSnap.data().declinedByDriverIds || [];
    const newExcluded = [...declinedByDriverIds, driverId];

    // Reset to pending
    await updateDoc(doc(this.db, 'ride_requests', requestId), {
      status: 'pending',
      offeredToDriverId: null,
      offerExpiresAt: null,
      declinedByDriverIds: newExcluded,
      updatedAt: serverTimestamp(),
    });

    // Try next driver
    await this.offerToNextDriver(requestId, newExcluded);
  }

  /**
   * Direct auto-assign without offer step.
   * Used when you want to skip the driver offer flow and just assign directly.
   */
  async directAssign(
    requestId: string,
    driverId: string,
    driverName: string,
    driverLocation: { latitude: number; longitude: number } | null
  ): Promise<{ success: boolean; error?: string }> {
    return this.acceptOffer(requestId, driverId, driverName, driverLocation);
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────
let engineInstance: DispatchEngine | null = null;

export function getDispatchEngine(db: Firestore): DispatchEngine {
  if (!engineInstance) {
    engineInstance = new DispatchEngine(db);
  }
  return engineInstance;
}
