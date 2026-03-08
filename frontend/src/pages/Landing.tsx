import { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'
import { 
  Shield, 
  Activity,
  Cpu,
  CheckCircle,
  Terminal,
  ArrowUpRight,
  Lock,
  Code2,
  Workflow
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../utils/cn'
import { WorkflowsSection } from '../components/WorkflowsSection'

// Animated background - scanline and data flow
function GridBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      
      {/* Horizontal scanlines */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)`,
        backgroundSize: '100% 4px'
      }} />
      
      {/* Moving scanline */}
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ top: '0%' }}
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Grid dots */}
      <div className="absolute inset-0 opacity-[0.15]" style={{
        backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />
      
      {/* Floating binary/data particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-[10px] font-mono text-white/10"
          initial={{ 
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: typeof window !== 'undefined' ? window.innerHeight + 20 : 900,
            opacity: 0
          }}
          animate={{ 
            y: -50, 
            opacity: [0, 0.3, 0.3, 0]
          }}
          transition={{ 
            duration: 10 + Math.random() * 10, 
            repeat: Infinity, 
            delay: Math.random() * 10, 
            ease: "linear" 
          }}
        >
          {Math.random() > 0.5 ? '1' : '0'}
        </motion.div>
      ))}
      
      {/* Corner brackets */}
      <div className="absolute top-8 left-8 w-16 h-16 border-l border-t border-white/10" />
      <div className="absolute top-8 right-8 w-16 h-16 border-r border-t border-white/10" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l border-b border-white/10" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r border-b border-white/10" />
    </div>
  )
}

// Animated counter
function AnimatedCounter({ value, suffix = '' }: { value: number, suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const duration = 2000
          const steps = 60
          const increment = value / steps
          let current = 0
          const timer = setInterval(() => {
            current += increment
            if (current >= value) {
              setCount(value)
              clearInterval(timer)
            } else {
              setCount(Math.floor(current))
            }
          }, duration / steps)
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value])
  
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

// Feature card
function FeatureCard({ icon: Icon, title, description, index = 0 }: { icon: any, title: string, description: string, index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.15 }}
      whileHover={{ y: -5 }}
      className="group relative rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur-sm p-8 hover:border-neutral-300/50 transition-all duration-300"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-300/5 to-neutral-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
      <div className="relative">
        <div className="w-14 h-14 rounded-xl bg-neutral-300/10 border border-neutral-300/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 group-hover:bg-neutral-300/20">
          <Icon className="w-7 h-7 text-neutral-200" />
        </div>
        <h3 className="text-xl font-bold text-slate-50 mb-3">{title}</h3>
        <p className="text-neutral-400 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  )
}

// Section wrapper with scroll snap
function Section({ 
  children, 
  id,
  className
}: { 
  children: React.ReactNode
  id: string
  className?: string
}) {
  return (
    <section 
      id={id}
      className={cn(
        "min-h-screen w-full flex items-center snap-start snap-always relative",
        className
      )}
    >
      <div className="w-full py-20">
        {children}
      </div>
    </section>
  )
}

export default function Landing() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeSection, setActiveSection] = useState(0)
  const [architectureView, setArchitectureView] = useState<'interactive' | 'static'>('interactive')
  
  const { scrollYProgress } = useScroll({ container: containerRef })
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 })
  
  const sections = ['hero', 'workflows']
  
  // Track active section based on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return
      const scrollPos = containerRef.current.scrollTop
      const windowHeight = window.innerHeight
      const newSection = Math.round(scrollPos / windowHeight)
      setActiveSection(Math.min(newSection, sections.length - 1))
    }
    
    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const scrollToSection = (index: number) => {
    const element = document.getElementById(sections[index])
    if (element && containerRef.current) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div ref={containerRef} className="h-screen overflow-y-auto snap-y snap-mandatory scroll-smooth">
      <GridBackground />
      
      {/* Progress line at top */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-px bg-white/30 origin-left z-50"
        style={{ scaleX }}
      />
      
      {/* Section indicators on right */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-3">
        {sections.map((section, i) => (
          <button
            key={section}
            onClick={() => scrollToSection(i)}
            className="group flex items-center justify-end gap-3"
          >
            <span className={cn(
              "text-[10px] font-mono uppercase tracking-wider transition-all duration-300",
              activeSection === i ? "text-white/70 opacity-100" : "text-white/0 group-hover:text-white/40"
            )}>
              {section.replace(/-/g, ' ')}
            </span>
            <div className={cn(
              "w-2 transition-all duration-300",
              activeSection === i 
                ? "h-8 bg-white/60" 
                : "h-2 bg-white/20 hover:bg-white/40"
            )} />
          </button>
        ))}
      </div>

      {/* Section 1: Hero */}
      <Section id="hero" className="min-h-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Risk & Compliance */}
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-4"
              >
                <h1 className="text-5xl md:text-6xl font-semibold text-white leading-tight">
                  Onchain Security & Compliance
                </h1>
                <p className="text-neutral-400 text-lg max-w-lg">
                  AI-powered threat detection meets DON-signed execution. Autonomous security workflows that protect DeFi protocols in real-time.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-wrap gap-3"
              >
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-emerald-500/20 bg-emerald-500/5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-emerald-400 text-xs font-medium">Risk Monitoring</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-blue-500/20 bg-blue-500/5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-blue-400 text-xs font-medium">Chainlink CRE</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-purple-500/20 bg-purple-500/5">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span className="text-purple-400 text-xs font-medium">Auto Triggers</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex gap-3 pt-2"
              >
                <Link
                  to="/setup"
                  className="inline-flex items-center justify-center gap-2 w-40 py-3 bg-white text-neutral-950 rounded-lg font-medium hover:bg-neutral-200 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  Setup
                </Link>
                <a
                  href="#workflows"
                  className="inline-flex items-center justify-center gap-2 w-40 py-3 border border-white/20 text-white rounded-lg font-medium hover:bg-white/5 transition-colors"
                >
                  <Workflow className="w-4 h-4" />
                  Workflows
                </a>
              </motion.div>
            </div>

            {/* Right: Code Preview */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="rounded-xl border border-white/10 bg-neutral-900/80 overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-neutral-800/50">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                <span className="ml-2 text-xs text-neutral-500">main.ts</span>
              </div>
              <div className="p-4 text-xs font-mono leading-relaxed overflow-x-auto">
                <pre className="text-slate-300">
{`// EVM Log Trigger - Auto-detects ETHDeposited events
const init = (cfg: any) => {
  const evm = new cre.capabilities.EVMClient(network.chainSelector.selector)
  
  return [cre.handler(
    evm.logTrigger({
      addresses: [cfg.sepolia.vaultAddress],
      topics: [{ values: [ethDepositedHash] }],
      confidence: 'CONFIDENCE_LEVEL_FINALIZED',
    }),
    onLogTrigger  // Fetches prices, runs compliance, mints USDA
  )]
}`}
                </pre>
              </div>
              <div className="px-4 py-2 border-t border-white/10 bg-emerald-500/10">
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  EVM Log Trigger → 3-Price Consensus → AI Review → Mint
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Section 2: Workflows */}
      <Section id="workflows">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <WorkflowsSection />
        </motion.div>
      </Section>

    </div>
  )
}
