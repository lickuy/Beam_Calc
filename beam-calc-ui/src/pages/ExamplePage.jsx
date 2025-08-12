import { useMemo, useState } from 'react'
import { maxMomentUDL, maxDeflectionUDL, maxMomentPointMid, toNumber } from '../lib/beamCalc'
import BeamCharts from '../components/BeamCharts'
import Grid from '@mui/material/Grid'
import { Box, Card, CardContent, CardHeader, TextField, Typography } from '@mui/material'

function formatNumber(v) {
  if (!Number.isFinite(v)) return '-'
  return Number(v).toPrecision(6)
}

export default function ExamplePage() {
  const [w, setW] = useState('10')
  const [L, setL] = useState('5')
  const [E, setE] = useState('2e11')
  const [I, setI] = useState('8e-6')
  const [P, setP] = useState('1000')

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

  const canPlot = Number.isFinite(LNum) && Number.isFinite(wNum) && Number.isFinite(PNum)

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Inputs" />
            <CardContent>
              <Box sx={{ display: 'grid', gap: 2 }}>
                <TextField label="Uniform load w (N/m)" value={w} onChange={(e) => setW(e.target.value)} size="small" />
                <TextField label="Span L (m)" value={L} onChange={(e) => setL(e.target.value)} size="small" />
                <TextField label="Young's Modulus E (Pa)" value={E} onChange={(e) => setE(e.target.value)} size="small" />
                <TextField label="Second moment I (m^4)" value={I} onChange={(e) => setI(e.target.value)} size="small" />
                <TextField label="Point load P (N)" value={P} onChange={(e) => setP(e.target.value)} size="small" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 2 }}>
            <CardHeader title="Key Results" />
            <CardContent>
              <ul>
                <li>Max bending moment (UDL): <strong>{formatNumber(results.M_udl)}</strong> N·m</li>
                <li>Max deflection (UDL): <strong>{formatNumber(results.defl_udl)}</strong> m</li>
                <li>Max bending moment (Point load at mid): <strong>{formatNumber(results.M_point)}</strong> N·m</li>
              </ul>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Formulas: M_udl = w L^2 / 8; δ_udl = 5 w L^4 / (384 E I); M_point(mid) = P L / 4
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Diagrams" />
            <CardContent>
              {canPlot ? (
                <BeamCharts L={LNum} w={wNum} P={PNum} />
              ) : (
                <Typography variant="body2">Enter valid numeric values for w, L, and P to show diagrams.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
