import { Routes, Route, useLocation } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Shield, Activity, Globe, FileCode, BookOpen, Home } from 'lucide-react'
import { useState } from 'react'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Contracts from './pages/Contracts'
import Docs from './pages/Docs'
import RuntimeMonitor from './pages/RuntimeMonitor'
import CrossChainStatus from './pages/CrossChainStatus'
import { cn } from './utils/cn'

function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="/" className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-sentinel-500" />
          <span className="text-lg font-bold text-gradient">Sentinel</span>
        </a>
        <ConnectButton />
      </div>
    </header>
  )
}

function BottomNavigation() {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/dashboard', label: 'Scan', icon: FileCode },
    { path: '/runtime', label: 'Runtime', icon: Activity },
    { path: '/cross-chain', label: 'Chains', icon: Globe },
    { path: '/contracts', label: 'Protected', icon: Shield },
    { path: '/docs', label: 'Docs', icon: BookOpen },
  ]

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <>
      {/* Desktop Bottom Nav - Centered, Not Full Width */}
      <nav className="hidden md:block fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="border border-border/50 bg-background/90 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/20 px-2 py-2">
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActive(item.path)
              return (
                <a
                  key={item.path}
                  href={item.path}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 px-5 py-2 rounded-xl transition-all min-w-[72px]',
                    active 
                      ? 'text-sentinel-400 bg-sentinel-500/10' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  )}
                >
                  <item.icon className={cn('h-5 w-5', active && 'text-sentinel-400')} />
                  <span className="text-xs font-medium">{item.label}</span>
                </a>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-xl safe-area-pb">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.slice(0, 5).map((item) => {
            const active = isActive(item.path)
            return (
              <a
                key={item.path}
                href={item.path}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px]',
                  active 
                    ? 'text-sentinel-400' 
                    : 'text-muted-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5', active && 'text-sentinel-400')} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </a>
            )
          })}
          {/* More button for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px]',
              isMobileMenuOpen ? 'text-sentinel-400' : 'text-muted-foreground'
            )}
          >
            <div className="flex flex-col gap-0.5">
              <div className="w-1 h-1 rounded-full bg-current" />
              <div className="w-1 h-1 rounded-full bg-current" />
              <div className="w-1 h-1 rounded-full bg-current" />
            </div>
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>

        {/* Mobile More Menu */}
        {isMobileMenuOpen && (
          <div className="absolute bottom-16 left-4 right-4 bg-background border border-border rounded-xl shadow-2xl p-2">
            <a
              href="/docs"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 text-muted-foreground"
            >
              <BookOpen className="h-5 w-5" />
              <span>Documentation</span>
            </a>
            <div className="border-t border-border/50 my-2" />
            <div className="px-4 py-2">
              <ConnectButton />
            </div>
          </div>
        )}
      </nav>

      {/* Backdrop for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pb-20 md:pb-32">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/runtime" element={<RuntimeMonitor />} />
          <Route path="/cross-chain" element={<CrossChainStatus />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/docs" element={<Docs />} />
        </Routes>
      </main>
      <BottomNavigation />
    </div>
  )
}
