/**
 * KULOOC Fare Service — Montréal 2026
 * Tarifs compétitifs vs Uber/Taxi, transparents, meilleure rémunération chauffeur
 *
 * Analyse comparative (source: taxihowmuch.fr, 23 fév 2026) :
 *   uberX      : base 1,90$ + résa 1,80$ + 0,79$/km + 0,19$/min | min 6,50$
 *   uberXL     : base 4,30$ + résa 1,80$ + 1,33$/km + 0,22$/min | min 8,50$
 *   uberCONFORT: base 4,30$ + résa 1,80$ + 1,65$/km + 0,27$/min | min 8,50$
 *   Taxi QC    : base 3,45$ + 1,70$/km + 0,63$/min | min 3,45$
 *
 * Stratégie KULOOC :
 *   - Prix légèrement sous Uber sur X et XL
 *   - Frais minimum bas pour dominer les courts trajets
 *   - Chauffeur : 70% du tarif net (vs ~60-65% chez Uber)
 *   - Taxes QC intégrées (TPS 5% + TVQ 9,975%)
 *
 * Catégories :
 *   KULOOC X       : Berline standard, 4 passagers
 *   KULOOC XL      : SUV/Minivan, 6 passagers
 *   KULOOC CONFORT : Berline premium, 4 passagers
 *   KULOOC MOTO    : Moto-taxi, 1 passager
 *   KULOOC EAT     : Livraison repas
 *   KULOOC COURIER : Livraison colis
 *   KULOOC GROCERY : Livraison épicerie
 *
 * Taxes québécoises:
 *   - TPS (fédérale) : 5 %
 *   - TVQ (provinciale) : 9,975 %
 *   - Total taxes : ~14,975 %
 *
 * Répartition:
 *   - Chauffeur : 70 %
 *   - Plateforme : 30 %
 */

export interface FareBreakdown {
  base: number;
  perKmCharge: number;
  perMinCharge: number;
  subtotal: number;
  surgeMultiplier: number;
  surgeAmount: number;
  subtotalWithSurge: number;
  tps: number;
  tvq: number;
  total: number;
  distanceKm: number;
  durationMin: number;
  driverEarnings: number;
  platformFee: number;
  serviceType: string;
  currency: 'CAD';
}

// Tarifs par type de service
// ─── Frais fixes ─────────────────────────────────────────────────────────────
export const FIXED_FEES = {
  BOOKING_FEE: 1.50,            // Frais de réservation (vs 1,80$ Uber)
  AIRPORT_YUL_SURCHARGE: 4.00,  // Surcharge aéroport Montréal-Trudeau YUL
  AIRPORT_YHU_SURCHARGE: 2.50,  // Surcharge aéroport St-Hubert YHU
  CANCELLATION_FEE: 5.00,       // Frais d'annulation (après 2 min)
  LONG_WAIT_FEE: 0.20,          // Par minute d'attente après 3 min
} as const;

// ─── Tableau comparatif public (KULOOC vs Uber vs Taxi) ──────────────────────
export const PRICING_COMPARISON = [
  { km: 3,  kuloocX: 7.50,  kuloocXL: 10.00, kuloocConfort: 11.50, uberX: 8.30,  taxi: 12.00 },
  { km: 5,  kuloocX: 9.50,  kuloocXL: 13.00, kuloocConfort: 14.50, uberX: 10.80, taxi: 15.00 },
  { km: 10, kuloocX: 14.50, kuloocXL: 20.00, kuloocConfort: 22.50, uberX: 17.00, taxi: 23.00 },
  { km: 15, kuloocX: 19.50, kuloocXL: 27.00, kuloocConfort: 30.00, uberX: 23.20, taxi: 31.00 },
  { km: 20, kuloocX: 24.50, kuloocXL: 34.00, kuloocConfort: 38.00, uberX: 29.40, taxi: 40.00 },
  { km: 30, kuloocX: 34.50, kuloocXL: 48.00, kuloocConfort: 54.00, uberX: 41.80, taxi: 57.00 },
];

// ─── Tarifs par type de service ───────────────────────────────────────────────
const SERVICE_RATES: Record<string, {
  base: number; perKm: number; perMin: number; minimum: number;
  description: string; capacity: number; cancellationFee: number;
}> = {
  // ── Rideshare ──────────────────────────────────────────────────────────────
  'KULOOC X': {
    base: 1.75,        // vs Uber 1,90$ — légèrement moins cher
    perKm: 0.75,       // vs Uber 0,79$/km
    perMin: 0.18,      // vs Uber 0,19$/min
    minimum: 5.50,     // vs Uber 6,50$ — avantage sur courts trajets
    description: 'Berline standard — jusqu\'à 4 passagers',
    capacity: 4,
    cancellationFee: 5.00,
  },
  'KULOOC XL': {
    base: 4.00,        // vs Uber 4,30$
    perKm: 1.25,       // vs Uber 1,33$/km
    perMin: 0.21,      // vs Uber 0,22$/min
    minimum: 8.00,     // vs Uber 8,50$
    description: 'SUV ou Minivan — jusqu\'à 6 passagers',
    capacity: 6,
    cancellationFee: 5.00,
  },
  'KULOOC CONFORT': {
    base: 4.00,        // vs Uber SELECT 4,30$
    perKm: 1.55,       // vs Uber SELECT 1,65$/km
    perMin: 0.25,      // vs Uber SELECT 0,27$/min
    minimum: 8.00,     // vs Uber SELECT 8,50$
    description: 'Berline premium — confort et discrétion',
    capacity: 4,
    cancellationFee: 5.00,
  },
  // ── Moto & livraisons ─────────────────────────────────────────────────────
  'KULOOC MOTO': {
    base: 2.50, perKm: 1.25, perMin: 0.25, minimum: 5.00,
    description: 'Moto-taxi — 1 passager, trajets rapides',
    capacity: 1, cancellationFee: 3.00,
  },
  'KULOOC EAT': {
    base: 3.00, perKm: 1.50, perMin: 0.30, minimum: 6.00,
    description: 'Livraison de repas',
    capacity: 0, cancellationFee: 3.00,
  },
  'KULOOC COURIER': {
    base: 4.00, perKm: 1.80, perMin: 0.35, minimum: 8.00,
    description: 'Livraison de colis',
    capacity: 0, cancellationFee: 3.00,
  },
  'KULOOC GROCERY': {
    base: 3.50, perKm: 1.75, perMin: 0.35, minimum: 8.00,
    description: 'Livraison d\'épicerie',
    capacity: 0, cancellationFee: 3.00,
  },
};

