import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
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
  Eye
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../utils/cn'

// Animated background
function CyberBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-sentinel-500/10 rounded-full blur-[150px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(14, 165, 233, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(14, 165, 233, 0.5) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />
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
      transition={{ delay: index * 0.1 }}
      className="group relative rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm p-8 hover:border-sentinel-500/30 transition-all"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-sentinel-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
      <div className="relative">
        <div className="w-14 h-14 rounded-xl bg-sentinel-500/10 border border-sentinel-500/20 flex items-center justify-center mb-6">
          <Icon className="w-7 h-7 text-sentinel-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  )
}

export default function Landing() {
  return (
    <div className="relative">
      <CyberBackground />
      
      {/* Section 1: Hero */}
      <section className="min-h-screen flex items-center relative z-10 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sentinel-500/10 border border-sentinel-500/20 mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sentinel-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sentinel-500" />
                </span>
                <span className="text-sm text-sentinel-300">Chainlink Convergence Hackathon 2026</span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
                <span className="text-white">Secure</span>
                <br />
                <span className="text-gradient">Everything</span>
              </h1>

              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                The first autonomous security oracle combining AI code analysis, 
                runtime heuristics, and cross-chain response.
              </p>

              <div className="flex flex-wrap gap-4 mb-12">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-sentinel-600 text-white rounded-xl font-semibold hover:bg-sentinel-500 transition-all"
                >
                  <Scan className="w-5 h-5" />
                  Launch Scanner
                </Link>
                <Link
                  to="/runtime"
                  className="inline-flex items-center gap-2 px-6 py-3 border border-white/10 bg-white/5 text-white rounded-xl font-semibold hover:bg-white/10 transition-all"
                >
                  <Activity className="w-5 h-5" />
                  Live Monitor
                </Link>
              </div>

              <div className="flex gap-8">
                <div>
                  <div className="text-2xl font-bold text-white"><AnimatedCounter value={1247} /></div>
                  <div className="text-xs text-muted-foreground uppercase">Protected</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white"><AnimatedCounter value={23} /></div>
                  <div className="text-xs text-muted-foreground uppercase">Attacks Blocked</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">$<AnimatedCounter value={47} suffix="M" /></div>
                  <div className="text-xs text-muted-foreground uppercase">Value Secured</div>
                </div>
              </div>
            </div>

            {/* Right visual */}
            <div className="order-1 lg:order-2 flex justify-center">
              <div className="relative w-80 h-80">
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-sentinel-500/20"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-2xl bg-sentinel-500/10 border border-sentinel-500/30 flex items-center justify-center">
                    <Shield className="w-16 h-16 text-sentinel-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Features */}
      <section className="py-32 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Three Layers of <span className="text-gradient">Security</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comprehensive protection at every stage
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={Cpu}
              title="Static Analysis"
              description="AI-powered code scanning detects known vulnerabilities before deployment using xAI Grok."
              index={0}
            />
            <FeatureCard
              icon={Radio}
              title="Runtime Heuristics"
              description="Deterministic pattern matching catches 0-day exploits by behavior, not code signatures."
              index={1}
            />
            <FeatureCard
              icon={Globe}
              title="Cross-Chain Response"
              description="Atomic pause across all linked chains via CCIP. Stop attacks in ~12 seconds."
              index={2}
            />
          </div>
        </div>
      </section>

      {/* Section 3: How It Works */}
      <section className="py-32 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              How It <span className="text-gradient">Works</span>
            </h2>
          </div>

          <div className="space-y-8">
            {[
              { icon: Scan, title: "Submit Contract", desc: "Enter contract address for security analysis" },
              { icon: Layers, title: "Dual Analysis", desc: "AI code scan + Runtime heuristic detection" },
              { icon: ShieldCheck, title: "Risk Assessment", desc: "CRITICAL/HIGH/MEDIUM/LOW classification" },
              { icon: Zap, title: "Auto-Response", desc: "Emergency pause triggered for critical threats" },
              { icon: Terminal, title: "Audit Trail", desc: "Immutable on-chain logging of all actions" }
            ].map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-6 items-start"
              >
                <div className="w-16 h-16 rounded-2xl bg-sentinel-500/10 border border-sentinel-500/30 flex items-center justify-center flex-shrink-0">
                  <step.icon className="w-7 h-7 text-sentinel-400" />
                </div>
                <div className="pt-2">
                  <div className="text-xs text-sentinel-400 font-medium mb-1">Step {i + 1}</div>
                  <h3 className="text-xl font-bold text-white mb-1">{step.title}</h3>
                  <p className="text-muted-foreground">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: 0-Day Demo */}
      <section className="py-32 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              The <span className="text-red-400">0-Day</span> Challenge
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Why traditional security misses what we catch
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Traditional AI</h3>
                  <p className="text-sm text-muted-foreground">Code analysis only</p>
                </div>
              </div>
              
              <div className="space-y-3 text-muted-foreground">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Known patterns</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Training data dependent</span>
                </div>
                <div className="flex items-center gap-3 text-red-400/50">
                  <div className="w-5 h-5 rounded-full border-2 border-red-400/50" />
                  <span>0-day exploits</span>
                </div>
              </div>

              <div className="mt-8 p-4 bg-blue-500/5 rounded-xl border border-blue-500/20">
                <p className="text-blue-400 text-center">"SAFE"</p>
              </div>
            </div>

            <div className="rounded-2xl border border-sentinel-500/30 bg-sentinel-500/5 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-sentinel-500/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-sentinel-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Sentinel</h3>
                  <p className="text-sm text-muted-foreground">Behavioral + Static</p>
                </div>
              </div>
              
              <div className="space-y-3 text-white">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Known patterns</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Heuristic detection</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>0-day exploits</span>
                </div>
              </div>

              <div className="mt-8 p-4 bg-red-500/10 rounded-xl border border-red-500/30">
                <p className="text-red-400 text-center font-medium">"CRITICAL THREAT DETECTED"</p>
              </div>
            </div>
          </div>

          <p className="text-center mt-12 text-xl text-muted-foreground italic">
            "Sentinel doesn't need to understand the bug. It recognizes the theft."
          </p>
        </div>
      </section>

      {/* Section 5: CTA */}
      <section className="py-32 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/20 p-12 md:p-16">
            <div className="absolute inset-0 bg-gradient-to-r from-sentinel-500/10 via-purple-500/10 to-sentinel-500/10" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-sentinel-500/20 blur-[100px] rounded-full" />
            
            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                Ready to Secure Your Contracts?
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
                Deploy in minutes. Sleep better tonight.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-sentinel-600 text-white rounded-xl font-semibold hover:bg-sentinel-500 transition-all"
                >
                  <Scan className="w-5 h-5" />
                  Get Started
                </Link>
                <Link
                  to="/docs"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/10 bg-white/5 text-white rounded-xl font-semibold hover:bg-white/10 transition-all"
                >
                  <ArrowRight className="w-5 h-5" />
                  Documentation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom spacing */}
      <div className="h-20" />
    </div>
  )
}
