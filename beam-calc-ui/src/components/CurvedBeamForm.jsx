import { useMemo, useState } from 'react'
import { SectionType, computeCurvedBeam } from '../lib/curvedBeam'
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

// Removed unused helper to satisfy linter

export default function CurvedBeamForm() {
  const [shape, setShape] = useState(SectionType.Rectangular)
  const [ri, setRi] = useState('0.05') // 50 mm
  const [M, setM] = useState('1000') // N·m

  // Shape-specific params
  const [b, setB] = useState('0.02') // m, rectangular width
  const [t, setT] = useState('0.02') // m, thickness (radial depth)

  const [bInner, setBInner] = useState('0.01')
  const [bOuter, setBOuter] = useState('0.03')

  const [d, setD] = useState('0.04')

  const params = useMemo(() => {
    switch (shape) {
      case SectionType.Rectangular:
        return { b: Number(b), t: Number(t) }
      case SectionType.Trapezoidal:
        return { bInner: Number(bInner), bOuter: Number(bOuter), t: Number(t) }
      case SectionType.Triangular:
        return { bInner: Number(bInner), bOuter: Number(bOuter), t: Number(t) }
      case SectionType.Circular:
        return { d: Number(d) }
      default:
        return {}
    }
  }, [shape, b, t, bInner, bOuter, d])

  const result = useMemo(() => {
    return computeCurvedBeam({ shape, ri: Number(ri), M: Number(M), params })
  }, [shape, ri, M, params])

  const labels = result.ok ? result.r.map((rr) => rr.toFixed(4)) : []
  const data = result.ok
    ? {
        labels,
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

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Curved Beam Stress Distribution (Winkler–Bach)' },
      tooltip: { mode: 'index', intersect: false },
    },
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: { title: { display: true, text: 'Radius r (m)' } },
      y: { title: { display: true, text: 'σ (Pa)' } },
    },
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <label>
          Cross-section
          <select value={shape} onChange={(e) => setShape(e.target.value)}>
            <option value={SectionType.Rectangular}>Rectangular</option>
            <option value={SectionType.Trapezoidal}>Trapezoidal</option>
            <option value={SectionType.Triangular}>Triangular</option>
            <option value={SectionType.Circular}>Circular (solid)</option>
          </select>
        </label>
        <label>
          Inner radius ri (m)
          <input type="text" value={ri} onChange={(e) => setRi(e.target.value)} placeholder="e.g. 0.05" />
        </label>
        <label>
          Bending moment M (N·m)
          <input type="text" value={M} onChange={(e) => setM(e.target.value)} placeholder="e.g. 1000" />
        </label>

        {shape === SectionType.Rectangular && (
          <>
            <label>
              Width b (m)
              <input type="text" value={b} onChange={(e) => setB(e.target.value)} placeholder="e.g. 0.02" />
            </label>
            <label>
              Thickness t (m)
              <input type="text" value={t} onChange={(e) => setT(e.target.value)} placeholder="e.g. 0.02" />
            </label>
          </>
        )}

        {shape !== SectionType.Rectangular && shape !== SectionType.Circular && (
          <>
            <label>
              Inner width b_inner (m)
              <input type="text" value={bInner} onChange={(e) => setBInner(e.target.value)} placeholder="e.g. 0.01" />
            </label>
            <label>
              Outer width b_outer (m)
              <input type="text" value={bOuter} onChange={(e) => setBOuter(e.target.value)} placeholder="e.g. 0.03" />
            </label>
            <label>
              Thickness t (m)
              <input type="text" value={t} onChange={(e) => setT(e.target.value)} placeholder="e.g. 0.02" />
            </label>
          </>
        )}

        {shape === SectionType.Circular && (
          <label>
            Diameter d (m)
            <input type="text" value={d} onChange={(e) => setD(e.target.value)} placeholder="e.g. 0.04" />
          </label>
        )}
      </div>

      <div className="card" style={{ padding: 16 }}>
        {result.ok ? (
          <ul>
            <li>A = {result.A.toPrecision(6)} m²</li>
            <li>ȳ (from inner) = {result.ybar.toPrecision(6)} m</li>
            <li>y_n (from inner) = {result.yn.toPrecision(6)} m</li>
            <li>e = {result.e.toPrecision(6)} m</li>
            <li>σ_inner = {result.sigmaInner.toPrecision(6)} Pa</li>
            <li>σ_outer = {result.sigmaOuter.toPrecision(6)} Pa</li>
          </ul>
        ) : (
          <p style={{ color: 'crimson' }}>{result.message}</p>
        )}
      </div>

      <div style={{ height: 320 }}>
        <Line options={options} data={data} />
      </div>
    </div>
  )
}
