import { useMemo, useState } from 'react'
import './App.css'
import {
  maxMomentUDL,
  maxDeflectionUDL,
  maxMomentPointMid,
  toNumber,
} from './lib/beamCalc'

function formatNumber(v) {
  if (!Number.isFinite(v)) return '-'
  // Use precision to handle very large/small numbers gracefully
  return Number(v).toPrecision(6)
}

export default function App() {
  // Controlled inputs (as strings for stable input behaviour)
  const [w, setW] = useState('10') // N/m
  const [L, setL] = useState('5') // m
  const [E, setE] = useState('2e11') // Pa (~steel)
  const [I, setI] = useState('8e-6') // m^4 (example)
  const [P, setP] = useState('1000') // N

  // Coerce to numbers for calculations
  const wNum = useMemo(() => toNumber(w, NaN), [w])
  const LNum = useMemo(() => toNumber(L, NaN), [L])
  const ENum = useMemo(() => toNumber(E, NaN), [E])
  const INum = useMemo(() => toNumber(I, NaN), [I])
  const PNum = useMemo(() => toNumber(P, NaN), [P])

  const results = useMemo(() => {
    const M_udl = maxMomentUDL(wNum, LNum)
    const defl_udl = maxDeflectionUDL(wNum, LNum, ENum, INum)
    const M_point = maxMomentPointMid(PNum, LNum)
    return { M_udl, defl_udl, M_point }
  }, [wNum, LNum, ENum, INum, PNum])

  return (
      <div className="beam-app" style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <h1>Beam Calculator (React + JS)</h1>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div>
            <label>
              Uniform load w (N/m)
              <input type="text" value={w} onChange={(e) => setW(e.target.value)} placeholder="e.g. 10" />
            </label>
          </div>
          <div>
            <label>
              Span L (m)
              <input type="text" value={L} onChange={(e) => setL(e.target.value)} placeholder="e.g. 5" />
            </label>
          </div>
          <div>
            <label>
              Young's Modulus E (Pa)
              <input type="text" value={E} onChange={(e) => setE(e.target.value)} placeholder="e.g. 2e11" />
            </label>
          </div>
          <div>
            <label>
              Second moment I (m^4)
              <input type="text" value={I} onChange={(e) => setI(e.target.value)} placeholder="e.g. 8e-6" />
            </label>
          </div>
          <div>
            <label>
              Point load P (N)
              <input type="text" value={P} onChange={(e) => setP(e.target.value)} placeholder="e.g. 1000" />
            </label>
          </div>
        </section>

        <section style={{ marginTop: 24 }}>
          <h2>Results</h2>
          <div className="card" style={{ padding: 16 }}>
            <ul>
              <li>
                Max bending moment (UDL): <strong>{formatNumber(results.M_udl)}</strong> N·m
              </li>
              <li>
                Max deflection (UDL): <strong>{formatNumber(results.defl_udl)}</strong> m
              </li>
              <li>
                Max bending moment (Point load at mid): <strong>{formatNumber(results.M_point)}</strong> N·m
              </li>
            </ul>
            <p style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
              Formulas: M_udl = w L^2 / 8; δ_udl = 5 w L^4 / (384 E I); M_point(mid) = P L / 4
            </p>
          </div>
        </section>

        <section style={{ marginTop: 24, fontSize: 12, opacity: 0.8 }}>
          <p>Tip: You can enter scientific notation (e.g., 2e11 for 200,000,000,000).</p>
        </section>
      </div>
  )
}