// Export des noms de services disponibles
export const RIDE_SERVICE_TYPES = ['KULOOC X', 'KULOOC XL', 'KULOOC CONFORT'] as const;
export type RideServiceType = typeof RIDE_SERVICE_TYPES[number];

export function getServiceInfo(serviceType: string) {
  return SERVICE_RATES[serviceType] || SERVICE_RATES['KULOOC X'];
}

const TPS_RATE = 0.05;
const TVQ_RATE = 0.09975;
const DRIVER_SHARE = 0.70;
const PLATFORM_SHARE = 0.30;

export function calculateFare(
  distanceKm: number,
  durationMin: number,
  surgeMultiplier: number = 1.0,
  serviceType: string = 'KULOOC X'
): FareBreakdown {
  const rates = SERVICE_RATES[serviceType] || SERVICE_RATES['KULOOC X'];

  const base = rates.base;
  const perKmCharge = +(distanceKm * rates.perKm).toFixed(2);
  const perMinCharge = +(durationMin * rates.perMin).toFixed(2);
  const subtotal = +(base + perKmCharge + perMinCharge).toFixed(2);

  const surgeAmount = +(subtotal * (surgeMultiplier - 1)).toFixed(2);
  const subtotalWithSurge = +(subtotal * surgeMultiplier).toFixed(2);

  // Appliquer le minimum
  const subtotalFinal = Math.max(subtotalWithSurge, rates.minimum);

  const tps = +(subtotalFinal * TPS_RATE).toFixed(2);
  const tvq = +(subtotalFinal * TVQ_RATE).toFixed(2);
  const total = +(subtotalFinal + tps + tvq).toFixed(2);

  const driverEarnings = +(total * DRIVER_SHARE).toFixed(2);
  const platformFee = +(total * PLATFORM_SHARE).toFixed(2);

  return {
    base,
    perKmCharge,
    perMinCharge,
    subtotal,
    surgeMultiplier,
    surgeAmount,
    subtotalWithSurge: subtotalFinal,
    tps,
    tvq,
    total,
    distanceKm,
    durationMin,
    driverEarnings,
    platformFee,
    serviceType,
    currency: 'CAD',
  };
}

/**
 * Estimer le tarif pour l'affichage avant la course
 * Retourne un objet avec min/max pour afficher une fourchette
 */
export function estimateFareRange(
  distanceKm: number,
  durationMin: number,
  serviceType: string = 'KULOOC X'
): { min: number; max: number; estimate: number } {
  const base = calculateFare(distanceKm, durationMin, 1.0, serviceType);
  const surge = calculateFare(distanceKm, durationMin, 1.5, serviceType);
  return {
    min: base.total,
    max: surge.total,
    estimate: base.total,
  };
}

/**
 * Générer le texte de facture pour un client
 */
export function generateInvoiceText(
  ride: {
    id: string;
    passengerName: string;
    driverName: string;
    pickup: { address: string };
    destination: { address: string };
    pricing: FareBreakdown;
    completedAt?: any;
    actualDurationMin?: number;
  }
): string {
  const date = ride.completedAt?.toDate?.()?.toLocaleDateString('fr-CA') || new Date().toLocaleDateString('fr-CA');
  const time = ride.completedAt?.toDate?.()?.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }) || '';
  const p = ride.pricing;

  return `
KULOOC — Facture de course
══════════════════════════════════════
N° de course : ${ride.id.substring(0, 8).toUpperCase()}
Date : ${date} ${time}
──────────────────────────────────────
Passager : ${ride.passengerName}
Chauffeur : ${ride.driverName}
Type de service : ${p.serviceType}
──────────────────────────────────────
De : ${ride.pickup?.address}
À  : ${ride.destination?.address}
──────────────────────────────────────
Distance : ${p.distanceKm?.toFixed(1)} km
Durée : ${ride.actualDurationMin || p.durationMin} min
──────────────────────────────────────
Prise en charge :          ${p.base.toFixed(2)} $
Distance (${p.distanceKm?.toFixed(1)} km × ${(p.perKmCharge / (p.distanceKm || 1)).toFixed(2)} $) : ${p.perKmCharge.toFixed(2)} $
Temps (${p.durationMin} min × ...) :   ${p.perMinCharge.toFixed(2)} $
${p.surgeMultiplier > 1 ? `Majoration (×${p.surgeMultiplier}) :   ${p.surgeAmount.toFixed(2)} $\n` : ''}Sous-total :               ${p.subtotalWithSurge.toFixed(2)} $
TPS (5 %) :                ${p.tps.toFixed(2)} $
TVQ (9,975 %) :            ${p.tvq.toFixed(2)} $
──────────────────────────────────────
TOTAL :                    ${p.total.toFixed(2)} $
══════════════════════════════════════
Merci d'avoir choisi KULOOC 🍁
kulooc-app.vercel.app
`.trim();
}
