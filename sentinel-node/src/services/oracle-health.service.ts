/**
 * Oracle Health Service - Monitors Chainlink oracle status and balances
 * 
 * Tracks:
 * - Oracle ETH balance (for gas fees)
 * - LINK token balance (for oracle payments)
 * - Data freshness (last heartbeat/update)
 * - Oracle response health
 */

import { ethers } from 'ethers';
import { CONFIG } from '../config';

// ERC20 ABI for balance checks
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

// Chainlink Price Feed ABI
const PRICE_FEED_ABI = [
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() view returns (uint8)',
  'function description() view returns (string)',
];

export interface TokenBalance {
  symbol: string;
  address: string;
  balance: string;
  balanceRaw: string;
  decimals: number;
  usdValue?: number;
}

export interface OracleHealthStatus {
  address: string;
  name: string;
  isHealthy: boolean;
  lastChecked: number;
  
  // Balances
  ethBalance: string;
  ethBalanceRaw: string;
  tokens: TokenBalance[];
  
  // Health metrics
  warnings: string[];
  errors: string[];
  
  // Metadata
  metadata?: {
    lastHeartbeat?: number;
    dataFreshness?: number; // seconds since last update
    responseTimeMs?: number;
    roundId?: string;
    answer?: string;
    answeredInRound?: string;
  };
}

export interface OracleConfig {
  address: string;
  name: string;
  type: 'priceFeed' | 'vrf' | 'automation' | 'custom';
  minEthBalance?: string; // in ETH
  minLinkBalance?: string; // in LINK
  maxDataAge?: number; // seconds
  tokensToMonitor?: string[]; // additional token addresses
}

export class OracleHealthService {
  private provider: ethers.JsonRpcProvider;
  private oracles: Map<string, OracleConfig> = new Map();
  private lastHealthStatus: Map<string, OracleHealthStatus> = new Map();
  
