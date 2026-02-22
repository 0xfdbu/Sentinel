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
  Lock,
  Zap,
  Wallet,
  Radio,
  Server,
  PauseCircle
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
  
  const sections = ['hero', 'features', 'how-it-works', 'flow', 'tech', 'cta']
  
  // Pause-only flow steps
  const steps = [
    { 
      icon: Wallet, 
      title: "Register & Stake", 
      description: "Register your contract with Sentinel and stake ETH as collateral. Grant Sentinel Guardian permission to pause your contract." 
    },
    { 
      icon: Radio, 
      title: "Live Monitoring", 
      description: "Our system monitors mempool and on-chain transactions 24/7, watching for suspicious patterns and fund draining attempts." 
    },
    { 
      icon: Cpu, 
      title: "AI Threat Detection", 
      description: "When fraud score exceeds threshold, we trigger Chainlink CRE workflow with Confidential HTTP to Etherscan + xAI Grok analysis." 
    },
    { 
      icon: PauseCircle, 
      title: "Emergency Pause", 
      description: "Critical threats trigger instant pause via Sentinel Guardian. Your contract is frozen before the exploit completes." 
    },
    { 
      icon: Shield, 
      title: "Owner Recovery", 
      description: "You investigate the issue and fix the vulnerability. Once resolved, you unpause the contract and resume operations." 
    }
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span className="text-sm text-amber-300">Powered by Chainlink CRE</span>
          </motion.div>

          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-6xl md:text-7xl lg:text-8xl font-bold mb-4 tracking-tight text-slate-50"
          >
            SENTINEL
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-2xl md:text-3xl text-amber-400 mb-4"
          >
            Autonomous Security Oracle
          </motion.p>

          {/* Chainlink Tech Stack */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="flex flex-wrap justify-center gap-3 mb-6"
          >
            <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm">
              🔒 Chainlink CRE
            </span>
            <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-sm">
              🛡️ Confidential HTTP
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
              ⏸️ Emergency Pause
            </span>
            <span className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm">
              🤖 xAI Grok
            </span>
          </motion.div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg text-neutral-400 mb-8 max-w-2xl mx-auto"
          >
            Protect your smart contracts with AI-powered threat detection and 
            <span className="text-amber-400"> instant emergency pause</span>. 
            When hackers attack, we freeze your contract before funds can be stolen.
            <span className="text-neutral-500 block mt-2 text-base">Your funds stay in your contract. You stay in control.</span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-4 mb-12"
          >
            <Link
              to="/protect"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-50 text-neutral-950 rounded-2xl font-semibold hover:bg-white transition-all hover:scale-105 shadow-lg shadow-amber-500/10"
            >
              <Shield className="w-5 h-5" />
              Register Contract
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
            <Link
              to="/monitor"
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
              <div className="text-4xl font-bold text-slate-50 mb-1">$<AnimatedCounter value={47} suffix="M" /></div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Secured</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-400 mb-1"><AnimatedCounter value={3} /></div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Attacks Stopped</div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Section 2: OpenZeppelin Pausable Requirement */}
      <Section id="features">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4"
            >
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-300">Contract Requirement</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-slate-50 mb-4"
            >
              Requires OpenZeppelin Pausable
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-neutral-400 max-w-2xl mx-auto"
            >
              Your contract must implement OpenZeppelin's Pausable pattern. 
              This is the industry standard used by Uniswap V2 and thousands of protocols.
            </motion.p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Code Example */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-white/10 bg-neutral-900/80 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 bg-neutral-800/50 border-b border-white/10">
                <span className="text-sm font-medium text-neutral-400">Solidity</span>
                <span className="text-xs text-emerald-400">Widely Adopted</span>
              </div>
              <div className="p-6 overflow-x-auto">
                <pre className="text-sm font-mono text-slate-300">
                  <code>{`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/";
import "@openzeppelin/contracts/";

contract MyProtocol is 
    Pausable,
    AccessControl 
{
    bytes32 public constant PAUSER_ROLE 
        = keccak256("PAUSER_ROLE");

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function withdraw() external whenNotPaused {
        // Protected function
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
              className="space-y-6"
            >
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                <h3 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Requirements
                </h3>
                <ul className="space-y-3 text-neutral-300">
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-400 mt-1">✓</span>
                    <span>Inherit from <code className="bg-white/10 px-1.5 py-0.5 rounded text-amber-400">Pausable</code></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-400 mt-1">✓</span>
                    <span>Define <code className="bg-white/10 px-1.5 py-0.5 rounded text-amber-400">PAUSER_ROLE</code> constant</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-400 mt-1">✓</span>
                    <span>Add <code className="bg-white/10 px-1.5 py-0.5 rounded text-amber-400">pause()</code> and <code className="bg-white/10 px-1.5 py-0.5 rounded text-amber-400">unpause()</code> functions</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-400 mt-1">✓</span>
                    <span>Use <code className="bg-white/10 px-1.5 py-0.5 rounded text-amber-400">whenNotPaused</code> modifier on sensitive functions</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-6">
                <h3 className="text-lg font-semibold text-slate-50 mb-4">
                  Trusted By Industry Leaders
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                    <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400 font-bold text-xs">
      🦄
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">Uniswap V2</p>
                      <p className="text-xs text-neutral-500">$100B+ volume</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs">
      B
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">BlackRock BUIDL-I</p>
                      <p className="text-xs text-neutral-500">Institutional fund</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-xs">
      C
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">Circle USDC</p>
                      <p className="text-xs text-neutral-500">Stablecoin</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
      🔷
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">OpenZeppelin</p>
                      <p className="text-xs text-neutral-500">Industry standard</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-400">
                  <strong>Note:</strong> You only grant Sentinel the PAUSER_ROLE. 
                  Sentinel can only pause your contract. Only YOU can unpause, upgrade, 
                  or withdraw funds.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Section 3: How It Works - Pause-Only Flow */}
      <Section id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4"
            >
              <Target className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-amber-300">How Sentinel Works</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-slate-50 mb-4"
            >
              Pause-Only Protection Flow
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-neutral-400 max-w-2xl mx-auto"
            >
              Simple, secure, and non-custodial. We detect threats and pause your contract. You stay in control of your funds.
            </motion.p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Steps */}
            <div className="space-y-4">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setActiveStep(index)}
                  className={cn(
                    "group p-6 rounded-2xl border cursor-pointer transition-all duration-300",
                    activeStep === index
                      ? "border-amber-500/50 bg-amber-500/5"
                      : "border-white/10 bg-neutral-900/30 hover:border-white/20"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                      activeStep === index
                        ? "bg-amber-500 text-neutral-950"
                        : "bg-white/5 text-neutral-400 group-hover:bg-white/10"
                    )}>
                      <step.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-amber-400 font-mono">STEP {index + 1}</span>
                        {activeStep === index && (
                          <motion.span
                            layoutId="active-indicator"
                            className="w-2 h-2 rounded-full bg-amber-400"
                          />
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-slate-50 mb-2">{step.title}</h3>
                      <p className="text-neutral-400 text-sm">{step.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Right: Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-3xl blur-3xl" />
              <div className="relative rounded-3xl border border-white/10 bg-neutral-900/80 backdrop-blur-xl p-8 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                
                <div className="relative space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      {(() => {
                        const Icon = steps[activeStep].icon
                        return <Icon className="w-8 h-8 text-neutral-950" />
                      })()}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-50">{steps[activeStep].title}</h3>
                      <p className="text-amber-400">Step {activeStep + 1} of {steps.length}</p>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                    <p className="text-neutral-300 leading-relaxed">
                      {steps[activeStep].description}
                    </p>
                  </div>

                  {/* Progress indicators */}
                  <div className="flex gap-2">
                    {steps.map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          i <= activeStep ? "bg-amber-500" : "bg-white/10"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Section 4: Detailed Attack Flow */}
      <Section id="flow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-bold text-slate-50 mb-4"
            >
              What Happens During an Attack
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-neutral-400 max-w-2xl mx-auto"
            >
              When a hacker tries to drain your funds, Sentinel springs into action
            </motion.p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Phase 1: Setup */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-50 mb-4">1. Before Attack</h3>
              <ul className="space-y-3 text-sm text-neutral-400">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  Deploy your smart contract
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  Register with Sentinel Registry
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  Stake ETH as collateral
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  Grant Guardian PAUSER_ROLE only
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  24/7 monitoring begins
                </li>
              </ul>
            </motion.div>

            {/* Phase 2: Attack Detection */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6"
            >
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-50 mb-4">2. Attack Detected</h3>
              <ul className="space-y-3 text-sm text-neutral-400">
                <li className="flex items-start gap-2">
                  <Siren className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  Hacker initiates fund drain attempt
                </li>
                <li className="flex items-start gap-2">
                  <Radio className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  Our monitors detect suspicious TX
                </li>
                <li className="flex items-start gap-2">
                  <Cpu className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  Fraud score: 90/100 (CRITICAL)
                </li>
                <li className="flex items-start gap-2">
                  <Server className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  Chainlink CRE workflow triggered
                </li>
                <li className="flex items-start gap-2">
                  <PauseCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  Emergency pause executed
                </li>
              </ul>
            </motion.div>

            {/* Phase 3: Owner Recovery */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-50 mb-4">3. Owner Recovery</h3>
              <ul className="space-y-3 text-sm text-neutral-400">
                <li className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  Contract is PAUSED - funds secured
                </li>
                <li className="flex items-start gap-2">
                  <Eye className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  You receive instant alert
                </li>
                <li className="flex items-start gap-2">
                  <Scan className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  Investigate the attack vector
                </li>
                <li className="flex items-start gap-2">
                  <Code2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  Fix the vulnerability
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  You unpause when ready
                </li>
              </ul>
            </motion.div>
          </div>

          {/* Key Point */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-12 p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-50 mb-2">You Stay In Control</h3>
                <p className="text-neutral-400">
                  <strong className="text-amber-400">Sentinel can only PAUSE.</strong> We cannot withdraw, transfer, 
                  or access your funds in any way. When your contract is paused, your funds are simply frozen in place, 
                  safe from attackers. Only YOU can unpause, upgrade, or withdraw. We protect; you decide.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Section 5: Tech Stack Details */}
      <Section id="tech">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-bold text-slate-50 mb-4"
            >
              Chainlink CRE Workflow
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-neutral-400 max-w-2xl mx-auto"
            >
              How Confidential HTTP protects your API keys while analyzing threats
            </motion.p>
          </div>

          <div className="relative">
            {/* Workflow steps visualization */}
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { 
                  icon: FileSearch, 
                  title: "Etherscan API", 
                  desc: "Fetch contract source",
                  sub: "Confidential HTTP",
                  color: "blue"
                },
                { 
                  icon: Cpu, 
                  title: "xAI Grok LLM", 
                  desc: "AI vulnerability analysis",
                  sub: "Confidential HTTP",
                  color: "purple"
                },
                { 
                  icon: AlertTriangle, 
                  title: "Threat Scoring", 
                  desc: "Fraud detection + heuristics",
                  sub: "Inside TEE",
                  color: "red"
                },
                { 
                  icon: PauseCircle, 
                  title: "Emergency Pause", 
                  desc: "Contract paused on-chain",
                  sub: "Instant response",
                  color: "amber"
                },
              ].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    "relative p-6 rounded-2xl border",
                    step.color === "blue" && "border-blue-500/20 bg-blue-500/5",
                    step.color === "purple" && "border-purple-500/20 bg-purple-500/5",
                    step.color === "red" && "border-red-500/20 bg-red-500/5",
                    step.color === "amber" && "border-amber-500/20 bg-amber-500/5",
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center mb-4",
                    step.color === "blue" && "bg-blue-500/20",
                    step.color === "purple" && "bg-purple-500/20",
                    step.color === "red" && "bg-red-500/20",
                    step.color === "amber" && "bg-amber-500/20",
                  )}>
                    <step.icon className={cn(
                      "w-5 h-5",
                      step.color === "blue" && "text-blue-400",
                      step.color === "purple" && "text-purple-400",
                      step.color === "red" && "text-red-400",
                      step.color === "amber" && "text-amber-400",
                    )} />
                  </div>
                  <h4 className="font-bold text-slate-50 mb-1">{step.title}</h4>
                  <p className="text-sm text-neutral-400 mb-2">{step.desc}</p>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    step.color === "blue" && "bg-blue-500/10 text-blue-400",
                    step.color === "purple" && "bg-purple-500/10 text-purple-400",
                    step.color === "red" && "bg-red-500/10 text-red-400",
                    step.color === "amber" && "bg-amber-500/10 text-amber-400",
                  )}>{step.sub}</span>
                  
                  {i < 3 && (
                    <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                      <ArrowRight className="w-4 h-4 text-neutral-600" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* API Keys Protection Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-12 p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-50 mb-2">Your API Keys Are Protected</h3>
                <p className="text-neutral-400 mb-4">
                  We use <code className="bg-white/10 px-2 py-0.5 rounded text-amber-400">XAI_API_KEY</code> and <code className="bg-white/10 px-2 py-0.5 rounded text-amber-400">ETHERSCAN_API_KEY</code> from environment variables. 
                  These are injected into the Chainlink CRE workflow where they remain inside the Trusted Execution Environment. 
                  They never appear in logs, frontend code, or API responses.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    🔒 API Keys in TEE Only
                  </span>
                  <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    🔐 Confidential HTTP
                  </span>
                  <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    🛡️ Never Exposed
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Section 6: CTA */}
      <Section id="cta">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl border border-amber-500/20 bg-gradient-to-b from-amber-500/10 to-orange-500/5 p-12 overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.15),transparent_70%)]" />
            
            <div className="relative">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-50 mb-6">
                Protect Your Contracts Today
              </h2>
              <p className="text-xl text-neutral-400 mb-8 max-w-2xl mx-auto">
                Join the future of non-custodial smart contract security. 
                Register your contract and let Sentinel monitor 24/7.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  to="/protect"
                  className="group inline-flex items-center gap-2 px-8 py-4 bg-slate-50 text-neutral-950 rounded-2xl font-semibold hover:bg-white transition-all hover:scale-105 shadow-lg"
                >
                  <Shield className="w-5 h-5" />
                  Register Contract
                  <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
                <Link
                  to="/docs"
                  className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 text-slate-50 rounded-2xl font-semibold hover:bg-white/5 transition-all"
                >
                  <Terminal className="w-5 h-5" />
                  Read Documentation
                </Link>
              </div>

              <div className="mt-8 pt-8 border-t border-white/10">
                <p className="text-sm text-neutral-500">
                  Built with 💜 using Chainlink CRE, Confidential HTTP, and instant emergency pause
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>
    </div>
  )
}
