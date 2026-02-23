/**
 * KULOOC Fare Service
 * Calcul des tarifs selon les règles KULOOC Canada
 *
 * Tarification de base (Montréal / Laval):
 *   - Prise en charge : 3,50 $
 *   - Par km : 1,75 $
 *   - Par minute : 0,35 $
 *   - Minimum : 8,00 $
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
const SERVICE_RATES: Record<string, { base: number; perKm: number; perMin: number; minimum: number }> = {
  'KULOOC X':        { base: 3.50, perKm: 1.75, perMin: 0.35, minimum: 8.00 },
  'KULOOC XL':       { base: 5.00, perKm: 2.25, perMin: 0.45, minimum: 12.00 },
  'KULOOC BLACK':    { base: 8.00, perKm: 3.00, perMin: 0.60, minimum: 18.00 },
  'KULOOC COMFORT':  { base: 5.00, perKm: 2.00, perMin: 0.40, minimum: 10.00 },
  'KULOOC MOTO':     { base: 2.50, perKm: 1.25, perMin: 0.25, minimum: 5.00 },
  'KULOOC EAT':      { base: 3.00, perKm: 1.50, perMin: 0.30, minimum: 6.00 },
  'KULOOC COURIER':  { base: 4.00, perKm: 1.80, perMin: 0.35, minimum: 8.00 },
  'KULOOC GROCERY':  { base: 3.50, perKm: 1.75, perMin: 0.35, minimum: 8.00 },
};

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
