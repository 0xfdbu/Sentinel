/**
 * Contract Registry Service
 * 
 * Pre-fetches and caches contract source code on registration
 * Eliminates Etherscan delay during attack detection
 */

import type { BlockchainService } from './blockchain.service';

export interface ContractInfo {
  address: string;
  isPaused: boolean;
  sourceCode?: string;
  contractName?: string;
  abi?: string;
  compilerVersion?: string;
  registeredAt: number;
}

export class ContractRegistryService {
  private contracts: Map<string, ContractInfo> = new Map();
  private etherscanApiKey: string;

  constructor(private blockchain: BlockchainService) {
    this.etherscanApiKey = process.env.ETHERSCAN_API_KEY || '';
  }

  /**
   * Register a contract - fetches source code from Etherscan
   */
  async register(address: string): Promise<ContractInfo> {
    const normalized = address.toLowerCase();
    
    console.log(`\n📋 Registering contract: ${normalized.slice(0, 20)}...`);
    
    // Check if already registered
    const existing = this.contracts.get(normalized);
    if (existing?.sourceCode) {
      console.log('   ✓ Already cached');
      return existing;
    }

    // Fetch pause status
    const isPaused = await this.blockchain.isPaused(normalized);

    // Pre-fetch source code
    const sourceInfo = await this.fetchSourceCode(normalized);

    const info: ContractInfo = {
      address: normalized,
      isPaused,
      sourceCode: sourceInfo?.sourceCode,
      contractName: sourceInfo?.contractName,
      abi: sourceInfo?.abi,
      compilerVersion: sourceInfo?.compilerVersion,
      registeredAt: Date.now(),
    };

    this.contracts.set(normalized, info);

    if (info.sourceCode) {
      console.log(`   ✓ Source cached: ${info.sourceCode.length} chars`);
      console.log(`   ✓ Name: ${info.contractName}`);
    } else {
      console.log('   ⚠️ Source not available (unverified contract)');
    }

    return info;
  }

  /**
   * Get contract info
   */
  get(address: string): ContractInfo | undefined {
    return this.contracts.get(address.toLowerCase());
  }

  /**
   * Get all registered contracts
   */
  getAll(): ContractInfo[] {
    return Array.from(this.contracts.values());
  }

  /**
   * Update pause status
   */
  setPaused(address: string, isPaused: boolean): void {
    const info = this.contracts.get(address.toLowerCase());
    if (info) {
      info.isPaused = isPaused;
    }
  }

  /**
   * Fetch source code from Etherscan
   */
  private async fetchSourceCode(address: string): Promise<Partial<ContractInfo> | null> {
    if (!this.etherscanApiKey) {
      console.log('   ⚠️ No Etherscan API key');
      return null;
    }

    try {
      const url = `https://api.etherscan.io/v2/api?chainid=11155111&module=contract&action=getsourcecode&address=${address}&apikey=${this.etherscanApiKey}`;
      
      const response = await fetch(url);
      const data = await response.json() as any;

      if (data.status !== '1' || !data.result?.[0]) {
        return null;
      }

      const result = data.result[0] as any;
      const sourceCode = result.SourceCode;

      if (!sourceCode || sourceCode === '') {
        return null;
      }

      return {
        sourceCode,
        contractName: result.ContractName || 'Unknown',
        abi: result.ABI,
        compilerVersion: result.CompilerVersion,
      };
    } catch (error) {
      console.log(`   ❌ Etherscan fetch failed: ${(error as Error).message}`);
      return null;
    }
  }
}
