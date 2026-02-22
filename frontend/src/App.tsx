import { Routes, Route, useLocation } from 'react-router-dom'
import { MainLayout, MinimalLayout } from './components/layout'
import Landing from './pages/Landing'
import Protect from './pages/Protect'
import Docs from './pages/Docs'
import Monitor from './pages/Monitor'
import Visualizer from './pages/Visualizer'
import ContractDetails from './pages/ContractDetails'

// Route configuration with layouts
const routes = [
  { path: '/', element: <Landing />, layout: 'main' },
  { path: '/protect', element: <Protect />, layout: 'main' },
  { path: '/monitor', element: <Monitor />, layout: 'main' },
  { path: '/contract/:address', element: <ContractDetails />, layout: 'main' },
  { path: '/docs', element: <Docs />, layout: 'main' },
  // Visualizer uses minimal layout (no header, only bottom nav)
  { path: '/visualizer', element: <Visualizer />, layout: 'minimal' },
  // Legacy redirects
  { path: '/dashboard', element: <Protect />, layout: 'main' },
  { path: '/contracts', element: <Protect />, layout: 'main' },
  { path: '/runtime', element: <Monitor />, layout: 'main' },
]

function AppContent() {
  const location = useLocation()
  const currentRoute = routes.find(r => {
    // Handle dynamic routes like /contract/:address
    const routePath = r.path
    const currentPath = location.pathname
    if (routePath.includes(':')) {
      const routeRegex = new RegExp('^' + routePath.replace(/:[^/]+/g, '[^/]+') + '$')
      return routeRegex.test(currentPath)
    }
    return routePath === currentPath
  })
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
