#!/usr/bin/env node
/**
 * Sentinel Node Service - Optimized Version
 * 
 * Monitors blockchain for suspicious transactions with minimal resource usage.
 * Triggers CRE workflow for AI analysis when threats detected.
 */

import WebSocket, { WebSocketServer } from 'ws';
import { ethers } from 'ethers';
import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { EventEmitter } from 'events';

dotenv.config();

// Configuration
const CONFIG = {
  WS_PORT: parseInt(process.env.WS_PORT || '9000'),
  API_PORT: parseInt(process.env.API_PORT || '9001'),
  RPC_URL: process.env.SEPOLIA_RPC || 'https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH',
  WSS_URL: process.env.SEPOLIA_WSS || 'wss://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH',
  GUARDIAN_ADDRESS: process.env.GUARDIAN_ADDRESS || '0x0000000000000000000000000000000000000000',
  REGISTRY_ADDRESS: process.env.REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000',
  PRIVATE_KEY: process.env.SENTINEL_PRIVATE_KEY || '',
  CRE_API_URL: process.env.CRE_API_URL || 'http://localhost:3001',
  
  // Resource optimization settings
  POLL_INTERVAL_MS: parseInt(process.env.POLL_INTERVAL_MS || '10000'), // 10 seconds default
  CONTRACT_REFRESH_INTERVAL_MS: parseInt(process.env.CONTRACT_REFRESH_INTERVAL_MS || '60000'), // 1 minute
  MAX_BLOCKS_PER_POLL: parseInt(process.env.MAX_BLOCKS_PER_POLL || '5'), // Max 5 blocks back
  
  // Heuristic thresholds
  SUSPICIOUS_VALUE_ETH: parseFloat(process.env.SUSPICIOUS_VALUE_ETH || '1.0'),
  GAS_PRICE_SPIKE_MULTIPLIER: parseFloat(process.env.GAS_PRICE_SPIKE_MULTIPLIER || '3.0'),
};

// ABIs
const GUARDIAN_ABI = [
  'function emergencyPause(address target, bytes32 vulnerabilityHash) external',
  'function isPaused(address target) view returns (bool)',
  'event EmergencyPauseTriggered(address indexed target, bytes32 indexed vulnHash, uint256 expiresAt, address indexed sentinel)',
];

const REGISTRY_ABI = [
  'function getProtectedCount() view returns (uint256)',
  'function getProtectedContracts(uint256 offset, uint256 limit) view returns (address[])',
  'function getRegistration(address contractAddr) view returns (tuple(bool isActive, uint256 stakedAmount, uint256 registeredAt, address owner, string metadata))',
  'event ContractRegistered(address indexed contractAddr, address indexed owner, uint256 stake, string metadata)',
];

// Types
interface MonitoredContract {
  address: string;
  owner: string;
  stake: string;
  riskScore: number;
  isPaused: boolean;
  registeredAt: number;
  lastActivity: number;
}

interface ThreatEvent {
  id: string;
  type: 'THREAT_DETECTED' | 'PAUSE_TRIGGERED' | 'ANALYSIS_COMPLETE';
  contractAddress: string;
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  details: string;
  txHash?: string;
  timestamp: number;
  confidence: number;
  analysis?: any;
}

interface ClientMessage {
  type: 'SUBSCRIBE' | 'UNSUBSCRIBE' | 'PING';
  contractAddress?: string;
}

// Sentinel Node Class
class SentinelNode extends EventEmitter {
  private provider: ethers.Provider;
  private wallet?: ethers.Wallet;
  private guardian?: ethers.Contract;
  private registry?: ethers.Contract;
  private monitoredContracts: Map<string, MonitoredContract> = new Map();
  private clients: Set<WebSocket> = new Set();
  private isRunning: boolean = false;
  private lastBlock: number = 0;
  private baselineGasPrice: bigint = BigInt(0);
  private wss?: WebSocketServer;
  
  // Resource optimization
  private pollInterval?: NodeJS.Timeout;
  private contractRefreshInterval?: NodeJS.Timeout;
  private lastContractRefresh: number = 0;
  private processedTxHashes: Set<string> = new Set();
  private maxProcessedTxCache: number = 1000;

