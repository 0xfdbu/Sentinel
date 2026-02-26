import { useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { 
  Home, 
  Shield,
  Radio, 
  BookOpen,
  BarChart3
} from 'lucide-react'
import { cn } from '../../utils/cn'

interface NavItem {
  path: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/protect', label: 'Protect', icon: Shield },
  { path: '/monitor', label: 'Monitor', icon: Radio },
  { path: '/visualizer', label: 'Network', icon: BarChart3 },
  { path: '/docs', label: 'Docs', icon: BookOpen },
]

export function BottomNavigation({ isMinimal = false }: { isMinimal?: boolean }) {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  // Filter items for mobile (show first 5 + More)
  const mobileItems = navItems.slice(0, 5)
  const moreItems = navItems.slice(5)

  return (
    <>
      {/* Desktop Vertical Nav - Floating Left */}
      <nav className={cn(
        "hidden md:block fixed left-6 top-1/2 -translate-y-1/2 z-50",
        isMinimal && "left-4"
      )}>
        <div className="border border-white/5 bg-neutral-900/30 backdrop-blur-sm px-2 py-2 rounded-2xl">
          <div className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const active = isActive(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 px-3 py-3 transition-all min-w-[72px] rounded-xl',
                    active 
                      ? 'text-slate-50 bg-white/10' 
                      : 'text-neutral-400 hover:text-slate-50 hover:bg-white/5'
                  )}
                  title={item.label}
                >
                  <item.icon className={cn('h-5 w-5', active && 'text-slate-50')} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-neutral-900/80 backdrop-blur-xl safe-area-pb">
        <div className="flex items-center justify-around h-14 px-2">
          {mobileItems.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 transition-all min-w-[60px]',
                  active 
                    ? 'text-slate-50' 
                    : 'text-neutral-500'
                )}
              >
                <item.icon className={cn('h-4 w-4', active && 'text-slate-50')} />
                <span className="text-[9px] font-medium">{item.label}</span>
              </Link>
            )
          })}
          {/* More button for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-3 py-2 transition-all min-w-[60px]',
              isMobileMenuOpen ? 'text-slate-50' : 'text-neutral-500'
            )}
          >
            <div className="flex flex-col gap-0.5">
              <div className="w-1 h-1 rounded-full bg-current" />
              <div className="w-1 h-1 rounded-full bg-current" />
              <div className="w-1 h-1 rounded-full bg-current" />
            </div>
            <span className="text-[9px] font-medium">More</span>
          </button>
        </div>

        {/* Mobile More Menu */}
        {isMobileMenuOpen && (
          <div className="absolute bottom-16 left-4 right-4 bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2">
            {moreItems.map((item) => {
              const active = isActive(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5',
                    active ? 'text-slate-50' : 'text-neutral-400'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              )
            })}
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

export default BottomNavigation
