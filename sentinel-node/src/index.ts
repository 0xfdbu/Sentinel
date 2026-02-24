#!/usr/bin/env node
/**
 * Sentinel Node - Modular Architecture with Source Caching
 * 
 * Pre-fetches contract sources on registration for fast attack response
 */

import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import express from 'express';

import { CONFIG } from './config';
import type { ThreatEvent, AnalysisResult } from './types';

import { BlockchainService } from './services/blockchain.service';
import { ContractRegistryService } from './services/contract-registry.service';
import { ThreatDetectorService } from './services/threat-detector.service';
import { CRERunnerService } from './services/cre-runner.service';
import { GuardianService } from './services/guardian.service';
import { WebSocketService } from './services/websocket.service';

class SentinelNode extends EventEmitter {
  // Services
  private blockchain: BlockchainService;
  private registry: ContractRegistryService;
  private threatDetector: ThreatDetectorService;
  private creRunner: CRERunnerService;
  private guardian: GuardianService;
  private wsService: WebSocketService;

  // State
  private processedTxHashes: Set<string> = new Set();
  private lastCheckedBlock: number = 0;

  constructor() {
    super();
    
    // Initialize services
    this.blockchain = new BlockchainService();
    this.registry = new ContractRegistryService(this.blockchain);
    this.threatDetector = new ThreatDetectorService();
    this.creRunner = new CRERunnerService();
    this.guardian = new GuardianService(this.blockchain);
    this.wsService = new WebSocketService(CONFIG.WS_PORT);
  }

  async initialize(): Promise<void> {
    console.log('🛡️  Initializing Sentinel Node...\n');

    if (!this.blockchain.isAuthenticated) {
      throw new Error('No private key configured');
    }

    console.log(`   Wallet: ${this.blockchain.address}`);

    // Register demo contracts (with pre-fetched sources)
    await this.registerContracts();

    // Start services
    this.wsService.start();
    this.startPolling();
    this.startHttpApi();

    console.log('\n✅ Sentinel Node operational');
    console.log(`   Monitoring ${this.registry.getAll().length} contracts`);
    console.log(`   Poll interval: ${CONFIG.POLL_INTERVAL_MS}ms`);
  }

  /**
   * Register contracts and pre-fetch their source code
   */
  private async registerContracts(): Promise<void> {
    console.log('\n📋 Registering contracts (pre-fetching sources)...\n');
    
    // Register vault
    await this.registry.register(CONFIG.VAULT_ADDRESS);
    
    // Register drainer
    await this.registry.register(CONFIG.DRAINER_ADDRESS);
    
    console.log('\n✓ All contracts registered');
  }

  private startPolling(): void {
    const poll = async () => {
      try {
        const currentBlock = await this.blockchain.getBlockNumber();
        if (currentBlock > this.lastCheckedBlock) {
          const fromBlock = Math.max(
            currentBlock - CONFIG.MAX_BLOCKS_PER_POLL,
            this.lastCheckedBlock + 1
          );
          
          for (let b = fromBlock; b <= currentBlock; b++) {
            await this.checkBlock(b);
          }
          this.lastCheckedBlock = currentBlock;
        }
      } catch (error) {
        // Silent fail
      }
      setTimeout(poll, CONFIG.POLL_INTERVAL_MS);
    };
    poll();
  }

  private async checkBlock(blockNumber: number): Promise<void> {
    const block = await this.blockchain.getBlock(blockNumber, true);
    if (!block) return;

    const monitoredAddrs = new Set(
      this.registry.getAll().map(c => c.address)
    );

    for (const tx of block.prefetchedTransactions || []) {
      if (this.processedTxHashes.has(tx.hash)) continue;
      this.processedTxHashes.add(tx.hash);

      // Cleanup cache
      if (this.processedTxHashes.size > 1000) {
        const first = this.processedTxHashes.values().next().value;
        if (first) this.processedTxHashes.delete(first);
      }

      const toAddress = tx.to?.toLowerCase();
      if (!toAddress || !monitoredAddrs.has(toAddress)) continue;

      const contract = this.registry.get(toAddress);
      if (!contract || contract.isPaused) continue;

      await this.processTransaction(tx, contract);
    }
  }

