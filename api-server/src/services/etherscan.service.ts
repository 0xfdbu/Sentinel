/**
 * Etherscan Service
 * 
 * Fetches contract source code from Etherscan API
 * Implements caching and rate limiting
 */

import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { ExternalAPIError, NotFoundError } from '../utils/errors';
import type { EtherscanResponse, EtherscanSourceResult } from '../types';

export class EtherscanService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private cache: Map<string, { data: EtherscanSourceResult; timestamp: number }> = new Map();
  private readonly cacheTtl = 5 * 60 * 1000; // 5 minutes
  
  constructor() {
    this.baseUrl = config.apis.etherscan.baseUrl;
    this.apiKey = config.apis.etherscan.key;
  }
  
  /**
   * Fetch contract source code from Etherscan
   */
  async getContractSource(
    contractAddress: string,
    chainId: number = 1
  ): Promise<EtherscanSourceResult> {
    const cacheKey = `${chainId}:${contractAddress.toLowerCase()}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      logger.debug('Etherscan cache hit', { contractAddress, chainId });
      return cached.data;
    }
    
    logger.info('Fetching contract source from Etherscan', { contractAddress, chainId });
    
    const url = new URL(this.baseUrl);
    url.searchParams.append('chainid', chainId.toString());
    url.searchParams.append('module', 'contract');
    url.searchParams.append('action', 'getsourcecode');
    url.searchParams.append('address', contractAddress);
    url.searchParams.append('apikey', this.apiKey);
    
    try {
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new ExternalAPIError('Etherscan', `HTTP ${response.status}`);
      }
      
      const data = await response.json() as EtherscanResponse;
      
      if (data.status !== '1') {
        throw new ExternalAPIError('Etherscan', data.message || 'Unknown error');
      }
      
      if (!data.result || data.result.length === 0) {
        throw new NotFoundError('Contract source code');
      }
      
      const result = data.result[0];
      
      if (!result.SourceCode || result.SourceCode === '') {
        throw new NotFoundError('Contract source code (not verified)');
      }
      
      // Cache the result
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      logger.info('Contract source fetched successfully', {
        contractAddress,
        contractName: result.ContractName,
        sourceLength: result.SourceCode.length,
      });
      
      return result;
      
    } catch (error) {
      if (error instanceof ExternalAPIError || error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error('Etherscan API error', { error, contractAddress });
      throw new ExternalAPIError('Etherscan', 'Failed to fetch contract source');
    }
  }
  
  /**
   * Parse source code - handle both single and multi-part contracts
   */
  parseSourceCode(sourceCode: string): string {
    // Handle multi-part contracts (JSON format)
    if (sourceCode.startsWith('{') && sourceCode.includes('sources')) {
      try {
        const parsed = JSON.parse(sourceCode);
        
        // Handle different metadata formats
        if (parsed.sources) {
          // Concatenate all sources
          return Object.entries(parsed.sources)
            .map(([path, source]: [string, any]) => 
              `// File: ${path}\n${source.content || source}`
            )
            .join('\n\n');
        }
        
        return JSON.stringify(parsed, null, 2);
      } catch {
        // If JSON parsing fails, return raw source
        return sourceCode;
      }
    }
    
    return sourceCode;
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Etherscan cache cleared');
  }
}

// Singleton instance
export const etherscanService = new EtherscanService();
