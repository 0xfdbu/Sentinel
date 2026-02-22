#!/usr/bin/env node
/**
 * Sentinel Node Service
 * 
 * Monitors blockchain for suspicious transactions,
 * triggers CRE workflow for AI analysis,
 * and executes emergency pauses through Guardian contract.
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
  // Tenderly Gateway - HTTPS for JSON-RPC, WSS for WebSocket
  RPC_URL: process.env.SEPOLIA_RPC || 'https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH',
  WSS_URL: process.env.SEPOLIA_WSS || 'wss://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH',
  GUARDIAN_ADDRESS: process.env.GUARDIAN_ADDRESS || '0x0000000000000000000000000000000000000000',
  REGISTRY_ADDRESS: process.env.REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000',
  PRIVATE_KEY: process.env.SENTINEL_PRIVATE_KEY || '',
  CRE_API_URL: process.env.CRE_API_URL || 'http://localhost:3001',
  // Heuristic thresholds
  SUSPICIOUS_VALUE_ETH: parseFloat(process.env.SUSPICIOUS_VALUE_ETH || '1.0'),
  GAS_PRICE_SPIKE_MULTIPLIER: parseFloat(process.env.GAS_PRICE_SPIKE_MULTIPLIER || '3.0'),
};

// ABIs (minimal)
const GUARDIAN_ABI = [
  'function emergencyPause(address target, bytes32 vulnerabilityHash) external',
  'function isPaused(address target) view returns (bool)',
  'event EmergencyPauseTriggered(address indexed target, bytes32 indexed vulnHash, uint256 expiresAt, address indexed sentinel)',
];

const REGISTRY_ABI = [
  'function getProtectedCount() view returns (uint256)',
  'function getProtectedContracts(uint256 offset, uint256 limit) view returns (address[])',
  'function getRegistration(address contractAddr) view returns (tuple(bool isActive, uint256 stakedAmount, uint256 registeredAt, address owner, string metadata))',
  'function isRegistered(address contractAddr) view returns (bool)',
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
  private wsProvider?: ethers.WebSocketProvider;
  private wallet?: ethers.Wallet;
  private guardian?: ethers.Contract;
  private registry?: ethers.Contract;
  private monitoredContracts: Map<string, MonitoredContract> = new Map();
  private clients: Set<WebSocket> = new Set();
  private isRunning: boolean = false;
  private lastBlock: number = 0;
  private baselineGasPrice: bigint = BigInt(0);
  private wss?: WebSocketServer;

  constructor() {
    super();
    
    // Use WebSocket provider for real-time block monitoring if WSS_URL is set
    if (CONFIG.WSS_URL && CONFIG.WSS_URL.startsWith('wss://')) {
      console.log(`🔗 Using WebSocket provider: ${CONFIG.WSS_URL.replace(/\/[^/]*$/, '/...')}`);
      this.wsProvider = new ethers.WebSocketProvider(CONFIG.WSS_URL);
      this.provider = this.wsProvider;
    } else {
      console.log(`🔗 Using HTTP provider: ${CONFIG.RPC_URL.replace(/\/[^/]*$/, '/...')}`);
      this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    }
    
    if (CONFIG.PRIVATE_KEY) {
      this.wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, this.provider);
      console.log(`🔑 Sentinel wallet: ${this.wallet.address}`);
    } else {
      console.warn('⚠️ No private key configured - pause functionality disabled');
    }
  }

  async initialize() {
    console.log('🚀 Initializing Sentinel Node...');
    
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

    // Setup event listeners
    this.setupEventListeners();
    
    console.log('✅ Sentinel Node initialized');
  }

  private setupEventListeners() {
    // Listen for new blocks
    this.provider.on('block', async (blockNumber) => {
      this.lastBlock = blockNumber;
      await this.checkBlock(blockNumber);
    });

    // Listen for registry events
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
      console.log(`📊 Loading ${count} monitored contracts...`);
      
      if (count === 0) {
        console.log('ℹ️ No contracts registered yet');
        return;
      }
      
      // Get all contracts (up to 100 at a time)
      const addresses = await this.registry.getProtectedContracts(0, 100);
      
      for (const addr of addresses) {
        const reg = await this.registry.getRegistration(addr);
        if (reg.isActive) {
          this.monitoredContracts.set(addr.toLowerCase(), {
            address: addr,
            owner: reg.owner,
            stake: ethers.formatEther(reg.stakedAmount),
            riskScore: 0, // Not stored in registry, would need risk oracle
            isPaused: false, // Would need to check Guardian
            registeredAt: Number(reg.registeredAt),
            lastActivity: Number(reg.registeredAt), // Use registeredAt as fallback
          });
        }
      }
      
      console.log(`✅ Loaded ${this.monitoredContracts.size} active contracts`);
    } catch (error) {
      console.error('❌ Failed to load contracts:', error);
    }
  }

  private async checkBlock(blockNumber: number) {
    try {
      const block = await this.provider.getBlock(blockNumber, true);
      if (!block) return;

      // Check each transaction
      for (const tx of block.prefetchedTransactions) {
        await this.analyzeTransaction(tx, block);
      }
    } catch (error) {
      console.error(`Error checking block ${blockNumber}:`, error);
    }
  }

  private async analyzeTransaction(tx: ethers.TransactionResponse, block: ethers.Block) {
    const toAddress = tx.to?.toLowerCase();
    if (!toAddress) return;

    // Check if transaction is to a monitored contract
    const contract = this.monitoredContracts.get(toAddress);
    if (!contract) return;

    // Skip if already paused
    if (contract.isPaused) return;

    const threats: ThreatEvent[] = [];

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

    // Heuristic 2: Gas price spike (potential front-running)
    if (tx.gasPrice) {
      const gasPriceMultiplier = Number(tx.gasPrice) / Number(this.baselineGasPrice);
      if (gasPriceMultiplier > CONFIG.GAS_PRICE_SPIKE_MULTIPLIER) {
        threats.push({
          id: `threat-${tx.hash}-${Date.now()}`,
          type: 'THREAT_DETECTED',
          contractAddress: toAddress,
          level: 'MEDIUM',
          details: `Gas price spike: ${gasPriceMultiplier.toFixed(1)}x baseline (possible front-running)`,
          txHash: tx.hash,
          timestamp: Date.now(),
          confidence: 0.5,
        });
      }
    }

    // Heuristic 3: Check transaction data for suspicious patterns
    if (tx.data && tx.data.length > 10) {
      const data = tx.data.toLowerCase();
      // Look for common function signatures that might be suspicious
      const suspiciousPatterns = [
        { sig: '0x8da5cb5b', name: 'owner()' },
        { sig: '0xf2fde38b', name: 'transferOwnership(address)' },
        { sig: '0x3659cfe6', name: 'upgradeTo(address)' },
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
            confidence: 0.6,
          });
        }
      }
    }

    // If threats detected, trigger CRE analysis
    if (threats.length > 0) {
      // Broadcast threats immediately
      for (const threat of threats) {
        this.broadcast({ type: 'THREAT_DETECTED', threat });
        this.emit('threat', threat);
      }

      // Trigger deep analysis via CRE
      await this.triggerCREAnalysis(toAddress, tx.hash!, threats);
    }
  }

  private async triggerCREAnalysis(contractAddress: string, txHash: string, initialThreats: ThreatEvent[]) {
    console.log(`🔍 Triggering CRE analysis for ${contractAddress}`);
    
    try {
      // Call CRE API for deep analysis
      const response = await axios.post(`${CONFIG.CRE_API_URL}/scan`, {
        contractAddress,
        chainId: 11155111, // Sepolia
        transactionHash: txHash,
        urgency: initialThreats.some(t => t.level === 'CRITICAL') ? 'critical' : 'high',
      }, {
        timeout: 60000,
      });

      const analysis = response.data;
      console.log(`✅ CRE analysis complete: ${analysis.data?.riskLevel || 'UNKNOWN'}`);

      // Broadcast analysis result
      this.broadcast({
        type: 'ANALYSIS_COMPLETE',
        contractAddress,
        analysis: analysis.data,
      });

      // If high/critical risk, trigger pause
      const riskLevel = analysis.data?.result?.riskLevel || analysis.data?.riskLevel;
      if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
        console.log(`🚨 HIGH RISK detected - triggering pause for ${contractAddress}`);
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

      // Execute pause (onlySentinel modifier will check authorization)
      const tx = await this.guardian.emergencyPause(contractAddress, vulnHash);
      console.log(`⏳ Pause transaction: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`✅ Pause executed in block ${receipt?.blockNumber}`);

      // Update local state
      const contract = this.monitoredContracts.get(contractAddress.toLowerCase());
      if (contract) {
        contract.isPaused = true;
        this.monitoredContracts.set(contractAddress.toLowerCase(), contract);
      }

      // Broadcast
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
    
    console.log(`📡 WebSocket server started on port ${port}`);

    this.wss.on('connection', (ws) => {
      console.log('🔗 Client connected');
      this.clients.add(ws);

      // Send initial state
      ws.send(JSON.stringify({
        type: 'INIT',
        contracts: Array.from(this.monitoredContracts.values()),
        lastBlock: this.lastBlock,
        isRunning: this.isRunning,
      }));

      ws.on('message', (data) => {
        try {
          const message: ClientMessage = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (error) {
          console.error('Invalid client message:', error);
        }
      });

      ws.on('close', () => {
        console.log('🔌 Client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }

  private handleClientMessage(ws: WebSocket, message: ClientMessage) {
    switch (message.type) {
      case 'PING':
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        break;
      case 'SUBSCRIBE':
        if (message.contractAddress) {
          console.log(`📌 Client subscribed to ${message.contractAddress}`);
        }
        break;
      case 'UNSUBSCRIBE':
        if (message.contractAddress) {
          console.log(`📌 Client unsubscribed from ${message.contractAddress}`);
        }
        break;
    }
  }

  private broadcast(data: any) {
    const message = JSON.stringify(data);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // HTTP API for emergency pause
  startHttpServer(port: number) {
    const app = express();
    app.use(express.json());

    // CORS middleware
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
      next();
    });

    // Health check
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        isRunning: this.isRunning,
        lastBlock: this.lastBlock,
        contractsMonitored: this.monitoredContracts.size,
        clientsConnected: this.clients.size,
      });
    });

    // Get monitored contracts
    app.get('/contracts', (req, res) => {
      res.json({
        contracts: Array.from(this.monitoredContracts.values()),
      });
    });

    // Emergency pause endpoint
    app.post('/emergency-pause', async (req, res) => {
      const { target, vulnHash, source } = req.body;
      
      if (!target || !vulnHash) {
        return res.status(400).json({ error: 'Missing target or vulnHash' });
      }

      console.log(`🚨 Emergency pause request from ${source || 'unknown'} for ${target}`);
      
      const success = await this.executePause(target, vulnHash);
      
      if (success) {
        res.json({ success: true, message: 'Pause executed' });
      } else {
        res.status(500).json({ error: 'Pause execution failed' });
      }
    });

    // Trigger scan manually
    app.post('/scan', async (req, res) => {
      const { contractAddress } = req.body;
      
      if (!contractAddress) {
        return res.status(400).json({ error: 'Missing contractAddress' });
      }

      try {
        await this.triggerCREAnalysis(contractAddress, '0x', []);
        res.json({ success: true, message: 'Scan triggered' });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.listen(port, () => {
      console.log(`🌐 HTTP API server started on port ${port}`);
    });
  }

  // Start everything
  async start() {
    await this.initialize();
    this.startWebSocketServer(CONFIG.WS_PORT);
    this.startHttpServer(CONFIG.API_PORT);
    this.isRunning = true;
    
    console.log('🚀 Sentinel Node fully operational');
    console.log(`   WebSocket: ws://localhost:${CONFIG.WS_PORT}`);
    console.log(`   HTTP API: http://localhost:${CONFIG.API_PORT}`);
  }

  stop() {
    this.isRunning = false;
    this.wss?.close();
    this.provider.removeAllListeners();
    console.log('🛑 Sentinel Node stopped');
  }
}

// Main
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║           🛡️  SENTINEL NODE SERVICE v1.0.0             ║');
  console.log('║     Autonomous Blockchain Security Monitor             ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log();

  const node = new SentinelNode();

  // Handle shutdown gracefully
  process.on('SIGINT', () => {
    console.log('\n⚠️  Shutting down...');
    node.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    node.stop();
    process.exit(0);
  });

  await node.start();
}

main().catch(console.error);
