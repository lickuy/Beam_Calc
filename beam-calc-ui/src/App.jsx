import './App.css'
import { AppBar, Box, Button, Container, CssBaseline, Toolbar, Typography } from '@mui/material'
import { Link as RouterLink, Route, Routes, useLocation, Navigate } from 'react-router-dom'
import ExamplePage from './pages/ExamplePage'
import CurvedBeamPage from './pages/CurvedBeamPage'
import HomePage from './pages/HomePage'

function NavBar() {
  const location = useLocation()
  const isActive = (path) => location.pathname === path
  return (
    <AppBar position="sticky" color="default" elevation={1}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>Beam Analysis</Typography>
        <Button component={RouterLink} to="/" color={isActive('/') ? 'primary' : 'inherit'}>Home</Button>
        <Button component={RouterLink} to="/example" color={isActive('/example') ? 'primary' : 'inherit'}>Example</Button>
        <Button component={RouterLink} to="/curved" color={isActive('/curved') ? 'primary' : 'inherit'}>Curved Beam</Button>
      </Toolbar>
    </AppBar>
  )
}

export default function App() {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <CssBaseline />
      <NavBar />
      <Container sx={{ py: 2, flexGrow: 1 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/example" element={<ExamplePage />} />
          <Route path="/curved" element={<CurvedBeamPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Container>
    </Box>
  )
}
