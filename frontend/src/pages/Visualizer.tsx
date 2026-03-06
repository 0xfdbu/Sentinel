/**
 * Visualizer Page - Arkham-style Network Graph
 * Canvas-based visualization of sentinel-monitored contracts and guardians
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  Maximize2,
  Minimize2,
  Radio,
  Shield,
  Lock,
  AlertTriangle,
  Eye,
  EyeOff,
  Download,
  RefreshCw
} from 'lucide-react'
import { useAccount, usePublicClient, useChainId } from 'wagmi'
import { toast } from 'react-hot-toast'
import { cn } from '../utils/cn'
import { getAddresses } from '../utils/wagmi'
import { formatEther } from 'viem'

// Grid Background
function GridBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)`,
        backgroundSize: '100% 4px'
      }} />
      <div className="absolute inset-0 opacity-[0.08]" style={{
        backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
    </div>
  )
}

const SENTINEL_API_URL = import.meta.env.VITE_SENTINEL_API_URL || 'http://localhost:9001'

// Canvas-based visualizer component
interface Node {
  id: string
  type: 'contract' | 'guardian' | 'sentinel' | 'policy'
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
  // Metadata
  status?: string
  staked?: string
  reputation?: number
  isPaused?: boolean
  isLight?: boolean
}

interface Edge {
  id: string
  source: string
  target: string
  type: 'protects' | 'monitors' | 'paused' | 'policy'
  strength: number
  animated: boolean
  timestamp: number
}

const COLORS = {
  contract: {
    safe: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    paused: '#6366f1',
    light: '#6b7280'
  },
  guardian: '#06b6d4',
  sentinel: '#8b5cf6',
  policy: '#f97316',
  edges: {
    protects: '#10b981',
    monitors: '#3b82f6',
    paused: '#ef4444',
    policy: '#f97316'
  }
}

// Registry V3 ABI
const REGISTRY_ABI = [
  { name: 'getActiveGuardians', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address[]' }] },
  { name: 'getGuardian', type: 'function', stateMutability: 'view', inputs: [{ name: 'addr', type: 'address' }], outputs: [{ components: [{ name: 'status', type: 'uint8' }, { name: 'stakedAmount', type: 'uint256' }, { name: 'registeredAt', type: 'uint256' }, { name: 'lastActivityAt', type: 'uint256' }, { name: 'totalActions', type: 'uint256' }, { name: 'successfulActions', type: 'uint256' }, { name: 'falsePositives', type: 'uint256' }, { name: 'reputation', type: 'uint256' }, { name: 'metadata', type: 'string' }], type: 'tuple' }] },
  { name: 'totalStaked', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const

const GUARDIAN_ABI = [
  { name: 'isPaused', type: 'function', stateMutability: 'view', inputs: [{ name: 'target', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'getActivePauses', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address[]' }] },
] as const

interface Contract {
  address: string
  name: string
  functions: number
  files: number
  registeredAt: number
  lastScanned: number
  isLight?: boolean
}

interface Guardian {
  address: string
  status: number
  stakedAmount: bigint
  reputation: bigint
  metadata: string
  totalActions: bigint
}

export default function Visualizer() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const ADDRESSES = getAddresses(chainId)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const nodesRef = useRef<Map<string, Node>>(new Map())
  const edgesRef = useRef<Map<string, Edge>>(new Map())
  const mouseRef = useRef({ x: 0, y: 0 })

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'threats' | 'guardians'>('all')
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showLabels, setShowLabels] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [stats, setStats] = useState({
    guardians: 0,
    contracts: 0,
    paused: 0,
    policies: 2
  })

  // Get canvas dimensions
  const getCanvasDimensions = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    }
    return { width: window.innerWidth, height: window.innerHeight - 200 }
  }, [])

  // Load data from blockchain and sentinel node
  const loadData = useCallback(async () => {
    if (!publicClient || !ADDRESSES.sentinelRegistry) return
    setIsLoading(true)

    try {
      // Load guardians
      const guardianAddrs = await publicClient.readContract({
        address: ADDRESSES.sentinelRegistry as `0x${string}`,
        abi: REGISTRY_ABI,
        functionName: 'getActiveGuardians'
      }) as `0x${string}`[]

      const guardianData: Guardian[] = await Promise.all(
        guardianAddrs.map(async (addr) => {
          const info = await publicClient.readContract({
            address: ADDRESSES.sentinelRegistry as `0x${string}`,
            abi: REGISTRY_ABI,
            functionName: 'getGuardian',
            args: [addr]
          }) as {
            status: number
            stakedAmount: bigint
            registeredAt: bigint
            lastActivityAt: bigint
            totalActions: bigint
            successfulActions: bigint
            falsePositives: bigint
            reputation: bigint
            metadata: string
          }
          return { address: addr, ...info }
        })
      )

      // Load contracts from sentinel node
      const response = await fetch(`${SENTINEL_API_URL}/contracts`)
      const contractData = await response.json()
      const contracts: Contract[] = contractData.success ? contractData.data : []

      // Load paused contracts
      const pausedAddrs = await publicClient.readContract({
        address: ADDRESSES.guardian as `0x${string}`,
        abi: GUARDIAN_ABI,
        functionName: 'getActivePauses'
      }).catch(() => []) as `0x${string}`[]
      const pausedSet = new Set(pausedAddrs.map(a => a.toLowerCase()))

      // Update stats
      setStats({
        guardians: guardianData.length,
        contracts: contracts.length,
        paused: pausedSet.size,
        policies: 2 // Blacklist + Volume
      })

      // Build nodes and edges
      buildGraph(guardianData, contracts, pausedSet)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to load data:', error)
    }
    setIsLoading(false)
  }, [publicClient, ADDRESSES.sentinelRegistry, ADDRESSES.guardian])

  // Build graph nodes and edges
  const buildGraph = (guardians: Guardian[], contracts: Contract[], pausedSet: Set<string>) => {
    const { width: w, height: h } = getCanvasDimensions()
    // Shift everything to the left side of the canvas
    const centerX = w * 0.28  // 28% from left - more to the left
    const centerY = h * 0.5   // Middle of height

    // Clear existing
    nodesRef.current.clear()
    edgesRef.current.clear()

    // Calculate radius based on LEFT portion of canvas only
    const availableWidth = w * 0.55  // Only use left 55% of canvas
    const maxRadius = Math.min(availableWidth, h) * 0.38  // Tighter outer ring
    const minRadius = Math.min(availableWidth, h) * 0.15  // Tighter inner ring
    
    // Add Guardians in CENTER (primary focus)
    if (guardians.length === 1) {
      // Single guardian in the center
      const g = guardians[0]
      nodesRef.current.set(g.address.toLowerCase(), {
        id: g.address.toLowerCase(),
        type: 'guardian',
        label: g.metadata || 'Guardian',
        x: centerX,
        y: centerY,
        vx: 0, vy: 0,
        radius: 32,  // Smaller center guardian
        color: COLORS.guardian,
        lastActivity: Date.now(),
        pulsePhase: 0,
        staked: formatEther(g.stakedAmount),
        reputation: Number(g.reputation) / 100,
        status: g.status === 1 ? 'Active' : 'Inactive'
      })
    } else if (guardians.length > 1) {
      // Multiple guardians in a tight inner circle
      const guardianRadius = minRadius * 0.5  // Tighter cluster
      guardians.forEach((g, i) => {
        const angle = (i / guardians.length) * Math.PI * 2 - Math.PI / 2
        const x = centerX + Math.cos(angle) * guardianRadius
        const y = centerY + Math.sin(angle) * guardianRadius

        nodesRef.current.set(g.address.toLowerCase(), {
          id: g.address.toLowerCase(),
          type: 'guardian',
          label: g.metadata || `Guardian ${i + 1}`,
          x,
          y,
          vx: 0, vy: 0,
          radius: 24,  // Smaller guardian nodes
          color: COLORS.guardian,
          lastActivity: Date.now(),
          pulsePhase: Math.random() * Math.PI * 2,
          staked: formatEther(g.stakedAmount),
          reputation: Number(g.reputation) / 100,
          status: g.status === 1 ? 'Active' : 'Inactive'
        })

        // Connect guardians to each other in a ring
        const nextGuardian = guardians[(i + 1) % guardians.length]
        edgesRef.current.set(`edge-guardian-ring-${i}`, {
          id: `edge-guardian-ring-${i}`,
          source: g.address.toLowerCase(),
          target: nextGuardian.address.toLowerCase(),
          type: 'monitors',
          strength: 0.4,
          animated: false,
          timestamp: Date.now()
        })
      })
    }

    // Add Sentinel Node more centered
    const sentinelX = w * 0.58  // More towards center
    const sentinelY = centerY   // Same vertical level as guardians
    nodesRef.current.set('sentinel', {
      id: 'sentinel',
      type: 'sentinel',
      label: 'Sentinel Node',
      x: sentinelX,
      y: sentinelY,
      vx: 0, vy: 0,
      radius: 28,  // Smaller sentinel node
      color: COLORS.sentinel,
      lastActivity: Date.now(),
      pulsePhase: 0,
      status: 'Active'
    })

    // Connect sentinel to all guardians
    guardians.forEach((g) => {
      edgesRef.current.set(`edge-sentinel-${g.address}`, {
        id: `edge-sentinel-${g.address}`,
        source: 'sentinel',
        target: g.address.toLowerCase(),
        type: 'monitors',
        strength: 0.8,
        animated: true,
        timestamp: Date.now()
      })
    })

    // Add Contracts in outer ring
    const contractRadius = maxRadius * 0.82  // Within bounds
    const totalItems = contracts.length
    const angleStep = (Math.PI * 2) / Math.max(totalItems, 1)
    
    contracts.forEach((c, i) => {
      const isPaused = pausedSet.has(c.address.toLowerCase())
      const isLight = c.functions === 0
      // Spread contracts evenly in full circle, starting from top
      const angle = i * angleStep - Math.PI / 2
      const x = centerX + Math.cos(angle) * contractRadius
      const y = centerY + Math.sin(angle) * contractRadius

      let color = isPaused ? COLORS.contract.paused : 
                  isLight ? COLORS.contract.light : COLORS.contract.safe

      nodesRef.current.set(c.address.toLowerCase(), {
        id: c.address.toLowerCase(),
        type: 'contract',
        label: c.name,
        x,
        y,
        vx: 0, vy: 0,
        radius: isPaused ? 18 : 15,  // Smaller contract nodes
        color,
        lastActivity: Date.now(),
        pulsePhase: Math.random() * Math.PI * 2,
        isPaused,
        isLight,
        status: isPaused ? 'Paused' : isLight ? 'Light' : 'Protected'
      })

      // Edge from nearest guardian to contract
      if (guardians.length > 0) {
        // Find closest guardian by angle
        const guardianIndex = Math.round((angle + Math.PI / 2) / angleStep) % guardians.length
        const closestGuardian = guardians[guardianIndex] || guardians[0]
        
        edgesRef.current.set(`edge-guardian-${c.address}`, {
          id: `edge-guardian-${c.address}`,
          source: closestGuardian.address.toLowerCase(),
          target: c.address.toLowerCase(),
          type: isPaused ? 'paused' : 'protects',
          strength: 0.6,
          animated: isPaused,
          timestamp: Date.now()
        })
      }
    })

    // Add Policy nodes in separate ring between guardians and contracts
    const policies = [
      { address: ADDRESSES.blacklistPolicy, name: 'Blacklist' },
      { address: ADDRESSES.volumePolicy, name: 'Volume' }
    ].filter(p => p.address && p.address !== '0x0000000000000000000000000000000000000000')

    const policyRadius = (minRadius + maxRadius) * 0.55  // Middle position
    policies.forEach((p, i) => {
      const angle = Math.PI * 0.75 + (i / policies.length) * Math.PI * 0.5
      const x = centerX + Math.cos(angle) * policyRadius
      const y = centerY + Math.sin(angle) * policyRadius

      nodesRef.current.set(p.address!.toLowerCase(), {
        id: p.address!.toLowerCase(),
        type: 'policy',
        label: p.name,
        x,
        y,
        vx: 0, vy: 0,
        radius: 18,  // Smaller policy nodes
        color: COLORS.policy,
        lastActivity: Date.now(),
        pulsePhase: Math.random() * Math.PI * 2,
        status: 'Active'
      })

      // Connect to all guardians
      guardians.forEach((g) => {
        edgesRef.current.set(`edge-policy-${p.address}-${g.address}`, {
          id: `edge-policy-${p.address}-${g.address}`,
          source: p.address!.toLowerCase(),
          target: g.address.toLowerCase(),
          type: 'policy',
          strength: 0.4,
          animated: true,
          timestamp: Date.now()
        })
      })
    })
  }

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

      // Clear with dark background
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, w, h)

      const now = Date.now()
      const nodes = Array.from(nodesRef.current.values())
      const edges = Array.from(edgesRef.current.values())

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
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
        if (filter === 'threats' && edge.type !== 'paused') return
        if (filter === 'guardians' && edge.type === 'policy') return

        const source = nodesRef.current.get(edge.source)
        const target = nodesRef.current.get(edge.target)
        if (!source || !target) return

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
        ctx.strokeStyle = COLORS.edges[edge.type] + '40'
        ctx.lineWidth = edge.strength * 2
        ctx.stroke()

        // Animated particles on edges
        if (edge.animated) {
          const speed = 1
          const offset = (now / 1000 * speed) % 1
          const px = startX + (endX - startX) * offset
          const py = startY + (endY - startY) * offset
          
          ctx.beginPath()
          ctx.arc(px, py, 3, 0, Math.PI * 2)
          ctx.fillStyle = COLORS.edges[edge.type]
          ctx.fill()
        }
      })

      // Nodes
      nodes.forEach(node => {
        // Glow effect
        if (node.type === 'sentinel' || node.isPaused) {
          const pulse = Math.sin(now / 500 + node.pulsePhase) * 0.3 + 0.7
          const gradient = ctx.createRadialGradient(
            node.x, node.y, node.radius,
            node.x, node.y, node.radius + 30 * pulse
          )
          gradient.addColorStop(0, node.color + '30')
          gradient.addColorStop(1, node.color + '00')
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(node.x, node.y, node.radius + 30, 0, Math.PI * 2)
          ctx.fill()
        }

        // Node body
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        ctx.fillStyle = '#0a0a0a'
        ctx.fill()
        ctx.strokeStyle = node.color
        ctx.lineWidth = 2
        ctx.stroke()

        // Inner fill
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius - 4, 0, Math.PI * 2)
        ctx.fillStyle = node.color + '20'
        ctx.fill()

        // Icon/indicator in center
        ctx.beginPath()
        ctx.arc(node.x, node.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = node.color
        ctx.fill()

        // Labels
        if (showLabels) {
          ctx.font = '10px ui-monospace, monospace'
          ctx.textAlign = 'center'
          ctx.fillStyle = '#e5e5e5'
          ctx.fillText(node.label.slice(0, 14), node.x, node.y + node.radius + 12)
          
          if (node.status) {
            ctx.font = '8px ui-monospace, monospace'
            ctx.fillStyle = node.color
            ctx.fillText(node.status.toUpperCase(), node.x, node.y + node.radius + 22)
          }
        }
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [filter, showLabels, getCanvasDimensions])

  // Load data on mount and interval
  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [loadData])

  // Handle resize
  useEffect(() => {
    const handleResize = () => loadData()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [loadData])

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
      edges: Array.from(edgesRef.current.values())
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sentinel-network-${Date.now()}.json`
    a.click()
    toast.success('Network data exported')
  }

  const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions()

  return (
    <div className="fixed inset-0 bg-neutral-950 flex overflow-hidden z-0">
      <GridBackground />

      {/* Floating Controls - Top Right */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        {/* Refresh */}
        <button
          onClick={loadData}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-neutral-900/80 backdrop-blur text-neutral-400 hover:bg-white/5 transition-colors disabled:opacity-50 text-sm"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Refresh
        </button>

        {/* Filter */}
        <div className="flex items-center gap-1 bg-neutral-900/80 backdrop-blur rounded-lg p-1 border border-white/10">
          {(['all', 'threats', 'guardians'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-md transition-colors',
                filter === f ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-neutral-200'
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Toggle Labels */}
        <button
          onClick={() => setShowLabels(!showLabels)}
          className="p-2 bg-neutral-900/80 backdrop-blur hover:bg-white/5 rounded-lg transition-colors border border-white/10"
          title="Toggle Labels"
        >
          {showLabels ? <Eye className="w-4 h-4 text-neutral-400" /> : <EyeOff className="w-4 h-4 text-neutral-400" />}
        </button>

        {/* Export */}
        <button
          onClick={handleExport}
          className="p-2 bg-neutral-900/80 backdrop-blur hover:bg-white/5 rounded-lg transition-colors border border-white/10"
          title="Export Data"
        >
          <Download className="w-4 h-4 text-neutral-400" />
        </button>

        {/* Fullscreen */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 bg-neutral-900/80 backdrop-blur hover:bg-white/5 rounded-lg transition-colors border border-white/10"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 text-neutral-400" /> : <Maximize2 className="w-4 h-4 text-neutral-400" />}
        </button>
      </div>

      {/* Main Canvas Area - Full height, no header */}
      <div ref={containerRef} className="flex-1 relative">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          className="cursor-crosshair block w-full h-full"
        />

        {/* Legend - Right side since graph is on left */}
        <div className="absolute bottom-6 right-6 z-20 bg-neutral-900/95 backdrop-blur rounded-xl p-4 border border-white/10 max-w-xs">
          <div className="text-sm font-medium text-slate-200 mb-3">Network Legend</div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-purple-500/30 border-2 border-purple-500" />
              <span className="text-sm text-neutral-400">Sentinel Node</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-cyan-500/30 border-2 border-cyan-500" />
              <span className="text-sm text-neutral-400">Guardian Node</span>
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
              <div className="w-4 h-4 rounded-full bg-orange-500/30 border-2 border-orange-500" />
              <span className="text-sm text-neutral-400">Policy Contract</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-gray-500/30 border-2 border-gray-500" />
              <span className="text-sm text-neutral-400">Light Registration</span>
            </div>
          </div>
          
          <div className="border-t border-white/10 my-3 pt-3">
            <div className="text-sm font-medium text-slate-200 mb-2">Connection Types</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-emerald-500/50" />
                <span className="text-xs text-neutral-400">Protection Link</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-blue-500/50" />
                <span className="text-xs text-neutral-400">Monitoring</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-red-500/50" />
                <span className="text-xs text-neutral-400">Paused State</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Panel - Below controls */}
        <div className="absolute top-20 right-4 z-20 bg-neutral-900/95 backdrop-blur rounded-xl p-4 border border-white/10">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Guardians</div>
              <div className="text-2xl font-bold text-cyan-400">{stats.guardians}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Contracts</div>
              <div className="text-2xl font-bold text-emerald-400">{stats.contracts}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Paused</div>
              <div className="text-2xl font-bold text-red-400">{stats.paused}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Last Update</div>
              <div className="text-sm font-medium text-neutral-300">
                {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
          </div>
        </div>

        {/* Selected Node Info - Bottom left since graph is on left */}
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-6 left-6 z-20 w-80 bg-neutral-900/95 backdrop-blur rounded-xl p-4 border border-white/10 max-h-[70vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                {selectedNode.type === 'sentinel' && <Radio className="w-4 h-4 text-purple-400" />}
                {selectedNode.type === 'guardian' && <Shield className="w-4 h-4 text-cyan-400" />}
                {selectedNode.type === 'contract' && <Lock className="w-4 h-4 text-emerald-400" />}
                {selectedNode.type === 'policy' && <AlertTriangle className="w-4 h-4 text-orange-400" />}
                {selectedNode.label}
              </h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-neutral-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Type</span>
                <span className="text-slate-300 capitalize">{selectedNode.type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Status</span>
                <span className={cn(
                  'text-xs px-2 py-1 rounded-full',
                  selectedNode.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' :
                  selectedNode.status === 'Paused' ? 'bg-red-500/10 text-red-400' :
                  'bg-neutral-700 text-neutral-400'
                )}>
                  {selectedNode.status || 'Unknown'}
                </span>
              </div>
              {selectedNode.staked && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Staked</span>
                  <span className="text-slate-300">{selectedNode.staked} LINK</span>
                </div>
              )}
              {selectedNode.reputation !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Reputation</span>
                  <span className="text-emerald-400">{selectedNode.reputation.toFixed(1)}%</span>
                </div>
              )}
              {selectedNode.type === 'contract' && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Address</span>
                    <code className="text-xs text-neutral-400">{selectedNode.id.slice(0, 12)}...</code>
                  </div>
                  {selectedNode.isLight && (
                    <div className="p-2 bg-amber-500/10 rounded border border-amber-500/30">
                      <p className="text-xs text-amber-400">
                        Light registration - contract tracked without full source verification
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Hover Tooltip */}
        {hoveredNode && (
          <div
            className="absolute pointer-events-none bg-neutral-900/95 border border-white/10 rounded-lg px-3 py-2 shadow-xl z-30"
            style={{
              left: Math.min(mouseRef.current.x + 15, canvasWidth - 150),
              top: Math.max(mouseRef.current.y - 40, 10),
            }}
          >
            <div className="text-xs text-neutral-400 font-mono">
              {nodesRef.current.get(hoveredNode)?.label}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
