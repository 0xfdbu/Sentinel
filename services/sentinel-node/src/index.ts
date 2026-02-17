/**
 * Sentinel Node - Production Monitoring Service with CRE Integration
 * 
 * Real-time blockchain monitoring with:
 * - WebSocket event streaming
 * - Heuristic threat detection  
 * - Chainlink Functions CRE integration
 * - Automatic emergency pause via confidential execution
 */

import { ethers } from 'ethers'
import { WebSocketServer, WebSocket } from 'ws'
import { createClient } from '@supabase/supabase-js'
import express from 'express'
import dotenv from 'dotenv'
import { createPauseRouter } from './api/pause.js'
import { 
  calculateHeuristicScore, 
  buildAIPrompt, 
  callGrokAI,
  executeAIResponse
} from './ai/index.js'
import type { AIAnalysisResult } from './ai/index.js'
// Import JSON files using fs since import assertions may not work in all environments
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SentinelRegistryAbi = JSON.parse(readFileSync(join(__dirname, './abi/SentinelRegistry.json'), 'utf-8'));
const EmergencyGuardianAbi = JSON.parse(readFileSync(join(__dirname, './abi/EmergencyGuardian.json'), 'utf-8'));

dotenv.config()

// Configuration
const CONFIG = {
  // Network
  RPC_URL: process.env.RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/DFCXUzLyQhp00HIXt2NTo',
  CHAIN_ID: parseInt(process.env.CHAIN_ID || '11155111'),
  
  // Contracts
  REGISTRY_ADDRESS: process.env.REGISTRY_ADDRESS || '0x774B96F8d892A1e4482B52b3d255Fa269136A0E9',
  GUARDIAN_ADDRESS: process.env.GUARDIAN_ADDRESS || '0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1',
  CRE_CONSUMER_ADDRESS: process.env.CRE_CONSUMER_ADDRESS || '',
  
  // CRE / Chainlink Functions
  SUBSCRIPTION_ID: process.env.CHAINLINK_SUBSCRIPTION_ID || '',
  
  // Authentication
  SENTINEL_API_KEY: process.env.SENTINEL_API_KEY || 'dev-key-' + Date.now(),
  PRIVATE_KEY: process.env.PRIVATE_KEY || '',
  
  // Detection thresholds
  THRESHOLDS: {
    LARGE_TRANSFER_ETH: 100,
    HIGH_GAS: 5000000,
    FLASH_LOAN_SIGS: ['0x6318967b', '0xefefaba7', '0xc42079f9', '0xab9c4b5d'],
    REENTRANCY_MAX_CALLS: 3,
    MULTIPLE_TRANSFERS: 5,
  },
  
  // Polling - reduced to ~1 second
  BLOCK_POLL_INTERVAL_MS: 1000,
  MAX_BLOCKS_PER_SCAN: 2,
  
  // Rate limiting
  WS_RECONNECT_COOLDOWN_MS: 5000,  // Min 5 seconds between reconnects
  MAX_WS_MESSAGES_PER_SEC: 10,
  
  // Server
  WS_PORT: parseInt(process.env.WS_PORT || '8080'),
  API_PORT: parseInt(process.env.API_PORT || '3000'),
}

// Threat levels
type ThreatLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'

interface ThreatEvent {
  id: string
  timestamp: number
  level: ThreatLevel
  contractAddress: string
  txHash: string
  from: string
  to?: string
  details: string
  value?: string
  confidence: number
  blockNumber: number
  gasUsed?: number
  action?: 'PAUSED' | 'ALERTED' | 'LOGGED' | 'CRE_TRIGGERED'
}

interface MonitoredContract {
  address: string
  owner: string
  stake: bigint
  metadata: string
  registeredAt: Date
  isPaused: boolean
  lastActivity: Date
  totalEvents: number
}

