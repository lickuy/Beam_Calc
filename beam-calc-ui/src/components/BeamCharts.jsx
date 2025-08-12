import { useMemo } from 'react'
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
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

function linspace(a, b, n) {
  if (n <= 1) return [a]
  const step = (b - a) / (n - 1)
  return Array.from({ length: n }, (_, i) => a + i * step)
}

export default function BeamCharts({ L, w, P }) {
  const N = 101

  const { x, V_udl, M_udl, V_point, M_point } = useMemo(() => {
    const x = linspace(0, L, N)

    // Simply supported beam
    // UDL: reactions Ra = Rb = wL/2
    // Shear V(x): Ra - w x
    // Moment M(x): Ra x - (w x^2)/2
    const Ra = (w * L) / 2
    const V_udl = x.map((xi) => Ra - w * xi)
    const M_udl = x.map((xi) => Ra * xi - (w * xi * xi) / 2)

    // Point load at midspan: reactions Ra = Rb = P/2, V is piecewise
    const V_point = x.map((xi) => (xi < L / 2 ? P / 2 : -P / 2))
    const M_point = x.map((xi) => (xi < L / 2 ? (P / 2) * xi : (P / 2) * (L - xi)))

    return { x, V_udl, M_udl, V_point, M_point }
  }, [L, w, P])

  const labels = x.map((xi) => xi.toFixed(2))

  const shearData = {
    labels,
    datasets: [
      {
        label: 'Shear V(x) UDL (N)',
        data: V_udl,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
        pointRadius: 0,
      },
      {
        label: 'Shear V(x) Point@mid (N)',
        data: V_point,
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0,
        stepped: true,
        pointRadius: 0,
      },
    ],
  }

  const momentData = {
    labels,
    datasets: [
      {
        label: 'Moment M(x) UDL (N·m)',
        data: M_udl,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        pointRadius: 0,
      },
      {
        label: 'Moment M(x) Point@mid (N·m)',
        data: M_point,
        borderColor: 'rgba(255, 205, 86, 1)',
        backgroundColor: 'rgba(255, 205, 86, 0.2)',
        tension: 0,
        pointRadius: 0,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: false },
      tooltip: { mode: 'index', intersect: false },
    },
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: { title: { display: true, text: 'x (m)' } },
      y: { title: { display: true, text: 'Value' } },
    },
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
      <div style={{ height: 300 }}>
        <Line options={{ ...options, plugins: { ...options.plugins, title: { display: true, text: 'Shear Force Diagram' } } }} data={shearData} />
      </div>
      <div style={{ height: 300 }}>
        <Line options={{ ...options, plugins: { ...options.plugins, title: { display: true, text: 'Bending Moment Diagram' } } }} data={momentData} />
      </div>
    </div>
  )
}
