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
  Code2
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../utils/cn'
import { ArchitectureStatic } from '../components/ArchitectureStatic'

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
  
  const sections = ['hero', 'features', 'how-it-works']
  
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Risk & Compliance */}
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-4"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
                  Chainlink CRE
                </div>
                <h1 className="text-4xl md:text-5xl font-semibold text-white leading-tight">
                  Onchain Risk & Compliance
                </h1>
                <p className="text-neutral-400 text-lg max-w-lg">
                  Automated risk monitoring and protocol safeguard triggers for smart contracts. Real-time health checks with instant response.
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
                  <span className="text-blue-400 text-xs font-medium">Health Checks</span>
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
                  to="/protect"
                  className="inline-flex items-center justify-center gap-2 w-40 py-3 bg-white text-neutral-950 rounded-lg font-medium hover:bg-neutral-200 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  Register
                </Link>
                <Link
                  to="/monitor"
                  className="inline-flex items-center justify-center gap-2 w-40 py-3 border border-white/20 text-white rounded-lg font-medium hover:bg-white/5 transition-colors"
                >
                  <Activity className="w-4 h-4" />
                  Monitor
                </Link>
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
                <span className="ml-2 text-xs text-neutral-500">SentinelGuardian.sol</span>
              </div>
              <div className="p-4 text-xs font-mono leading-relaxed overflow-x-auto">
                <pre className="text-slate-300">
{`// Chainlink CRE + xAI Analysis
const onThreatDetected = async (tx: Transaction) => {
  const riskScore = await analyzeWithGrok(tx);
  
  if (riskScore > 85) {
    // Trigger emergency pause via Chainlink CRE
    await sentinelGuardian.emergencyPause({
      contract: tx.target,
      proof: await tee.generateProof()
    });
    
    console.log("Contract paused - funds secured");
  }
};`}
                </pre>
              </div>
              <div className="px-4 py-2 border-t border-white/10 bg-emerald-500/10">
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Monitoring 1,247 contracts
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Section 2: OpenZeppelin Pausable Requirement */}
      <Section id="features">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3"
            >
              <Code2 className="w-3 h-3 text-emerald-400" />
              <span className="text-xs text-emerald-300">Contract Requirement</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-4xl font-bold text-slate-50 mb-3"
            >
              Requires OpenZeppelin Pausable
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-neutral-400 text-sm max-w-xl mx-auto"
            >
              Your contract must implement OpenZeppelin's Pausable pattern. 
              This is the industry standard used by thousands of protocols.
            </motion.p>
          </div>

          <div className="grid lg:grid-cols-5 gap-6 items-start">
            {/* Code Example */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-3 rounded-xl border border-white/10 bg-neutral-900/80 overflow-hidden"
            >
              <div className="flex items-center justify-between px-3 py-2 bg-neutral-800/50 border-b border-white/10">
                <span className="text-xs font-medium text-neutral-400">Solidity</span>
                <span className="text-xs text-emerald-400">Widely Adopted</span>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className="text-xs font-mono text-slate-300">
                  <code>{`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/";

contract MyProtocol is Pausable, AccessControl {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}`}</code>
                </pre>
              </div>
            </motion.div>

            {/* Requirements List */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2 space-y-4"
            >
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Requirements
                </h3>
                <ul className="space-y-2 text-xs text-neutral-300">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>Inherit from <code className="bg-white/10 px-1 rounded text-neutral-200">Pausable</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>Define <code className="bg-white/10 px-1 rounded text-neutral-200">PAUSER_ROLE</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>Add <code className="bg-white/10 px-1 rounded text-neutral-200">pause()</code> / <code className="bg-white/10 px-1 rounded text-neutral-200">unpause()</code></span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-3">
                <h3 className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-2">
                  Adopted By
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 text-[10px] bg-white/5 text-neutral-300 rounded">Uniswap V2</span>
                  <span className="px-2 py-1 text-[10px] bg-white/5 text-neutral-300 rounded">BlackRock BUIDL</span>
                  <span className="px-2 py-1 text-[10px] bg-white/5 text-neutral-300 rounded">Circle USDC</span>
                  <span className="px-2 py-1 text-[10px] bg-white/5 text-neutral-300 rounded">Aave</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-300/10 border border-neutral-300/20">
                <p className="text-xs text-neutral-200">
                  <strong>Note:</strong> You only grant Sentinel the PAUSER_ROLE. 
                  Sentinel can only pause. Only YOU can unpause or withdraw funds.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Section 3: System Architecture */}
      <Section id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <ArchitectureStatic />
          </motion.div>
        </div>
      </Section>

    </div>
  )
}