  private async processTransaction(
    tx: ethers.TransactionResponse,
    contract: import('./services/contract-registry.service').ContractInfo
  ): Promise<void> {
    const threats = this.threatDetector.analyzeTransaction(tx, contract.address);
    
    if (!this.threatDetector.hasCriticalThreats(threats)) return;

    // Determine victim
    const toAddress = tx.to!.toLowerCase();
    const isAttacker = toAddress === CONFIG.DRAINER_ADDRESS.toLowerCase();
    const hasAttack = threats.some(t => t.details?.includes('ATTACK'));
    const victim = (isAttacker && hasAttack) ? CONFIG.VAULT_ADDRESS : toAddress;

    const victimContract = this.registry.get(victim)!;

    console.log('\n🚨 THREAT DETECTED');
    console.log(`   TX: ${tx.hash.slice(0, 20)}...`);
    console.log(`   Target: ${toAddress.slice(0, 20)}...`);
    console.log(`   Victim: ${victim.slice(0, 20)}...`);
    console.log(`   Source: ${victimContract.sourceCode ? '✓ Pre-loaded' : '✗ Not available'}`);

    // Run CRE analysis (with pre-fetched source - FAST!)
    try {
      console.log('\n   🔬 Running CRE Workflow (TEE + xAI)...');
      console.log('   ┌─────────────────────────────────────────────────────────────┐');
      
      const startTime = Date.now();
      
      const analysis = await this.creRunner.analyze(
        victim,
        victimContract.contractName || 'Unknown',
        victimContract.sourceCode,  // Pre-fetched!
        tx.hash,
        tx.from,
        tx.to,
        tx.value,
        tx.data,
        threats
      );
      
      const duration = Date.now() - startTime;
      
      console.log('   └─────────────────────────────────────────────────────────────┘');
      console.log(`   ⏱️  Analysis time: ${duration}ms`);
      
      await this.handleAnalysis(analysis, victim, tx.hash);
    } catch (error) {
      console.log('   ⚠️  CRE failed, using heuristic fallback');
      await this.executePause(victim, 'heuristic_fallback');
    }
  }

  private async handleAnalysis(
    analysis: AnalysisResult,
    targetAddress: string,
    txHash: string
  ): Promise<void> {
    const { riskLevel, overallScore } = analysis;
    console.log(`   📊 Risk: ${riskLevel} (Score: ${overallScore})`);

    const shouldPause = riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ||
                       (riskLevel === 'MEDIUM' && overallScore >= 60);

    if (shouldPause) {
      await this.executePause(targetAddress, 'sentinel_auto_pause');
    } else {
      console.log(`   ℹ️  No pause needed (${riskLevel})`);
    }
  }

  private async executePause(contractAddress: string, reason: string): Promise<void> {
    console.log('   🔒 Executing pause...');
    
    const vulnHash = ethers.keccak256(ethers.toUtf8Bytes(reason));
    const success = await this.guardian.pause(contractAddress, vulnHash);

    if (success) {
      console.log('   ✅ AUTO-PAUSE SUCCESSFUL');
      this.registry.setPaused(contractAddress, true);
      this.wsService.broadcast({
        type: 'PAUSE_TRIGGERED',
        contractAddress,
        timestamp: Date.now(),
      });
    } else {
      console.log('   ❌ Pause failed');
    }
  }

  private startHttpApi(): void {
    const app = express();
    app.use(express.json());

    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        contracts: this.registry.getAll().length,
        wsClients: this.wsService.clientCount,
      });
    });

    // Endpoint to manually register a contract
    app.post('/register', async (req, res) => {
      const { address } = req.body;
      if (!address) {
        return res.status(400).json({ error: 'Address required' });
      }
      const info = await this.registry.register(address);
      res.json({ success: true, data: info });
    });

    app.listen(CONFIG.API_PORT, () => {});
  }
}

// Start
const node = new SentinelNode();
node.initialize().catch(console.error);