class SentinelNode {
  private provider: ethers.WebSocketProvider | null = null
  private registry: ethers.Contract | null = null
  private guardian: ethers.Contract | null = null
  private wallet: ethers.Wallet | null = null
  private wss: WebSocketServer | null = null
  private clients: Set<WebSocket> = new Set()
  private monitoredContracts: Map<string, MonitoredContract> = new Map()
  private lastProcessedBlock: number = 0
  private isRunning: boolean = false
  private pollInterval: NodeJS.Timeout | null = null
  private supabase: any = null
  private app: express.Application | null = null
  
  // Rate limiting
  private lastReconnectAttempt: number = 0
  private reconnectInProgress: boolean = false
  private messageTimestamps: number[] = []

  async start() {
    console.log('🛡️  Starting Sentinel Node...')
    console.log(`   Chain ID: ${CONFIG.CHAIN_ID}`)
    console.log(`   Registry: ${CONFIG.REGISTRY_ADDRESS}`)
    console.log(`   Guardian: ${CONFIG.GUARDIAN_ADDRESS}`)
    console.log(`   CRE Consumer: ${CONFIG.CRE_CONSUMER_ADDRESS || 'Not configured'}`)
    console.log(`   API Key: ${CONFIG.SENTINEL_API_KEY.slice(0, 8)}...`)

    // Initialize Supabase if configured
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
      console.log('   Supabase connected')
    }

    // Initialize WebSocket provider
    await this.connectProvider()

