import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Radio,
  Cpu,
  Lock,
  AlertTriangle,
  Eye,
  EyeOff,
  Download,
  BarChart3
} from 'lucide-react'
import { useSentinelMonitor, SentinelEvent } from '../hooks/useSentinelMonitor'
import { getAddresses } from '../utils/wagmi'
import { useNetwork, useAccount } from 'wagmi'
import { toast } from 'react-hot-toast'

// Canvas-based visualizer component
interface Node {
  id: string
  type: 'contract' | 'attacker' | 'sentinel'
  label: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  threatLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  lastActivity: number
  pulsePhase: number
  targetX?: number
  targetY?: number
  // Node metadata
  ip?: string
  uptime?: string
  version?: string
  latency?: number
  stake?: string
  reputation?: number
  contractsSecured?: number
  lastSeen?: string
  chainId?: number
  paused?: boolean
  deposit?: string
  riskLevel?: string
}

interface Edge {
  id: string
  source: string
  target: string
  type: 'attack' | 'defense' | 'scan' | 'pause' | 'monitor'
  strength: number
  animated: boolean
  timestamp: number
}

const COLORS = {
  contract: {
    safe: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    paused: '#6366f1'
  },
  attacker: '#dc2626',
  sentinel: '#06b6d4',
  edges: {
    attack: '#ef4444',
    defense: '#10b981',
    scan: '#3b82f6',
    pause: '#f59e0b',
    monitor: '#64748b'
  }
}

