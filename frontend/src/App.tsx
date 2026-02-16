import { Routes, Route, useLocation } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Shield, Activity, Globe, FileCode, BookOpen, Home, Wallet } from 'lucide-react'
import { useState } from 'react'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Contracts from './pages/Contracts'
import Docs from './pages/Docs'
import RuntimeMonitor from './pages/RuntimeMonitor'
import CrossChainStatus from './pages/CrossChainStatus'
import { cn } from './utils/cn'

// Custom styled connect button
function CustomConnectButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading'
        const connected = ready && account && chain

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="group relative inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-50 text-neutral-950 rounded-xl font-semibold text-sm hover:bg-white transition-all hover:scale-105 shadow-lg shadow-amber-500/10 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-amber-400/10 to-amber-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                    <Wallet className="w-4 h-4" />
                    <span className="relative">Connect Wallet</span>
                  </button>
                )
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-semibold text-sm hover:bg-red-500/30 transition-all"
                  >
                    Wrong network
                  </button>
                )
              }

              return (
                <div className="flex items-center gap-2">
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-neutral-800 border border-white/10 text-slate-50 rounded-xl text-sm hover:bg-neutral-700 transition-all"
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 16,
                          height: 16,
                          borderRadius: 999,
                          overflow: 'hidden',
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            style={{ width: 16, height: 16 }}
                          />
                        )}
                      </div>
                    )}
                    <span className="hidden sm:inline">{chain.name}</span>
                  </button>

                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-800 border border-white/10 text-slate-50 rounded-xl font-medium text-sm hover:bg-neutral-700 hover:border-amber-500/30 transition-all"
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span>{account.displayName}</span>
                    {account.displayBalance && (
                      <span className="text-neutral-400">
                        ({account.displayBalance})
                      </span>
                    )}
                  </button>
                </div>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}

function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex h-16 items-center justify-between rounded-2xl border border-white/10 bg-neutral-900/80 backdrop-blur-xl px-6">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full group-hover:bg-amber-500/30 transition-colors" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Shield className="h-6 w-6 text-neutral-950" strokeWidth={2.5} />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-slate-50">SENTINEL</span>
              <span className="text-[10px] text-neutral-400 tracking-[0.2em] uppercase">Security Oracle</span>
            </div>
          </a>

          {/* Right side */}
          <CustomConnectButton />
        </div>
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
        <div className="border border-white/10 bg-neutral-900/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/40 px-2 py-2">
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
                      ? 'text-amber-400 bg-amber-500/10' 
                      : 'text-neutral-400 hover:text-slate-50 hover:bg-white/5'
                  )}
                >
                  <item.icon className={cn('h-5 w-5', active && 'text-amber-400')} />
                  <span className="text-xs font-medium">{item.label}</span>
                </a>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-neutral-900/95 backdrop-blur-xl safe-area-pb">
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
                    ? 'text-amber-400' 
                    : 'text-neutral-400'
                )}
              >
                <item.icon className={cn('h-5 w-5', active && 'text-amber-400')} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </a>
            )
          })}
          {/* More button for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px]',
              isMobileMenuOpen ? 'text-amber-400' : 'text-neutral-400'
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
          <div className="absolute bottom-16 left-4 right-4 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl p-2">
            <a
              href="/docs"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 text-neutral-400"
            >
              <BookOpen className="h-5 w-5" />
              <span>Documentation</span>
            </a>
            <div className="border-t border-white/10 my-2" />
            <div className="px-4 py-2">
              <CustomConnectButton />
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
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <Header />
      <main className="flex-1 pt-28 pb-20 md:pb-32">
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
