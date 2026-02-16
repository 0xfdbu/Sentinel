import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion'
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

// Animated background with cyber security theme
function CyberBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    let animationId: number
    let time = 0
    
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    
    // Network nodes
    const nodes: Array<{x: number, y: number, vx: number, vy: number, radius: number}> = []
    const nodeCount = 50
    
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1
      })
    }
    
    const draw = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      time += 0.01
      
      // Draw connections
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.05)'
      ctx.lineWidth = 0.5
      
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < 150) {
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }
      
      // Draw and update nodes
      nodes.forEach((node, i) => {
        // Update position
        node.x += node.vx
        node.y += node.vy
        
        // Bounce off edges
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1
        
        // Draw node
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        ctx.fillStyle = i % 5 === 0 ? 'rgba(14, 165, 233, 0.4)' : 'rgba(14, 165, 233, 0.15)'
        ctx.fill()
      })
      
      // Pulse rings at random positions
      if (Math.random() < 0.02) {
        const x = Math.random() * canvas.width
        const y = Math.random() * canvas.height
        
        const drawRing = (radius: number, opacity: number) => {
          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(14, 165, 233, ${opacity})`
          ctx.lineWidth = 1
          ctx.stroke()
        }
        
        for (let i = 0; i < 3; i++) {
          setTimeout(() => drawRing(20 + i * 15, 0.3 - i * 0.1), i * 100)
        }
      }
      
      animationId = requestAnimationFrame(draw)
    }
    
    draw()
    
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [])
  
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Canvas for network effect */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-sentinel-500/5 to-transparent" />
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-purple-500/5 to-transparent" />
      
      {/* Animated orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%)',
        }}
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  )
}

// Section wrapper with horizontal slide animations
function Section({ 
  children, 
  className,
  direction = 'right'
}: { 
  children: React.ReactNode
  className?: string
  direction?: 'left' | 'right'
}) {
  return (
    <section className={cn("min-h-screen w-full flex items-center relative overflow-hidden", className)}>
      <motion.div
        initial={{ x: direction === 'right' ? '100%' : '-100%', opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ 
          type: "spring",
          stiffness: 50,
          damping: 20,
          duration: 0.8
        }}
        className="w-full"
      >
        {children}
      </motion.div>
    </section>
  )
}

// Feature card with hover effect
function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  index = 0 
}: { 
  icon: any
  title: string
  description: string
  index?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="group relative"
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm p-8 h-full hover:border-sentinel-500/30 transition-all duration-300">
        {/* Glow effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-sentinel-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative">
          <div className="w-14 h-14 rounded-xl bg-sentinel-500/10 border border-sentinel-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Icon className="w-7 h-7 text-sentinel-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </motion.div>
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

// Main landing page
export default function Landing() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentSection, setCurrentSection] = useState(0)
  
  const { scrollYProgress } = useScroll({ container: containerRef })
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  const sections = ['hero', 'features', 'how-it-works', 'demo', 'cta']

  return (
    <div ref={containerRef} className="h-screen overflow-y-auto scroll-smooth">
      <CyberBackground />
      
      {/* Progress bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sentinel-500 to-purple-500 origin-left z-50"
        style={{ scaleX }}
      />

      {/* Section indicators */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-3">
        {sections.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              document.getElementById(sections[i])?.scrollIntoView({ behavior: 'smooth' })
              setCurrentSection(i)
            }}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              currentSection === i 
                ? "bg-sentinel-500 h-8" 
                : "bg-white/20 hover:bg-white/40"
            )}
          />
        ))}
      </div>

      {/* Section 1: Modern Hero */}
      <Section id="hero" className="min-h-screen" direction="right">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div className="order-2 lg:order-1">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sentinel-500/10 border border-sentinel-500/20 mb-6"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sentinel-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sentinel-500" />
                </span>
                <span className="text-sm text-sentinel-300">Chainlink Convergence Hackathon 2026</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6"
              >
                <span className="text-white">Secure</span>
                <br />
                <span className="text-gradient">Everything</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-muted-foreground mb-8 max-w-lg"
              >
                The first autonomous security oracle combining AI code analysis, 
                runtime heuristics, and cross-chain response.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap gap-4 mb-12"
              >
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-sentinel-600 text-white rounded-xl font-semibold hover:bg-sentinel-500 transition-all hover:scale-105"
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
              </motion.div>

              {/* Quick stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex gap-8"
              >
                <div>
                  <div className="text-2xl font-bold text-white">
                    <AnimatedCounter value={1247} />
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Protected</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    <AnimatedCounter value={23} />
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Attacks Blocked</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    $<AnimatedCounter value={47} suffix="M" />
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Value Secured</div>
                </div>
              </motion.div>
            </div>

            {/* Right visual */}
            <div className="order-1 lg:order-2 flex justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="relative"
              >
                {/* Central shield */}
                <div className="relative w-80 h-80 md:w-96 md:h-96">
                  {/* Outer ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-sentinel-500/20"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  >
                    {[0, 90, 180, 270].map((deg, i) => (
                      <div
                        key={i}
                        className="absolute w-3 h-3 bg-sentinel-500/40 rounded-full"
                        style={{
                          top: '50%',
                          left: '50%',
                          transform: `rotate(${deg}deg) translateX(180px) translateY(-50%)`
                        }}
                      />
                    ))}
                  </motion.div>
                  
                  {/* Middle ring */}
                  <motion.div
                    className="absolute inset-8 rounded-full border border-sentinel-500/10"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  />
                  
                  {/* Inner glow */}
                  <div className="absolute inset-16 rounded-full bg-gradient-to-br from-sentinel-500/20 to-purple-500/20 blur-xl" />
                  
                  {/* Center icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 rounded-2xl bg-sentinel-500/10 border border-sentinel-500/30 flex items-center justify-center backdrop-blur-sm">
                      <Shield className="w-16 h-16 text-sentinel-400" />
                    </div>
                  </div>
                  
                  {/* Orbiting elements */}
                  {[Lock, Eye, Fingerprint, ShieldCheck].map((Icon, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center"
                      animate={{
                        rotate: 360
                      }}
                      transition={{
                        duration: 12,
                        repeat: Infinity,
                        ease: "linear",
                        delay: i * 3
                      }}
                      style={{
                        top: '50%',
                        left: '50%',
                        transformOrigin: '0 0'
                      }}
                    >
                      <div
                        style={{
                          transform: `rotate(${i * 90}deg) translateX(140px) rotate(-${i * 90}deg)`
                        }}
                      >
                        <Icon className="w-5 h-5 text-sentinel-400" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </Section>

      {/* Section 2: Features */}
      <Section id="features" direction="left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
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
      </Section>

      {/* Section 3: How It Works */}
      <Section id="how-it-works" direction="right">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              How It <span className="text-gradient">Works</span>
            </h2>
          </div>

          <div className="relative">
            {/* Connection line */}
            <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gradient-to-b from-sentinel-500/50 via-sentinel-500/20 to-transparent hidden md:block" />
            
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
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-6 items-start"
                >
                  <div className="relative z-10 w-16 h-16 rounded-2xl bg-sentinel-500/10 border border-sentinel-500/30 flex items-center justify-center flex-shrink-0">
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
        </div>
      </Section>

      {/* Section 4: 0-Day Demo */}
      <Section id="demo" direction="left">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              The <span className="text-red-400">0-Day</span> Challenge
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Why traditional security misses what we catch
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Traditional */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-white/10 bg-black/20 p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Traditional AI</h3>
                  <p className="text-sm text-muted-foreground">Code analysis only</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {['Known patterns', 'Training data dependent', 'Static analysis'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>{item}</span>
                  </div>
                ))}
                <div className="flex items-center gap-3 text-red-400/50">
                  <div className="w-5 h-5 rounded-full border-2 border-red-400/50" />
                  <span>0-day exploits</span>
                </div>
              </div>

              <div className="mt-8 p-4 bg-blue-500/5 rounded-xl border border-blue-500/20">
                <p className="text-blue-400 text-center">"SAFE"</p>
              </div>
            </motion.div>

            {/* Sentinel */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-sentinel-500/30 bg-sentinel-500/5 p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-sentinel-500/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-sentinel-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Sentinel</h3>
                  <p className="text-sm text-muted-foreground">Behavioral + Static</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {['Known patterns', 'Heuristic detection', 'Runtime monitoring', '0-day exploits'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-white">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-red-500/10 rounded-xl border border-red-500/30">
                <p className="text-red-400 text-center font-medium">"CRITICAL THREAT DETECTED"</p>
              </div>
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-12 text-xl text-muted-foreground italic"
          >
            "Sentinel doesn't need to understand the bug. It recognizes the theft."
          </motion.p>
        </div>
      </Section>

      {/* Section 5: CTA */}
      <Section id="cta" direction="right">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/20 p-12 md:p-16"
          >
            {/* Background effects */}
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
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-sentinel-600 text-white rounded-xl font-semibold hover:bg-sentinel-500 transition-all hover:scale-105"
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
          </motion.div>
        </div>
      </Section>

      {/* Footer spacer */}
      <div className="h-20" />
    </div>
  )
}
