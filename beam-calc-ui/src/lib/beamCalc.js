/**
 * Simple beam calculation helpers.
 * Units are assumed consistent (e.g., N, m).
 */

/**
 * Maximum bending moment for a simply supported beam under uniform load w (force per length).
 * Mmax = w L^2 / 8
 */
export function maxMomentUDL(w, L) {
  if (!Number.isFinite(w) || !Number.isFinite(L)) return NaN;
  return (w * L * L) / 8;
}

/**
 * Maximum deflection for simply supported beam under UDL:
 * δmax = 5 w L^4 / (384 E I)
 */
export function maxDeflectionUDL(w, L, E, I) {
  if (![w, L, E, I].every(Number.isFinite)) return NaN;
  return (5 * w * Math.pow(L, 4)) / (384 * E * I);
}

/**
 * Maximum bending moment for a simply supported beam with a point load P at midspan:
 * Mmax = P L / 4
 */
export function maxMomentPointMid(P, L) {
  if (!Number.isFinite(P) || !Number.isFinite(L)) return NaN;
  return (P * L) / 4;
}

/**
 * Utility to coerce any input to a finite number, with optional default value.
 */
export function toNumber(x, def = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : def;
}

export default {
  maxMomentUDL,
  maxDeflectionUDL,
  maxMomentPointMid,
  toNumber,
};
