/**
 * Curved beam stress analysis using Winkler-Bach theory (pure bending).
 * Supports multiple cross-sections: rectangular, trapezoidal, triangular, circular (solid).
 *
 * Coordinates and conventions
 * - ri: inner radius to the inner surface from the center of curvature [m]
 * - y: radial coordinate measured from inner surface, 0 <= y <= t [m]
 * - r = ri + y: absolute radius of a material fiber [m]
 * - M: applied bending moment (positive sign convention yields tension at inner fiber when e < 0)
 * - b(y): section width (out-of-plane thickness) as function of y [m]
 *
 * Core relations (Winkler–Bach):
 *   A = ∫ b(y) dy
 *   y_bar = (1/A) ∫ y b(y) dy (centroid from inner surface)
 *   S = ∫ b(y)/(ri + y) dy
 *   y_n = A / S (neutral axis distance from inner surface)
 *   e = y_bar - y_n (eccentricity; may be negative)
 *   σ(r) = (M / (A e)) * (1 - y_n / r)
 */

export const SectionType = {
  Rectangular: 'rectangular',
  Trapezoidal: 'trapezoidal',
  Triangular: 'triangular',
  Circular: 'circular', // solid circle of diameter d
  TSection: 'tsection', // composite of two rectangles at radii R1 and R2
}

/**
 * Numeric integrate helper over y in [0, t].
 */
function integrate(t, f, N = 800) {
  if (!(t > 0)) return 0
  const dy = t / N
  let sum = 0
  for (let i = 0; i <= N; i++) {
    const y = Math.min(i * dy, t)
    const w = i === 0 || i === N ? 0.5 : 1 // trapezoidal rule
    sum += w * f(y)
  }
  return sum * dy
}

/**
 * Width functions b(y) for different section types.
 * params per type:
 * - Rectangular: { b, t }
 * - Trapezoidal: { bInner, bOuter, t }
 * - Triangular:  { bInner, bOuter, t } with one of bInner/bOuter = 0
 * - Circular:    { d } (solid circle of diameter d => t = d)
 */
function makeWidthFn(shape, params) {
  switch (shape) {
    case SectionType.Rectangular: {
      const { b = NaN, t = NaN } = params || {}
      return { bfn: () => b, t }
    }
    case SectionType.Trapezoidal: {
      const { bInner = NaN, bOuter = NaN, t = NaN } = params || {}
      const slope = (bOuter - bInner) / t
      return { bfn: (y) => bInner + slope * y, t }
    }
    case SectionType.Triangular: {
      const { bInner = 0, bOuter = 0, t = NaN } = params || {}
      const slope = (bOuter - bInner) / t
      return { bfn: (y) => Math.max(0, bInner + slope * y), t }
    }
    case SectionType.Circular: {
      const { d = NaN } = params || {}
      const a = d / 2 // radius of circle
      const t = d
      // Place inner surface at leftmost point of circle: chord width across radial strip
      // y in [0, d], width b(y) = 2 * sqrt(a^2 - (y - a)^2)
      return { bfn: (y) => 2 * Math.sqrt(Math.max(0, a * a - (y - a) * (y - a))), t }
    }
    case SectionType.TSection: {
      const { R1 = NaN, t1 = NaN, b1 = NaN, R2 = NaN, t2 = NaN, b2 = NaN } = params || {}
      const riOverride = Math.min(R1, R2)
      const roOverride = Math.max(R1 + t1, R2 + t2)
      const t = roOverride - riOverride
      const bfn = (y) => {
        const r = riOverride + y
        let w = 0
        if (r >= R1 && r <= R1 + t1) w += b1
        if (r >= R2 && r <= R2 + t2) w += b2
        return w
      }
      return { bfn, t, riOverride, roOverride }
    }
    default:
      return { bfn: () => NaN, t: NaN }
  }
}

export const SectionSpecs = {
  [SectionType.Rectangular]: {
    label: 'Rectangular',
    params: [
      { key: 'b', label: 'Width b (m)', positive: true },
      { key: 't', label: 'Thickness t (m)', positive: true },
    ],
  },
  [SectionType.Trapezoidal]: {
    label: 'Trapezoidal',
    params: [
      { key: 'bInner', label: 'Inner width b_inner (m)', positive: true },
      { key: 'bOuter', label: 'Outer width b_outer (m)', positive: true },
      { key: 't', label: 'Thickness t (m)', positive: true },
    ],
  },
  [SectionType.Triangular]: {
    label: 'Triangular',
    params: [
      { key: 'bInner', label: 'Inner width b_inner (m)', nonNegative: true },
      { key: 'bOuter', label: 'Outer width b_outer (m)', nonNegative: true },
      { key: 't', label: 'Thickness t (m)', positive: true },
    ],
    note: 'Set one of b_inner or b_outer to 0 for a true triangle',
  },
  [SectionType.Circular]: {
    label: 'Circular (solid)',
    params: [
      { key: 'd', label: 'Diameter d (m)', positive: true },
    ],
  },
  [SectionType.TSection]: {
    label: 'T-section (two rectangles)',
    params: [
      { key: 'R1', label: 'Rect 1 inner radius R1 (m)', positive: true },
      { key: 't1', label: 'Rect 1 thickness t1 (m)', positive: true },
      { key: 'b1', label: 'Rect 1 width b1 (m)', positive: true },
      { key: 'R2', label: 'Rect 2 inner radius R2 (m)', positive: true },
      { key: 't2', label: 'Rect 2 thickness t2 (m)', positive: true },
      { key: 'b2', label: 'Rect 2 width b2 (m)', positive: true },
    ],
  },
}

