import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { 
  Shield, 
  Scan, 
  Lock, 
  Activity,
  Zap,
  Globe,
  Cpu,
  Eye,
  ChevronDown,
  ArrowRight,
  CheckCircle,
  ShieldCheck,
  Fingerprint,
  Radio
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../utils/cn'

// Animated background component
function SecurityBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Gradient orbs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-sentinel-500/20 rounded-full blur-[120px] animate-pulse-slow" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse-slow delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sentinel-600/10 rounded-full blur-[150px] animate-pulse-slow delay-500" />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(14, 165, 233, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(14, 165, 233, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />
      
      {/* Floating security icons */}
      {[Shield, Lock, Eye, Fingerprint, ShieldCheck].map((Icon, i) => (
        <motion.div
          key={i}
          className="absolute text-sentinel-500/10"
          initial={{ 
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800)
          }}
          animate={{
            y: [0, -30, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{
            duration: 8 + i * 2,
            repeat: Infinity,
            delay: i * 1.5,
            ease: "easeInOut"
          }}
          style={{
            left: `${10 + i * 20}%`,
            top: `${15 + (i % 3) * 25}%`,
          }}
        >
          <Icon className="w-16 h-16 md:w-24 md:h-24" strokeWidth={0.5} />
        </motion.div>
      ))}
      
      {/* Scanning line effect */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-sentinel-500/50 to-transparent"
        animate={{
          top: ['0%', '100%', '0%']
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      {/* Binary rain effect */}
      <div className="absolute inset-0 opacity-[0.02] overflow-hidden font-mono text-xs text-sentinel-400">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: `${i * 5}%` }}
            animate={{
              y: [-100, typeof window !== 'undefined' ? window.innerHeight : 800]
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear"
            }}
          >
            {Array.from({ length: 30 }).map(() => 
              Math.random() > 0.5 ? '1' : '0'
            ).join('\n')}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// Scroll indicator
function ScrollIndicator({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground hover:text-sentinel-400 transition-colors"
      animate={{ y: [0, 8, 0] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <span className="text-xs uppercase tracking-widest">Scroll</span>
      <ChevronDown className="w-5 h-5" />
    </motion.button>
  )
}

// Section component
function Section({ 
  children, 
  className,
  id 
}: { 
  children: React.ReactNode
  className?: string
  id?: string
}) {
  return (
    <section 
      id={id}
      className={cn(
        "min-h-screen flex flex-col justify-center relative px-4 sm:px-6 lg:px-8",
        className
      )}
    >
      {children}
    </section>
  )
}

// Feature card
function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  delay = 0 
}: { 
  icon: any
  title: string
  description: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay }}
      className="group relative"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-sentinel-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative glass rounded-2xl p-8 h-full border border-white/5 hover:border-sentinel-500/30 transition-all">
        <div className="w-14 h-14 rounded-xl bg-sentinel-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
          <Icon className="w-7 h-7 text-sentinel-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </motion.div>
  )
}

// Stat counter
function StatCounter({ value, label, suffix = '' }: { value: number, label: string, suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  
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
  
  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-gradient mb-2">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-sm text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  )
}

// Main landing page
export default function Landing() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ container: containerRef })
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  const scrollToSection = (index: number) => {
    const sections = document.querySelectorAll('section')
    sections[index]?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div 
      ref={containerRef}
      className="h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth"
    >
      <SecurityBackground />
      
      {/* Progress bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-sentinel-500 origin-left z-50"
        style={{ scaleX }}
      />
      
      {/* Section 1: Hero */}
      <Section id="hero" className="snap-start">
        <div className="max-w-6xl mx-auto w-full">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sentinel-500/10 border border-sentinel-500/20 mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sentinel-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sentinel-500" />
              </span>
              <span className="text-sm text-sentinel-300">Chainlink Convergence Hackathon 2026</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
            >
              <span className="text-gradient">Sentinel</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-4"
            >
              Autonomous AI Security Oracle
            </motion.p>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-sm text-muted-foreground max-w-xl mx-auto mb-12"
            >
              Static code analysis + Runtime heuristics + Cross-chain response.
              <br />Catching 0-day exploits before they drain your funds.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-sentinel-600 text-white rounded-xl font-semibold hover:bg-sentinel-500 transition-all hover:scale-105 shadow-lg shadow-sentinel-500/25"
              >
                <Scan className="w-5 h-5" />
                Start Scanning
              </Link>
              <button 
                onClick={() => scrollToSection(1)}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-border bg-background/50 rounded-xl font-semibold hover:bg-white/5 transition-all"
              >
                <Eye className="w-5 h-5" />
                See How It Works
              </button>
            </motion.div>
          </div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 pt-12 border-t border-white/10"
          >
            <StatCounter value={1247} label="Contracts Protected" />
            <StatCounter value={23} label="Attacks Prevented" />
            <StatCounter value={47} label="Value Protected" suffix="M" />
            <StatCounter value={3} label="Avg Response" suffix="s" />
          </motion.div>
        </div>
        
        <ScrollIndicator onClick={() => scrollToSection(1)} />
      </Section>

      {/* Section 2: How It Works */}
      <Section id="how-it-works" className="snap-start">
        <div className="max-w-6xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Three Layers of <span className="text-gradient">Protection</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Sentinel combines multiple detection methods to catch exploits at every stage
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={Cpu}
              title="Static Analysis"
              description="AI-powered code scanning using xAI Grok. Detects known vulnerabilities before deployment."
              delay={0}
            />
            <FeatureCard
              icon={Radio}
              title="Runtime Heuristics"
              description="Deterministic pattern matching detects 0-day exploits by behavior, not code signatures."
              delay={0.1}
            />
            <FeatureCard
              icon={Globe}
              title="Cross-Chain Response"
              description="Atomic pause across all linked chains via CCIP. Stop attacks in ~12 seconds."
              delay={0.2}
            />
          </div>

          {/* Workflow diagram */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 glass rounded-2xl p-8"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {['Contract Scan', 'AI Analysis', 'Risk Assessment', 'Emergency Pause', 'Audit Log'].map((step, i) => (
                <div key={step} className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-sentinel-500/20 flex items-center justify-center text-sentinel-400 font-bold">
                      {i + 1}
                    </div>
                    <span className="text-xs text-muted-foreground mt-2 whitespace-nowrap">{step}</span>
                  </div>
                  {i < 4 && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground hidden md:block" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
        
        <ScrollIndicator onClick={() => scrollToSection(2)} />
      </Section>

      {/* Section 3: Features */}
      <Section id="features" className="snap-start">
        <div className="max-w-6xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Why <span className="text-gradient">Sentinel?</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built for the future of DeFi security
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: Eye,
                title: "0-Day Detection",
                desc: "Heuristic patterns catch novel exploits that AI training data doesn't include."
              },
              {
                icon: Lock,
                title: "Confidential Compute",
                desc: "Emergency pauses are hidden from mempool until execution. Attackers can't front-run."
              },
              {
                icon: Zap,
                title: "Sub-Second Response",
                desc: "Automated protection without human intervention. Critical threats trigger instant response."
              },
              {
                icon: ShieldCheck,
                title: "Immutable Audit Trail",
                desc: "All scans logged on-chain with hashed vulnerability details for transparency."
              },
              {
                icon: Globe,
                title: "Multi-Chain Coverage",
                desc: "Protect contracts across Ethereum, Arbitrum, Base, and more."
              },
              {
                icon: Activity,
                title: "Real-Time Monitoring",
                desc: "Continuous transaction analysis detects runtime exploits as they happen."
              }
            ].map((feature, i) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.desc}
                delay={i * 0.1}
              />
            ))}
          </div>
        </div>
        
        <ScrollIndicator onClick={() => scrollToSection(3)} />
      </Section>

      {/* Section 4: The 0-Day Demo */}
      <Section id="demo" className="snap-start">
        <div className="max-w-5xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              The <span className="text-red-400">0-Day</span> Challenge
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              See how Sentinel catches exploits that traditional security misses
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* AI Side */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass rounded-2xl p-8 border border-white/10"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">AI Static Analysis</h3>
                  <p className="text-sm text-muted-foreground">Traditional approach</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Reentrancy patterns</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Overflow/underflow checks</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Access control validation</span>
                </div>
                <div className="flex items-center gap-3 text-red-400/60">
                  <div className="w-5 h-5 rounded-full border-2 border-red-400/60" />
                  <span>Novel exploit variants</span>
                </div>
              </div>

              <div className="mt-8 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <p className="text-blue-400 font-medium text-center">
                  "SAFE - No vulnerabilities detected"
                </p>
              </div>
            </motion.div>

            {/* Sentinel Side */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass rounded-2xl p-8 border border-sentinel-500/30"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-sentinel-500/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-sentinel-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Sentinel Runtime</h3>
                  <p className="text-sm text-muted-foreground">Behavioral detection</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Flash loan patterns</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Price manipulation</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Invariant violations</span>
                </div>
                <div className="flex items-center gap-3 text-green-400">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Unknown exploit signatures</span>
                </div>
              </div>

              <div className="mt-8 p-4 bg-red-500/10 rounded-xl border border-red-500/30">
                <p className="text-red-400 font-medium text-center">
                  "CRITICAL - INVARIANT_VIOLATION detected"
                </p>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <p className="text-xl text-muted-foreground italic">
              "Sentinel doesn't need to understand the bug. It recognizes the theft."
            </p>
          </motion.div>
        </div>
        
        <ScrollIndicator onClick={() => scrollToSection(4)} />
      </Section>

      {/* Section 5: CTA */}
      <Section id="cta" className="snap-start">
        <div className="max-w-4xl mx-auto w-full text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass rounded-3xl p-12 md:p-16 relative overflow-hidden"
          >
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-sentinel-500/20 via-purple-500/10 to-sentinel-500/20 opacity-50" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-sentinel-500/30 rounded-full blur-[100px]" />
            
            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                Ready to Protect Your Contracts?
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
                Join the future of DeFi security. Deploy in minutes, sleep better at night.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-sentinel-600 text-white rounded-xl font-semibold hover:bg-sentinel-500 transition-all hover:scale-105 shadow-lg shadow-sentinel-500/25"
                >
                  <Scan className="w-5 h-5" />
                  Launch Sentinel
                </Link>
                <Link
                  to="/runtime"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-border bg-background/50 rounded-xl font-semibold hover:bg-white/5 transition-all"
                >
                  <Activity className="w-5 h-5" />
                  View Demo
                </Link>
              </div>

              <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>No hidden fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Cancel anytime</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>24/7 monitoring</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>
    </div>
  )
}
