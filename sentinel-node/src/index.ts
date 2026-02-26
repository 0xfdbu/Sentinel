#!/usr/bin/env node
/**
 * Sentinel Node - Modular Architecture with Source Caching
 * 
 * Pre-fetches contract sources on registration for fast attack response
 */

import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import express from 'express';
import cors from 'cors';

// Fix BigInt serialization for JSON - must be done before any imports that might use BigInt
Object.defineProperty(BigInt.prototype, 'toJSON', {
  get() {
    return () => this.toString();
  },
  configurable: true,
});

import { CONFIG } from './config';
import type { ThreatEvent, AnalysisResult } from './types';

import { BlockchainService } from './services/blockchain.service';
import { ContractRegistryService } from './services/contract-registry.service';
import { ThreatDetectorService } from './services/threat-detector.service';
import { CRERunnerService } from './services/cre-runner.service';
import { GuardianService } from './services/guardian.service';
import { WebSocketService } from './services/websocket.service';
import { OracleHealthService } from './services/oracle-health.service';

class SentinelNode extends EventEmitter {
  // Services
  private blockchain: BlockchainService;
  private registry: ContractRegistryService;
  private threatDetector: ThreatDetectorService;
  private creRunner: CRERunnerService;
  private guardian: GuardianService;
  private wsService: WebSocketService;
  private oracleHealth: OracleHealthService;

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
    this.oracleHealth = new OracleHealthService(this.blockchain.provider);
  }

  async initialize(): Promise<void> {
    console.log('🛡️  Initializing Sentinel Node...\n');

    if (!this.blockchain.isAuthenticated) {
      throw new Error('No private key configured');
    }

    console.log(`   Wallet: ${this.blockchain.address}`);

    // Register demo contracts (with pre-fetched sources)
    await this.registerContracts();

    // Register and check oracles
    this.registerOracles();
    await this.checkOracleHealth();

    // Start services
    this.wsService.start();
    this.startPolling();
    this.startOracleMonitoring();
    this.startHttpApi();

    console.log('\n✅ Sentinel Node operational');
    console.log(`   Monitoring ${this.registry.getAll().length} contracts`);
    console.log(`   Monitoring ${this.oracleHealth.getRegisteredOracles().length} oracles`);
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

  /**
   * Register oracles to monitor
   */
  private registerOracles(): void {
    console.log('\n🔗 Registering oracles for health monitoring...\n');
    
    const oracles = this.oracleHealth.getRegisteredOracles();
    for (const oracle of oracles) {
      console.log(`   ✓ ${oracle.name}: ${oracle.address}`);
    }
    
    console.log(`\n✓ ${oracles.length} oracles registered`);
  }

  /**
   * Check oracle health and report status
   */
  private async checkOracleHealth(): Promise<void> {
    console.log('\n🏥 Checking oracle health...\n');
    
    const statuses = await this.oracleHealth.checkAllOracles();
    
    for (const status of statuses) {
      const healthIcon = status.isHealthy ? '✅' : '❌';
      const ethBalance = parseFloat(status.ethBalance).toFixed(4);
      const linkToken = status.tokens.find(t => t.symbol === 'LINK');
      const linkBalance = linkToken ? parseFloat(linkToken.balance).toFixed(2) : '0';
      
      console.log(`   ${healthIcon} ${status.name}`);
      console.log(`      ETH: ${ethBalance} | LINK: ${linkBalance}`);
      
      if (status.warnings.length > 0) {
        for (const warning of status.warnings) {
          console.log(`      ⚠️  ${warning}`);
        }
      }
      if (status.errors.length > 0) {
        for (const error of status.errors) {
          console.log(`      🚨 ${error}`);
        }
      }
    }
    
    const summary = this.oracleHealth.getHealthSummary();
    console.log(`\n   Summary: ${summary.healthy}/${summary.total} healthy`);
    if (summary.totalWarnings > 0) console.log(`   Warnings: ${summary.totalWarnings}`);
    if (summary.totalErrors > 0) console.log(`   Errors: ${summary.totalErrors}`);
  }

  /**
   * Start periodic oracle health monitoring
   */
  private startOracleMonitoring(): void {
    // Check every 5 minutes (300 seconds)
    const CHECK_INTERVAL = 5 * 60 * 1000;
    
    setInterval(async () => {
      await this.checkOracleHealth();
      
      // Broadcast health status via WebSocket
      const summary = this.oracleHealth.getHealthSummary();
      this.wsService.broadcast({
        type: 'ORACLE_HEALTH_UPDATE',
        timestamp: Date.now(),
        data: summary,
      });
    }, CHECK_INTERVAL);
    
    console.log(`   Oracle health check every ${CHECK_INTERVAL / 1000}s`);
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
    // ==========================================
    // STEP 1: Threat Detection (Heuristics)
    // ==========================================
    const threats = this.threatDetector.analyzeTransaction(tx, contract.address);
    
    // ==========================================
    // STEP 2: ACE Policy Evaluation
    // ==========================================
    const policyResult = this.threatDetector.evaluateACEPolicies(tx, threats);
    
    // Log ACE policy result
    if (!policyResult.passed) {
      console.log('\n🛡️  ACE POLICY VIOLATION');
      console.log(`   Policy: ${policyResult.policy}`);
      console.log(`   Risk Score: ${policyResult.riskScore}/100`);
      console.log(`   Action: ${policyResult.recommendedAction}`);
      for (const v of policyResult.violations) {
        console.log(`   ❌ ${v.rule}: ${v.severity}`);
      }
    }
    
    // Check if we should proceed (has critical threats or ACE violation)
    const hasCritical = this.threatDetector.hasCriticalThreats(threats);
    const shouldAnalyze = hasCritical || !policyResult.passed;
    
    if (!shouldAnalyze) return;

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
    console.log(`   Threats: ${threats.length}`);
    console.log(`   Source: ${victimContract.sourceCode ? '✓ Pre-loaded' : '✗ Not available'}`);

    // ==========================================
    // STEP 3: CRE Workflow (TEE + xAI Analysis)
    // ==========================================
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
        threats,
        policyResult  // Pass ACE result to CRE
      );
      
      const duration = Date.now() - startTime;
      
      console.log('   └─────────────────────────────────────────────────────────────┘');
      console.log(`   ⏱️  Analysis time: ${duration}ms`);
      
      await this.handleAnalysis(analysis, victim, tx.hash, policyResult);
    } catch (error) {
      console.log('   ⚠️  CRE failed, using ACE policy fallback');
      // Use ACE policy to decide on fallback
      if (policyResult.recommendedAction === 'PAUSE_IMMEDIATELY' || 
          policyResult.recommendedAction === 'PAUSE') {
        await this.executePause(victim, 'ace_policy_fallback');
      }
    }
  }

  private async handleAnalysis(
    analysis: AnalysisResult,
    targetAddress: string,
    txHash: string,
    policyResult?: import('./services/ace-policy.service').PolicyResult
  ): Promise<void> {
    const { riskLevel, overallScore } = analysis;
    console.log(`   📊 xAI Risk: ${riskLevel} (Score: ${overallScore})`);
    
    // Combine xAI result with ACE policy
    const aceAction = policyResult?.recommendedAction;
    console.log(`   📋 ACE Action: ${aceAction || 'N/A'}`);

    // Decision logic: xAI OR ACE can trigger pause
    const xaiSaysPause = riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ||
                        (riskLevel === 'MEDIUM' && overallScore >= 60);
    const aceSaysPause = aceAction === 'PAUSE_IMMEDIATELY' || aceAction === 'PAUSE';
    
    const shouldPause = xaiSaysPause || aceSaysPause;

    if (shouldPause) {
      const reason = aceSaysPause ? 'ace_policy_triggered' : 'sentinel_auto_pause';
      await this.executePause(targetAddress, reason);
    } else {
      console.log(`   ℹ️  No pause needed (${riskLevel}, ACE: ${aceAction})`);
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
    app.use(cors({
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
    }));
    app.use(express.json());
    
    // Override res.json to handle BigInt serialization
    app.use((req, res, next) => {
      const originalJson = res.json.bind(res);
      res.json = function(body: any) {
        try {
          // Convert body to safe JSON string
          const safeString = JSON.stringify(body, (key, value) => {
            if (typeof value === 'bigint') {
              console.log(`[BigInt Debug] Converting BigInt at key: ${key}`);
              return value.toString();
            }
            return value;
          });
          // Send directly without calling original json to avoid double serialization
          res.setHeader('Content-Type', 'application/json');
          return res.send(safeString);
        } catch (e) {
          console.error('[BigInt Error]', e);
          throw e;
        }
      };
      next();
    });

    app.get('/health', (req, res) => {
      const oracleSummary = this.oracleHealth.getHealthSummary();
      res.json( {
        status: 'healthy',
        contracts: this.registry.getAll().length,
        wsClients: this.wsService.clientCount,
        oracles: oracleSummary,
      });
    });

    // Oracle Health Endpoints
    
    // Get all oracle health statuses
    app.get('/oracles', (req, res) => {
      const statuses = this.oracleHealth.getAllLastStatuses();
      res.json( {
        success: true,
        data: statuses.map(s => ({
          address: s.address,
          name: s.name,
          isHealthy: s.isHealthy,
          lastChecked: s.lastChecked,
          ethBalance: s.ethBalance,
          tokens: s.tokens.map(t => ({
            symbol: t.symbol,
            balance: t.balance,
            balanceRaw: String(t.balanceRaw),
          })),
          warnings: s.warnings,
          errors: s.errors,
          metadata: s.metadata ? {
            lastHeartbeat: s.metadata.lastHeartbeat,
            dataFreshness: s.metadata.dataFreshness,
            responseTimeMs: s.metadata.responseTimeMs,
            roundId: s.metadata.roundId ? String(s.metadata.roundId) : undefined,
            answer: s.metadata.answer ? String(s.metadata.answer) : undefined,
            answeredInRound: s.metadata.answeredInRound ? String(s.metadata.answeredInRound) : undefined,
          } : undefined,
        })),
      });
    });

    // Get specific oracle health
    app.get('/oracles/:address', async (req, res) => {
      const address = req.params.address.toLowerCase();
      
      // Try to get fresh data
      const status = await this.oracleHealth.checkOracleHealth(address);
      
      res.json( {
        success: true,
        data: {
          address: status.address,
          name: status.name,
          isHealthy: status.isHealthy,
          lastChecked: status.lastChecked,
          ethBalance: status.ethBalance,
          ethBalanceRaw: String(status.ethBalanceRaw),
          tokens: status.tokens.map(t => ({
            symbol: t.symbol,
            address: t.address,
            balance: t.balance,
            balanceRaw: String(t.balanceRaw),
            decimals: t.decimals,
            usdValue: t.usdValue,
          })),
          warnings: status.warnings,
          errors: status.errors,
          metadata: status.metadata ? {
            lastHeartbeat: status.metadata.lastHeartbeat,
            dataFreshness: status.metadata.dataFreshness,
            responseTimeMs: status.metadata.responseTimeMs,
            roundId: status.metadata.roundId ? String(status.metadata.roundId) : undefined,
            answer: status.metadata.answer ? String(status.metadata.answer) : undefined,
            answeredInRound: status.metadata.answeredInRound ? String(status.metadata.answeredInRound) : undefined,
          } : undefined,
        },
      });
    });

    // Refresh all oracle health checks
    app.post('/oracles/refresh', async (req, res) => {
      const statuses = await this.oracleHealth.checkAllOracles();
      const summary = this.oracleHealth.getHealthSummary();
      
      res.json( {
        success: true,
        data: {
          summary,
          oracles: statuses.map(s => ({
            address: s.address,
            name: s.name,
            isHealthy: s.isHealthy,
            ethBalance: s.ethBalance,
            ethBalanceRaw: String(s.ethBalanceRaw),
            tokens: s.tokens.map(t => ({ 
              symbol: t.symbol, 
              balance: t.balance,
              balanceRaw: String(t.balanceRaw),
            })),
            warnings: s.warnings,
            errors: s.errors,
            metadata: s.metadata ? {
              lastHeartbeat: s.metadata.lastHeartbeat,
              dataFreshness: s.metadata.dataFreshness,
              responseTimeMs: s.metadata.responseTimeMs,
              roundId: s.metadata.roundId ? String(s.metadata.roundId) : undefined,
              answer: s.metadata.answer ? String(s.metadata.answer) : undefined,
              answeredInRound: s.metadata.answeredInRound ? String(s.metadata.answeredInRound) : undefined,
            } : undefined,
          })),
        },
      });
    });

    // Register a new oracle to monitor
    app.post('/oracles/register', (req, res) => {
      const { address, name, type, minEthBalance, minLinkBalance, maxDataAge } = req.body;
      
      if (!address || !name) {
        res.status(400);
        res.json( {
          success: false,
          error: 'Address and name are required',
        });
        return;
      }
      
      this.oracleHealth.registerOracle({
        address,
        name,
        type: type || 'custom',
        minEthBalance,
        minLinkBalance,
        maxDataAge,
      });
      
      res.json( {
        success: true,
        message: `Oracle ${name} registered`,
      });
    });

    // Endpoint to manually register a contract
    app.post('/register', async (req, res) => {
      const { address } = req.body;
      if (!address) {
        res.status(400);
        res.json( { error: 'Address required' });
        return;
      }
      const info = await this.registry.register(address);
      res.json( { success: true, data: info });
    });

    // Contract Explorer Endpoints
    
    // Get all registered contracts (for monitor page)
    app.get('/contracts', (req, res) => {
      const contracts = this.registry.getAll().map(c => ({
        address: c.address,
        name: c.contractName,
        isPaused: c.isPaused,
        functionCount: c.functions?.length || 0,
        registeredAt: c.registeredAt,
      }));
      res.json( { success: true, data: contracts });
    });

    // Get detailed contract info (for explorer page)
    app.get('/contracts/:address', (req, res) => {
      const address = req.params.address.toLowerCase();
      const contract = this.registry.get(address);
      
      if (!contract) {
        res.status(404);
        res.json( { 
          success: false, 
          error: 'Contract not found. Register it first.' 
        });
        return;
      }

      res.json( { 
        success: true, 
        data: {
          address: contract.address,
          name: contract.contractName,
          isPaused: contract.isPaused,
          compilerVersion: contract.compilerVersion,
          optimizationUsed: contract.optimizationUsed,
          runs: contract.runs,
          evmVersion: contract.evmVersion,
          license: contract.license,
          functions: contract.functions,
          abi: contract.abi,
          fileCount: contract.sourceFiles?.length || 0,
        }
      });
    });

    // Get contract source files
    app.get('/contracts/:address/sources', (req, res) => {
      const address = req.params.address.toLowerCase();
      const contract = this.registry.get(address);
      
      if (!contract) {
        res.status(404);
        res.json( { 
          success: false, 
          error: 'Contract not found' 
        });
        return;
      }

      res.json( { 
        success: true, 
        data: contract.sourceFiles || []
      });
    });

    // Get specific source file
    app.get('/contracts/:address/sources/:filename', (req, res) => {
      const address = req.params.address.toLowerCase();
      const filename = req.params.filename;
      const contract = this.registry.get(address);
      
      if (!contract?.sourceFiles) {
        res.status(404);
        res.json( { 
          success: false, 
          error: 'Contract or source not found' 
        });
        return;
      }

      const file = contract.sourceFiles.find(f => f.name === filename);
      if (!file) {
        res.status(404);
        res.json( { 
          success: false, 
          error: 'File not found' 
        });
        return;
      }

      res.json( { success: true, data: file });
    });

    app.listen(CONFIG.API_PORT, () => {});
  }
}

// Start
const node = new SentinelNode();
node.initialize().catch(console.error);
