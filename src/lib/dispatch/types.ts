/**
 * KULOOC — Types partagés pour le module dispatch
 */
import { Timestamp } from 'firebase/firestore';

// ─── Types de base ────────────────────────────────────────────────────────────

export type GeoPoint = {
  latitude: number;
  longitude: number;
  address?: string;
};

export type RideStatus =
  | 'pending'
  | 'searching'
  | 'driver-assigned'
  | 'driver-arrived'
  | 'in-progress'
  | 'completed'
  | 'cancelled';

// ─── Chauffeur pour le dispatch ───────────────────────────────────────────────

export interface DispatchDriver {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'online' | 'offline' | 'en-route' | 'on-trip' | 'busy';
  location?: { latitude: number; longitude: number };
  currentLocation?: { latitude: number; longitude: number }; // Alias pour location
  onlineSince?: Timestamp | null;
  averageRating?: number;
  totalRides?: number;
  acceptanceRate?: number;
  vehicleType?: string;
  currentRideId?: string | null;
  zone?: string;
  vehicle?: {
    make: string;
    model: string;
    year?: number;
    licensePlate: string;
    color?: string;
    type?: 'car' | 'suv' | 'truck' | 'van' | 'electric';
  };
}

// ─── Demande de course ────────────────────────────────────────────────────────

export interface RideRequest {
  id?: string;
  passengerId: string;
  passengerName: string;
  passengerPhone?: string;
  pickup: GeoPoint & { address: string; location?: { latitude: number; longitude: number } };
  destination: GeoPoint & { address: string; location?: { latitude: number; longitude: number } };
  serviceType: string;
  estimatedPrice: number;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  surgeMultiplier: number;
  status: RideStatus;
  requestedAt?: Timestamp;
  assignedAt?: Timestamp;
  driverId?: string;
  driverName?: string;
  notes?: string;
  paymentMethod?: string;
  dispatchAttempts?: number;
  lastDispatchedAt?: Timestamp;
}

// ─── Course active ────────────────────────────────────────────────────────────

export interface ActiveRide {
  id?: string;
  requestId: string;
  passengerId: string;
  passengerName: string;
  passengerPhone?: string;
  driverId: string;
  driverName: string;
  driverLocation?: { latitude: number; longitude: number };
  pickup: GeoPoint & { address: string };
  destination: GeoPoint & { address: string };
  serviceType: string;
  status: RideStatus;
  estimatedPrice?: number;
  estimatedDistanceKm?: number;
  estimatedDurationMin?: number;
  pricing: {
    base: number;
    perKm: number;
    perMin: number;
    distanceKm: number;
    durationMin: number;
    surgeMultiplier: number;
    subtotal: number;
    tax: number;
    total: number;
    driverEarnings?: number;
    platformFee?: number;
  };
  assignedAt?: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  polyline?: string;
}

// ─── Métriques de dispatch ────────────────────────────────────────────────────

export interface DispatchMetrics {
  totalDispatched: number;
  totalAccepted: number;
  totalDeclined: number;
  totalExpired: number;
  avgResponseTimeMs: number;
  avgDistanceKm: number;
  activeRequests: number;
  activeDrivers: number;
  timestamp: Timestamp;
}

// ─── Score de matching ────────────────────────────────────────────────────────

export interface MatchScore {
  driverId: string;
  driverName: string;
  score: number;
  distanceKm: number;
  etaMinutes: number;
  waitTimeSeconds: number;
  rating: number;
}

// ─── Métriques de zone ────────────────────────────────────────────────────────

export interface ZoneMetrics {
  zoneId: string;
  activeDrivers: number;
  pendingRequests: number;
  avgWaitTimeMin: number;
  surgeMultiplier: number;
  lastUpdated: Timestamp;
}

// ─── Candidat chauffeur ───────────────────────────────────────────────────────

export interface CandidateDriver {
  driver: DispatchDriver;
  distanceKm: number;
  etaMinutes: number;
  score: number;
}
