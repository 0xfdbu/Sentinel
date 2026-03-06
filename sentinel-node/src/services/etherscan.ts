/**
 * Etherscan API V2 Service - Fetches contract source code
 */

import axios from 'axios';
import { EtherscanContract } from '../types';

export class EtherscanService {
  private apiKey: string;
  private baseUrl: string;
  private chainId: number;

  constructor(apiKey: string, chainId: number = 11155111) {
    this.apiKey = apiKey;
    this.chainId = chainId;
    // Etherscan API v2 endpoint
    this.baseUrl = 'https://api.etherscan.io/v2/api';
  }

  async getContractSource(address: string): Promise<EtherscanContract | null> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          chainid: this.chainId,
          module: 'contract',
          action: 'getsourcecode',
          address,
          apikey: this.apiKey,
        },
      });

      if (response.data.status !== '1' || !response.data.result?.[0]) {
        console.log(`   ⚠️  Etherscan: ${response.data.message || 'Unknown error'}`);
        return null;
      }

      const result = response.data.result[0];

      // Check if source code exists and is not just "Contract source code not verified"
      if (!result.SourceCode || result.SourceCode === '' || result.SourceCode.includes('not verified')) {
        return null;
      }

      // Check if ABI exists
      if (!result.ABI || result.ABI === 'Contract source code not verified') {
        return null;
      }

      return {
        SourceCode: result.SourceCode,
        ABI: result.ABI,
        ContractName: result.ContractName,
        CompilerVersion: result.CompilerVersion,
        OptimizationUsed: result.OptimizationUsed,
        Runs: result.Runs,
        Proxy: result.Proxy,
        Implementation: result.Implementation,
      };
    } catch (error) {
      console.error('   ❌ Etherscan API error:', (error as any).message);
      return null;
    }
  }
}
