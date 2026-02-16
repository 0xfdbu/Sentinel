import { motion } from 'framer-motion'
import { 
  Shield, 
  Scan, 
  Lock, 
  Activity, 
  CheckCircle, 
  ArrowRight,
  Cpu,
  Eye,
  Zap
} from 'lucide-react'
import { Link } from 'react-router-dom'

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export default function Landing() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-sentinel-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sentinel-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div 
              className="inline-flex items-center gap-2 rounded-full border border-sentinel-500/30 bg-sentinel-500/10 px-4 py-1.5 text-sm font-medium text-sentinel-300"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sentinel-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sentinel-500" />
              </span>
              Chainlink Convergence Hackathon 2026
            </motion.div>

            <h1 className="mt-8 text-5xl md:text-7xl font-bold tracking-tight">
              <span className="text-gradient">Autonomous Security</span>
              <br />
              <span className="text-white">for Smart Contracts</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Sentinel uses AI and Chainlink CRE to continuously scan smart contracts 
              for vulnerabilities and execute private emergency responses before 
              attackers can exploit them.
            </p>

            <motion.div 
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-sentinel-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-sentinel-500/25 hover:bg-sentinel-500 transition-all hover:scale-105"
              >
                <Scan className="h-5 w-5" />
                Start Scanning
              </Link>
              <Link
                to="/docs"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/50 px-8 py-4 text-base font-semibold hover:bg-muted transition-all"
              >
                <Activity className="h-5 w-5" />
                View Documentation
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div 
              className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {[
                { label: 'Contracts Protected', value: '1,247' },
                { label: 'Attacks Prevented', value: '23' },
                { label: 'Value Protected', value: '$47M' },
                { label: 'Avg Response Time', value: '< 3s' },
              ].map((stat) => (
                <motion.div 
                  key={stat.label} 
                  className="flex flex-col"
                  variants={fadeIn}
                >
                  <dt className="text-sm font-medium text-muted-foreground">{stat.label}</dt>
                  <dd className="text-3xl font-bold text-sentinel-400">{stat.value}</dd>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white">How Sentinel Works</h2>
            <p className="mt-4 text-muted-foreground">
              Three layers of protection powered by Chainlink CRE
            </p>
          </div>

          <motion.div 
            className="grid md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              {
                icon: Scan,
                title: 'AI-Powered Scanning',
                description: 'Gemini 1.5 Pro analyzes contract source code for vulnerabilities including reentrancy, overflow, and access control issues.',
                color: 'text-blue-400',
                bg: 'bg-blue-500/10',
              },
              {
                icon: Eye,
                title: 'Confidential HTTP',
                description: 'API keys for Etherscan and Gemini are never exposed in logs or frontend. All external calls are encrypted end-to-end.',
                color: 'text-purple-400',
                bg: 'bg-purple-500/10',
              },
              {
                icon: Lock,
                title: 'Private Response',
                description: 'Emergency pauses are executed via Confidential Compute, hiding transaction details from mempool until execution.',
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                className="relative group"
                variants={fadeIn}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-sentinel-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative glass rounded-2xl p-8 h-full">
                  <div className={`inline-flex p-3 rounded-xl ${feature.bg} ${feature.color} mb-6`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sentinel-500/20 text-xs font-medium text-sentinel-400">
                      {index + 1}
                    </span>
                    <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Workflow Visualization */}
      <section className="py-24 border-t border-border/50 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white">CRE Workflow</h2>
            <p className="mt-4 text-muted-foreground">
              End-to-end flow from detection to response
            </p>
          </div>

          <div className="relative">
            {/* Connection Lines */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-sentinel-500/0 via-sentinel-500/50 to-sentinel-500/0 -translate-y-1/2" />

            <motion.div 
              className="grid md:grid-cols-5 gap-4"
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {[
                { icon: Activity, label: 'HTTP Trigger', desc: 'User initiates scan' },
                { icon: Cpu, label: 'Fetch Source', desc: 'Confidential HTTP to Etherscan' },
                { icon: Scan, label: 'AI Analysis', desc: 'Gemini detects vulnerabilities' },
                { icon: Shield, label: 'Risk Assessment', desc: 'Severity classification' },
                { icon: Zap, label: 'Emergency Pause', desc: 'Private on-chain response' },
              ].map((step, index) => (
                <motion.div
                  key={step.label}
                  className="relative"
                  variants={fadeIn}
                >
                  <div className="glass rounded-xl p-6 text-center relative z-10 hover:bg-white/10 transition-colors">
                    <div className="mx-auto w-12 h-12 rounded-full bg-sentinel-500/20 flex items-center justify-center mb-4">
                      <step.icon className="h-6 w-6 text-sentinel-400" />
                    </div>
                    <h4 className="font-semibold text-white text-sm">{step.label}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
                  </div>
                  {index < 4 && (
                    <div className="hidden md:flex absolute top-1/2 -right-2 transform -translate-y-1/2 translate-x-1/2 z-20">
                      <ArrowRight className="h-4 w-4 text-sentinel-500" />
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-white mb-6">
                Why Choose Sentinel?
              </h2>
              <div className="space-y-4">
                {[
                  'First autonomous security layer with private response',
                  'No vulnerability details exposed to attackers',
                  'Sub-second response time for critical threats',
                  'Fully transparent audit trail via blockchain',
                  'No centralized authority - CRE-powered execution',
                  'Compatible with any pausable smart contract',
                ].map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-sentinel-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="glass rounded-2xl p-8"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-2 text-sm text-muted-foreground font-mono">
                  sentinel-workflow.ts
                </span>
              </div>
              <pre className="text-sm overflow-x-auto">
                <code className="text-muted-foreground">
                  {`// CRE Workflow: Autonomous Security Scan
sentinelWorkflow
  .step('fetch_source', {
    confidentialHttp: {
      url: 'https://api.etherscan.io/api',
      apikey: '{{secrets.etherscanKey}}' // Hidden!
    }
  })
  .step('ai_analysis', {
    llm: {
      provider: 'gemini-1.5-pro',
      prompt: 'Analyze for vulnerabilities...'
    }
  })
  .step('confidential_pause', {
    condition: 'severity === "CRITICAL"',
    privacy: 'full' // Hidden from mempool!
  });`}
                </code>
              </pre>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="glass rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-sentinel-500/10 via-transparent to-sentinel-500/10" />
            <div className="relative">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Protect Your Contracts?
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                Join the growing number of protocols using Sentinel for autonomous 
                security monitoring. Registration takes less than 5 minutes.
              </p>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-sentinel-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-sentinel-500/25 hover:bg-sentinel-500 transition-all hover:scale-105"
              >
                <Shield className="h-5 w-5" />
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
