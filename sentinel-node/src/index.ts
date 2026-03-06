#!/usr/bin/env node
/**
 * Sentinel Node v3 - Minimal & Modular
 * 
 * Core responsibilities:
 * 1. Accept contract registrations
 * 2. Prefetch contract source code from Etherscan
 * 3. Periodically trigger CRE workflows for security scans
 * 4. Serve contract data via HTTP API
 */

import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { CONFIG, DEFAULT_CONTRACTS } from './config';
import type { RegisteredContract, SourceFile } from './types';
import { ContractRegistry } from './registry';
import { EtherscanService } from './services/etherscan';
import { CREService } from './services/cre';

// BigInt serialization fix
Object.defineProperty(BigInt.prototype, 'toJSON', {
  get() { return () => this.toString(); },
  configurable: true,
});

class SentinelNode extends EventEmitter {
  private registry: ContractRegistry;
  private etherscan: EtherscanService;
  private cre: CREService;
  private provider: ethers.JsonRpcProvider;
  private scanInterval: NodeJS.Timeout | null = null;
  private workflowInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    this.registry = new ContractRegistry();
    this.etherscan = new EtherscanService(CONFIG.ETHERSCAN_API_KEY, CONFIG.CHAIN_ID);
    this.cre = new CREService(CONFIG.CRE_WORKFLOW_PATH);
  }

  async initialize(): Promise<void> {
    console.log('🛡️  Sentinel Node v3\n');

    // Auto-register default contracts
    await this.registerDefaultContracts();

    // Start HTTP API
    this.startHttpApi();

    // Start periodic CRE scans
    this.startPeriodicScans();
    
    // Start workflow scheduler (every 15 mins)
    this.startWorkflowScheduler();

    console.log(`\n✅ Node ready at http://localhost:${CONFIG.API_PORT}`);
    console.log(`   Scan interval: ${CONFIG.SCAN_INTERVAL_MS / 1000}s`);
    console.log(`   Volume Sentinel interval: ${CONFIG.VOLUME_SENTINEL_INTERVAL_MS / 60000}min`);
    console.log(`   Contracts: ${this.registry.getAll().length}`);
  }

  /**
   * Register default contracts on startup
   */
  private async registerDefaultContracts(): Promise<void> {
    console.log('📋 Auto-registering default contracts...\n');
    
    for (const { address, name } of DEFAULT_CONTRACTS) {
      await this.registerContract(address, name);
    }
    
    console.log(`\n✓ Registered ${this.registry.getAll().length} contracts`);
  }

  /**
   * Register a new contract and prefetch its source code (if available)
   */
  async registerContract(address: string, name?: string): Promise<RegisteredContract | null> {
    const normalizedAddr = address.toLowerCase();
    
    // Skip if already registered
    if (this.registry.has(normalizedAddr)) {
      console.log(`   ℹ️  Already registered: ${normalizedAddr.slice(0, 12)}...`);
      return this.registry.get(normalizedAddr)!;
    }

    console.log(`\n📋 Registering: ${normalizedAddr}`);

    try {
      // Try to fetch contract info from Etherscan
      const contractInfo = await this.etherscan.getContractSource(normalizedAddr);
      
      if (contractInfo) {
        // Full registration with source code
        // Parse ABI to extract functions
        const abi = JSON.parse(contractInfo.ABI || '[]');
        const functions = abi
          .filter((item: any) => item.type === 'function')
          .map((item: any) => ({
            name: item.name,
            signature: `${item.name}(${item.inputs?.map((i: any) => i.type).join(',') || ''})`,
            type: item.stateMutability || 'nonpayable',
          }));

        // Parse source files
        const sourceFiles: SourceFile[] = [];
        if (contractInfo.SourceCode) {
          try {
            const sourceObj = JSON.parse(contractInfo.SourceCode.slice(1, -1));
            if (sourceObj.sources) {
              for (const [name, data] of Object.entries(sourceObj.sources)) {
                sourceFiles.push({ name, content: (data as any).content });
              }
            }
          } catch {
            sourceFiles.push({
              name: `${contractInfo.ContractName || 'Contract'}.sol`,
              content: contractInfo.SourceCode
            });
          }
        }

        const registered: RegisteredContract = {
          address: normalizedAddr,
          name: contractInfo.ContractName || name || 'Unknown',
          abi,
          functions,
          sourceFiles,
          compilerVersion: contractInfo.CompilerVersion,
          optimizationUsed: contractInfo.OptimizationUsed === '1',
          runs: parseInt(contractInfo.Runs) || 200,
          proxy: contractInfo.Proxy === '1',
          implementation: contractInfo.Implementation?.toLowerCase(),
          registeredAt: Date.now(),
          lastScanned: 0,
        };

        this.registry.add(registered);
        
        console.log(`   ✅ Registered: ${registered.name}`);
        console.log(`   📁 Files: ${sourceFiles.length}`);
        console.log(`   🔧 Functions: ${functions.length}`);

        return registered;
      } else {
        // Light registration without source code
        const contractName = name || `Contract-${normalizedAddr.slice(2, 8)}`;
        
        const registered: RegisteredContract = {
          address: normalizedAddr,
          name: contractName,
          abi: [],
          functions: [],
          sourceFiles: [],
          compilerVersion: 'Unknown',
          optimizationUsed: false,
          runs: 0,
          proxy: false,
          implementation: undefined,
          registeredAt: Date.now(),
          lastScanned: 0,
        };

        this.registry.add(registered);
        
        console.log(`   ⚠️  Light registration: ${registered.name}`);
        console.log(`      (No source code on Etherscan)`);

        return registered;
      }
    } catch (error) {
      console.error(`   ❌ Registration failed:`, error);
      return null;
    }
  }

  /**
   * Start periodic CRE security scans
   */
  private startPeriodicScans(): void {
    const runScan = async () => {
      const contracts = this.registry.getAll();
      if (contracts.length === 0) {
        console.log('⏭️  No contracts to scan');
        return;
      }

      console.log(`\n🔬 Starting CRE scan (${contracts.length} contracts)`);

      for (const contract of contracts) {
        try {
          // Combine all source files for analysis
          const fullSource = contract.sourceFiles
            .map(f => `// File: ${f.name}\n${f.content}`)
            .join('\n\n');

          if (!fullSource || fullSource.length < 100) {
            console.log(`   ⚠️  ${contract.name}: Insufficient source`);
            continue;
          }

          // Trigger CRE workflow
          const result = await this.cre.analyze({
            address: contract.address,
            name: contract.name,
            sourceCode: fullSource,
            functions: contract.functions,
            compilerVersion: contract.compilerVersion,
          });

          // Update last scanned timestamp
          this.registry.updateLastScanned(contract.address);

          if (result.threatsFound > 0) {
            console.log(`   🚨 ${contract.name}: ${result.threatsFound} threats`);
            this.emit('threatsDetected', { contract, result });
          } else {
            console.log(`   ✅ ${contract.name}: Clean`);
          }
        } catch (error) {
          console.error(`   ❌ Scan failed for ${contract.name}:`, error);
        }
      }

      console.log(`✅ Scan complete\n`);
    };

    // Run immediately
    runScan();

    // Schedule periodic scans
    this.scanInterval = setInterval(runScan, CONFIG.SCAN_INTERVAL_MS);
  }

  /**
   * Start workflow scheduler for Volume Sentinel
   * Triggers volume-sentinel workflow every 15 minutes
   */
  private startWorkflowScheduler(): void {
    if (!CONFIG.WORKFLOW_SCHEDULER_ENABLED) {
      console.log('\n⏭️  Workflow scheduler disabled');
      return;
    }

    const runVolumeWorkflow = async () => {
      console.log('\n🔄 [Volume Sentinel] Triggering workflow...');
      
      try {
        // Get current volume limit from contract first
        const volumePolicyAddress = '0x2e3Df8D5b19e1576Ec5aAd849438C41897974E33';
        const usdaTokenAddress = '0x500D640f4fE39dAF609C6E14C83b89A68373EaFe';
        
        // For now, use default limit - in production would read from contract
        const currentLimit = '1000000000000000000000'; // 1000 tokens
        
        const payload = {
          tokenSymbol: 'USDA',
          tokenAddress: usdaTokenAddress,
          currentLimit: currentLimit,
          forceAdjust: false
        };

        console.log(`   Token: ${payload.tokenSymbol}`);
        console.log(`   Current limit: ${currentLimit} (wei)`);
        
        // Trigger the workflow via CRE CLI
        const { execSync } = require('child_process');
        const workflowPath = require('path').join(__dirname, '../../workflows/volume-sentinel');
        
        // Check if workflow exists
        const fs = require('fs');
        if (!fs.existsSync(workflowPath)) {
          console.log('   ⚠️  volume-sentinel workflow not found, skipping');
          return;
        }

        // Run workflow simulation with broadcast
        const result = execSync(
          `cd ${workflowPath} && cre workflow simulate volume-sentinel --target local-simulation --broadcast 2>&1`,
          { encoding: 'utf-8', timeout: 120000 }
        );

        console.log('   ✅ Workflow completed');
        
        // Parse result for summary
        if (result.includes('SUCCESS')) {
          const txMatch = result.match(/txHash[":\s]+(0x[a-fA-F0-9]+)/);
          const txHash = txMatch ? txMatch[1] : 'unknown';
          console.log(`   📤 Transaction: ${txHash.slice(0, 20)}...`);
        } else if (result.includes('maintain') || result.includes('below threshold')) {
          console.log('   ⏸️  No adjustment needed (below threshold)');
        }

      } catch (error: any) {
        console.error('   ❌ Workflow failed:', error.message);
        // Don't crash - log and continue
      }
    };

    // Run immediately on startup
    console.log('\n📅 Starting workflow scheduler...');
    runVolumeWorkflow();

    // Schedule every 15 minutes
    this.workflowInterval = setInterval(runVolumeWorkflow, CONFIG.VOLUME_SENTINEL_INTERVAL_MS);
  }

  /**
   * HTTP API for external interaction
   */
  private startHttpApi(): void {
    const app = express();
    
    app.use(cors({ origin: '*' }));
    app.use(express.json());

    // Health check
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        contracts: this.registry.getAll().length,
        uptime: process.uptime(),
      });
    });

    // Register a new contract
    app.post('/contracts/register', async (req, res) => {
      const { address } = req.body;
      
      if (!address || !ethers.isAddress(address)) {
        res.status(400).json({ error: 'Invalid address' });
        return;
      }

      const contract = await this.registerContract(address);
      
      if (!contract) {
        res.status(404).json({ error: 'Contract source not found on Etherscan' });
        return;
      }

      res.json({ success: true, data: contract });
    });

    // Get all registered contracts (for Monitor page)
    app.get('/contracts', (req, res) => {
      const contracts = this.registry.getAll().map(c => ({
        address: c.address,
        name: c.name,
        functions: c.functions.length,
        files: c.sourceFiles.length,
        compiler: c.compilerVersion,
        proxy: c.proxy,
        registeredAt: c.registeredAt,
        lastScanned: c.lastScanned,
      }));
      
      res.json({ success: true, data: contracts });
    });

    // Get specific contract details
    app.get('/contracts/:address', (req, res) => {
      const address = req.params.address.toLowerCase();
      const contract = this.registry.get(address);

      if (!contract) {
        res.status(404).json({ error: 'Contract not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          address: contract.address,
          name: contract.name,
          functions: contract.functions,
          compilerVersion: contract.compilerVersion,
          optimizationUsed: contract.optimizationUsed,
          runs: contract.runs,
          proxy: contract.proxy,
          implementation: contract.implementation,
          sourceFiles: contract.sourceFiles.map(f => ({ name: f.name })),
          registeredAt: contract.registeredAt,
          lastScanned: contract.lastScanned,
        }
      });
    });

    // Get contract source code
    app.get('/contracts/:address/source', (req, res) => {
      const address = req.params.address.toLowerCase();
      const contract = this.registry.get(address);

      if (!contract) {
        res.status(404).json({ error: 'Contract not found' });
        return;
      }

      res.json({
        success: true,
        data: contract.sourceFiles
      });
    });

    // Trigger manual scan
    app.post('/scan', async (req, res) => {
      const contracts = this.registry.getAll();
      
      res.json({
        success: true,
        message: `Scanning ${contracts.length} contracts`,
      });

      // Run scan in background
      this.emit('manualScan');
    });

    // Trigger Volume Sentinel workflow manually
    app.post('/workflows/volume-sentinel/trigger', async (req, res) => {
      const { forceAdjust = false, currentLimit } = req.body;
      
      res.json({
        success: true,
        message: 'Volume Sentinel workflow triggered',
        params: { forceAdjust, currentLimit }
      });

      // Run in background
      setImmediate(async () => {
        try {
          const { execSync } = require('child_process');
          const workflowPath = require('path').join(__dirname, '../../workflows/volume-sentinel');
          
          const payload = JSON.stringify({
            tokenSymbol: 'USDA',
            tokenAddress: '0x500D640f4fE39dAF609C6E14C83b89A68373EaFe',
            currentLimit: currentLimit || '1000000000000000000000',
            forceAdjust
          });

          const result = execSync(
            `echo '${payload}' | cre workflow simulate volume-sentinel --target local-simulation --broadcast 2>&1`,
            { encoding: 'utf-8', timeout: 120000, cwd: workflowPath }
          );
          
          console.log('[Volume Sentinel] Manual trigger result:', result);
        } catch (error: any) {
          console.error('[Volume Sentinel] Manual trigger failed:', error.message);
        }
      });
    });

    // Get workflow status
    app.get('/workflows/volume-sentinel/status', (req, res) => {
      res.json({
        success: true,
        data: {
          enabled: CONFIG.WORKFLOW_SCHEDULER_ENABLED,
          intervalMinutes: CONFIG.VOLUME_SENTINEL_INTERVAL_MS / 60000,
          lastRun: 'See logs for details',
          workflowPath: 'workflows/volume-sentinel',
          contract: {
            volumePolicy: '0x2e3Df8D5b19e1576Ec5aAd849438C41897974E33',
            token: '0x500D640f4fE39dAF609C6E14C83b89A68373EaFe'
          }
        }
      });
    });

    app.listen(CONFIG.API_PORT, () => {});
  }
}

// Start node
const node = new SentinelNode();
node.initialize().catch(console.error);