  // Known token addresses on Sepolia
  private readonly KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
    '0x779877A7B0D9E8603169DdbD7836e478b4624789': { symbol: 'LINK', decimals: 18 }, // Chainlink token
    '0xFd57b4ddBf88a4e07fF4e34C487b99afdeFeFe56': { symbol: 'USDC', decimals: 6 },
    '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419': { symbol: 'WETH', decimals: 18 },
  };
  
  // Price feeds to monitor (Sepolia testnet)
  private readonly DEFAULT_ORACLES: OracleConfig[] = [
    {
      address: '0x694AA1769357215DE4FAC081bf1f309aDC325306', // ETH/USD on Sepolia
      name: 'ETH/USD Price Feed',
      type: 'priceFeed',
      minEthBalance: '0.01',
      minLinkBalance: '1',
      maxDataAge: 3600, // 1 hour
    },
    {
      address: '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43', // BTC/USD on Sepolia
      name: 'BTC/USD Price Feed',
      type: 'priceFeed',
      minEthBalance: '0.01',
      minLinkBalance: '1',
      maxDataAge: 3600,
    },
    {
      address: '0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E', // LINK/USD on Sepolia
      name: 'LINK/USD Price Feed',
      type: 'priceFeed',
      minEthBalance: '0.01',
      minLinkBalance: '1',
      maxDataAge: 3600,
    },
  ];

  constructor(provider: ethers.JsonRpcProvider) {
    this.provider = provider;
    
    // Register default oracles
    for (const oracle of this.DEFAULT_ORACLES) {
      this.oracles.set(oracle.address.toLowerCase(), oracle);
    }
  }

  /**
   * Register a new oracle to monitor
   */
  registerOracle(config: OracleConfig): void {
    this.oracles.set(config.address.toLowerCase(), config);
    console.log(`   ✓ Registered oracle: ${config.name} (${config.address})`);
  }

  /**
   * Get all registered oracles
   */
  getRegisteredOracles(): OracleConfig[] {
    return Array.from(this.oracles.values());
  }

  /**
   * Check health of a single oracle
   */
  async checkOracleHealth(oracleAddress: string): Promise<OracleHealthStatus> {
    const config = this.oracles.get(oracleAddress.toLowerCase());
    const startTime = Date.now();
    
    const status: OracleHealthStatus = {
      address: oracleAddress,
      name: config?.name || 'Unknown Oracle',
      isHealthy: true,
      lastChecked: startTime,
      ethBalance: '0',
      ethBalanceRaw: '0',
      tokens: [],
      warnings: [],
      errors: [],
      metadata: {},
    };

    try {
      // Check ETH balance
      const ethBalance = await this.provider.getBalance(oracleAddress);
      status.ethBalanceRaw = ethBalance.toString();
      status.ethBalance = ethers.formatEther(ethBalance);
      
      const minEth = ethers.parseEther(config?.minEthBalance || '0.01');
      if (ethBalance < minEth) {
        const warning = `Low ETH balance: ${status.ethBalance} ETH (min: ${config?.minEthBalance} ETH)`;
        status.warnings.push(warning);
      }

      // Check LINK balance (primary oracle token)
      const linkAddress = '0x779877A7B0D9E8603169DdbD7836e478b4624789'; // Sepolia LINK
      const linkBalance = await this.getTokenBalance(linkAddress, oracleAddress);
      if (linkBalance) {
        status.tokens.push(linkBalance);
        
        const minLink = ethers.parseEther(config?.minLinkBalance || '1');
        if (ethers.parseEther(linkBalance.balance) < minLink) {
          const warning = `Low LINK balance: ${linkBalance.balance} LINK (min: ${config?.minLinkBalance} LINK)`;
          status.warnings.push(warning);
        }
      }

      // Check additional tokens
      if (config?.tokensToMonitor) {
        for (const tokenAddress of config.tokensToMonitor) {
          const balance = await this.getTokenBalance(tokenAddress, oracleAddress);
          if (balance) {
            status.tokens.push(balance);
          }
        }
      }

      // Check data freshness for price feeds
      if (config?.type === 'priceFeed') {
        try {
          const feed = new ethers.Contract(oracleAddress, PRICE_FEED_ABI, this.provider);
          const roundData = await feed.latestRoundData();
          
          // Convert all BigInts to numbers/strings
          const updatedAt = Number(roundData.updatedAt);
          const dataAge = Math.floor(Date.now() / 1000) - updatedAt;
          
          status.metadata = {
            lastHeartbeat: updatedAt,
            dataFreshness: dataAge,
            responseTimeMs: Date.now() - startTime,
            roundId: String(roundData.roundId),
            answer: String(roundData.answer),
            answeredInRound: String(roundData.answeredInRound),
          };

          if (config.maxDataAge && dataAge > config.maxDataAge) {
            const warning = `Stale data: Last update ${dataAge}s ago (max: ${config.maxDataAge}s)`;
            status.warnings.push(warning);
          }
        } catch (error) {
          status.errors.push(`Failed to read price feed data: ${(error as Error).message}`);
        }
      }

      // Determine overall health
      status.isHealthy = status.errors.length === 0;
      
    } catch (error) {
      status.isHealthy = false;
      status.errors.push(`Health check failed: ${(error as Error).message}`);
    }

    this.lastHealthStatus.set(oracleAddress.toLowerCase(), status);
    return status;
  }

  /**
   * Check all registered oracles
   */
  async checkAllOracles(): Promise<OracleHealthStatus[]> {
    const results: OracleHealthStatus[] = [];
    
    for (const [address] of this.oracles) {
      const status = await this.checkOracleHealth(address);
      results.push(status);
    }
    
    return results;
  }

  /**
   * Get last known health status
   */
  getLastStatus(oracleAddress: string): OracleHealthStatus | undefined {
    return this.lastHealthStatus.get(oracleAddress.toLowerCase());
  }

  /**
   * Get all last known statuses
   */
  getAllLastStatuses(): OracleHealthStatus[] {
    return Array.from(this.lastHealthStatus.values());
  }

  /**
   * Get token balance
   */
  private async getTokenBalance(
    tokenAddress: string, 
    ownerAddress: string
  ): Promise<TokenBalance | null> {
    try {
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      const [balance, decimals, symbol] = await Promise.all([
        token.balanceOf(ownerAddress),
        token.decimals().catch(() => 18),
        token.symbol().catch(() => {
          // Fallback to known tokens
          const known = this.KNOWN_TOKENS[tokenAddress.toLowerCase()];
          return known?.symbol || 'UNKNOWN';
        }),
      ]);

      return {
        symbol,
        address: tokenAddress,
        balance: ethers.formatUnits(balance, decimals),
        balanceRaw: balance.toString(),
        decimals,
      };
    } catch (error) {
      // Token might not exist or not be ERC20
      return null;
    }
  }

  /**
   * Get summary of oracle health
   */
  getHealthSummary(): {
    total: number;
    healthy: number;
    unhealthy: number;
    totalWarnings: number;
    totalErrors: number;
  } {
    const statuses = this.getAllLastStatuses();
    return {
      total: statuses.length,
      healthy: statuses.filter(s => s.isHealthy).length,
      unhealthy: statuses.filter(s => !s.isHealthy).length,
      totalWarnings: statuses.reduce((sum, s) => sum + s.warnings.length, 0),
      totalErrors: statuses.reduce((sum, s) => sum + s.errors.length, 0),
    };
  }

  // ==========================================
  // PoR-STYLE VALIDATION (from aws-cre-pricefeeds-por template)
  // ==========================================

  /**
   * PoR-style price feed validation
   * Validates price feed data with consensus checks
   */
  async validatePriceFeed(feedAddress: string): Promise<{
    valid: boolean;
    price: string;
    timestamp: number;
    deviations: string[];
  }> {
    const feed = new ethers.Contract(feedAddress, PRICE_FEED_ABI, this.provider);
    
    try {
      const roundData = await feed.latestRoundData();
      const now = Math.floor(Date.now() / 1000);
      const dataAge = now - Number(roundData.updatedAt);
      
      const deviations: string[] = [];
      
      // Check data freshness (PoR requirement: < 1 hour)
      if (dataAge > 3600) {
        deviations.push(`Stale data: ${dataAge}s old (max: 3600s)`);
      }
      
      // Check for reasonable price values (PoR validation)
      const answer = Number(roundData.answer);
      if (answer <= 0) {
        deviations.push(`Invalid price: ${answer}`);
      }
      
      // Check round consistency
      if (roundData.answeredInRound < roundData.roundId) {
        deviations.push(`Round inconsistency: answeredInRound < roundId`);
      }
      
      return {
        valid: deviations.length === 0,
        price: String(roundData.answer),
        timestamp: Number(roundData.updatedAt),
        deviations,
      };
    } catch (error) {
      return {
        valid: false,
        price: '0',
        timestamp: 0,
        deviations: [`Read error: ${(error as Error).message}`],
      };
    }
  }

  /**
   * Multi-feed consensus check (PoR-style)
   * Compares multiple price feeds for consistency
   */
  async checkFeedConsensus(feeds: string[]): Promise<{
    consensus: boolean;
    averagePrice: string;
    deviations: number;
    details: Record<string, { price: string; valid: boolean }>;
  }> {
    const results: Record<string, { price: string; valid: boolean }> = {};
    let totalPrice = 0;
    let validCount = 0;
    
    for (const feed of feeds) {
      const validation = await this.validatePriceFeed(feed);
      results[feed] = {
        price: validation.price,
        valid: validation.valid,
      };
      
      if (validation.valid) {
        totalPrice += Number(validation.price);
        validCount++;
      }
    }
    
    const averagePrice = validCount > 0 ? (totalPrice / validCount).toFixed(0) : '0';
    const deviations = feeds.length - validCount;
    
    // Consensus: at least 2/3 of feeds must be valid
    const consensus = validCount >= Math.ceil((feeds.length * 2) / 3);
    
    return {
      consensus,
      averagePrice,
      deviations,
      details: results,
    };
  }

  /**
   * Get current ETH/USD price (convenience method)
   */
  async getEthUsdPrice(): Promise<{ price: string; timestamp: number; valid: boolean }> {
    const ethUsdFeed = '0x694AA1769357215DE4FAC081bf1f309aDC325306';
    const validation = await this.validatePriceFeed(ethUsdFeed);
    
    return {
      price: validation.price,
      timestamp: validation.timestamp,
      valid: validation.valid,
    };
  }
}
