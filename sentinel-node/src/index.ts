#!/usr/bin/env node
/**
 * Sentinel Node - AI-Powered Blockchain Security
 * 
 * Monitors mempool for attacks, runs CRE workflow locally, auto-pauses threats.
 */

import WebSocket, { WebSocketServer } from 'ws';
import { ethers } from 'ethers';
import express from 'express';
import dotenv from 'dotenv';
import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

// Configuration
const CONFIG = {
  WS_PORT: parseInt(process.env.WS_PORT || '9000'),
  API_PORT: parseInt(process.env.API_PORT || '9001'),
  RPC_URL: process.env.SEPOLIA_RPC || 'https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH',
  GUARDIAN_ADDRESS: process.env.GUARDIAN_ADDRESS || '0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1',
  REGISTRY_ADDRESS: process.env.REGISTRY_ADDRESS || '0x774B96F8d892A1e4482B52b3d255Fa269136A0E9',
  PRIVATE_KEY: process.env.SENTINEL_PRIVATE_KEY || '',
  CRE_WORKFLOW_PATH: process.env.CRE_WORKFLOW_PATH || join(__dirname, '../../cre-workflow'),
  
  // Polling settings
  POLL_INTERVAL_MS: parseInt(process.env.POLL_INTERVAL_MS || '1000'),
  CONTRACT_REFRESH_INTERVAL_MS: parseInt(process.env.CONTRACT_REFRESH_INTERVAL_MS || '60000'),
  MAX_BLOCKS_PER_POLL: parseInt(process.env.MAX_BLOCKS_PER_POLL || '10'),
  
  // Thresholds
  SUSPICIOUS_VALUE_ETH: parseFloat(process.env.SUSPICIOUS_VALUE_ETH || '0.0001'),
};

// Contract addresses
const VAULT_ADDRESS = '0x22650892Ce8db57fCDB48AE8b3508F52420A727A';
const DRAINER_ADDRESS = '0x997E47e8169b1A9112F9Bc746De6b6677c0791C0';

// ABIs
const GUARDIAN_ABI = [
  'function emergencyPause(address target, bytes32 vulnerabilityHash) external',
  'function isPaused(address target) view returns (bool)',
];

const REGISTRY_ABI = [
  'function getProtectedContracts(uint256 offset, uint256 limit) view returns (address[])',
];

// Types
interface MonitoredContract {
  address: string;
  isPaused: boolean;
}

interface ThreatEvent {
  id: string;
  type: 'THREAT_DETECTED';
  contractAddress: string;
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  details: string;
  txHash: string;
  timestamp: number;
  confidence: number;
  metadata?: any;
}

interface AnalysisResult {
  riskLevel: string;
  overallScore: number;
  vulnerabilities: any[];
  contractName?: string;
}

class SentinelNode extends EventEmitter {
  private provider: ethers.JsonRpcProvider;
  private wallet?: ethers.Wallet;
  private guardian?: ethers.Contract;
  private registry?: ethers.Contract;
  private monitoredContracts: Map<string, MonitoredContract> = new Map();
  private wss?: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private lastCheckedBlock: number = 0;
  private baselineGasPrice: bigint = ethers.parseUnits('10', 'gwei');
  private processedTxHashes: Set<string> = new Set();
  private maxProcessedTxCache: number = 1000;