  constructor() {
    super();
    
    // Use HTTP provider for polling (less resource intensive than WSS for this use case)
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    
    if (CONFIG.PRIVATE_KEY) {
      this.wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, this.provider);
      console.log(`🔑 Sentinel wallet: ${this.wallet.address}`);
    } else {
      console.warn('⚠️ No private key configured - pause functionality disabled');
    }
  }

  async initialize() {
    console.log('🚀 Initializing Sentinel Node...');
    console.log(`⏱️  Poll interval: ${CONFIG.POLL_INTERVAL_MS}ms`);
    console.log(`📦 Max blocks per poll: ${CONFIG.MAX_BLOCKS_PER_POLL}`);
    
    // Initialize contracts
    if (CONFIG.GUARDIAN_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      this.guardian = new ethers.Contract(CONFIG.GUARDIAN_ADDRESS, GUARDIAN_ABI, this.wallet || this.provider);
    }
    
    if (CONFIG.REGISTRY_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      this.registry = new ethers.Contract(CONFIG.REGISTRY_ADDRESS, REGISTRY_ABI, this.provider);
      await this.loadMonitoredContracts();
    }

    // Get baseline gas price
    const feeData = await this.provider.getFeeData();
    this.baselineGasPrice = feeData.gasPrice || BigInt(1000000000);
    
    // Get current block
    this.lastBlock = await this.provider.getBlockNumber();
    console.log(`📦 Starting from block ${this.lastBlock}`);

    // Setup interval-based polling instead of block listeners
    this.setupPolling();
    
    // Setup event listeners for registry (low resource)
    this.setupEventListeners();
    
    console.log('✅ Sentinel Node initialized');
  }

  private setupPolling() {
    // Poll for new blocks at configured interval (default 10 seconds)
    this.pollInterval = setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        const currentBlock = await this.provider.getBlockNumber();
        if (currentBlock <= this.lastBlock) return;
        
        // Limit how many blocks we process at once
        const fromBlock = Math.max(this.lastBlock + 1, currentBlock - CONFIG.MAX_BLOCKS_PER_POLL + 1);
        
        for (let blockNum = fromBlock; blockNum <= currentBlock; blockNum++) {
          await this.checkBlock(blockNum);
          this.lastBlock = blockNum;
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, CONFIG.POLL_INTERVAL_MS);
    
    // Periodically refresh contract list
    this.contractRefreshInterval = setInterval(async () => {
      if (this.registry && Date.now() - this.lastContractRefresh > CONFIG.CONTRACT_REFRESH_INTERVAL_MS) {
        await this.loadMonitoredContracts();
      }
    }, CONFIG.CONTRACT_REFRESH_INTERVAL_MS);
  }

  private setupEventListeners() {
    // Only listen to registry events (low frequency, low resource)
    if (this.registry) {
      this.registry.on('ContractRegistered', (contractAddr: string, owner: string, stake: bigint, metadata: string) => {
        console.log(`📋 New contract registered: ${contractAddr}`);
        this.loadMonitoredContracts();
        this.broadcast({
          type: 'REGISTRATION',
          contractAddress: contractAddr,
          owner,
          stake: ethers.formatEther(stake),
          metadata,
        });
      });
    }

    // Listen for Guardian pause events
    if (this.guardian) {
      this.guardian.on('EmergencyPauseTriggered', (target: string, vulnHash: string, expiresAt: bigint, sentinel: string) => {
        console.log(`🔒 Contract paused by ${sentinel}: ${target}`);
        const contract = this.monitoredContracts.get(target.toLowerCase());
        if (contract) {
          contract.isPaused = true;
          this.monitoredContracts.set(target.toLowerCase(), contract);
        }
        this.broadcast({
          type: 'PAUSE_TRIGGERED',
          contractAddress: target,
          sentinel,
          expiresAt: Number(expiresAt),
        });
      });
    }
  }

  async loadMonitoredContracts() {
    if (!this.registry) return;
    
    try {
      const count = await this.registry.getProtectedCount();
      
      if (count === 0) {
        this.monitoredContracts.clear();
        this.lastContractRefresh = Date.now();
        return;
      }
      
      // Get all contracts
      const addresses = await this.registry.getProtectedContracts(0, 100);
      
      for (const addr of addresses) {
        const reg = await this.registry.getRegistration(addr);
        if (reg.isActive) {
          // Only update if changed or new
          const existing = this.monitoredContracts.get(addr.toLowerCase());
          if (!existing || existing.isPaused !== reg.isPaused) {
            this.monitoredContracts.set(addr.toLowerCase(), {
              address: addr,
              owner: reg.owner,
              stake: ethers.formatEther(reg.stakedAmount),
              riskScore: 0,
              isPaused: false, // Will check actual status
              registeredAt: Number(reg.registeredAt),
              lastActivity: Date.now(),
            });
          }
        } else {
          this.monitoredContracts.delete(addr.toLowerCase());
        }
      }
      
      this.lastContractRefresh = Date.now();
      console.log(`📊 Tracking ${this.monitoredContracts.size} contracts`);
    } catch (error) {
      console.error('Failed to load contracts:', error);
    }
  }

  private async checkBlock(blockNumber: number) {
    try {
      const block = await this.provider.getBlock(blockNumber, true);
      if (!block || !block.prefetchedTransactions) return;

      // Only check transactions to monitored contracts
      const monitoredAddresses = new Set(this.monitoredContracts.keys());
      
      for (const tx of block.prefetchedTransactions) {
        // Skip already processed transactions
        if (this.processedTxHashes.has(tx.hash)) continue;
        this.processedTxHashes.add(tx.hash);
        
        // Maintain cache size
        if (this.processedTxHashes.size > this.maxProcessedTxCache) {
          const first = this.processedTxHashes.values().next().value;
          if (first) this.processedTxHashes.delete(first);
        }
        
        const toAddress = tx.to?.toLowerCase();
        if (!toAddress || !monitoredAddresses.has(toAddress)) continue;

        const contract = this.monitoredContracts.get(toAddress);
        if (!contract || contract.isPaused) continue;

        await this.analyzeTransaction(tx, block, contract);
      }
    } catch (error) {
      console.error(`Error checking block ${blockNumber}:`, error);
    }
  }

  private async analyzeTransaction(
    tx: ethers.TransactionResponse, 
    block: ethers.Block,
    contract: MonitoredContract
  ) {
    const threats: ThreatEvent[] = [];
    const toAddress = tx.to!.toLowerCase();

    // Heuristic 1: Large value transfers
    const valueEth = parseFloat(ethers.formatEther(tx.value));
    if (valueEth > CONFIG.SUSPICIOUS_VALUE_ETH) {
      threats.push({
        id: `threat-${tx.hash}-${Date.now()}`,
        type: 'THREAT_DETECTED',
        contractAddress: toAddress,
        level: 'HIGH',
        details: `Large value transfer: ${valueEth.toFixed(4)} ETH`,
        txHash: tx.hash,
        timestamp: Date.now(),
        confidence: 0.7,
      });
    }

    // Heuristic 2: Gas price spike
    if (tx.gasPrice) {
      const gasPriceMultiplier = Number(tx.gasPrice) / Number(this.baselineGasPrice);
      if (gasPriceMultiplier > CONFIG.GAS_PRICE_SPIKE_MULTIPLIER) {
        threats.push({
          id: `threat-${tx.hash}-${Date.now()}`,
          type: 'THREAT_DETECTED',
          contractAddress: toAddress,
          level: 'MEDIUM',
          details: `Gas price spike: ${gasPriceMultiplier.toFixed(1)}x baseline`,
          txHash: tx.hash,
          timestamp: Date.now(),
          confidence: 0.5,
        });
      }
    }

    // Heuristic 3: Sensitive function calls
    if (tx.data && tx.data.length > 10) {
      const data = tx.data.toLowerCase();
      const suspiciousPatterns = [
        { sig: '0x8da5cb5b', name: 'owner()' },
        { sig: '0xf2fde38b', name: 'transferOwnership(address)' },
        { sig: '0x3659cfe6', name: 'upgradeTo(address)' },
        { sig: '0x4f1ef286', name: 'upgradeToAndCall(address,bytes)' },
      ];
      
      for (const pattern of suspiciousPatterns) {
        if (data.includes(pattern.sig)) {
          threats.push({
            id: `threat-${tx.hash}-${Date.now()}`,
            type: 'THREAT_DETECTED',
            contractAddress: toAddress,
            level: 'HIGH',
            details: `Sensitive function: ${pattern.name}`,
            txHash: tx.hash,
            timestamp: Date.now(),
            confidence: 0.8,
          });
        }
      }
    }

    // If threats detected, trigger CRE analysis
    if (threats.length > 0) {
      for (const threat of threats) {
        this.broadcast({ type: 'THREAT_DETECTED', threat });
        this.emit('threat', threat);
      }

      // Trigger CRE workflow with transaction context
      await this.triggerCREAnalysis(toAddress, tx, threats);
    }
  }

  private async triggerCREAnalysis(
    contractAddress: string, 
    tx: ethers.TransactionResponse,
    threats: ThreatEvent[]
  ) {
    console.log(`🔍 Triggering CRE analysis for ${contractAddress}`);
    console.log(`   TX: ${tx.hash}`);
    console.log(`   Threats: ${threats.map(t => t.level).join(', ')}`);
    
    try {
      // Build transaction context for xAI analysis
      const txContext = {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        gasPrice: tx.gasPrice?.toString(),
        gasLimit: tx.gasLimit?.toString(),
        data: tx.data,
        threatSummary: threats.map(t => ({
          level: t.level,
          details: t.details,
          confidence: t.confidence,
        })),
      };

      // Call CRE API with transaction context
      // The CRE workflow will: 
      // 1. Fetch contract source from Etherscan (if not cached)
      // 2. Send source + transaction context to xAI for analysis
      // 3. Return risk assessment
      const response = await axios.post(`${CONFIG.CRE_API_URL}/scan`, {
        contractAddress,
        chainId: 11155111,
        transactionHash: tx.hash,
        transactionContext: txContext,
        urgency: threats.some(t => t.level === 'CRITICAL') ? 'critical' : 'high',
        // Skip source fetch if we already have analysis cached (optional optimization)
        skipSourceIfCached: true,
      }, {
        timeout: 120000, // 2 minute timeout for AI analysis
      });

      const analysis = response.data;
      console.log(`✅ CRE analysis complete: ${analysis.data?.riskLevel || 'UNKNOWN'}`);

      this.broadcast({
        type: 'ANALYSIS_COMPLETE',
        contractAddress,
        analysis: analysis.data,
      });

      // Auto-pause if critical/high risk
      const riskLevel = analysis.data?.result?.riskLevel || analysis.data?.riskLevel;
      if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
        console.log(`🚨 HIGH RISK - triggering pause for ${contractAddress}`);
        await this.executePause(contractAddress, `0x${'9'.repeat(64)}`);
      }
    } catch (error) {
      console.error('CRE analysis failed:', error);
    }
  }

  async executePause(contractAddress: string, vulnHash: string): Promise<boolean> {
    if (!this.guardian || !this.wallet) {
      console.error('❌ Guardian not configured or no wallet');
      return false;
    }

    try {
      console.log(`🔒 Executing pause for ${contractAddress}...`);
      
      const tx = await this.guardian.emergencyPause(contractAddress, vulnHash);
      console.log(`⏳ Pause transaction: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`✅ Pause executed in block ${receipt?.blockNumber}`);

      const contract = this.monitoredContracts.get(contractAddress.toLowerCase());
      if (contract) {
        contract.isPaused = true;
        this.monitoredContracts.set(contractAddress.toLowerCase(), contract);
      }

      this.broadcast({
        type: 'PAUSE_TRIGGERED',
        contractAddress,
        txHash: tx.hash,
        blockNumber: receipt?.blockNumber,
      });

      return true;
    } catch (error: any) {
      console.error('❌ Pause execution failed:', error.message);
      return false;
    }
  }

  // WebSocket Server
  startWebSocketServer(port: number) {
    this.wss = new WebSocketServer({ port });
    console.log(`📡 WebSocket server on port ${port}`);

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);

      ws.send(JSON.stringify({
        type: 'INIT',
        contracts: Array.from(this.monitoredContracts.values()),
        lastBlock: this.lastBlock,
        isRunning: this.isRunning,
      }));

      ws.on('message', (data) => {
        try {
          const message: ClientMessage = JSON.parse(data.toString());
          if (message.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          }
        } catch (error) {
          console.error('Invalid client message:', error);
        }
      });

      ws.on('close', () => this.clients.delete(ws));
      ws.on('error', () => this.clients.delete(ws));
    });
  }

  private broadcast(data: any) {
    const message = JSON.stringify(data);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // HTTP API
  startHttpServer(port: number) {
    const app = express();
    app.use(express.json());

    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
      next();
    });

    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        isRunning: this.isRunning,
        lastBlock: this.lastBlock,
        contractsMonitored: this.monitoredContracts.size,
        clientsConnected: this.clients.size,
        pollInterval: CONFIG.POLL_INTERVAL_MS,
      });
    });

    app.get('/contracts', (req, res) => {
      res.json({ contracts: Array.from(this.monitoredContracts.values()) });
    });

    app.post('/emergency-pause', async (req, res) => {
      const { target, vulnHash } = req.body;
      if (!target || !vulnHash) {
        return res.status(400).json({ error: 'Missing target or vulnHash' });
      }

      const success = await this.executePause(target, vulnHash);
      res.json({ success });
    });

    app.listen(port, () => {
      console.log(`🌐 HTTP API on port ${port}`);
    });
  }

  async start() {
    await this.initialize();
    this.startWebSocketServer(CONFIG.WS_PORT);
    this.startHttpServer(CONFIG.API_PORT);
    this.isRunning = true;
    
    console.log('🚀 Sentinel Node operational');
    console.log(`   WebSocket: ws://localhost:${CONFIG.WS_PORT}`);
    console.log(`   HTTP API: http://localhost:${CONFIG.API_PORT}`);
  }

  stop() {
    this.isRunning = false;
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.contractRefreshInterval) clearInterval(this.contractRefreshInterval);
    this.wss?.close();
    this.provider.removeAllListeners();
    console.log('🛑 Sentinel Node stopped');
  }
}

// Main
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║      🛡️  SENTINEL NODE v1.1.0 (Optimized)              ║');
  console.log('║      Low-Resource Blockchain Security Monitor          ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log();

  const node = new SentinelNode();

  process.on('SIGINT', () => {
    console.log('\n⚠️  Shutting down...');
    node.stop();
    process.exit(0);
  });

  await node.start();
}

main().catch(console.error);
