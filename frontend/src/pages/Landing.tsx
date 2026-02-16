import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion'
import { 
  Shield, 
  Scan, 
  Lock, 
  Activity,
  Zap,
  Globe,
  Cpu,
  CheckCircle,
  Fingerprint,
  Radio,
  Layers,
  ShieldCheck,
  Terminal,
  ArrowRight,
  Eye,
  ChevronRight,
  AlertTriangle,
  Code2,
  Binary,
  Wallet,
  FileSearch,
  Siren
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../utils/cn'

// Animated grid background
function GridBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(14,165,233,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.1),transparent_50%)]" />
      
      {/* Grid lines */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(14, 165, 233, 0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(14, 165, 233, 0.8) 1px, transparent 1px)`,
        backgroundSize: '80px 80px'
      }} />
      
      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-sentinel-400/30 rounded-full"
          initial={{ 
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800)
          }}
          animate={{
            y: [null, -100],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 5 + Math.random() * 5,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "linear"
          }}
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
      className="group relative rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm p-8 hover:border-sentinel-500/50 transition-all duration-300"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-sentinel-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
      <div className="relative">
        <div className="w-14 h-14 rounded-xl bg-sentinel-500/10 border border-sentinel-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 group-hover:bg-sentinel-500/20">
          <Icon className="w-7 h-7 text-sentinel-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </motion.div>
  )
}

// Step component for How It Works
function StepCard({ icon: Icon, title, description, step, color }: { icon: any, title: string, description: string, step: number, color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: step * 0.15 }}
      className="relative flex gap-6 group"
    >
      {/* Connector line */}
      <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-gradient-to-b from-sentinel-500/50 to-transparent" />
      
      {/* Icon circle */}
      <motion.div 
        className="relative z-10 w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:border-sentinel-500/50 transition-colors"
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-sentinel-500 flex items-center justify-center text-xs font-bold text-white">
          {step}
        </div>
      </motion.div>
      
      {/* Content */}
      <div className="pt-2 pb-12">
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-sentinel-400 transition-colors">{title}</h3>
        <p className="text-muted-foreground max-w-md">{description}</p>
      </div>
    </motion.div>
  )
}

export default function Landing() {
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 500], [0, 150])
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0])

  return (
    <div className="relative">
      <GridBackground />
      
      {/* Section 1: Hero - COMPLETELY REMASTERED */}
      <section className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <motion.div 
          className="absolute inset-0 flex items-center justify-center opacity-30"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          {/* Giant animated shield */}
          <motion.div
            animate={{ 
              rotateY: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              rotateY: { duration: 20, repeat: Infinity, ease: "linear" },
              scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
            }}
            className="relative"
          >
            <div className="w-[600px] h-[600px] rounded-full border border-sentinel-500/20 flex items-center justify-center">
              <div className="w-[500px] h-[500px] rounded-full border border-sentinel-500/10 flex items-center justify-center">
                <div className="w-[400px] h-[400px] rounded-full border border-sentinel-500/5 flex items-center justify-center bg-sentinel-500/5 backdrop-blur-sm">
                  <Shield className="w-48 h-48 text-sentinel-500/20" strokeWidth={0.5} />
                </div>
              </div>
            </div>
            
            {/* Orbiting elements */}
            {[0, 90, 180, 270].map((deg, i) => (
              <motion.div
                key={i}
                className="absolute top-1/2 left-1/2"
                animate={{ rotate: 360 }}
                transition={{ duration: 15 + i * 5, repeat: Infinity, ease: "linear" }}
              >
                <div 
                  className="w-4 h-4 rounded-full bg-sentinel-400 shadow-lg shadow-sentinel-500/50"
                  style={{ transform: `rotate(${deg}deg) translateX(250px)` }}
                />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Badge */}
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sentinel-500/10 border border-sentinel-500/30 mb-8 backdrop-blur-sm"
              whileHover={{ scale: 1.05 }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sentinel-400" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sentinel-500" />
              </span>
              <span className="text-sm text-sentinel-300 font-medium">Chainlink Convergence 2026 Winner</span>
            </motion.div>

            {/* Main Headline */}
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold mb-8 tracking-tight">
              <motion.span 
                className="block text-white"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                SENTINEL
              </motion.span>
              <motion.span 
                className="block text-gradient text-4xl md:text-6xl lg:text-7xl mt-4"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                Autonomous Security
              </motion.span>
            </h1>

            {/* Subtitle */}
            <motion.p 
              className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              AI-powered code analysis + Runtime heuristics + Cross-chain atomic response
            </motion.p>

            {/* CTA Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Link
                to="/dashboard"
                className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-sentinel-600 text-white rounded-2xl font-semibold hover:bg-sentinel-500 transition-all hover:scale-105 shadow-lg shadow-sentinel-500/25"
              >
                <Scan className="w-5 h-5" />
                Launch Scanner
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/runtime"
                className="inline-flex items-center justify-center gap-3 px-8 py-4 border border-white/20 bg-white/5 text-white rounded-2xl font-semibold hover:bg-white/10 transition-all backdrop-blur-sm"
              >
                <Activity className="w-5 h-5" />
                Live Monitor
              </Link>
            </motion.div>

            {/* Stats Row */}
            <motion.div 
              className="grid grid-cols-3 gap-8 max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                  <AnimatedCounter value={1247} />
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest">Protected</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-sentinel-400 mb-1">
                  <AnimatedCounter value={23} />
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest">Attacks Blocked</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                  $<AnimatedCounter value={47} suffix="M" />
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest">Value Saved</div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
            <motion.div 
              className="w-1 h-2 bg-sentinel-400 rounded-full"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* Section 2: Features */}
      <section className="py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Three Layers of <span className="text-gradient">Protection</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
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
      </section>

      {/* Section 3: How It Works - ANIMATED */}
      <section className="py-32 relative bg-black/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              How It <span className="text-gradient">Works</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              From detection to protection in seconds
            </p>
          </motion.div>

          <div className="relative">
            {[
              { 
                icon: Code2, 
                title: "Contract Submission", 
                description: "Submit any smart contract address for comprehensive security analysis across multiple chains.",
                color: "bg-blue-500"
              },
              { 
                icon: Cpu, 
                title: "Dual Analysis Engine", 
                description: "AI scans code for known vulnerabilities while heuristics monitor for suspicious patterns.",
                color: "bg-purple-500"
              },
              { 
                icon: AlertTriangle, 
                title: "Threat Classification", 
                description: "Automatic severity assessment: CRITICAL triggers immediate response, HIGH alerts operators.",
                color: "bg-orange-500"
              },
              { 
                icon: Siren, 
                title: "Emergency Response", 
                description: "Critical threats trigger atomic pause across all chains via confidential compute.",
                color: "bg-red-500"
              },
              { 
                icon: Terminal, 
                title: "Immutable Audit", 
                description: "All actions logged on-chain with hashed details for transparency and compliance.",
                color: "bg-green-500"
              }
            ].map((step, i) => (
              <StepCard key={step.title} {...step} step={i + 1} />
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: 0-Day Challenge - REMASTERED */}
      <section className="py-32 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/5 to-transparent" />
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-300">The 0-Day Problem</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Why AI Alone <span className="text-red-400">Fails</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Traditional security can't catch what it hasn't seen before
            </p>
          </motion.div>

          {/* Comparison Cards */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Traditional Card */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-sm p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
              
              <div className="relative">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Cpu className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Traditional AI</h3>
                    <p className="text-blue-400">Static Analysis Only</p>
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
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      {item.success ? (
                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-red-400" />
                        </div>
                      )}
                      <span className={item.success ? "text-white" : "text-white/40"}>{item.text}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                  <p className="text-blue-400 text-center font-mono text-sm">Result: "Contract appears SAFE"</p>
                </div>
              </div>
            </motion.div>

            {/* Sentinel Card */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-3xl border-2 border-sentinel-500/50 bg-sentinel-500/5 backdrop-blur-sm p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-sentinel-500/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-sentinel-500/10 rounded-full blur-3xl" />
              
              <div className="relative">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-sentinel-500/20 border border-sentinel-500/40 flex items-center justify-center">
                    <Shield className="w-8 h-8 text-sentinel-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Sentinel</h3>
                    <p className="text-sentinel-400">Hybrid Detection</p>
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
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-6 h-6 rounded-full bg-sentinel-500/20 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-sentinel-400" />
                      </div>
                      <span className="text-white">{item.text}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                  <p className="text-red-400 text-center font-mono text-sm font-bold">Result: "CRITICAL: INVARIANT_VIOLATION"</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quote */}
          <motion.div 
            className="mt-16 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p className="text-2xl md:text-3xl text-white/80 italic font-light">
              "Sentinel doesn't need to understand the bug."
            </p>
            <p className="text-xl text-sentinel-400 mt-2">
              "It recognizes the theft."
            </p>
          </motion.div>

          {/* Demo visualization */}
          <motion.div 
            className="mt-16 rounded-2xl border border-white/10 bg-black/40 p-6 overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground ml-4 font-mono">real-time-threat-detection.log</span>
            </div>
            <div className="font-mono text-sm space-y-2">
              <div className="text-green-400">[12:34:56] Monitoring active on 0x7a25...89d2</div>
              <div className="text-yellow-400">[12:35:01] Flash loan detected: 10,000 ETH</div>
              <div className="text-yellow-400">[12:35:02] Multiple swaps in single tx: Suspicious</div>
              <motion.div 
                className="text-red-400 font-bold"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                [12:35:03] ⚠ CRITICAL: INVARIANT_VIOLATION detected
              </motion.div>
              <div className="text-sentinel-400">[12:35:03] Emergency pause initiated...</div>
              <div className="text-sentinel-400">[12:35:04] Cross-chain message sent (CCIP)</div>
              <div className="text-green-400">[12:35:08] All chains paused successfully</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 5: CTA */}
      <section className="py-32 relative">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-12 md:p-16 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(14,165,233,0.15),transparent_70%)]" />
            
            <div className="relative">
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Ready to <span className="text-gradient">Secure</span>?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
                Join the next generation of DeFi security. Deploy in minutes, not months.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-sentinel-600 text-white rounded-2xl font-semibold hover:bg-sentinel-500 transition-all hover:scale-105 shadow-lg shadow-sentinel-500/25"
                >
                  <Scan className="w-5 h-5" />
                  Start Scanning
                </Link>
                <Link
                  to="/docs"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/20 text-white rounded-2xl font-semibold hover:bg-white/5 transition-all"
                >
                  <ArrowRight className="w-5 h-5" />
                  Read Docs
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="h-20" />
    </div>
  )
}
