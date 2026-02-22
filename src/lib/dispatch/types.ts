// ============================================================
// KULOOC Dispatch System — Types & Interfaces
// ============================================================

export type DriverStatus = 'offline' | 'online' | 'en-route' | 'on-trip' | 'busy';
export type RideStatus = 'pending' | 'searching' | 'matched' | 'driver-assigned' | 'driver-arrived' | 'in-progress' | 'completed' | 'cancelled' | 'expired';
export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface DriverLocation extends GeoPoint {
  heading?: number;
  speed?: number;
  accuracy?: number;
  h3Cell?: string;
  timestamp?: Date;
}

export interface DriverVehicle {
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  capacity: number;
  type: 'standard' | 'xl' | 'premium' | 'electric' | 'comfort';
  features?: string[];
}

export interface DispatchDriver {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  photoUrl?: string;
  status: DriverStatus;
  onlineSince?: Date;
  lastSeen?: Date;
  currentLocation?: DriverLocation;
  vehicle: DriverVehicle;
  currentRideId?: string | null;
  totalRidesToday: number;
  acceptanceRate: number;
  averageRating: number;
  preferences?: {
    maxDetourMinutes?: number;
    language?: string;
  };
}

export interface RideLocation {
  address: string;
  location: GeoPoint;
  h3Cell?: string;
}

export interface RideRequest {
  id: string;
  passengerId: string;
  passengerName?: string;
  pickup: RideLocation;
  destination: RideLocation;
  productType: 'standard' | 'xl' | 'premium' | 'electric' | 'comfort';
  estimatedFare: number;
  estimatedDistance: number;
  estimatedDuration: number;
  requestedAt: Date;
  expiresAt?: Date;
  status: RideStatus;
  matchingRadius: number;
  candidateDrivers?: CandidateDriver[];
  assignedDriverId?: string | null;
  assignedAt?: Date;
  surgeMultiplier?: number;
}

export interface CandidateDriver {
  driverId: string;
  score: number;
  etaToPickup: number;
  distanceToPickup: number;
}

export interface ActiveRide {
  id: string;
  passengerId: string;
  passengerName?: string;
  driverId: string;
  driverName?: string;
  pickup: RideLocation;
  destination: RideLocation;
  status: RideStatus;
  assignedAt?: Date;
  driverArrivedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  pricing?: {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    surgeMultiplier: number;
    subtotal: number;
    tax: number;
    total: number;
  };
  actualRoute?: {
    distanceKm: number;
    durationMinutes: number;
    polyline?: string;
  };
}

export interface ZoneMetrics {
  cellId: string;
  availableDrivers: string[];
  driversCount: number;
  pendingRequests: string[];
  pendingCount: number;
  demandSupplyRatio: number;
  smoothedSurge: number;
  updatedAt?: Date;
}

export interface DispatchMetrics {
  activeDrivers: number;
  onlineDrivers: number;
  pendingRequests: number;
  activeRides: number;
  completedToday: number;
  avgWaitTimeSeconds: number;
  avgRating: number;
  surgeZones: number;
  revenue: number;
}

export interface MatchScore {
  driverId: string;
  score: number;
  etaToPickup: number;
  distanceToPickup: number;
  breakdown: {
    etaScore: number;
    ratingScore: number;
    acceptanceScore: number;
    distanceScore: number;
  };
}