function validateParams(shape, params) {
  const spec = SectionSpecs[shape]
  if (!spec) return { ok: false, message: 'Unsupported shape' }
  const p = params || {}
  for (const def of spec.params) {
    const v = Number(p[def.key])
    if (def.positive && !(Number.isFinite(v) && v > 0)) {
      return { ok: false, message: `${def.label} must be > 0` }
    }
    if (def.nonNegative && !(Number.isFinite(v) && v >= 0)) {
      return { ok: false, message: `${def.label} must be ≥ 0` }
    }
  }
  if (shape === SectionType.Triangular) {
    const bi = Number(p.bInner) || 0
    const bo = Number(p.bOuter) || 0
    if (bi <= 0 && bo <= 0) return { ok: false, message: 'At least one of b_inner or b_outer must be > 0' }
  }
  return { ok: true }
}

/**
 * Compute curved beam stress distribution and key results.
 * @param {{shape: string, ri?: number, M?: number, P?: number, d?: number, params: object, samples?: number}} input
 * @returns {{ ok: boolean, message?: string, A?: number, ybar?: number, yn?: number, e?: number, Rc?: number, R?: number, rInner?: number, rOuter?: number, sigmaInner?: number, sigmaOuter?: number, maxTension?: any, maxCompression?: any, r?: number[], sigma?: number[], Rn?: number }}
 */
export function computeCurvedBeam(input) {
  const { shape, ri, M, P, d, params, samples = 201 } = input || {}

  const v = validateParams(shape, params)
  if (!v.ok) return v

  const { bfn, t, riOverride, roOverride } = makeWidthFn(shape, params)
  if (!(t > 0)) return { ok: false, message: 'Section thickness t must be > 0' }

  const riLocal = Number.isFinite(riOverride) ? riOverride : ri
  if (!Number.isFinite(riLocal) || riLocal <= 0) return { ok: false, message: 'ri must be a positive number' }
  const ro = Number.isFinite(roOverride) ? roOverride : riLocal + t

  const Mlocal = (Number.isFinite(P) && Number.isFinite(d)) ? P * d : (Number.isFinite(M) ? M : NaN)
  if (!Number.isFinite(Mlocal)) return { ok: false, message: 'Provide bending moment M or both P and d' }

  // Integrals
  const A = integrate(t, (y) => bfn(y))
  const Qy = integrate(t, (y) => y * bfn(y))
  const S = integrate(t, (y) => bfn(y) / (riLocal + y))

  if (!(A > 0) || !(S > 0)) {
    return { ok: false, message: 'Invalid geometry leading to zero/negative area or integral' }
  }

  const ybar = Qy / A // centroid from inner surface
  const yn = A / S // neutral axis from inner surface (Winkler–Bach)
  const e = ybar - yn // eccentricity (can be negative)
  const Rn = riLocal + yn // neutral axis radius from center of curvature

  if (!Number.isFinite(e) || Math.abs(e) < 1e-12) {
    return { ok: false, message: 'Eccentricity too small; check geometry (ri, t) and section parameters.' }
  }

  const r = []
  const sigma = []
  for (let i = 0; i < samples; i++) {
    const y = (i / (samples - 1)) * t
    const rr = riLocal + y
    const s = (Mlocal / (A * e)) * (Rn / rr - 1)
    r.push(rr)
    sigma.push(s)
  }

  const sigmaInner = (Mlocal / (A * e)) * (Rn / riLocal - 1)
  const sigmaOuter = (Mlocal / (A * e)) * (Rn / ro - 1)

  const maxTensionVal = Math.max(sigmaInner, sigmaOuter)
  const maxCompressionVal = Math.min(sigmaInner, sigmaOuter)
  const maxTension = sigmaInner >= sigmaOuter
    ? { value: maxTensionVal, atR: riLocal, side: 'inner' }
    : { value: maxTensionVal, atR: ro, side: 'outer' }
  const maxCompression = sigmaInner <= sigmaOuter
    ? { value: maxCompressionVal, atR: riLocal, side: 'inner' }
    : { value: maxCompressionVal, atR: ro, side: 'outer' }

  return {
    ok: true,
    A,
    ybar,
    yn,
    e,
    rInner: riLocal,
    rOuter: ro,
    sigmaInner,
    sigmaOuter,
    maxTension,
    maxCompression,
    r,
    sigma,
    Rn,
    Rc: riLocal + ybar,
    R: Rn,
  }
}

export default { SectionType, SectionSpecs, computeCurvedBeam }
