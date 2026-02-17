import { Routes, Route, useLocation } from 'react-router-dom'
import { MainLayout, MinimalLayout } from './components/layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Contracts from './pages/Contracts'
import Docs from './pages/Docs'
import RuntimeMonitor from './pages/RuntimeMonitor'
import Monitor from './pages/Monitor'
import Visualizer from './pages/Visualizer'
import CrossChainStatus from './pages/CrossChainStatus'

// Route configuration with layouts
const routes = [
  { path: '/', element: <Landing />, layout: 'main' },
  { path: '/dashboard', element: <Dashboard />, layout: 'main' },
  { path: '/runtime', element: <RuntimeMonitor />, layout: 'main' },
  { path: '/monitor', element: <Monitor />, layout: 'main' },
  { path: '/cross-chain', element: <CrossChainStatus />, layout: 'main' },
  { path: '/contracts', element: <Contracts />, layout: 'main' },
  { path: '/docs', element: <Docs />, layout: 'main' },
  // Visualizer uses minimal layout (no header, only bottom nav)
  { path: '/visualizer', element: <Visualizer />, layout: 'minimal' },
]

function AppContent() {
  const location = useLocation()
  const currentRoute = routes.find(r => r.path === location.pathname)
  const layout = currentRoute?.layout || 'main'

  return (
    <>
      {layout === 'main' ? (
        <MainLayout>
          <Routes>
            {routes.filter(r => r.layout === 'main').map(route => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
          </Routes>
        </MainLayout>
      ) : (
        <MinimalLayout>
          <Routes>
            {routes.filter(r => r.layout === 'minimal').map(route => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
          </Routes>
        </MinimalLayout>
      )}
    </>
  )
}

// Wrapper to handle route changes
function App() {
  return <AppContent />
}

export default App
