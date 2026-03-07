#!/usr/bin/env node
/**
 * Sentinel Node - Blockchain Security Monitor
 * 
 * Core responsibilities:
 * 1. Monitor USDA V8 contract for suspicious transactions
 * 2. Heuristic analysis for fraud detection
 * 3. Trigger pause workflow when threats detected
 * 4. Contract data service via HTTP API
 */

import { ethers } from 'ethers';
import express from 'express';
import cors from 'cors';
import { CONFIG, DEFAULT_CONTRACTS } from './config';
import type { RegisteredContract, SourceFile } from './types';
import { ContractRegistry } from './registry';
import { EtherscanService } from './services/etherscan';
import { transactionMonitor } from './services/TransactionMonitor';

// BigInt serialization fix
Object.defineProperty(BigInt.prototype, 'toJSON', {
  get() { return () => this.toString(); },
  configurable: true,
});

class SentinelNode {
  private registry: ContractRegistry;
  private etherscan: EtherscanService;

  constructor() {
    this.etherscan = new EtherscanService(CONFIG.ETHERSCAN_API_KEY, CONFIG.CHAIN_ID);
    this.registry = new ContractRegistry();
  }

  async initialize(): Promise<void> {
    console.log('🛡️  Sentinel Node - Blockchain Security Monitor\n');

    // Auto-register default contracts
    await this.registerDefaultContracts();

    // Start HTTP API
    this.startHttpApi();

    // Start transaction monitor (WebSocket listener)
    try {
      await transactionMonitor.start();
    } catch (error) {
      console.error('❌ Failed to start transaction monitor:', error);
      console.log('   Continuing with API service only...\n');
    }

    console.log(`\n✅ Node ready at http://localhost:${CONFIG.API_PORT}`);
    console.log(`   Contracts: ${this.registry.getAll().length}`);
    console.log(`   Purpose: Fraud detection & contract monitoring`);
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
   * HTTP API for contract data serving
   */
  private startHttpApi(): void {
    const app = express();
    
    app.use(cors({ origin: '*' }));
    app.use(express.json());

    // Health check
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'Sentinel Node - Contract Data Service',
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

    app.listen(CONFIG.API_PORT, () => {});
  }
}

// Start node
const node = new SentinelNode();
node.initialize().catch(console.error);
