import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  AlertTriangle, 
  Activity,
  Radio,
  Maximize2,
  Minimize2,
  Lock,
  Cpu
} from 'lucide-react'
import { SentinelEvent, ThreatLevel } from '../hooks/useSentinelMonitor'

interface Node {
  id: string
  type: 'contract' | 'attacker' | 'sentinel' | 'cre'
  label: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  threatLevel?: ThreatLevel
  lastActivity: number
  pulsePhase: number
  targetX?: number
  targetY?: number
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

interface VisualizerProps {
  events: SentinelEvent[]
  monitoredContracts: string[]
  isNodeConnected: boolean
  width?: number
  height?: number
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
  cre: '#8b5cf6',
  edges: {
    attack: '#ef4444',
    defense: '#10b981',
    scan: '#3b82f6',
    pause: '#f59e0b',
    monitor: '#64748b'
  }
}

export function SentinelVisualizer({ 
  events, 
  monitoredContracts,
  isNodeConnected,
  width = 1100,
  height = 400
}: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const nodesRef = useRef<Map<string, Node>>(new Map())
  const edgesRef = useRef<Map<string, Edge>>(new Map())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [filter, setFilter] = useState<'all' | 'threats' | 'defense'>('all')
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Get actual canvas dimensions
  const getCanvasDimensions = useCallback(() => {
    if (isFullscreen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      return { width: rect.width - 32, height: rect.height - 100 }
    }
    return { width, height }
  }, [isFullscreen, width, height])

  // Initialize nodes for monitored contracts in a semi-circle
  useEffect(() => {
    const { width: w, height: h } = getCanvasDimensions()
    const centerX = w / 2
    const centerY = h * 0.65
    const radius = Math.min(w, h) * 0.35

    monitoredContracts.forEach((address, index) => {
      const existingNode = nodesRef.current.get(address.toLowerCase())
      
      // Position in semi-circle at bottom
      const total = Math.max(monitoredContracts.length, 1)
      const angle = Math.PI + (index / (total - 1 || 1)) * Math.PI // Semi-circle from left to right
      const targetX = centerX + Math.cos(angle) * radius
      const targetY = centerY + Math.sin(angle) * radius * 0.5

      if (!existingNode) {
        nodesRef.current.set(address.toLowerCase(), {
          id: address.toLowerCase(),
          type: 'contract',
          label: `${address.slice(0, 6)}...${address.slice(-4)}`,
          x: targetX,
          y: targetY,
          targetX,
          targetY,
          vx: 0,
          vy: 0,
          radius: 18,
          color: COLORS.contract.safe,
          lastActivity: Date.now(),
          pulsePhase: Math.random() * Math.PI * 2
        })
      } else {
        // Update target position for smooth transition
        existingNode.targetX = targetX
        existingNode.targetY = targetY
      }
    })

    // Remove nodes for contracts no longer monitored
    nodesRef.current.forEach((node, id) => {
      if (node.type === 'contract') {
        const stillMonitored = monitoredContracts.some(
          addr => addr.toLowerCase() === id
        )
        if (!stillMonitored) {
          nodesRef.current.delete(id)
          // Remove associated edges
          edgesRef.current.forEach((edge, edgeId) => {
            if (edge.source === id || edge.target === id) {
              edgesRef.current.delete(edgeId)
            }
          })
        }
      }
    })
  }, [monitoredContracts, getCanvasDimensions])

  // Initialize Sentinel Node (left side)
  useEffect(() => {
    const { width: w, height: h } = getCanvasDimensions()
    const sentinelId = 'sentinel-node'
    if (!nodesRef.current.has(sentinelId)) {
      nodesRef.current.set(sentinelId, {
        id: sentinelId,
        type: 'sentinel',
        label: 'Sentinel',
        x: w * 0.12,
        y: h * 0.35,
        targetX: w * 0.12,
        targetY: h * 0.35,
        vx: 0,
        vy: 0,
        radius: 28,
        color: COLORS.sentinel,
        lastActivity: Date.now(),
        pulsePhase: 0
      })
    } else {
      const node = nodesRef.current.get(sentinelId)!
      node.targetX = w * 0.12
      node.targetY = h * 0.35
    }
  }, [getCanvasDimensions])

  // Initialize CRE Node (right side)
  useEffect(() => {
    const { width: w, height: h } = getCanvasDimensions()
    const creId = 'cre-node'
    if (!nodesRef.current.has(creId)) {
      nodesRef.current.set(creId, {
        id: creId,
        type: 'cre',
        label: 'CRE',
        x: w * 0.88,
        y: h * 0.35,
        targetX: w * 0.88,
        targetY: h * 0.35,
        vx: 0,
        vy: 0,
        radius: 28,
        color: COLORS.cre,
        lastActivity: Date.now(),
        pulsePhase: 0
      })
    } else {
      const node = nodesRef.current.get(creId)!
      node.targetX = w * 0.88
      node.targetY = h * 0.35
    }
  }, [getCanvasDimensions])

  // Add persistent monitoring edges from Sentinel to contracts
  useEffect(() => {
    const sentinelId = 'sentinel-node'
    
    monitoredContracts.forEach(contractAddress => {
      const edgeId = `monitor-${sentinelId}-${contractAddress.toLowerCase()}`
      
      if (!edgesRef.current.has(edgeId)) {
        edgesRef.current.set(edgeId, {
          id: edgeId,
          source: sentinelId,
          target: contractAddress.toLowerCase(),
          type: 'monitor',
          strength: 0.8,
          animated: true,
          timestamp: Date.now()
        })
      }
    })

    // Cleanup monitoring edges for removed contracts
    edgesRef.current.forEach((edge, edgeId) => {
      if (edgeId.startsWith('monitor-')) {
        const targetAddress = edge.target
        const isStillMonitored = monitoredContracts.some(
          addr => addr.toLowerCase() === targetAddress
        )
        if (!isStillMonitored) {
          edgesRef.current.delete(edgeId)
        }
      }
    })
  }, [monitoredContracts])

  // Process events to update graph
  useEffect(() => {
    events.forEach(event => {
      const nodeId = event.contractAddress.toLowerCase()
      const node = nodesRef.current.get(nodeId)
      
      if (node) {
        // Update node appearance based on threat level
        if (event.level === 'CRITICAL') {
          node.color = COLORS.contract.danger
          node.threatLevel = 'CRITICAL'
          node.radius = 24
        } else if (event.level === 'HIGH') {
          node.color = COLORS.contract.warning
          node.threatLevel = 'HIGH'
          node.radius = 20
        } else if (event.action === 'PAUSED') {
          node.color = COLORS.contract.paused
        }
        node.lastActivity = Date.now()

        // Add edge from attacker if it's an exploit
        if (event.level === 'CRITICAL' || event.level === 'HIGH') {
          const attackerId = `attacker-${event.from}-${Date.now()}`
          const { width: w, height: h } = getCanvasDimensions()
          
          nodesRef.current.set(attackerId, {
            id: attackerId,
            type: 'attacker',
            label: `Attacker`,
            x: w * 0.5 + (Math.random() - 0.5) * 100,
            y: h * 0.15,
            vx: 0,
            vy: 0,
            radius: 14,
            color: COLORS.attacker,
            lastActivity: Date.now(),
            pulsePhase: 0
          })

          // Attack edge
          const edgeId = `attack-${attackerId}-${nodeId}`
          edgesRef.current.set(edgeId, {
            id: edgeId,
            source: attackerId,
            target: nodeId,
            type: 'attack',
            strength: event.confidence,
            animated: true,
            timestamp: Date.now()
          })

          // Defense edge from Sentinel
          const defenseEdgeId = `defense-${nodeId}-${Date.now()}`
          edgesRef.current.set(defenseEdgeId, {
            id: defenseEdgeId,
            source: 'sentinel-node',
            target: nodeId,
            type: 'defense',
            strength: 1,
            animated: true,
            timestamp: Date.now()
          })
        }

        // Pause edge to CRE
        if (event.action === 'PAUSED') {
          const pauseEdgeId = `pause-${nodeId}-${Date.now()}`
          edgesRef.current.set(pauseEdgeId, {
            id: pauseEdgeId,
            source: nodeId,
            target: 'cre-node',
            type: 'pause',
            strength: 1,
            animated: true,
            timestamp: Date.now()
          })
        }
      }
    })

    // Cleanup old attacker nodes
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

    // Cleanup old edges
    edgesRef.current.forEach((edge, id) => {
      if (now - edge.timestamp > 60000 && !edge.id.startsWith('monitor-')) {
        edgesRef.current.delete(id)
      }
    })
  }, [events, getCanvasDimensions])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = () => {
      const { width: w, height: h } = getCanvasDimensions()
      
      // Set canvas size
      canvas.width = w
      canvas.height = h
      
      // Clear with solid background
      ctx.fillStyle = '#0a0a0f'
      ctx.fillRect(0, 0, w, h)

      const now = Date.now()
      const nodes = Array.from(nodesRef.current.values())
      const edges = Array.from(edgesRef.current.values())

      // Smooth position transitions
      nodes.forEach(node => {
        if (node.targetX !== undefined && node.targetY !== undefined) {
          node.x += (node.targetX - node.x) * 0.1
          node.y += (node.targetY - node.y) * 0.1
        }
      })

      // Draw static grid (no animation)
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 0.5
      const gridSize = 40
      
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

      // Draw edges with arrows
      edges.forEach(edge => {
        if (filter === 'threats' && edge.type !== 'attack') return
        if (filter === 'defense' && edge.type !== 'defense' && edge.type !== 'pause') return

        const source = nodesRef.current.get(edge.source)
        const target = nodesRef.current.get(edge.target)
        if (!source || !target) return

        const age = (now - edge.timestamp) / 1000
        const isPersistent = edge.id.startsWith('monitor-')
        const fadeOut = isPersistent ? 1 : Math.max(0.2, 1 - age / 30)
        
        // Calculate edge end point
        const dx = target.x - source.x
        const dy = target.y - source.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist === 0) return
        
        const startX = source.x + (dx / dist) * source.radius
        const startY = source.y + (dy / dist) * source.radius
        const endX = target.x - (dx / dist) * target.radius
        const endY = target.y - (dy / dist) * target.radius

        // Draw line
        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        
        const baseColor = COLORS.edges[edge.type]
        ctx.strokeStyle = baseColor + Math.floor(fadeOut * 150).toString(16).padStart(2, '0')
        ctx.lineWidth = edge.strength * (isPersistent ? 1.5 : 2.5)
        ctx.stroke()

        // Draw arrowhead
        const arrowLength = 8
        const arrowAngle = Math.PI / 6
        const angle = Math.atan2(dy, dx)
        
        ctx.beginPath()
        ctx.moveTo(endX, endY)
        ctx.lineTo(
          endX - arrowLength * Math.cos(angle - arrowAngle),
          endY - arrowLength * Math.sin(angle - arrowAngle)
        )
        ctx.moveTo(endX, endY)
        ctx.lineTo(
          endX - arrowLength * Math.cos(angle + arrowAngle),
          endY - arrowLength * Math.sin(angle + arrowAngle)
        )
        ctx.strokeStyle = baseColor + Math.floor(fadeOut * 255).toString(16).padStart(2, '0')
        ctx.lineWidth = edge.strength * 2
        ctx.stroke()

        // Animated particles on edges
        if (edge.animated) {
          const speed = isPersistent ? 0.5 : 2
          const particleOffset = (now / 1000 * speed) % 1
          const px = startX + (endX - startX) * particleOffset
          const py = startY + (endY - startY) * particleOffset
          
          ctx.beginPath()
          ctx.arc(px, py, isPersistent ? 2 : 3, 0, Math.PI * 2)
          ctx.fillStyle = baseColor
          ctx.fill()
        }
      })

      // Draw nodes
      nodes.forEach(node => {
        // Glow effect for threats
        if (node.threatLevel === 'CRITICAL') {
          const pulse = Math.sin(now / 200 + node.pulsePhase) * 0.5 + 0.5
          const glowRadius = node.radius + 15 + pulse * 10
          const gradient = ctx.createRadialGradient(node.x, node.y, node.radius, node.x, node.y, glowRadius)
          gradient.addColorStop(0, node.color + '60')
          gradient.addColorStop(1, node.color + '00')
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2)
          ctx.fill()
        }

        // Outer ring
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        ctx.fillStyle = node.color + '15'
        ctx.fill()
        ctx.strokeStyle = node.color
        ctx.lineWidth = 2
        ctx.stroke()

        // Inner fill
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius - 5, 0, Math.PI * 2)
        ctx.fillStyle = node.color + '30'
        ctx.fill()

        // Pulse effect for active threats
        if (node.threatLevel === 'CRITICAL') {
          const pulse = Math.sin(now / 150) * 0.5 + 0.5
          ctx.beginPath()
          ctx.arc(node.x, node.y, node.radius + 5 + pulse * 5, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.3 + pulse * 0.4})`
          ctx.lineWidth = 2
          ctx.stroke()
        }

        // Label background
        const labelText = node.label
        ctx.font = '11px monospace'
        const textWidth = ctx.measureText(labelText).width
        
        ctx.fillStyle = 'rgba(10, 10, 15, 0.8)'
        ctx.fillRect(node.x - textWidth/2 - 4, node.y + node.radius + 8, textWidth + 8, 16)
        
        // Label text
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#e2e8f0'
        ctx.fillText(labelText, node.x, node.y + node.radius + 16)
        
        // Type badge
        ctx.font = '9px sans-serif'
        ctx.fillStyle = node.color
        const typeText = node.type === 'sentinel' ? 'NODE' : node.type === 'cre' ? 'CRE' : node.type.toUpperCase()
        ctx.fillText(typeText, node.x, node.y + node.radius + 30)
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [filter, getCanvasDimensions])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      // Force re-render on resize
      if (isFullscreen) {
        // Update node positions
        const { width: w, height: h } = getCanvasDimensions()
        const sentinelNode = nodesRef.current.get('sentinel-node')
        if (sentinelNode) {
          sentinelNode.targetX = w * 0.12
          sentinelNode.targetY = h * 0.35
        }
        const creNode = nodesRef.current.get('cre-node')
        if (creNode) {
          creNode.targetX = w * 0.88
          creNode.targetY = h * 0.35
        }
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isFullscreen, getCanvasDimensions])

  // Mouse interactions
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
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
      const node = nodesRef.current.get(hoveredNode)
      if (node) setSelectedNode(node)
    }
  }, [hoveredNode])

  const { width: displayWidth, height: displayHeight } = getCanvasDimensions()

  return (
    <div 
      ref={containerRef}
      className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-black/95 p-4' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neutral-300/10 rounded-lg">
            <Activity className="w-5 h-5 text-neutral-200" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-200">Threat Visualizer</h3>
            <p className="text-xs text-neutral-500">
              {isNodeConnected ? (
                <span className="text-emerald-400">● Live</span>
              ) : (
                <span className="text-red-400">● Offline</span>
              )}
              {' '}• {monitoredContracts.length} contracts monitored
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
            {(['all', 'threats', 'defense'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  filter === f
                    ? 'bg-neutral-300/20 text-neutral-200'
                    : 'text-neutral-400 hover:text-neutral-300'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Fullscreen */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-neutral-400" />
            ) : (
              <Maximize2 className="w-4 h-4 text-neutral-400" />
            )}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#0a0a0f]">
        <canvas
          ref={canvasRef}
          width={displayWidth}
          height={displayHeight}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          className="cursor-crosshair block"
          style={{ width: displayWidth, height: displayHeight }}
        />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-slate-900/95 backdrop-blur rounded-lg p-3 border border-slate-800">
          <div className="text-xs font-medium text-neutral-400 mb-2">Nodes</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500/50 border border-cyan-500" />
              <span className="text-xs text-neutral-400">Sentinel Node</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-violet-500/50 border border-violet-500" />
              <span className="text-xs text-neutral-400">Chainlink CRE</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500/50 border border-emerald-500" />
              <span className="text-xs text-neutral-400">Safe Contract</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/50 border border-red-500" />
              <span className="text-xs text-neutral-400">Under Attack</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500/50 border border-indigo-500" />
              <span className="text-xs text-neutral-400">Paused</span>
            </div>
          </div>
          
          <div className="border-t border-slate-700 my-2 pt-2">
            <div className="text-xs font-medium text-neutral-400 mb-1">Flows</div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-gray-500" />
              <span className="text-xs text-neutral-400">Monitoring</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-4 h-0.5 bg-red-500" />
              <span className="text-xs text-neutral-400">Attack</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-4 h-0.5 bg-emerald-500" />
              <span className="text-xs text-neutral-400">Defense</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="absolute top-4 right-4 bg-slate-900/95 backdrop-blur rounded-lg p-3 border border-slate-800">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-neutral-500">Active Threats</div>
              <div className="text-lg font-semibold text-red-400">
                {Array.from(nodesRef.current.values()).filter(n => n.threatLevel === 'CRITICAL').length}
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Protected</div>
              <div className="text-lg font-semibold text-emerald-400">
                {monitoredContracts.length}
              </div>
            </div>
          </div>
        </div>

        {/* Hover tooltip */}
        <AnimatePresence>
          {hoveredNode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute pointer-events-none bg-slate-900/95 border border-slate-700 rounded-lg p-3 shadow-xl z-10"
              style={{
                left: Math.min(mouseRef.current.x + 15, displayWidth - 150),
                top: Math.max(mouseRef.current.y - 10, 10),
              }}
            >
              <div className="text-xs text-neutral-400 font-mono">{hoveredNode.slice(0, 20)}...</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Node Details Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-20 right-4 w-64 bg-slate-900/95 border border-slate-800 rounded-xl p-4 shadow-2xl z-20"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-slate-200 flex items-center gap-2">
                {selectedNode.type === 'sentinel' && <Radio className="w-4 h-4 text-cyan-400" />}
                {selectedNode.type === 'cre' && <Cpu className="w-4 h-4 text-violet-400" />}
                {selectedNode.type === 'contract' && <Lock className="w-4 h-4 text-emerald-400" />}
                {selectedNode.type === 'attacker' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                Node Details
              </h4>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-neutral-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="text-xs text-neutral-500">Type</div>
              <div className="text-sm text-slate-300 capitalize">
                {selectedNode.type}
              </div>
              
              <div className="text-xs text-neutral-500 mt-3">Address</div>
              <div className="text-xs font-mono text-slate-300 break-all">{selectedNode.id}</div>
              
              {selectedNode.threatLevel && (
                <>
                  <div className="text-xs text-neutral-500 mt-3">Threat Level</div>
                  <div className={`text-sm font-medium ${
                    selectedNode.threatLevel === 'CRITICAL' ? 'text-red-400' :
                    selectedNode.threatLevel === 'HIGH' ? 'text-neutral-400' :
                    'text-yellow-400'
                  }`}>
                    {selectedNode.threatLevel}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SentinelVisualizer
