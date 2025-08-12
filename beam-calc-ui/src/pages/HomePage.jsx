import { Box, Button, Card, CardContent, CardHeader, Container, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

export default function HomePage() {
  return (
    <Box sx={{ position: 'relative', minHeight: 'calc(100dvh - 64px)' }}>
      <Box
        sx={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/src/assets/beams-bg.svg)',
          backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.55,
          filter: 'saturate(0.9) contrast(1.05)'
        }}
      />
      <Container sx={{ position: 'relative', py: { xs: 6, md: 10 } }}>
        <Card sx={{ maxWidth: 900, mx: 'auto', boxShadow: 8, backdropFilter: 'blur(4px)', backgroundColor: 'rgba(255,255,255,0.85)' }}>
          <CardHeader title="Curved Beam Stress Analysis (Winkler–Bach)" />
          <CardContent sx={{ display: 'grid', gap: 2 }}>
            <Typography variant="body1">
              This web application automates the stress analysis of curved beams under pure bending using the Winkler–Bach theory.
              Curved members such as crane hooks, C-clamps, chain links, and ring segments have non-linear stress distributions across
              the thickness, and the neutral axis does not pass through the centroid as in straight beams. Manual calculations are
              time-consuming and error-prone; this app streamlines the workflow and adds interactive visual understanding.
            </Typography>
            <Typography variant="body1">
              You can analyze multiple cross-sections (rectangular, trapezoidal, triangular, solid circular, and T-section), input geometry
              and loads (either a direct bending moment M or a force-lever pair P·d), and obtain key results: cross-sectional area A,
              centroid radius R_c, neutral-axis radius R, eccentricity e, inner/outer fiber stresses, and full stress distribution σ(r).
              The app also plots stress vs radius and a bending-moment diagram along the arc. Results and diagrams are designed for
              education and quick verification – units are user-defined but must be consistent to keep σ(r) dimensionally correct.
            </Typography>
            <Typography variant="body1">
              Scope and assumptions: pure bending only (no axial/torsion/shear), linearly elastic material (no plasticity), closed-form
              neutral-axis expressions where available and robust numerical integration otherwise. The interface includes a schematic
              section diagram with centroid and neutral axis for clarity.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, pt: 1 }}>
              <Button component={RouterLink} to="/curved" variant="contained">Start Curved Beam Analysis</Button>
              <Button component={RouterLink} to="/example" variant="outlined">Open Straight Beam Example</Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}
