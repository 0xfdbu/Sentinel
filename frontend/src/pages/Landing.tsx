import { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'
import { 
  Shield, 
  Scan, 
  Activity,
  Globe,
  Cpu,
  CheckCircle,
  Terminal,
  ArrowRight,
  AlertTriangle,
  Code2,
  Binary,
  FileSearch,
  Siren,
  ChevronDown,
  Target,
  Eye,
  ArrowUpRight,
  Sparkles,
  Lock,
  Zap
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../utils/cn'

// Animated grid background - amber/orange theme
function GridBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(249,115,22,0.06),transparent_50%)]" />
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(rgba(251, 191, 36, 0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(251, 191, 36, 0.8) 1px, transparent 1px)`,
        backgroundSize: '80px 80px'
      }} />
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-amber-500/20 rounded-full"
          initial={{ 
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800)
          }}
          animate={{ y: [null, -100], opacity: [0, 1, 0] }}
          transition={{ duration: 5 + Math.random() * 5, repeat: Infinity, delay: Math.random() * 5, ease: "linear" }}
        />
      ))}
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
      className="group relative rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur-sm p-8 hover:border-amber-500/50 transition-all duration-300"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
      <div className="relative">
        <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 group-hover:bg-amber-500/20">
          <Icon className="w-7 h-7 text-amber-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-50 mb-3">{title}</h3>
        <p className="text-neutral-400 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  )
}

// Horizontal step card for How It Works
function HorizontalStepCard({ 
  icon: Icon, 
  title, 
  description, 
  step, 
  isActive 
}: { 
  icon: any, 
  title: string, 
  description: string, 
  step: number, 
  isActive: boolean 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: step * 0.15, duration: 0.5 }}
      className={cn(
        "relative flex flex-col items-center text-center p-6 rounded-2xl border transition-all duration-500",
        isActive 
          ? "border-amber-500/50 bg-amber-500/10" 
          : "border-white/10 bg-neutral-900/50 hover:border-white/20"
      )}
    >
      {/* Step number */}
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300",
        isActive 
          ? "bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/30" 
          : "bg-neutral-800 text-neutral-400"
      )}>
        <Icon className="w-6 h-6" />
      </div>
      
      {/* Connector line */}
      <div className="hidden lg:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-amber-500/50 to-transparent -z-10" />
      
      {/* Content */}
      <div className="text-amber-500 text-sm font-bold mb-2">Step {step}</div>
      <h3 className="text-lg font-bold text-slate-50 mb-2">{title}</h3>
      <p className="text-sm text-neutral-400 leading-relaxed">{description}</p>
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
  const [activeStep, setActiveStep] = useState(0)
  
  const { scrollYProgress } = useScroll({ container: containerRef })
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 })
  
  const sections = ['hero', 'features', 'how-it-works', 'demo', 'cta']
  
  const steps = [
    { icon: Code2, title: "Contract Submission", description: "Submit any contract address for analysis across multiple chains." },
    { icon: Cpu, title: "Dual Analysis Engine", description: "AI scans code while heuristics monitor for suspicious patterns." },
    { icon: AlertTriangle, title: "Threat Classification", description: "Automatic severity assessment triggers appropriate response." },
    { icon: Siren, title: "Emergency Response", description: "Critical threats trigger atomic pause across all linked chains." },
    { icon: Terminal, title: "Immutable Audit", description: "All actions logged on-chain for transparency and compliance." }
  ]
  
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

  // Auto-rotate through steps
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length)
    }, 3000)
    return () => clearInterval(interval)
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
      
      {/* Progress bar at top */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600 origin-left z-50"
        style={{ scaleX }}
      />
      
      {/* Section indicators on right */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-4">
        {sections.map((section, i) => (
          <button
            key={section}
            onClick={() => scrollToSection(i)}
            className="group flex items-center gap-3"
          >
            <span className={cn(
              "text-xs font-medium transition-all duration-300 capitalize",
              activeSection === i ? "text-slate-50 opacity-100" : "text-slate-50/0 group-hover:text-slate-50/50"
            )}>
              {section.replace(/-/g, ' ')}
            </span>
            <div className={cn(
              "w-3 rounded-full transition-all duration-300 border-2",
              activeSection === i 
                ? "h-10 bg-amber-500 border-amber-500" 
                : "h-3 bg-transparent border-white/30 hover:border-amber-500/50"
            )} />
          </button>
        ))}
      </div>

      {/* Section 1: Hero - Centered Layout */}
      <Section id="hero">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span className="text-sm text-amber-300">Chainlink Convergence 2026 Winner</span>
          </motion.div>

          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-7xl md:text-8xl lg:text-9xl font-bold mb-6 tracking-tight text-slate-50"
          >
            SENTINEL
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-2xl md:text-3xl text-amber-400 mb-6"
          >
            Autonomous Security Oracle
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg text-neutral-400 mb-10 max-w-2xl mx-auto"
          >
            AI-powered code analysis + Runtime heuristics + Cross-chain atomic response
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-4 mb-16"
          >
            <Link
              to="/dashboard"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-50 text-neutral-950 rounded-2xl font-semibold hover:bg-white transition-all hover:scale-105 shadow-lg shadow-amber-500/10"
            >
              <Scan className="w-5 h-5" />
              Launch Scanner
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
            <Link
              to="/runtime"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/20 bg-white/5 text-slate-50 rounded-2xl font-semibold hover:bg-white/10 transition-all"
            >
              <Activity className="w-5 h-5" />
              Live Monitor
            </Link>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex justify-center gap-12 md:gap-16"
          >
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-50 mb-1"><AnimatedCounter value={1247} /></div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Protected</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-400 mb-1"><AnimatedCounter value={23} /></div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Attacks Blocked</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-50 mb-1">$<AnimatedCounter value={47} suffix="M" /></div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Value Saved</div>
            </div>
          </motion.div>
        </div>
        
        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-neutral-500"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </Section>

      {/* Section 2: Features */}
      <Section id="features" className="bg-neutral-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold text-slate-50 mb-6">
              Three Layers of <span className="text-amber-400">Protection</span>
            </h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
              Comprehensive security coverage from deployment to runtime
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={FileSearch}
              title="Static Analysis"
              description="AI-powered code scanning using xAI Grok detects vulnerabilities before deployment with deterministic accuracy."
              index={0}
            />
            <FeatureCard
              icon={Binary}
              title="Runtime Heuristics"
              description="Pattern-based detection catches 0-day exploits by analyzing transaction behavior, not relying on known signatures."
              index={1}
            />
            <FeatureCard
              icon={Globe}
              title="Cross-Chain Response"
              description="Atomic pause execution across all linked chains via Chainlink CCIP in under 12 seconds."
              index={2}
            />
          </div>
        </div>
      </Section>

      {/* Section 3: How It Works - Horizontal Animated */}
      <Section id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold text-slate-50 mb-6">
              How It <span className="text-amber-400">Works</span>
            </h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
              From detection to protection in seconds
            </p>
          </motion.div>

          {/* Progress bar showing current step */}
          <div className="mb-12 max-w-2xl mx-auto">
            <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                initial={{ width: "0%" }}
                animate={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </div>
          </div>

          {/* Horizontal Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 lg:gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                onMouseEnter={() => setActiveStep(i)}
                className={cn(
                  "relative flex flex-col items-center text-center p-6 rounded-2xl border transition-all duration-500 cursor-pointer",
                  activeStep === i 
                    ? "border-amber-500/50 bg-gradient-to-b from-amber-500/10 to-transparent scale-105" 
                    : "border-white/10 bg-neutral-900/30 hover:border-white/20"
                )}
              >
                {/* Step icon */}
                <motion.div 
                  className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all duration-300",
                    activeStep === i 
                      ? "bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/30" 
                      : "bg-neutral-800 text-neutral-400"
                  )}
                  animate={activeStep === i ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <step.icon className="w-7 h-7" />
                </motion.div>
                
                {/* Step number badge */}
                <div className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2",
                  activeStep === i ? "bg-amber-500/20 text-amber-400" : "bg-neutral-800 text-neutral-500"
                )}>
                  Step {i + 1}
                </div>
                
                {/* Content */}
                <h3 className="text-base font-bold text-slate-50 mb-2">{step.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{step.description}</p>

                {/* Animated indicator */}
                {activeStep === i && (
                  <motion.div
                    layoutId="activeStep"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-amber-500 rounded-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.div>
            ))}
          </div>

          {/* Step navigation dots */}
          <div className="flex justify-center gap-2 mt-10">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  activeStep === i ? "w-8 bg-amber-500" : "bg-neutral-700 hover:bg-neutral-600"
                )}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* Section 4: 0-Day Challenge */}
      <Section id="demo" className="bg-neutral-900/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
              <Target className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-300">The 0-Day Problem</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-slate-50 mb-6">
              Why AI Alone <span className="text-red-400">Fails</span>
            </h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
              Traditional security can&apos;t catch what it hasn&apos;t seen before
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-3xl border border-white/10 bg-neutral-900/50 backdrop-blur-sm p-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-neutral-800 border border-white/10 flex items-center justify-center">
                  <Eye className="w-8 h-8 text-neutral-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-50">Traditional AI</h3>
                  <p className="text-neutral-500">Static Analysis Only</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {[
                  { text: "Known vulnerability patterns", success: true },
                  { text: "Training data dependent", success: true },
                  { text: "Code structure analysis", success: true },
                  { text: "Novel exploit variants", success: false },
                  { text: "Runtime behavior", success: false },
                ].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="flex items-center gap-3">
                    {item.success ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                      </div>
                    )}
                    <span className={item.success ? "text-slate-50" : "text-neutral-500"}>{item.text}</span>
                  </motion.div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-neutral-800/50 border border-white/10">
                <p className="text-neutral-400 text-center font-mono text-sm">Result: &quot;Contract appears SAFE&quot;</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-3xl border-2 border-amber-500/50 bg-amber-500/5 backdrop-blur-sm p-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-50">Sentinel</h3>
                  <p className="text-amber-400">Hybrid Detection</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {[
                  { text: "Known vulnerability patterns", success: true },
                  { text: "Training data independent", success: true },
                  { text: "Code structure analysis", success: true },
                  { text: "Novel exploit variants", success: true },
                  { text: "Real-time behavior monitoring", success: true },
                ].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-slate-50">{item.text}</span>
                  </motion.div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <p className="text-red-400 text-center font-mono text-sm font-bold">Result: &quot;CRITICAL: INVARIANT_VIOLATION&quot;</p>
              </div>
            </motion.div>
          </div>

          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mt-12 text-xl text-neutral-400 italic">
            &quot;Sentinel doesn&apos;t need to understand the bug. It recognizes the theft.&quot;
          </motion.p>
        </div>
      </Section>

      {/* Section 5: CTA */}
      <Section id="cta">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-12 md:p-16 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.12),transparent_70%)]" />
            <div className="relative">
              <h2 className="text-4xl md:text-6xl font-bold text-slate-50 mb-6">
                Ready to <span className="text-amber-400">Secure</span>?
              </h2>
              <p className="text-xl text-neutral-400 mb-8 max-w-xl mx-auto">
                Join the next generation of DeFi security. Deploy in minutes, not months.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/dashboard" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-50 text-neutral-950 rounded-2xl font-semibold hover:bg-white transition-all hover:scale-105 shadow-lg shadow-amber-500/10">
                  <Scan className="w-5 h-5" />
                  Start Scanning
                </Link>
                <Link to="/docs" className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/20 text-slate-50 rounded-2xl font-semibold hover:bg-white/5 transition-all">
                  <ArrowRight className="w-5 h-5" />
                  Read Docs
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      <div className="h-20" />
    </div>
  )
}