  constructor() {
    super();
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    if (CONFIG.PRIVATE_KEY) {
      this.wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, this.provider);
    }
    this.guardian = new ethers.Contract(CONFIG.GUARDIAN_ADDRESS, GUARDIAN_ABI, this.wallet || this.provider);
    this.registry = new ethers.Contract(CONFIG.REGISTRY_ADDRESS, REGISTRY_ABI, this.provider);
  }

  async initialize(): Promise<void> {
    console.log('🛡️  Initializing Sentinel Node...\n');
    
    if (!this.wallet) {
      throw new Error('No private key configured');
    }
    
    console.log(`   Wallet: ${this.wallet.address}`);
    
    // Setup monitored contracts
    await this.refreshMonitoredContracts();
    
    // Start polling
    this.startPolling();
    
    // Start WebSocket server
    this.startWebSocketServer();
    
    // Start HTTP API
    this.startHttpApi();
    
    console.log('\n✅ Sentinel Node operational');
    console.log(`   Monitoring ${this.monitoredContracts.size} contracts`);
    console.log(`   Poll interval: ${CONFIG.POLL_INTERVAL_MS}ms`);
  }

  private async refreshMonitoredContracts(): Promise<void> {
    try {
      // Hardcoded for demo - in production fetch from registry
      const addresses = [VAULT_ADDRESS.toLowerCase(), DRAINER_ADDRESS.toLowerCase()];
      
      for (const addr of addresses) {
        const isPaused = await this.guardian!.isPaused(addr).catch(() => false);
        this.monitoredContracts.set(addr, { address: addr, isPaused });
      }
    } catch (error) {
      console.error('Failed to refresh contracts:', error);
    }
  }

  private startPolling(): void {
    const poll = async () => {
      try {
        const currentBlock = await this.provider.getBlockNumber();
        if (currentBlock > this.lastCheckedBlock) {
          const fromBlock = Math.max(currentBlock - CONFIG.MAX_BLOCKS_PER_POLL, this.lastCheckedBlock + 1);
          for (let blockNum = fromBlock; blockNum <= currentBlock; blockNum++) {
            await this.checkBlock(blockNum);
          }
          this.lastCheckedBlock = currentBlock;
        }
      } catch (error) {
        // Silent fail - don't spam logs
      }
      setTimeout(poll, CONFIG.POLL_INTERVAL_MS);
    };
    poll();
  }

  private async checkBlock(blockNumber: number): Promise<void> {
    try {
      const block = await this.provider.getBlock(blockNumber, true);
      if (!block) return;
      
      const monitoredAddrs = new Set(this.monitoredContracts.keys());
      
      for (const tx of block.prefetchedTransactions || []) {
        if (this.processedTxHashes.has(tx.hash)) continue;
        this.processedTxHashes.add(tx.hash);
        
        // Cleanup cache
        if (this.processedTxHashes.size > this.maxProcessedTxCache) {
          const first = this.processedTxHashes.values().next().value;
          if (first) this.processedTxHashes.delete(first);
        }
        
        const toAddress = tx.to?.toLowerCase();
        if (!toAddress || !monitoredAddrs.has(toAddress)) continue;
        
        const contract = this.monitoredContracts.get(toAddress);
        if (!contract || contract.isPaused) continue;
        
        await this.analyzeTransaction(tx, block, contract);
      }
    } catch (error) {
      // Silent fail
    }
  }

  private async analyzeTransaction(tx: ethers.TransactionResponse, block: ethers.Block, contract: MonitoredContract): Promise<void> {
    const threats: ThreatEvent[] = [];
    const toAddress = tx.to!.toLowerCase();
    const valueEth = parseFloat(ethers.formatEther(tx.value));

    // Check for attack patterns
    if (tx.data && tx.data.length >= 10) {
      const funcSelector = tx.data.toLowerCase().slice(0, 10);
      
      // Attack function detection
      if (funcSelector === '0x64dd891a') { // attack(uint256)
        threats.push({
          id: `threat-${tx.hash}-${Date.now()}`,
          type: 'THREAT_DETECTED',
          contractAddress: toAddress,
          level: 'CRITICAL',
          details: '🚨 ATTACK FUNCTION DETECTED: attack(uint256)',
          txHash: tx.hash,
          timestamp: Date.now(),
          confidence: 0.98,
          metadata: { funcSelector }
        });
      }
      
      // Other suspicious patterns
      const suspiciousFuncs: Record<string, string> = {
        '0x3ccfd60b': 'withdraw()',
        '0x2e1a7d4d': 'withdraw(uint256)',
        '0x3659cfe6': 'upgradeTo(address)',
      };
      
      if (suspiciousFuncs[funcSelector] && valueEth > CONFIG.SUSPICIOUS_VALUE_ETH) {
        threats.push({
          id: `threat-${tx.hash}-${Date.now()}`,
          type: 'THREAT_DETECTED',
          contractAddress: toAddress,
          level: 'HIGH',
          details: `Sensitive function: ${suspiciousFuncs[funcSelector]}`,
          txHash: tx.hash,
          timestamp: Date.now(),
          confidence: 0.85,
        });
      }
    }

    // Process threats
    if (threats.length > 0) {
      const hasCritical = threats.some(t => t.level === 'CRITICAL' || t.level === 'HIGH');
      
      if (hasCritical) {
        // Determine victim contract
        const isKnownAttacker = toAddress === DRAINER_ADDRESS.toLowerCase();
        const hasAttack = threats.some(t => t.details?.includes('ATTACK'));
        const victimToAnalyze = (isKnownAttacker && hasAttack) ? VAULT_ADDRESS : toAddress;
        
        console.log('\n🚨 THREAT DETECTED');
        console.log(`   TX: ${tx.hash.slice(0, 20)}...`);
        console.log(`   Target: ${toAddress.slice(0, 20)}...`);
        console.log(`   Victim: ${victimToAnalyze.slice(0, 20)}...`);
        
        // Run CRE workflow locally
        try {
          const analysis = await this.runCREWorkflow(victimToAnalyze, tx, threats);
          await this.handleAnalysisResult(analysis, victimToAnalyze, tx.hash, threats);
        } catch (error) {
          // Fallback to heuristic
          console.log('   ⚠️  CRE failed, using heuristic fallback');
          await this.executePause(victimToAnalyze, ethers.keccak256(ethers.toUtf8Bytes('heuristic_fallback')));
        }
      }
    }
  }

  private async runCREWorkflow(contractAddress: string, tx: ethers.TransactionResponse, threats: ThreatEvent[]): Promise<AnalysisResult> {
    console.log('\n   🔬 Running CRE Workflow (TEE + Confidential HTTP)...');
    console.log('   ┌─────────────────────────────────────────────────────────────┐');
    
    return new Promise((resolve, reject) => {
      // Create config with API keys for CRE runtime
      const config = {
        etherscanApiKey: process.env.ETHERSCAN_API_KEY || '',
        xaiApiKey: process.env.XAI_API_KEY || '',
        xaiModel: process.env.XAI_MODEL || 'grok-4-1-fast-non-reasoning',
      };
      
      const configPath = join(CONFIG.CRE_WORKFLOW_PATH, 'config.json');
      writeFileSync(configPath, JSON.stringify(config, null, 2));
      
      // Build payload
      const payload = JSON.stringify({
        contractAddress,
        chainId: 11155111,
        transactionHash: tx.hash,
        transactionContext: {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: ethers.formatEther(tx.value),
          data: tx.data,
          threatSummary: threats.map(t => ({ level: t.level, details: t.details })),
        },
        urgency: 'critical',
      });
      
      // CRE project root is the parent directory containing project.yaml
      const projectRoot = join(CONFIG.CRE_WORKFLOW_PATH, '..');
      const envFile = join(CONFIG.CRE_WORKFLOW_PATH, '.env');
      
      // Spawn CRE process with proper project context
      const child = spawn('cre', [
        'workflow',
        'simulate',
        CONFIG.CRE_WORKFLOW_PATH,
        '-R', projectRoot,
        '-e', envFile,
        '--target=hackathon-settings',
        '--non-interactive',
        '--trigger-index=0',
        '--http-payload',
        payload,
      ], {
        cwd: CONFIG.CRE_WORKFLOW_PATH,
        env: { ...process.env },
      });
      
      let output = '';
      let errorOutput = '';
      
      // Stream CRE CLI output in real-time
      child.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '').trim(); // Remove ANSI codes
          // Only show important CRE logs
          if (cleanLine.includes('[STEP') || 
              cleanLine.includes('SENTINEL SECURITY SCAN') ||
              cleanLine.includes('Confidential HTTP') ||
              cleanLine.includes('xAI') ||
              cleanLine.includes('Risk Level') ||
              cleanLine.includes('tee') ||
              cleanLine.includes('✓') ||
              cleanLine.includes('🔒')) {
            console.log(`   │ ${cleanLine.slice(0, 58).padEnd(58)} │`);
          }
        }
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => { 
        errorOutput += data.toString(); 
      });
      
      child.on('close', (code) => {
        console.log('   └─────────────────────────────────────────────────────────────┘');
        
        // Parse result from output - CRE returns exit code 0 even on workflow failure
        // Look for the result in the output
        const match = output.match(/Workflow Simulation Result:\s*\n?\s*({[\s\S]*?}|"[\s\S]*?")\s*(?:\n\n|$)/);
        if (match) {
          try {
            // The result might be a JSON string wrapped in quotes with escaped chars
            let resultStr = match[1].trim();
            
            // If it's wrapped in quotes, it's a JSON string that needs unescaping
            if (resultStr.startsWith('"') && resultStr.endsWith('"')) {
              // Parse as JSON string to unescape
              resultStr = JSON.parse(resultStr);
            }
            
            const result = JSON.parse(resultStr);
            
            if (result.status === 'error') {
              reject(new Error(`CRE workflow error: ${result.error}`));
              return;
            }
            
            resolve({
              riskLevel: result.riskLevel || 'UNKNOWN',
              overallScore: result.overallScore || 0,
              vulnerabilities: result.vulnerabilities || [],
              contractName: result.contractName,
            });
          } catch (e) {
            reject(new Error('Failed to parse CRE result'));
          }
        } else if (code !== 0) {
          reject(new Error(`CRE failed: ${errorOutput}`));
        } else {
          reject(new Error('No result found in CRE output'));
        }
      });
    });
  }

  private async handleAnalysisResult(analysis: AnalysisResult, targetAddress: string, txHash: string, threats: ThreatEvent[]): Promise<void> {
    const { riskLevel, overallScore } = analysis;
    
    console.log(`   📊 Risk: ${riskLevel} (Score: ${overallScore})`);
    
    const shouldPause = riskLevel === 'CRITICAL' || riskLevel === 'HIGH' || 
                       (riskLevel === 'MEDIUM' && overallScore >= 60);
    
    if (shouldPause) {
      console.log('   🔒 Executing pause...');
      const pauseResult = await this.executePause(targetAddress, ethers.keccak256(ethers.toUtf8Bytes('sentinel_auto_pause')));
      
      if (pauseResult) {
        console.log('   ✅ AUTO-PAUSE SUCCESSFUL');
        this.monitoredContracts.get(targetAddress)!.isPaused = true;
        this.broadcast({ type: 'PAUSE_TRIGGERED', contractAddress: targetAddress, txHash });
      } else {
        console.log('   ❌ Pause failed');
      }
    } else {
      console.log(`   ℹ️  No pause needed (${riskLevel})`);
    }
  }

  private async executePause(contractAddress: string, vulnHash: string): Promise<boolean> {
    if (!this.wallet) return false;
    
    try {
      const tx = await this.guardian!.emergencyPause(contractAddress, vulnHash, {
        gasLimit: 100000,
      });
      await tx.wait();
      return true;
    } catch (error) {
      return false;
    }
  }

  private startWebSocketServer(): void {
    this.wss = new WebSocketServer({ port: CONFIG.WS_PORT });
    
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      ws.send(JSON.stringify({ type: 'CONNECTED', contracts: Array.from(this.monitoredContracts.keys()) }));
      
      ws.on('close', () => this.clients.delete(ws));
    });
  }

  private broadcast(data: any): void {
    const msg = JSON.stringify(data);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  private startHttpApi(): void {
    const app = express();
    app.use(express.json());
    
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy', contracts: this.monitoredContracts.size });
    });
    
    app.listen(CONFIG.API_PORT, () => {
      // Silent - no log spam
    });
  }
}

// Start node
const node = new SentinelNode();
node.initialize().catch(console.error);
