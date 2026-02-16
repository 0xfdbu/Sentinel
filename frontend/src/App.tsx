import { Routes, Route } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Shield, Menu, X, Activity, Globe } from 'lucide-react'
import { useState } from 'react'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Contracts from './pages/Contracts'
import Docs from './pages/Docs'
import RuntimeMonitor from './pages/RuntimeMonitor'
import CrossChainStatus from './pages/CrossChainStatus'
import { cn } from './utils/cn'

function Navigation() {
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/dashboard', label: 'Scanner' },
    { path: '/runtime', label: 'Runtime', icon: Activity },
    { path: '/cross-chain', label: 'Cross-Chain', icon: Globe },
    { path: '/contracts', label: 'Protected' },
    { path: '/docs', label: 'Docs' },
  ]

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-sentinel-500" />
          <span className="text-xl font-bold text-gradient">Sentinel</span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              {item.icon && <item.icon className="h-4 w-4" />}
              {item.label}
            </a>
          ))}
        </div>

        <div className="hidden md:block">
          <ConnectButton />
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="md:hidden border-t border-border/50 bg-background">
          <div className="space-y-1 px-4 py-4">
            {navItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="pt-4">
              <ConnectButton />
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-sentinel-500" />
            <span className="text-lg font-semibold">Sentinel</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Chainlink Convergence Hackathon 2026
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="https://github.com/sentinel-team/sentinel" className="hover:text-foreground">GitHub</a>
            <a href="https://docs.sentinel.io" className="hover:text-foreground">Documentation</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/runtime" element={<RuntimeMonitor />} />
          <Route path="/cross-chain" element={<CrossChainStatus />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/docs" element={<Docs />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
