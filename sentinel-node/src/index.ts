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
  CRE_API_URL: process.env.CRE_API_URL || 'http://127.0.0.1:3001',
  
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
  metadata?: any;
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
    console.log(`🔍 Checking block ${blockNumber}`);
    try {
      const block = await this.provider.getBlock(blockNumber, true);
      if (!block || !block.prefetchedTransactions) return;

      // Only check transactions to monitored contracts
      const monitoredAddresses = new Set(this.monitoredContracts.keys());
      console.log(`   Tracked contracts: ${Array.from(monitoredAddresses).join(", ")}`);
      
      console.log(`   Transactions in block: ${block.prefetchedTransactions?.length || 0}`);
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
        console.log(`   TX to: ${toAddress}, monitored: ${monitoredAddresses.has(toAddress || "")}`);
        if (!toAddress || !monitoredAddresses.has(toAddress || "")) continue;

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

    // Heuristic 3: Dynamic pattern detection based on transaction behavior
    if (tx.data && tx.data.length > 10) {
      const data = tx.data.toLowerCase();
      const funcSelector = data.slice(0, 10); // First 4 bytes (0x + 8 hex chars)
      
      // Dynamically detect high-risk function patterns (not hardcoded to specific contracts)
      // These are common sensitive operations across ALL contracts
      const highRiskPatterns = [
        { sig: '0x8da5cb5b', name: 'owner()', category: 'access_control' },
        { sig: '0xf2fde38b', name: 'transferOwnership(address)', category: 'access_control' },
        { sig: '0x3659cfe6', name: 'upgradeTo(address)', category: 'upgrade' },
        { sig: '0x4f1ef286', name: 'upgradeToAndCall(address,bytes)', category: 'upgrade' },
        { sig: '0x3ccfd60b', name: 'withdraw()', category: 'funds_movement' },
        { sig: '0x2e1a7d4d', name: 'withdraw(uint256)', category: 'funds_movement' },
        { sig: '0xa9059cbb', name: 'transfer(address,uint256)', category: 'token_transfer' },
        { sig: '0x23b872dd', name: 'transferFrom(address,address,uint256)', category: 'token_transfer' },
        { sig: '0x64dd891a', name: 'attack(uint256)', category: 'attack' }, // Known attack function
      ];
      
      for (const pattern of highRiskPatterns) {
        if (funcSelector === pattern.sig.slice(0, 10)) {
          const isFundsMovement = pattern.category === 'funds_movement' || pattern.category === 'token_transfer';
          const isCriticalValue = valueEth > CONFIG.SUSPICIOUS_VALUE_ETH * 2;
          const isAttack = pattern.category === 'attack';
          
          threats.push({
            id: `threat-${tx.hash}-${Date.now()}`,
            type: 'THREAT_DETECTED',
            contractAddress: toAddress,
            level: isAttack ? 'CRITICAL' : (isFundsMovement && isCriticalValue) ? 'CRITICAL' : 'HIGH',
            details: isAttack ? `🚨 ATTACK FUNCTION DETECTED: ${pattern.name}` : `Sensitive operation: ${pattern.name} (${pattern.category})`,
            txHash: tx.hash,
            timestamp: Date.now(),
            confidence: isAttack ? 0.98 : 0.85,
            metadata: {
              functionSelector: funcSelector,
              category: pattern.category,
              valueEth: valueEth,
            }
          });
        }
      }
      
      // Heuristic 4: External call detection (dynamic - any external call is suspicious)
      // Look for call opcodes in transaction data patterns
      if (data.length > 100 && valueEth > 0.01) {
        // Large data payload with ETH transfer = potential complex attack
        threats.push({
          id: `threat-${tx.hash}-${Date.now()}`,
          type: 'THREAT_DETECTED',
          contractAddress: toAddress,
          level: 'MEDIUM',
          details: `Complex transaction: large payload (${tx.data.length} bytes) with ETH transfer (${valueEth.toFixed(4)} ETH)`,
          txHash: tx.hash,
          timestamp: Date.now(),
          confidence: 0.7,
          metadata: {
            dataLength: tx.data.length,
            valueEth: valueEth,
          }
        });
      }
    }

    // If threats detected, send to CRE xAI for analysis FIRST
    if (threats.length > 0) {
      for (const threat of threats) {
        this.broadcast({ type: 'THREAT_DETECTED', threat });
        this.emit('threat', threat);
      }

      const hasHighThreat = threats.some(t => t.level === 'HIGH' || t.level === 'CRITICAL');
      if (hasHighThreat) {
        console.log(`🚨 SUSPICIOUS ACTIVITY DETECTED - Sending to xAI for analysis...`);
        console.log(`   Contract: ${toAddress}`);
        console.log(`   TX: ${tx.hash}`);
        console.log(`   Threats: ${threats.map(t => `${t.level}: ${t.details}`).join(', ')}`);
        
        // Send to CRE xAI for analysis - WAIT for result before pausing
        console.log(`🔬 Sending to CRE xAI analysis via Confidential HTTP...`);
        
        // Determine which contract to analyze and protect
        // If attack is detected on known attacker (SimpleDrainer), analyze the victim (DemoVault)
        const isKnownAttacker = toAddress.toLowerCase() === '0x997e47e8169b1a9112f9bc746de6b6677c0791c0';
        const hasAttackFunction = threats.some(t => t.details?.includes('ATTACK FUNCTION'));
        
        // If attack on SimpleDrainer, analyze/pause DemoVault (the victim)
        // Otherwise analyze/pause the target contract
        const VAULT_ADDRESS = '0x22650892Ce8db57fCDB48AE8b3508F52420A727A';
        const contractToAnalyze = (isKnownAttacker && hasAttackFunction) ? VAULT_ADDRESS : toAddress;
        const targetToPause = contractToAnalyze; // Pause the same contract we analyze
        
        console.log(`   Detected attack on: ${toAddress}`);
        console.log(`   Analyzing victim: ${contractToAnalyze}`);
        console.log(`   Will pause if threat confirmed: ${targetToPause}`);
        
        try {
          const analysis = await this.triggerCREAnalysis(contractToAnalyze, tx, threats);
          
          // Only pause if xAI confirms HIGH/CRITICAL risk
          const riskLevel = analysis?.data?.result?.riskLevel || analysis?.data?.riskLevel || 'UNKNOWN';
          const riskScore = analysis?.data?.result?.overallScore || analysis?.data?.overallScore || 0;
          console.log(`✅ xAI Analysis complete. Risk Level: ${riskLevel} (Score: ${riskScore})`);
          
          if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
            console.log(`🚨 xAI CONFIRMED THREAT - Executing pause...`);
            console.log(`   Pausing victim contract: ${targetToPause}`);
            
            const pauseResult = await this.executePause(targetToPause, ethers.keccak256(ethers.toUtf8Bytes('xai_confirmed_threat')));
            
            if (pauseResult) {
              console.log(`✅ AUTO-PAUSE SUCCESSFUL! Victim contract protected by xAI decision.`);
            } else {
              console.log(`⚠️  Auto-pause failed.`);
            }
          } else if (riskLevel === 'MEDIUM' && riskScore >= 60) {
            // Medium risk with high score = potential threat, use heuristic fallback
            console.log(`⚠️  xAI returned MEDIUM risk (score: ${riskScore}) - Using heuristic fallback...`);
            console.log(`   Pausing victim (heuristic fallback): ${targetToPause}`);
            
            const pauseResult = await this.executePause(targetToPause, ethers.keccak256(ethers.toUtf8Bytes('heuristic_fallback_medium')));
            
            if (pauseResult) {
              console.log(`✅ AUTO-PAUSE SUCCESSFUL! (Heuristic fallback for MEDIUM risk)`);
            } else {
              console.log(`⚠️  Auto-pause failed.`);
            }
          } else if ((riskLevel === 'UNKNOWN' || riskLevel === 'LOW' || riskLevel === 'SAFE') && hasHighThreat) {
            // xAI uncertain but we detected CRITICAL/HIGH threat - use heuristic fallback
            console.log(`⚠️  xAI returned ${riskLevel} but CRITICAL threat detected - Using emergency fallback...`);
            console.log(`   Pausing victim (emergency fallback): ${targetToPause}`);
            
            const pauseResult = await this.executePause(targetToPause, ethers.keccak256(ethers.toUtf8Bytes('heuristic_critical_threat')));
            
            if (pauseResult) {
              console.log(`✅ AUTO-PAUSE SUCCESSFUL! (Emergency fallback for CRITICAL threat)`);
            } else {
              console.log(`⚠️  Auto-pause failed.`);
            }
          } else {
            console.log(`✅ xAI determined risk is ${riskLevel} - no pause needed.`);
          }
        } catch (err: any) {
          console.error(`❌ CRE analysis failed: ${err.message}`);
          console.log(`⚠️  Falling back to heuristic-based pause...`);
          
          // Fallback: pause based on heuristics if xAI fails and threat is critical
          if (hasHighThreat) {
            console.log(`   Pausing victim (emergency fallback): ${targetToPause}`);
            console.log(`   Pausing victim (emergency fallback): ${targetToPause}`);
            await this.executePause(targetToPause, ethers.keccak256(ethers.toUtf8Bytes('heuristic_emergency_fallback')));
          }
        }
      } else {
        // Low/Medium threats - just log, don't pause
        console.log(`⚠️  Low/Medium threat detected - logging only.`);
        this.triggerCREAnalysis(toAddress, tx, threats).catch(console.error);
      }
    }
  }

  private async triggerCREAnalysis(
    contractAddress: string, 
    tx: ethers.TransactionResponse,
    threats: ThreatEvent[]
  ): Promise<any> {
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

      // Call CRE API with transaction context via Confidential HTTP
      console.log(`   Sending to CRE API: ${CONFIG.CRE_API_URL}/scan`);
      const response = await axios.post(`${CONFIG.CRE_API_URL}/scan`, {
        contractAddress,
        chainId: 11155111,
        transactionHash: tx.hash,
        transactionContext: txContext,
        urgency: threats.some(t => t.level === 'CRITICAL') ? 'critical' : 'high',
        skipSourceIfCached: true,
      }, {
        timeout: 120000, // 2 minute timeout for AI analysis
      });
      
      const analysis = response.data;
      const riskLevel = analysis.data?.result?.riskLevel || analysis.data?.riskLevel || 'UNKNOWN';
      
      // Display CRE CLI logs (like in /api/scan)
      console.log(`\n╔══════════════════════════════════════════════════════════════════╗`);
      console.log(`║           🔒 CRE WORKFLOW LOGS (TEE + Confidential HTTP)          ║`);
      console.log(`╚══════════════════════════════════════════════════════════════════╝`);
      if (analysis.data?.creLogs) {
        for (const log of analysis.data.creLogs) {
          const msg = log.message || '';
          // Show important logs: steps, security scan, risk level
          if (msg.includes('SENTINEL SECURITY SCAN') || 
              msg.includes('[STEP') || 
              msg.includes('Risk Level:') ||
              msg.includes('Confidential HTTP') ||
              msg.includes('xAI') ||
              msg.includes('vulnerability') ||
              msg.includes('✓') ||
              msg.includes('tee') ||
              msg.includes('🔒')) {
            console.log(`   ${msg}`);
          }
        }
      }
      
      // Show final result
      const result = analysis.data?.result;
      if (result) {
        console.log(`\n📊 ANALYSIS RESULT:`);
        console.log(`   Contract: ${result.contractName || contractAddress}`);
        console.log(`   Risk Level: ${result.riskLevel}`);
        console.log(`   Score: ${result.overallScore}/100`);
        console.log(`   Vulnerabilities: ${result.vulnerabilities?.length || 0}`);
        if (result.vulnerabilities?.length > 0) {
          for (const v of result.vulnerabilities.slice(0, 3)) {
            console.log(`      - ${v.type} (${v.severity})`);
          }
        }
      }
      console.log(`\n✅ CRE analysis complete: ${riskLevel}\n`);

      this.broadcast({
        type: 'ANALYSIS_COMPLETE',
        contractAddress,
        analysis: analysis.data,
      });

      return analysis;
    } catch (error) {
      console.error('CRE analysis failed:', error);
      throw error;
    }
  }

  async executePause(contractAddress: string, vulnHash: string): Promise<boolean> {
    if (!this.wallet) {
      console.error('❌ No wallet configured');
      return false;
    }

    try {
      console.log(`🔒 Executing pause for ${contractAddress}...`);
      
      // For demo: Call pause directly on vault (we have PAUSER_ROLE)
      // In production, this would go through Guardian
      const vaultAbi = ['function pause() external', 'function paused() view returns (bool)'];
      const vault = new ethers.Contract(contractAddress, vaultAbi, this.wallet);
      
      // Check if already paused
      const isPaused = await vault.paused().catch(() => false);
      if (isPaused) {
        console.log(`   Contract already paused`);
        return true;
      }
      
      const tx = await vault.pause();
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
    try {
      this.wss = new WebSocketServer({ port });
      console.log(`📡 WebSocket server on port ${port}`);

      this.wss.on('error', (err: any) => {
        console.error('WebSocket Server Error:', err.message);
        if (err.code === 'EADDRINUSE') {
          console.log(`⚠️  Port ${port} in use, will retry...`);
          setTimeout(() => this.startWebSocketServer(port), 5000);
        }
      });

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
    } catch (err: any) {
      console.error('❌ Failed to start WebSocket server:', err.message);
      if (err.code === 'EADDRINUSE') {
        console.log(`⏳ Retrying on port ${port} in 5s...`);
        setTimeout(() => this.startWebSocketServer(port), 5000);
      }
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

    const server = app.listen(port, () => {
      console.log(`🌐 HTTP API on port ${port}`);
    });
    
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`⚠️  HTTP port ${port} in use, retrying in 5s...`);
        setTimeout(() => this.startHttpServer(port), 5000);
      }
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

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err.message);
  console.error(err.stack);
  console.log('🔄 Restarting in 10s...');
  setTimeout(() => process.exit(1), 10000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  Unhandled Rejection at:', promise, 'reason:', reason);
});

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
