/**
 * Sentinel Process Animation - Minimal version for hackathon judges
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  Eye, 
  AlertTriangle, 
  Lock,
  FileCode
} from 'lucide-react'

interface Step {
  id: number
  title: string
  desc: string
  icon: React.ElementType
  color: string
}

const steps: Step[] = [
  { id: 1, title: 'Register', desc: 'Contract stakes ETH', icon: FileCode, color: 'amber' },
  { id: 2, title: 'Monitor', desc: 'Every tx analyzed', icon: Eye, color: 'blue' },
  { id: 3, title: 'Detect', desc: 'AI finds threat', icon: AlertTriangle, color: 'orange' },
  { id: 4, title: 'Pause', desc: 'TEE private tx', icon: Lock, color: 'emerald' },
  { id: 5, title: 'Protected', desc: 'Attack blocked', icon: Shield, color: 'green' },
]

export function SentinelProcessAnimation() {
  const [activeStep, setActiveStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  const nextStep = useCallback(() => {
    setActiveStep((prev) => (prev + 1) % steps.length)
  }, [])

  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(nextStep, 2500)
    return () => clearInterval(interval)
  }, [isPlaying, nextStep])

  const currentStep = steps[activeStep]

  return (
    <div className="rounded-xl border border-white/10 bg-neutral-900/50 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-50">Process Flow</h3>
          <p className="text-xs text-neutral-500">Real-time autonomous security</p>
        </div>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="text-xs px-3 py-1.5 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>

      {/* Animation */}
      <div className="p-6 bg-gradient-to-b from-neutral-900 to-neutral-950">
        {/* Step Nodes */}
        <div className="flex items-center justify-between mb-6 relative">
          {/* Connection line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-neutral-800 -translate-y-1/2" />
          <motion.div 
            className="absolute top-1/2 left-0 h-0.5 bg-amber-500 -translate-y-1/2"
            animate={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.5 }}
          />

          {steps.map((step, index) => {
            const isActive = index === activeStep
            const isComplete = index < activeStep
            const Icon = step.icon

            return (
              <motion.div
                key={step.id}
                className="relative z-10 flex flex-col items-center"
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-colors ${
                  isActive ? 'bg-amber-500/20 border-amber-500 shadow-lg shadow-amber-500/20' :
                  isComplete ? 'bg-emerald-500/20 border-emerald-500' :
                  'bg-neutral-800 border-neutral-700'
                }`}>
                  <Icon className={`w-5 h-5 ${
                    isActive ? 'text-amber-400' :
                    isComplete ? 'text-emerald-400' :
                    'text-neutral-500'
                  }`} />
                </div>
                <span className={`text-xs mt-2 font-medium ${isActive ? 'text-slate-50' : 'text-neutral-500'}`}>
                  {step.title}
                </span>
              </motion.div>
            )
          })}
        </div>

        {/* Current Step Detail */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-neutral-900/80 rounded-xl border border-white/10 p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg bg-${currentStep.color}-500/10 flex items-center justify-center`}>
                <currentStep.icon className={`w-4 h-4 text-${currentStep.color}-400`} />
              </div>
              <div>
                <div className="font-medium text-slate-50">{currentStep.title}</div>
                <div className="text-sm text-neutral-400">{currentStep.desc}</div>
              </div>
              {activeStep === 4 && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded border border-emerald-500/20"
                >
                  BLOCKED
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Detection', value: '<500ms' },
            { label: 'Pause', value: '~2s' },
            { label: 'Privacy', value: 'TEE' },
            { label: 'Uptime', value: '99.9%' },
          ].map((s) => (
            <div key={s.label} className="text-center p-2 rounded-lg bg-neutral-800/50">
              <div className="text-sm font-bold text-amber-400">{s.value}</div>
              <div className="text-xs text-neutral-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress */}
      <div className="h-1 bg-neutral-800">
        <motion.div
          className="h-full bg-amber-500"
          animate={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  )
}

export default SentinelProcessAnimation