    // Initialize wallet if private key provided
    if (CONFIG.PRIVATE_KEY) {
      this.wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, this.provider!)
      console.log(`   Wallet: ${this.wallet.address}`)
    }

    // Initialize contracts
    this.initializeContracts()

    // Load monitored contracts
    await this.loadMonitoredContracts()

    // Setup event listeners
    this.setupEventListeners()

    // Start block polling
    this.startPolling()

    // Start WebSocket server for frontend clients
    this.startWebSocketServer()

    // Start HTTP API server
    this.startAPIServer()

    this.isRunning = true
    console.log('✅ Sentinel Node is running')
    console.log(`   WebSocket: ws://localhost:${CONFIG.WS_PORT}`)
    console.log(`   API: http://localhost:${CONFIG.API_PORT}`)
  }

  async stop() {
    this.isRunning = false
    
    if (this.pollInterval) clearInterval(this.pollInterval)
    if (this.wss) this.wss.close()
    if (this.provider) await this.provider.destroy()
    
    console.log('🛑 Sentinel Node stopped')
  }

  private async connectProvider() {
    try {
      this.provider = new ethers.WebSocketProvider(CONFIG.RPC_URL)
      
      this.provider.on('error', (error) => {
        console.error('Provider error:', error)
        this.reconnectProvider()
      })
      
      // Handle WebSocket close event via the underlying socket
      const ws = (this.provider as any).websocket
      if (ws) {
        ws.on('close', () => {
          console.log('Provider connection closed')
          this.reconnectProvider()
        })
      }

      const network = await this.provider.getNetwork()
      console.log(`   Connected to ${network.name} (${network.chainId})`)
    } catch (error) {
      console.error('Failed to connect provider:', error)
      throw error
    }
  }

  private async reconnectProvider() {
    if (!this.isRunning || this.reconnectInProgress) return
    
    // Rate limit reconnection attempts
    const now = Date.now()
    const timeSinceLastReconnect = now - this.lastReconnectAttempt
    if (timeSinceLastReconnect < CONFIG.WS_RECONNECT_COOLDOWN_MS) {
      console.log(`⏳ Reconnect cooldown active, waiting ${Math.ceil((CONFIG.WS_RECONNECT_COOLDOWN_MS - timeSinceLastReconnect) / 1000)}s...`)
      return
    }
    
    this.reconnectInProgress = true
    this.lastReconnectAttempt = now
    
    console.log('🔄 Reconnecting provider...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    await this.connectProvider()
    this.initializeContracts()
    this.setupEventListeners()
    
    this.reconnectInProgress = false
  }

  private initializeContracts() {
    if (!this.provider) return

    this.registry = new ethers.Contract(CONFIG.REGISTRY_ADDRESS, SentinelRegistryAbi.abi, this.provider)
    this.guardian = new ethers.Contract(CONFIG.GUARDIAN_ADDRESS, EmergencyGuardianAbi.abi, this.provider)
  }

  private async loadMonitoredContracts() {
    if (!this.registry) return

    try {
      const count = await this.registry.getProtectedCount()
      console.log(`   Loading ${count} monitored contracts...`)

      if (count === 0n) {
        this.monitoredContracts.clear()
        return
      }

      const addresses = await this.registry.getProtectedContracts(0, count)
      
      for (const addr of addresses) {
        try {
          const metadata = await this.registry.getContractMetadata(addr)
          const isPaused = await this.guardian?.isPaused(addr)

          this.monitoredContracts.set(addr.toLowerCase(), {
            address: addr,
            owner: metadata.owner,
            stake: metadata.stake,
            metadata: metadata.metadata,
            registeredAt: new Date(Number(metadata.registeredAt) * 1000),
            isPaused: Boolean(isPaused),
            lastActivity: new Date(),
            totalEvents: 0,
          })
        } catch (e) {
          console.warn(`Failed to load metadata for ${addr}`)
        }
      }

      console.log(`   Loaded ${this.monitoredContracts.size} contracts`)
    } catch (error) {
      console.error('Failed to load contracts:', error)
    }
  }

  private setupEventListeners() {
    if (!this.registry || !this.guardian) return

    // Listen for new registrations
    this.registry.on('ContractRegistered', async (contractAddr: string, owner: string, stake: bigint) => {
      console.log(`📋 New contract registered: ${contractAddr}`)
      
      this.monitoredContracts.set(contractAddr.toLowerCase(), {
        address: contractAddr,
        owner,
        stake,
        metadata: '',
        registeredAt: new Date(),
        isPaused: false,
        lastActivity: new Date(),
        totalEvents: 0,
      })

      this.broadcast({ type: 'REGISTRATION', contractAddress: contractAddr, owner, stake: stake.toString() })
    })

    // Listen for emergency pauses
    this.guardian.on('EmergencyPauseTriggered', (target: string, sentinel: string, vulnHash: string) => {
      console.log(`🚨 Emergency pause triggered: ${target}`)
      
      const contract = this.monitoredContracts.get(target.toLowerCase())
      if (contract) contract.isPaused = true

      this.broadcast({ type: 'PAUSE_TRIGGERED', contractAddress: target, sentinel, vulnHash })
    })

    // Listen for pause lifts
    this.guardian.on('PauseLifted', (target: string) => {
      console.log(`✅ Pause lifted: ${target}`)
      
      const contract = this.monitoredContracts.get(target.toLowerCase())
      if (contract) contract.isPaused = false

      this.broadcast({ type: 'PAUSE_LIFTED', contractAddress: target })
    })
  }

  private startPolling() {
    this.pollInterval = setInterval(async () => {
      await this.scanBlocks()
    }, CONFIG.BLOCK_POLL_INTERVAL_MS)
  }

  private async scanBlocks() {
    if (!this.provider || this.monitoredContracts.size === 0) return

    try {
      const currentBlock = await this.provider.getBlockNumber()
      
      if (this.lastProcessedBlock === 0) {
        this.lastProcessedBlock = currentBlock - 1
      }

      if (currentBlock <= this.lastProcessedBlock) return

      const fromBlock = this.lastProcessedBlock + 1
      const toBlock = Math.min(currentBlock, fromBlock + CONFIG.MAX_BLOCKS_PER_SCAN - 1)

      for (let blockNum = fromBlock; blockNum <= toBlock; blockNum++) {
        const block = await this.provider.getBlock(blockNum, true)
        if (!block) continue

        for (const tx of block.prefetchedTransactions) {
          const to = tx.to?.toLowerCase()
          if (!to || !this.monitoredContracts.has(to)) continue

          const receipt = await this.provider.getTransactionReceipt(tx.hash)
          if (!receipt) continue

          const threat = await this.analyzeTransaction(tx, receipt, block)
          
          if (threat) {
            await this.handleThreat(threat)
          }
        }

        this.lastProcessedBlock = blockNum
      }
    } catch (error) {
      console.error('Scan error:', error)
    }
  }

  private async analyzeTransaction(
    tx: ethers.TransactionResponse,
    receipt: ethers.TransactionReceipt,
    block: ethers.Block
  ): Promise<ThreatEvent | null> {
    const contract = this.monitoredContracts.get(tx.to!.toLowerCase())
    if (!contract) return null

    const threats: string[] = []
    let level: ThreatLevel = 'INFO'
    let confidence = 0.5

    const valueEth = Number(ethers.formatEther(tx.value))

    // Check 1: Flash loan pattern
    const input = (tx.data || '').toLowerCase()
    const hasFlashLoan = CONFIG.THRESHOLDS.FLASH_LOAN_SIGS.some(sig => input.includes(sig.slice(2)))

    if (hasFlashLoan) {
      threats.push('Flash loan pattern detected')
      level = 'CRITICAL'
      confidence = 0.95
    }

    // Check 2: Large transfer
    if (valueEth > CONFIG.THRESHOLDS.LARGE_TRANSFER_ETH) {
      threats.push(`Large transfer: ${valueEth.toFixed(2)} ETH`)
      level = level === 'CRITICAL' ? 'CRITICAL' : 'HIGH'
      confidence = Math.max(confidence, 0.8)
    }

    // Check 3: High gas usage
    const gasUsed = Number(receipt.gasUsed)
    if (gasUsed > CONFIG.THRESHOLDS.HIGH_GAS) {
      threats.push(`High gas usage: ${gasUsed.toLocaleString()}`)
      level = level === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM'
      confidence = Math.max(confidence, 0.7)
    }

    // Check 4: Multiple transfers
    const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    const transferEvents = receipt.logs.filter(log => log.topics[0] === transferTopic)

    if (transferEvents.length > CONFIG.THRESHOLDS.MULTIPLE_TRANSFERS) {
      threats.push(`Multiple transfers (${transferEvents.length}): Possible drain`)
      level = level === 'CRITICAL' ? 'CRITICAL' : 'HIGH'
      confidence = Math.max(confidence, 0.85)
    }

    // Check 5: Multiple internal calls
    const internalCalls = receipt.logs.filter(log => log.address.toLowerCase() === tx.to!.toLowerCase()).length

    if (internalCalls > CONFIG.THRESHOLDS.REENTRANCY_MAX_CALLS) {
      threats.push(`Multiple internal calls (${internalCalls}): Possible reentrancy`)
      level = 'CRITICAL'
      confidence = 0.9
    }

    if (threats.length === 0) return null

    let action: ThreatEvent['action'] = 'LOGGED'
    if (level === 'CRITICAL') action = 'CRE_TRIGGERED'
    else if (level === 'HIGH') action = 'ALERTED'

    return {
      id: `${tx.hash}-${Date.now()}`,
      timestamp: Date.now(),
      level,
      contractAddress: tx.to!,
      txHash: tx.hash,
      from: tx.from,
      to: tx.to!,
      details: threats.join('; '),
      value: valueEth > 0 ? `${valueEth.toFixed(4)} ETH` : undefined,
      confidence,
      blockNumber: block.number,
      gasUsed,
      action,
    }
  }

  private async handleThreat(threat: ThreatEvent) {
    console.log(`⚠️  ${threat.level} threat detected:`, threat.details)

    const contract = this.monitoredContracts.get(threat.contractAddress.toLowerCase())
    if (contract) {
      contract.totalEvents++
      contract.lastActivity = new Date()
    }

    if (this.supabase) {
      await this.supabase.from('threats').insert([threat])
    }

    this.broadcast({ type: 'THREAT_DETECTED', threat })

    // NEW: Multi-tier AI analysis for HIGH and CRITICAL threats
    if ((threat.level === 'CRITICAL' || threat.level === 'HIGH') && this.wallet) {
      // Get the transaction data for AI analysis
      const tx = await this.provider!.getTransaction(threat.txHash)
      const receipt = await this.provider!.getTransactionReceipt(threat.txHash)
      
      if (tx && receipt) {
        // Run AI analysis asynchronously (don't block)
        this.performAIAnalysis(tx, receipt, threat).catch(console.error)
      }
    }

    // Fallback: Direct pause for CRITICAL threats if AI is not configured
    if (threat.level === 'CRITICAL' && !CONFIG.CRE_CONSUMER_ADDRESS && this.wallet) {
      await this.triggerCRE(threat)
    }
  }

  private async triggerCRE(threat: ThreatEvent) {
    try {
      console.log(`🔄 Triggering CRE for ${threat.contractAddress}...`)

      // For now, execute direct pause (can add Functions integration later)
      const guardian = new ethers.Contract(
        CONFIG.GUARDIAN_ADDRESS,
        EmergencyGuardianAbi.abi,
        this.wallet
      )

      const tx = await guardian.emergencyPause(
        threat.contractAddress,
        threat.txHash as `0x${string}`,
        { gasLimit: 500000 }
      )

      console.log(`⏳ Pause tx sent: ${tx.hash}`)
      const receipt = await tx.wait()
      console.log(`✅ Pause executed in block ${receipt?.blockNumber}`)

      this.broadcast({
        type: 'CRE_PAUSE_EXECUTED',
        contractAddress: threat.contractAddress,
        txHash: tx.hash,
        blockNumber: receipt?.blockNumber
      })

    } catch (error: any) {
      console.error('❌ CRE trigger failed:', error.message)
    }
  }

  /**
   * AI Analysis Flow
   * Multi-tier threat detection with Grok AI via Chainlink CRE
   */
  private async performAIAnalysis(
    tx: ethers.TransactionResponse,
    receipt: ethers.TransactionReceipt,
    threat: ThreatEvent
  ): Promise<void> {
    try {
      // Check if we have CRE configured
      if (!CONFIG.CRE_CONSUMER_ADDRESS || !this.wallet) {
        console.log('⚠️  CRE not configured, skipping AI analysis')
        return
      }

      // Step 1: Calculate detailed heuristic score
      const heuristic = calculateHeuristicScore(tx, receipt, [])
      
      console.log(`📊 Heuristic Score: ${(heuristic.score * 100).toFixed(1)}%`)
      console.log(`🚩 Flags: ${heuristic.flags.join(', ')}`)

      // Step 2: Check if AI analysis should be triggered
      if (!heuristic.shouldTriggerAI) {
        console.log('✅ Heuristics below AI trigger threshold, no AI analysis needed')
        return
      }

      console.log('🤖 Triggering AI analysis via Chainlink CRE...')

      // Step 3: Build AI prompt
      const aiRequest = {
        contractAddress: threat.contractAddress,
        txHash: threat.txHash,
        from: threat.from,
        to: threat.to || '',
        value: tx.value.toString(),
        data: tx.data || '',
        gasUsed: Number(receipt.gasUsed),
        heuristicScore: heuristic.score,
        heuristicFlags: heuristic.flags,
        timestamp: Date.now()
      }

      const prompt = buildAIPrompt(aiRequest)

      // Step 4: Call Grok AI via CRE
      const aiResult: AIAnalysisResult = await callGrokAI(
        prompt,
        CONFIG.CRE_CONSUMER_ADDRESS,
        this.wallet
      )

      // Step 5: Broadcast AI result
      this.broadcast({
        type: 'AI_ANALYSIS_COMPLETE',
        contractAddress: threat.contractAddress,
        threatDetected: aiResult.threatDetected,
        confidence: aiResult.confidence,
        severity: aiResult.severity,
        attackType: aiResult.attackType,
        recommendedAction: aiResult.recommendedAction
      })

      // Step 6: Execute recommended action
      if (aiResult.recommendedAction === 'PAUSE' && aiResult.confidence >= 0.85) {
        console.log(`🚨 AI recommends PAUSE with ${(aiResult.confidence * 100).toFixed(0)}% confidence`)
        
        const guardian = new ethers.Contract(
          CONFIG.GUARDIAN_ADDRESS,
          EmergencyGuardianAbi.abi,
          this.wallet
        )

        await executeAIResponse(aiResult, threat.contractAddress, guardian, this.wallet)
        
        this.broadcast({
          type: 'AI_PAUSE_EXECUTED',
          contractAddress: threat.contractAddress,
          attackType: aiResult.attackType,
          confidence: aiResult.confidence
        })
      } else if (aiResult.recommendedAction === 'ALERT') {
        console.log(`⚠️  AI ALERT: ${aiResult.explanation}`)
      }

    } catch (error: any) {
      console.error('❌ AI Analysis failed:', error.message)
      // Fall back to heuristic-based response
      if (threat.level === 'CRITICAL') {
        console.log('🔄 Falling back to heuristic-based pause')
        await this.triggerCRE(threat)
      }
    }
  }

  private startWebSocketServer() {
    this.wss = new WebSocketServer({ port: CONFIG.WS_PORT })
    
    this.wss.on('connection', (ws) => {
      console.log('🔌 WebSocket client connected')
      this.clients.add(ws)
      
      ws.send(JSON.stringify({
        type: 'INIT',
        contracts: Array.from(this.monitoredContracts.values()),
        lastBlock: this.lastProcessedBlock,
      }))

      ws.on('close', () => this.clients.delete(ws))
      ws.on('error', (error) => {
        console.error('WebSocket error:', error)
        this.clients.delete(ws)
      })
    })

    console.log(`   WebSocket server on port ${CONFIG.WS_PORT}`)
  }

  private startAPIServer() {
    this.app = express()
    this.app.use(express.json())

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        isRunning: this.isRunning,
        contractsCount: this.monitoredContracts.size,
        lastBlock: this.lastProcessedBlock,
        timestamp: new Date().toISOString()
      })
    })

    // Status endpoint
    this.app.get('/api/v1/status', (req, res) => {
      res.json({
        status: 'ok',
        guardian: CONFIG.GUARDIAN_ADDRESS,
        creConsumer: CONFIG.CRE_CONSUMER_ADDRESS,
        contractsMonitored: this.monitoredContracts.size,
        hasWallet: !!this.wallet,
        timestamp: new Date().toISOString()
      })
    })

    // Pause router
    this.app.use('/api/v1', createPauseRouter())

    this.app.listen(CONFIG.API_PORT, () => {
      console.log(`   API server on port ${CONFIG.API_PORT}`)
    })
  }

  private broadcast(data: any) {
    // Rate limit: max 10 messages per second
    const now = Date.now()
    this.messageTimestamps = this.messageTimestamps.filter(ts => now - ts < 1000)
    
    if (this.messageTimestamps.length >= CONFIG.MAX_WS_MESSAGES_PER_SEC) {
      console.log('⏳ WebSocket broadcast rate limited')
      return
    }
    
    this.messageTimestamps.push(now)
    
    const message = JSON.stringify(data)
    this.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message)
      }
    })
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      contractsCount: this.monitoredContracts.size,
      lastProcessedBlock: this.lastProcessedBlock,
      clientsCount: this.clients.size,
    }
  }
}

// Start the node
const node = new SentinelNode()

process.on('SIGINT', async () => {
  console.log('\nShutting down...')
  await node.stop()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await node.stop()
  process.exit(0)
})

node.start().catch(error => {
  console.error('Failed to start Sentinel Node:', error)
  process.exit(1)
})

export default node
