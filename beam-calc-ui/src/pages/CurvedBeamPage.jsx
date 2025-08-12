import { useMemo, useState } from 'react'
import { Box, Card, CardContent, CardHeader, Grid, MenuItem, TextField, Typography } from '@mui/material'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { SectionType, computeCurvedBeam } from '../lib/curvedBeam'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

/**
 * Coerce user input to a finite number or NaN.
 * Treat empty strings as NaN so M is used when P or d are blank.
 * @param {unknown} x
 * @returns {number} Finite number or NaN
 */
function numberOrNaN(x) {
  if (x === '' || x === null || x === undefined) return NaN
  const n = Number(x)
  return Number.isFinite(n) ? n : NaN
}

/**
 * Format numbers for UI display with a sensible precision.
 * @param {number} v
 * @returns {string}
 */
function fmt(v) {
  return Number.isFinite(v) ? Number(v).toPrecision(6) : '-'
}

// Inline geometry diagram for cross-sections
/**
 * Render a simplified cross-section profile b(y) vs y as an SVG.
 * Shows inner/outer surfaces, centroid (ȳ) and neutral axis (y_n) when available.
 * Note: This is a schematic for learning/inspection; not to scale in absolute units.
 * @param {{ shape: string, params: object, ri: number, result?: { yn: number, ybar: number } }} props
 */
function SectionDiagram({ shape, params, result }) {
  // Build width function b(y) and thickness t
  let t = NaN
  let bfn = () => 0
  if (shape === SectionType.Rectangular) {
    const b = Number(params?.b)
    t = Number(params?.t)
    bfn = () => b
  } else if (shape === SectionType.Trapezoidal || shape === SectionType.Triangular) {
    const bInner = Number(params?.bInner)
    const bOuter = Number(params?.bOuter)
    t = Number(params?.t)
    const slope = (bOuter - bInner) / t
    bfn = (y) => Math.max(0, bInner + slope * y)
  } else if (shape === SectionType.Circular) {
    const d = Number(params?.d)
    const a = d / 2
    t = d
    bfn = (y) => 2 * Math.sqrt(Math.max(0, a * a - (y - a) * (y - a)))
  } else if (shape === SectionType.TSection) {
    const R1 = Number(params?.R1)
    const t1 = Number(params?.t1)
    const b1 = Number(params?.b1)
    const R2 = Number(params?.R2)
    const t2 = Number(params?.t2)
    const b2 = Number(params?.b2)
    const riLocal = Math.min(R1, R2)
    const roLocal = Math.max(R1 + t1, R2 + t2)
    t = roLocal - riLocal
    bfn = (y) => {
      const r = riLocal + y
      let w = 0
      if (r >= R1 && r <= R1 + t1) w += b1
      if (r >= R2 && r <= R2 + t2) w += b2
      return w
    }
  }

  if (!(t > 0)) return <Typography variant="body2">Invalid geometry</Typography>

  // Sample profile
  const N = 80
  const ys = Array.from({ length: N }, (_, i) => (i / (N - 1)) * t)
  const widths = ys.map((yy) => Math.max(0, bfn(yy)))
  const maxB = Math.max(1e-9, ...widths)

  // SVG dims
  const W = 320
  const H = 180
  const padX = 24
  const padY = 16
  const innerW = W - 2 * padX
  const innerH = H - 2 * padY

  const scaleX = innerW / maxB
  const scaleY = innerH / t

  const yToSvg = (y) => padY + y * scaleY
  const xLeft = (y) => W / 2 - (bfn(y) * scaleX) / 2
  const xRight = (y) => W / 2 + (bfn(y) * scaleX) / 2

  // Build polygon path (right edge down, left edge up)
  const right = ys.map((yy) => `${xRight(yy)},${yToSvg(yy)}`).join(' ')
  const left = ys
    .slice()
    .reverse()
    .map((yy) => `${xLeft(yy)},${yToSvg(yy)}`)
    .join(' ')
  const polygonPoints = `${right} ${left}`

  const yn = Number(result?.yn) // from inner surface
  const ybar = Number(result?.ybar)

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* Outline */}
      <polygon points={polygonPoints} fill="#e8f0fe" stroke="#1a73e8" strokeWidth="1" />

      {/* Inner/Outer lines */}
      <line x1={padX} x2={W - padX} y1={yToSvg(0)} y2={yToSvg(0)} stroke="#999" strokeDasharray="4 4" />
      <line x1={padX} x2={W - padX} y1={yToSvg(t)} y2={yToSvg(t)} stroke="#999" strokeDasharray="4 4" />
      <text x={padX} y={Math.max(12, yToSvg(0) - 6)} fontSize="10" fill="#333" textAnchor="start" style={{ paintOrder: 'stroke', stroke: '#fff', strokeWidth: 3 }}>inner (y=0)</text>
      <text x={padX} y={Math.min(H - 6, yToSvg(t) + 12)} fontSize="10" fill="#333" textAnchor="start" style={{ paintOrder: 'stroke', stroke: '#fff', strokeWidth: 3 }}>outer (y=t)</text>

      {/* Centroid and neutral axis */}
      {Number.isFinite(ybar) && (
        <>
          <line x1={padX} x2={W - padX} y1={yToSvg(ybar)} y2={yToSvg(ybar)} stroke="#43a047" strokeDasharray="3 3" />
          <text x={padX + 2} y={yToSvg(ybar) - 4} fontSize="10" textAnchor="start" fill="#2e7d32" style={{ paintOrder: 'stroke', stroke: '#fff', strokeWidth: 3 }}>centroid ȳ</text>
        </>
      )}
      {Number.isFinite(yn) && (
        <>
          <line x1={padX} x2={W - padX} y1={yToSvg(yn)} y2={yToSvg(yn)} stroke="#e53935" strokeDasharray="3 3" />
          <text x={padX + 2} y={yToSvg(yn) - 4} fontSize="10" textAnchor="start" fill="#b71c1c" style={{ paintOrder: 'stroke', stroke: '#fff', strokeWidth: 3 }}>neutral axis y_n</text>
        </>
      )}

      {/* Title removed to reduce clutter; card header provides context */}
    </svg>
  )
}

