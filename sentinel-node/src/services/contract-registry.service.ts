/**
 * Contract Registry Service
 * 
 * Pre-fetches and caches contract source code, ABI, and metadata
 * Eliminates Etherscan delay during attack detection
 * Provides explorer-like data for frontend
 */

import type { BlockchainService } from './blockchain.service';

export interface ContractFunction {
  name: string;
  signature: string;
  selector: string;
  stateMutability: string;
  inputs: { name: string; type: string }[];
  outputs: { name: string; type: string }[];
}

export interface SourceFile {
  name: string;
  path: string;
  content: string;
}

export interface ContractInfo {
  address: string;
  isPaused: boolean;
  sourceCode?: string;
  sourceFiles?: SourceFile[];
  contractName?: string;
  abi?: any[];
  abiString?: string;
  functions?: ContractFunction[];
  compilerVersion?: string;
  optimizationUsed?: boolean;
  runs?: number;
  evmVersion?: string;
  license?: string;
  registeredAt: number;
}

interface FetchedContractData {
  sourceCode?: string;
  sourceFiles?: SourceFile[];
  contractName?: string;
  abi?: any[];
  abiString?: string;
  compilerVersion?: string;
  optimizationUsed?: boolean;
  runs?: number;
  evmVersion?: string;
  license?: string;
}

export class ContractRegistryService {
  private contracts: Map<string, ContractInfo> = new Map();
  private etherscanApiKey: string;

  constructor(private blockchain: BlockchainService) {
    this.etherscanApiKey = process.env.ETHERSCAN_API_KEY || '';
  }

  /**
   * Register a contract - fetches source code and ABI from Etherscan
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

    // Pre-fetch source code and ABI
    const sourceInfo = await this.fetchSourceCode(normalized);

    // Parse ABI to extract functions
    const functions = this.parseFunctions(sourceInfo?.abi);

    const info: ContractInfo = {
      address: normalized,
      isPaused,
      sourceCode: sourceInfo?.sourceCode,
      sourceFiles: sourceInfo?.sourceFiles,
      contractName: sourceInfo?.contractName,
      abi: sourceInfo?.abi,
      abiString: sourceInfo?.abiString,
      functions,
      compilerVersion: sourceInfo?.compilerVersion,
      optimizationUsed: sourceInfo?.optimizationUsed,
      runs: sourceInfo?.runs,
      evmVersion: sourceInfo?.evmVersion,
      license: sourceInfo?.license,
      registeredAt: Date.now(),
    };

    this.contracts.set(normalized, info);

    if (info.sourceCode) {
      console.log(`   ✓ Source cached: ${info.sourceCode.length} chars`);
      console.log(`   ✓ Contract: ${info.contractName}`);
      console.log(`   ✓ Functions: ${info.functions?.length || 0}`);
      console.log(`   ✓ ABI: ${info.abi?.length || 0} items`);
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
   * Parse ABI to extract readable functions
   */
  private parseFunctions(abi: any[] | undefined): ContractFunction[] | undefined {
    if (!abi || !Array.isArray(abi)) return undefined;

    return abi
      .filter((item: any) => item.type === 'function')
      .map((func: any) => {
        const inputs = func.inputs?.map((i: any) => `${i.type} ${i.name}`).join(', ') || '';
        const signature = `${func.name}(${inputs})`;
        
        // Calculate function selector (first 4 bytes of keccak256)
        const selector = this.computeSelector(signature);

        return {
          name: func.name,
          signature,
          selector,
          stateMutability: func.stateMutability || 'nonpayable',
          inputs: func.inputs?.map((i: any) => ({ name: i.name, type: i.type })) || [],
          outputs: func.outputs?.map((o: any) => ({ name: o.name, type: o.type })) || [],
        };
      });
  }

  /**
   * Compute function selector (0x12345678)
   */
  private computeSelector(signature: string): string {
    // Simple hash - in production use keccak256
    // For display purposes only
    let hash = 0;
    for (let i = 0; i < signature.length; i++) {
      const char = signature.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return '0x' + Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8);
  }

  /**
   * Fetch source code from Etherscan
   */
  private async fetchSourceCode(address: string): Promise<FetchedContractData | null> {
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
      const abiString = result.ABI;

      if (!sourceCode || sourceCode === '') {
        return null;
      }

      // Parse source files (handle multi-file contracts)
      const sourceFiles = this.parseSourceFiles(sourceCode, result.ContractName);

      // Parse ABI
      let abi: any[] | undefined;
      try {
        if (abiString && abiString !== 'Contract source code not verified') {
          abi = JSON.parse(abiString);
        }
      } catch (e) {
        console.log('   ⚠️ Failed to parse ABI');
      }

      return {
        sourceCode,
        sourceFiles,
        contractName: result.ContractName || 'Unknown',
        abi,
        abiString,
        compilerVersion: result.CompilerVersion,
        optimizationUsed: result.OptimizationUsed === '1',
        runs: parseInt(result.Runs) || 0,
        evmVersion: result.EVMVersion,
        license: result.LicenseType,
      };
    } catch (error) {
      console.log(`   ❌ Etherscan fetch failed: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Parse source code into individual files
   * Handles both single file and multi-file (metadata JSON) formats
   */
  private parseSourceFiles(sourceCode: string, contractName: string): SourceFile[] {
    const files: SourceFile[] = [];

    // Check if it's a multi-file contract (starts with {{)
    if (sourceCode.startsWith('{{') && sourceCode.includes('sources')) {
      try {
        // Etherscan wraps multi-file in double braces
        const jsonStr = sourceCode.slice(1, -1); // Remove outer {}
        const metadata = JSON.parse(jsonStr);
        
        if (metadata.sources) {
          for (const [path, source] of Object.entries(metadata.sources)) {
            const src = source as any;
            files.push({
              name: path.split('/').pop() || path,
              path,
              content: src.content || '',
            });
          }
          return files;
        }
      } catch (e) {
        // Fall through to single file
      }
    }

    // Single file contract
    files.push({
      name: `${contractName}.sol`,
      path: `contracts/${contractName}.sol`,
      content: sourceCode,
    });

    return files;
  }
}