export default function Visualizer() {
  const { chain } = useNetwork()
  const { isConnected } = useAccount()
  const addresses = getAddresses(chain?.id)
  
  const { events, monitoredContracts, isMonitoring, startMonitoring, stopMonitoring } = 
    useSentinelMonitor(addresses.registry, addresses.guardian)
  const { isConnected: isNodeConnected, serverEvents } = useSentinelNode()
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const nodesRef = useRef<Map<string, Node>>(new Map())
  const edgesRef = useRef<Map<string, Edge>>(new Map())
  const mouseRef = useRef({ x: 0, y: 0 })
  
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'threats' | 'defense'>('all')
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showLabels, setShowLabels] = useState(true)
  const [simulationSpeed] = useState(1)

  // Combine events
  const allEvents = [...events, ...serverEvents.filter(e => e.threat).map(e => e.threat!)]

  // Get canvas dimensions
  const getCanvasDimensions = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      return { 
        width: rect.width - (isFullscreen ? 0 : 0), 
        height: rect.height - (isFullscreen ? 0 : 64)
      }
    }
    return { width: window.innerWidth, height: window.innerHeight - 100 }
  }, [isFullscreen])

  // Initialize nodes
  useEffect(() => {
    const { width: w, height: h } = getCanvasDimensions()
    const centerX = w / 2
    const centerY = h * 0.65
    const radius = Math.min(w, h) * 0.35

    // Contract nodes in semi-circle
    monitoredContracts.forEach((contract, index) => {
      const id = contract.address.toLowerCase()
      const existing = nodesRef.current.get(id)
      const total = Math.max(monitoredContracts.length, 1)
      const angle = Math.PI + (index / (total - 1 || 1)) * Math.PI
      const targetX = centerX + Math.cos(angle) * radius
      const targetY = centerY + Math.sin(angle) * radius * 0.5

      if (!existing) {
        nodesRef.current.set(id, {
          id,
          type: 'contract',
          label: `${contract.address.slice(0, 6)}...${contract.address.slice(-4)}`,
          x: targetX,
          y: targetY,
          targetX,
          targetY,
          vx: 0, vy: 0,
          radius: 20,
          color: contract.isPaused ? COLORS.contract.paused : COLORS.contract.safe,
          lastActivity: Date.now(),
          pulsePhase: Math.random() * Math.PI * 2,
          paused: contract.isPaused,
          deposit: '0.01 ETH',
          riskLevel: 'LOW',
          chainId: chain?.id || 11155111
        })
      } else {
        existing.targetX = targetX
        existing.targetY = targetY
        if (contract.isPaused) {
          existing.color = COLORS.contract.paused
          existing.paused = true
        }
      }
    })

    // Cleanup removed contracts
    nodesRef.current.forEach((node, id) => {
      if (node.type === 'contract') {
        const stillMonitored = monitoredContracts.some(
          c => c.address.toLowerCase() === id
        )
        if (!stillMonitored) {
          nodesRef.current.delete(id)
          edgesRef.current.forEach((edge, edgeId) => {
            if (edge.source === id || edge.target === id) {
              edgesRef.current.delete(edgeId)
            }
          })
        }
      }
    })
  }, [monitoredContracts, getCanvasDimensions])

  // Initialize Sentinel and CRE nodes
  useEffect(() => {
    const { width: w, height: h } = getCanvasDimensions()
    
    // Sentinel Node (left) - with detailed metadata
    const sentinel = nodesRef.current.get('sentinel-node')
    if (!sentinel) {
      nodesRef.current.set('sentinel-node', {
        id: 'sentinel-node',
        type: 'sentinel',
        label: 'Sentinel Node #1',
        x: w * 0.12,
        y: h * 0.35,
        targetX: w * 0.12,
        targetY: h * 0.35,
        vx: 0, vy: 0,
        radius: 32,
        color: COLORS.sentinel,
        lastActivity: Date.now(),
        pulsePhase: 0,
        // Node details
        ip: '127.0.0.1',
        uptime: '2d 14h 32m',
        version: 'v1.2.0',
        latency: 12,
        stake: '0.5 ETH',
        reputation: 98.5,
        contractsSecured: monitoredContracts.length,
        lastSeen: 'Active now'
      })
    } else {
      sentinel.targetX = w * 0.12
      sentinel.targetY = h * 0.35
      sentinel.contractsSecured = monitoredContracts.length
    }
  }, [getCanvasDimensions, monitoredContracts])

  // Add monitoring edges
  useEffect(() => {
    monitoredContracts.forEach(contract => {
      const edgeId = `monitor-sentinel-node-${contract.address.toLowerCase()}`
      if (!edgesRef.current.has(edgeId)) {
        edgesRef.current.set(edgeId, {
          id: edgeId,
          source: 'sentinel-node',
          target: contract.address.toLowerCase(),
          type: 'monitor',
          strength: 0.8,
          animated: true,
          timestamp: Date.now()
        })
      }
    })
  }, [monitoredContracts])

  // Process events
  useEffect(() => {
    allEvents.forEach(event => {
      const nodeId = event.contractAddress.toLowerCase()
      const node = nodesRef.current.get(nodeId)
      
      if (node) {
        if (event.level === 'CRITICAL') {
          node.color = COLORS.contract.danger
          node.threatLevel = 'CRITICAL'
          node.radius = 24
        } else if (event.level === 'HIGH') {
          node.color = COLORS.contract.warning
          node.threatLevel = 'HIGH'
          node.radius = 20
        }
        node.lastActivity = Date.now()

        // Attack from random position above
        if (event.level === 'CRITICAL' || event.level === 'HIGH') {
          const { width: w } = getCanvasDimensions()
          const attackerId = `attacker-${Date.now()}-${Math.random()}`
          
          nodesRef.current.set(attackerId, {
            id: attackerId,
            type: 'attacker',
            label: 'Attacker',
            x: w * 0.3 + Math.random() * w * 0.4,
            y: 50,
            vx: 0, vy: 0,
            radius: 14,
            color: COLORS.attacker,
            lastActivity: Date.now(),
            pulsePhase: 0
          })

          edgesRef.current.set(`attack-${attackerId}-${nodeId}`, {
            id: `attack-${attackerId}-${nodeId}`,
            source: attackerId,
            target: nodeId,
            type: 'attack',
            strength: event.confidence,
            animated: true,
            timestamp: Date.now()
          })

          edgesRef.current.set(`defense-${nodeId}-${Date.now()}`, {
            id: `defense-${nodeId}-${Date.now()}`,
            source: 'sentinel-node',
            target: nodeId,
            type: 'defense',
            strength: 1,
            animated: true,
            timestamp: Date.now()
          })
        }

        if (event.action === 'PAUSED') {
          edgesRef.current.set(`pause-${nodeId}-${Date.now()}`, {
            id: `pause-${nodeId}-${Date.now()}`,
            source: 'sentinel-node',
            target: nodeId,
            type: 'pause',
            strength: 1,
            animated: true,
            timestamp: Date.now()
          })
        }
      }
    })

    // Cleanup
    const now = Date.now()
    nodesRef.current.forEach((node, id) => {
      if (node.type === 'attacker' && now - node.lastActivity > 30000) {
        nodesRef.current.delete(id)
        edgesRef.current.forEach((edge, edgeId) => {
          if (edge.source === id || edge.target === id) {
            edgesRef.current.delete(edgeId)
          }
        })
      }
    })

    edgesRef.current.forEach((edge, id) => {
      if (!id.startsWith('monitor-') && Date.now() - edge.timestamp > 60000) {
        edgesRef.current.delete(id)
      }
    })
  }, [allEvents, getCanvasDimensions])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = () => {
      const { width: w, height: h } = getCanvasDimensions()
      canvas.width = w
      canvas.height = h

      ctx.fillStyle = '#050508'
      ctx.fillRect(0, 0, w, h)

      const now = Date.now()
      const nodes = Array.from(nodesRef.current.values())
      const edges = Array.from(edgesRef.current.values())

      // Smooth transitions
      nodes.forEach(node => {
        if (node.targetX !== undefined && node.targetY !== undefined) {
          node.x += (node.targetX - node.x) * 0.1 * simulationSpeed
          node.y += (node.targetY - node.y) * 0.1 * simulationSpeed
        }
      })

      // Grid
      ctx.strokeStyle = '#1a1a2e'
      ctx.lineWidth = 1
      const gridSize = 50
      for (let x = 0; x <= w; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y <= h; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      // Edges
      edges.forEach(edge => {
        if (filter === 'threats' && edge.type !== 'attack') return
        if (filter === 'defense' && edge.type !== 'defense' && edge.type !== 'pause') return

        const source = nodesRef.current.get(edge.source)
        const target = nodesRef.current.get(edge.target)
        if (!source || !target) return

        const age = (now - edge.timestamp) / 1000
        const isPersistent = edge.id.startsWith('monitor-')
        const alpha = isPersistent ? 0.4 : Math.max(0.2, 1 - age / 30)
        
        const dx = target.x - source.x
        const dy = target.y - source.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist === 0) return

        const startX = source.x + (dx / dist) * source.radius
        const startY = source.y + (dy / dist) * source.radius
        const endX = target.x - (dx / dist) * target.radius
        const endY = target.y - (dy / dist) * target.radius

        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        ctx.strokeStyle = COLORS.edges[edge.type] + Math.floor(alpha * 255).toString(16).padStart(2, '0')
        ctx.lineWidth = edge.strength * (isPersistent ? 1.5 : 2.5)
        ctx.stroke()

        // Arrow
        const arrowLen = 8
        const angle = Math.PI / 6
        const lineAngle = Math.atan2(dy, dx)
        
        ctx.beginPath()
        ctx.moveTo(endX, endY)
        ctx.lineTo(
          endX - arrowLen * Math.cos(lineAngle - angle),
          endY - arrowLen * Math.sin(lineAngle - angle)
        )
        ctx.moveTo(endX, endY)
        ctx.lineTo(
          endX - arrowLen * Math.cos(lineAngle + angle),
          endY - arrowLen * Math.sin(lineAngle + angle)
        )
        ctx.stroke()

        // Particles
        if (edge.animated) {
          const speed = isPersistent ? 0.5 : 2
          const offset = (now / 1000 * speed * simulationSpeed) % 1
          const px = startX + (endX - startX) * offset
          const py = startY + (endY - startY) * offset
          
          ctx.beginPath()
          ctx.arc(px, py, isPersistent ? 2 : 3, 0, Math.PI * 2)
          ctx.fillStyle = COLORS.edges[edge.type]
          ctx.fill()
        }
      })

      // Nodes
      nodes.forEach(node => {
        // Glow for threats
        if (node.threatLevel === 'CRITICAL') {
          const pulse = Math.sin(now / 200 + node.pulsePhase) * 0.5 + 0.5
          const gradient = ctx.createRadialGradient(
            node.x, node.y, node.radius,
            node.x, node.y, node.radius + 20 + pulse * 10
          )
          gradient.addColorStop(0, node.color + '60')
          gradient.addColorStop(1, node.color + '00')
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(node.x, node.y, node.radius + 25, 0, Math.PI * 2)
          ctx.fill()
        }

        // Node body
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        ctx.fillStyle = node.color + '20'
        ctx.fill()
        ctx.strokeStyle = node.color
        ctx.lineWidth = 2
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius - 5, 0, Math.PI * 2)
        ctx.fillStyle = node.color + '40'
        ctx.fill()

        // Labels
        if (showLabels) {
          ctx.font = '11px monospace'
          ctx.textAlign = 'center'
          ctx.fillStyle = '#e2e8f0'
          ctx.fillText(node.label, node.x, node.y + node.radius + 16)
          
          ctx.font = '9px sans-serif'
          ctx.fillStyle = node.color
          const typeText = node.type === 'sentinel' ? 'GUARDIAN' : 
                          node.type === 'contract' ? (node.paused ? 'PAUSED' : 'PROTECTED') :
                          node.type.toUpperCase()
          ctx.fillText(typeText, node.x, node.y + node.radius + 30)
        }
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [filter, showLabels, simulationSpeed, getCanvasDimensions])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const { width: w, height: h } = getCanvasDimensions()
      const sentinel = nodesRef.current.get('sentinel-node')
      if (sentinel) {
        sentinel.targetX = w * 0.12
        sentinel.targetY = h * 0.35
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [getCanvasDimensions])

  // Mouse interactions
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }

    let found = false
    nodesRef.current.forEach(node => {
      const dx = mouseRef.current.x - node.x
      const dy = mouseRef.current.y - node.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < node.radius && !found) {
        setHoveredNode(node.id)
        found = true
      }
    })
    if (!found) setHoveredNode(null)
  }, [])

  const handleClick = useCallback(() => {
    if (hoveredNode) {
      setSelectedNode(nodesRef.current.get(hoveredNode) || null)
    }
  }, [hoveredNode])

  const handleExport = () => {
    const data = {
      timestamp: Date.now(),
      nodes: Array.from(nodesRef.current.values()),
      edges: Array.from(edgesRef.current.values()),
      events: allEvents
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sentinel-visualization-${Date.now()}.json`
    a.click()
    toast.success('Visualization exported')
  }

  const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions()

  return (
    <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] bg-neutral-950 flex flex-col overflow-hidden">
      {/* Header - Simplified, no back button (bottom nav has it) */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-neutral-900/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neutral-300/10 rounded-lg">
            <BarChart3 className="w-5 h-5 text-neutral-200" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-200">Threat Visualizer</h1>
            <p className="text-xs text-neutral-500">
              {isNodeConnected ? (
                <span className="text-emerald-400">● Live</span>
              ) : (
                <span className="text-red-400">● Offline</span>
              )}
              {' '}• {monitoredContracts.length} protected
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Monitor Toggle */}
          {isConnected && (
            <button
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isMonitoring 
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
              }`}
            >
              {isMonitoring ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isMonitoring ? 'Stop Monitor' : 'Start Monitor'}
            </button>
          )}

          {/* Filter */}
          <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
            {(['all', 'threats', 'defense'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  filter === f ? 'bg-neutral-300/20 text-neutral-200' : 'text-neutral-400 hover:text-neutral-300'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Toggle Labels */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            className="p-2 bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors"
            title="Toggle Labels"
          >
            {showLabels ? <Eye className="w-4 h-4 text-neutral-400" /> : <EyeOff className="w-4 h-4 text-neutral-400" />}
          </button>

          {/* Export */}
          <button
            onClick={handleExport}
            className="p-2 bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors"
            title="Export Data"
          >
            <Download className="w-4 h-4 text-neutral-400" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-neutral-400" /> : <Maximize2 className="w-4 h-4 text-neutral-400" />}
          </button>
        </div>
      </header>

      {/* Main Canvas Area */}
      <div ref={containerRef} className="flex-1 relative">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          className="cursor-crosshair block w-full h-full"
        />

        {/* Legend */}
        <div className="absolute bottom-6 left-6 bg-slate-900/95 backdrop-blur rounded-xl p-4 border border-slate-800 max-w-xs">
          <div className="text-sm font-medium text-slate-200 mb-3">Network Legend</div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-cyan-500/30 border-2 border-cyan-500" />
              <span className="text-sm text-neutral-400">Sentinel Guardian Node</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-emerald-500/30 border-2 border-emerald-500" />
              <span className="text-sm text-neutral-400">Protected Contract</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-indigo-500/30 border-2 border-indigo-500" />
              <span className="text-sm text-neutral-400">Paused Contract</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-red-500/30 border-2 border-red-500" />
              <span className="text-sm text-neutral-400">Active Threat</span>
            </div>
          </div>
          
          <div className="border-t border-slate-700 my-3 pt-3">
            <div className="text-sm font-medium text-slate-200 mb-2">Flow Types</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-gray-500" />
                <span className="text-xs text-neutral-400">Continuous Monitoring</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-red-500" />
                <span className="text-xs text-neutral-400">Attack Vector</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-emerald-500" />
                <span className="text-xs text-neutral-400">Defense Response</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-neutral-300" />
                <span className="text-xs text-neutral-400">Pause Triggered</span>
              </div>
            </div>
          </div>
          
          {/* Future Roadmap Note */}
          <div className="border-t border-slate-700 mt-3 pt-3">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-200 mt-1.5 flex-shrink-0" />
              <p className="text-xs text-neutral-500 italic">
                Future: Decentralized proof-of-stake guardian network with slashing conditions, 
                node attribution scores, and weighted voting based on reputation.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Panel */}
        <div className="absolute top-6 right-6 bg-slate-900/95 backdrop-blur rounded-xl p-4 border border-slate-800">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Protected</div>
              <div className="text-2xl font-bold text-emerald-400">{monitoredContracts.length}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Threats</div>
              <div className="text-2xl font-bold text-red-400">
                {Array.from(nodesRef.current.values()).filter(n => n.threatLevel === 'CRITICAL').length}
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Events</div>
              <div className="text-2xl font-bold text-neutral-200">{allEvents.length}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Status</div>
              <div className={`text-sm font-medium ${isMonitoring ? 'text-emerald-400' : 'text-neutral-500'}`}>
                {isMonitoring ? 'ACTIVE' : 'STANDBY'}
              </div>
            </div>
          </div>
        </div>

        {/* Selected Node Info */}
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-6 right-6 w-80 bg-slate-900/95 backdrop-blur rounded-xl p-4 border border-slate-800 max-h-[70vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                {selectedNode.type === 'sentinel' && <Radio className="w-4 h-4 text-cyan-400" />}
                {selectedNode.type === 'contract' && <Lock className="w-4 h-4 text-emerald-400" />}
                {selectedNode.type === 'attacker' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                {selectedNode.type === 'sentinel' ? 'Guardian Node' : 
                 selectedNode.type === 'contract' ? 'Protected Contract' : 'Node Details'}
              </h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-neutral-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            {/* Sentinel Node Details */}
            {selectedNode.type === 'sentinel' && (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Node ID</span>
                  <span className="text-slate-300 font-mono text-xs">{selectedNode.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">IP Address</span>
                  <span className="text-slate-300 font-mono">{selectedNode.ip || '127.0.0.1'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Status</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-400">Online</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Version</span>
                  <span className="text-slate-300">{selectedNode.version || 'v1.2.0'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Uptime</span>
                  <span className="text-slate-300">{selectedNode.uptime || '2d 14h 32m'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Latency</span>
                  <span className="text-slate-300">{selectedNode.latency || 12}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Stake</span>
                  <span className="text-neutral-200 font-medium">{selectedNode.stake || '0.5 ETH'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Reputation</span>
                  <span className="text-emerald-400 font-medium">{selectedNode.reputation || 98.5}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Contracts Secured</span>
                  <span className="text-slate-300">{selectedNode.contractsSecured || monitoredContracts.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Last Seen</span>
                  <span className="text-slate-300">{selectedNode.lastSeen || 'Active now'}</span>
                </div>
                
                <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="text-xs text-neutral-500 mb-2">ATTRIBUTION SCORE</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full" style={{ width: '98.5%' }} />
                    </div>
                    <span className="text-xs text-emerald-400 font-medium">Top 5%</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Contract Node Details */}
            {selectedNode.type === 'contract' && (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Address</span>
                  <span className="text-slate-300 font-mono text-xs">{selectedNode.id.slice(0, 16)}...</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Status</span>
                  <span className={`flex items-center gap-1.5 ${selectedNode.paused ? 'text-indigo-400' : 'text-emerald-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${selectedNode.paused ? 'bg-indigo-500' : 'bg-emerald-500 animate-pulse'}`} />
                    {selectedNode.paused ? 'PAUSED' : 'ACTIVE'}
                  </span>
                </div>
                {selectedNode.riskLevel && (
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Risk Level</span>
                    <span className={`font-medium ${
                      selectedNode.riskLevel === 'CRITICAL' ? 'text-red-400' :
                      selectedNode.riskLevel === 'HIGH' ? 'text-neutral-400' :
                      selectedNode.riskLevel === 'MEDIUM' ? 'text-yellow-400' :
                      'text-emerald-400'
                    }`}>{selectedNode.riskLevel}</span>
                  </div>
                )}
                {selectedNode.threatLevel && (
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Current Threat</span>
                    <span className={`font-medium ${
                      selectedNode.threatLevel === 'CRITICAL' ? 'text-red-400' :
                      selectedNode.threatLevel === 'HIGH' ? 'text-neutral-400' :
                      'text-yellow-400'
                    }`}>{selectedNode.threatLevel}</span>
                  </div>
                )}
                {selectedNode.deposit && (
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Stake Deposit</span>
                    <span className="text-neutral-200 font-medium">{selectedNode.deposit}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Protection</span>
                  <span className="text-emerald-400">PAUSE-ONLY</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Last Activity</span>
                  <span className="text-slate-300">{new Date(selectedNode.lastActivity).toLocaleTimeString()}</span>
                </div>
                
                <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="text-xs text-neutral-500 mb-1">PAUSER ROLE</div>
                  <div className="text-xs text-slate-300 font-mono break-all">
                    0x65d7a28e3265b37a6474929f336521b332c1681b...
                  </div>
                </div>
              </div>
            )}
            
            {/* Attacker Node Details */}
            {selectedNode.type === 'attacker' && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Type</span>
                  <span className="text-red-400 font-medium">MALICIOUS ACTOR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Detected</span>
                  <span className="text-slate-300">{new Date(selectedNode.lastActivity).toLocaleTimeString()}</span>
                </div>
                {selectedNode.threatLevel && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Threat Level</span>
                    <span className="text-red-400 font-medium">{selectedNode.threatLevel}</span>
                  </div>
                )}
                <div className="mt-3 p-2 bg-red-500/10 rounded border border-red-500/30">
                  <p className="text-xs text-red-400">
                    Attack attempt detected and neutralized by Sentinel guardian node.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Hover Tooltip */}
        {hoveredNode && (
          <div
            className="absolute pointer-events-none bg-slate-900/95 border border-slate-700 rounded-lg px-3 py-2 shadow-xl z-50"
            style={{
              left: Math.min(mouseRef.current.x + 15, canvasWidth - 150),
              top: Math.max(mouseRef.current.y - 40, 10),
            }}
          >
            <div className="text-xs text-neutral-400 font-mono">
              {hoveredNode.slice(0, 25)}...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Sentinel Node WebSocket hook (duplicate for this page)
interface ServerEvent {
  type: 'INIT' | 'THREAT_DETECTED' | 'REGISTRATION' | 'PAUSE_TRIGGERED'
  contractAddress?: string
  threat?: SentinelEvent
  contracts?: any[]
}

function useSentinelNode() {
  const [isConnected, setIsConnected] = useState(false)
  const [serverEvents, setServerEvents] = useState<ServerEvent[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const wsUrl = (import.meta as any).env?.VITE_SENTINEL_WS_URL || 'ws://localhost:9000'
    
    const connect = () => {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => setIsConnected(true)
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          setServerEvents(prev => [data, ...prev].slice(0, 50))
        } catch {}
      }
      ws.onclose = () => {
        setIsConnected(false)
        setTimeout(connect, 3000)
      }
    }

    connect()
    return () => wsRef.current?.close()
  }, [])

  return { isConnected, serverEvents }
}