/**
 * CurvedBeamPage
 * - Left: Inputs card (section, geometry, loads).  
 * - Right (top): Key Results card (A, Rc, R, stresses, etc.).  
 * - Right (bottom): Diagrams card with geometry profile, stress plot, and moment diagram.
 * Behavior: If P and d are both valid, uses M = P·d; otherwise uses the M field.
 */
export default function CurvedBeamPage() {
  const [shape, setShape] = useState(SectionType.Rectangular)

  // Common inputs
  const [ri, setRi] = useState('0.05') // m
  const [M, setM] = useState('1000') // N·m (optional; P and d override if both provided)
  const [P, setP] = useState('') // N
  const [d, setD] = useState('') // m

  // Rect/trap/tri params
  const [b, setB] = useState('0.02')
  const [t, setT] = useState('0.02')
  const [bInner, setBInner] = useState('0.01')
  const [bOuter, setBOuter] = useState('0.03')

  // Circular
  const [diam, setDiam] = useState('0.04')

  // T-section
  const [R1, setR1] = useState('0.04')
  const [t1, setT1] = useState('0.01')
  const [b1, setB1] = useState('0.03')
  const [R2, setR2] = useState('0.05')
  const [t2, setT2] = useState('0.015')
  const [b2, setB2] = useState('0.02')

  const params = useMemo(() => {
    switch (shape) {
      case SectionType.Rectangular:
        return { b: numberOrNaN(b), t: numberOrNaN(t) }
      case SectionType.Trapezoidal:
        return { bInner: numberOrNaN(bInner), bOuter: numberOrNaN(bOuter), t: numberOrNaN(t) }
      case SectionType.Triangular:
        return { bInner: numberOrNaN(bInner), bOuter: numberOrNaN(bOuter), t: numberOrNaN(t) }
      case SectionType.Circular:
        return { d: numberOrNaN(diam) }
      case SectionType.TSection:
        return { R1: numberOrNaN(R1), t1: numberOrNaN(t1), b1: numberOrNaN(b1), R2: numberOrNaN(R2), t2: numberOrNaN(t2), b2: numberOrNaN(b2) }
      default:
        return {}
    }
  }, [shape, b, t, bInner, bOuter, diam, R1, t1, b1, R2, t2, b2])

  const result = useMemo(() => {
    return computeCurvedBeam({
      shape,
      ri: numberOrNaN(ri),
      M: numberOrNaN(M),
      P: numberOrNaN(P),
      d: numberOrNaN(d),
      params,
      samples: 201,
    })
  }, [shape, ri, M, P, d, params])

  /** Compute display moment, preferring P·d when available (avoids conflicting inputs). */
  const Mdisplay = useMemo(() => {
    const pp = numberOrNaN(P)
    const dd = numberOrNaN(d)
    if (Number.isFinite(pp) && Number.isFinite(dd)) return pp * dd
    const m = numberOrNaN(M)
    return Number.isFinite(m) ? m : NaN
  }, [M, P, d])

  // Stress chart data
  const stressLabels = result.ok ? result.r.map((rr) => rr.toFixed(4)) : []
  /** Chart dataset for σ(r) vs radius r (tension positive). */
  const stressData = result.ok
    ? {
        labels: stressLabels,
        datasets: [
          {
            label: 'σ(r) [Pa] (tension +, compression −)',
            data: result.sigma,
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            tension: 0.1,
            pointRadius: 0,
          },
        ],
      }
    : { labels: [], datasets: [] }

  // Bending moment diagram (constant along arc for pure bending)
  const Nbm = 50
  const bmLabels = Array.from({ length: Nbm }, (_, i) => (i / (Nbm - 1)).toFixed(2))
  const bmValues = Array.from({ length: Nbm }, () => (Number.isFinite(Mdisplay) ? Mdisplay : NaN))
  /** Constant bending-moment diagram along the arc for pure bending. */
  const bmData = {
    labels: bmLabels,
    datasets: [
      {
        label: 'Bending Moment M (N·m) along arc (s/L)',
        data: bmValues,
        borderColor: 'rgba(255, 159, 64, 1)',
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        tension: 0,
        pointRadius: 0,
      },
    ],
  }

  /** Reusable Chart.js options with responsive layout and labeled axes. */
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: { mode: 'index', intersect: false },
    },
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: { title: { display: true, text: '' } },
      y: { title: { display: true, text: '' } },
    },
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Inputs" />
            <CardContent>
              <Box sx={{ display: 'grid', gap: 2 }}>
                <TextField select label="Cross-section" value={shape} onChange={(e) => setShape(e.target.value)} size="small">
                  <MenuItem value={SectionType.Rectangular}>Rectangular</MenuItem>
                  <MenuItem value={SectionType.Trapezoidal}>Trapezoidal</MenuItem>
                  <MenuItem value={SectionType.Triangular}>Triangular</MenuItem>
                  <MenuItem value={SectionType.Circular}>Circular (solid)</MenuItem>
                  <MenuItem value={SectionType.TSection}>T-section</MenuItem>
                </TextField>
                <TextField label="Inner radius ri (m)" value={ri} onChange={(e) => setRi(e.target.value)} size="small" />
                <TextField label="Bending moment M (N·m)" value={M} onChange={(e) => setM(e.target.value)} size="small" helperText="If P and d are both provided, they override M" />
                <TextField label="Force P (N)" value={P} onChange={(e) => setP(e.target.value)} size="small" />
                <TextField label="Lever arm d (m)" value={d} onChange={(e) => setD(e.target.value)} size="small" />

                {shape === SectionType.Rectangular && (
                  <>
                    <TextField label="Width b (m)" value={b} onChange={(e) => setB(e.target.value)} size="small" />
                    <TextField label="Thickness t (m)" value={t} onChange={(e) => setT(e.target.value)} size="small" />
                  </>
                )}

                {(shape === SectionType.Trapezoidal || shape === SectionType.Triangular) && (
                  <>
                    <TextField label="Inner width b_inner (m)" value={bInner} onChange={(e) => setBInner(e.target.value)} size="small" />
                    <TextField label="Outer width b_outer (m)" value={bOuter} onChange={(e) => setBOuter(e.target.value)} size="small" />
                    <TextField label="Thickness t (m)" value={t} onChange={(e) => setT(e.target.value)} size="small" />
                  </>
                )}

                {shape === SectionType.Circular && (
                  <TextField label="Diameter d (m)" value={diam} onChange={(e) => setDiam(e.target.value)} size="small" />
                )}

                {shape === SectionType.TSection && (
                  <>
                    <TextField label="Rect 1 inner R1 (m)" value={R1} onChange={(e) => setR1(e.target.value)} size="small" />
                    <TextField label="Rect 1 thickness t1 (m)" value={t1} onChange={(e) => setT1(e.target.value)} size="small" />
                    <TextField label="Rect 1 width b1 (m)" value={b1} onChange={(e) => setB1(e.target.value)} size="small" />
                    <TextField label="Rect 2 inner R2 (m)" value={R2} onChange={(e) => setR2(e.target.value)} size="small" />
                    <TextField label="Rect 2 thickness t2 (m)" value={t2} onChange={(e) => setT2(e.target.value)} size="small" />
                    <TextField label="Rect 2 width b2 (m)" value={b2} onChange={(e) => setB2(e.target.value)} size="small" />
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 2 }}>
            <CardHeader title="Key Results" />
            <CardContent>
              {result.ok ? (
                <ul>
                  <li>M (used) = {fmt(Mdisplay)} N·m</li>
                  <li>A = {fmt(result.A)} m²</li>
                  <li>ȳ (from inner) = {fmt(result.ybar)} m</li>
                  <li>y_n (from inner) = {fmt(result.yn)} m</li>
                  <li>R_c (centroid radius) = {fmt(result.Rc)} m</li>
                  <li>R (neutral-axis radius) = {fmt(result.R)} m</li>
                  <li>R_i = {fmt(result.rInner)} m, R_o = {fmt(result.rOuter)} m</li>
                  <li>e = {fmt(result.e)} m</li>
                  <li>σ_inner = {fmt(result.sigmaInner)} Pa</li>
                  <li>σ_outer = {fmt(result.sigmaOuter)} Pa</li>
                  <li>Max tension = {fmt(result.maxTension?.value)} Pa @ {result.maxTension?.side}</li>
                  <li>Max compression = {fmt(result.maxCompression?.value)} Pa @ {result.maxCompression?.side}</li>
                </ul>
              ) : (
                <Typography color="error">{result.message}</Typography>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Diagrams" />
            <CardContent>
              <Box sx={{ display: 'grid', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <SectionDiagram shape={shape} params={{ b, t, bInner, bOuter, d: diam, R1, t1, b1, R2, t2, b2 }} ri={numberOrNaN(ri)} result={result.ok ? result : undefined} />
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: -1 }}>
                  Cross-section profile b(y) vs y (inner at y=0, outer at y=t). Centroid ȳ and neutral axis y_n shown when available.
                </Typography>
                <Box sx={{ height: 220 }}>
                  <Line
                    options={{
                      ...chartOptions,
                      plugins: { ...chartOptions.plugins, title: { display: true, text: 'Stress distribution σ(r)' } },
                      scales: { x: { title: { display: true, text: 'Radius r (m)' } }, y: { title: { display: true, text: 'σ (Pa)' } } },
                    }}
                    data={stressData}
                  />
                </Box>
                <Box sx={{ height: 160 }}>
                  <Line
                    options={{
                      ...chartOptions,
                      plugins: { ...chartOptions.plugins, title: { display: true, text: 'Bending Moment along arc (pure bending)' } },
                      scales: { x: { title: { display: true, text: 'Normalized arc coordinate s/L' } }, y: { title: { display: true, text: 'M (N·m)' } } },
                    }}
                    data={bmData}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
