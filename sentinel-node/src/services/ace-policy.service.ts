/**
 * ACE Policy Engine - Compliance and risk policy evaluation
 * 
 * Implements ACE-style policies similar to stablecoin-ace-ccip template:
 * - Blacklist checks
 * - Volume/threshold limits
 * - Threat level policies
 */

import { CONFIG } from '../config';

export interface PolicyResult {
  passed: boolean;
  policy: string;
  violations: PolicyViolation[];
  recommendedAction: 'ALLOW' | 'MONITOR' | 'PAUSE' | 'PAUSE_IMMEDIATELY';
  riskScore: number;
}

export interface PolicyViolation {
  rule: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  details: string;
}

export interface TransactionContext {
  from: string;
  to: string | null;
  value: bigint;
  data: string;
  threats: any[];
}

// ACE-style configuration
const ACE_CONFIG = {
  // Blacklist policy
  BLACKLIST: [
    '0xBadActor0000000000000000000000000000000000', // Example
    // Add known malicious addresses here
  ].map(a => a.toLowerCase()),
  
  // Volume policy (like stablecoin template)
  MAX_TRANSACTION_VALUE: BigInt(CONFIG.SUSPICIOUS_VALUE_ETH * 1e18), // From config
  MAX_DAILY_VOLUME: BigInt('1000000000000000000'), // 1 ETH example
  
  // Threat policy
  CRITICAL_ACTION_THRESHOLD: 'CRITICAL' as const,
  HIGH_ACTION_THRESHOLD: 'HIGH' as const,
  MEDIUM_MONITOR_THRESHOLD: 'MEDIUM' as const,
};

export class ACEPolicyService {
  private dailyVolumes: Map<string, bigint> = new Map();
  private lastReset: number = Date.now();

  /**
   * Run full ACE policy evaluation on transaction
   */
  evaluatePolicies(context: TransactionContext): PolicyResult {
    const violations: PolicyViolation[] = [];
    
    // Policy 1: Blacklist Check
    const blacklistViolation = this.checkBlacklist(context);
    if (blacklistViolation) violations.push(blacklistViolation);
    
    // Policy 2: Volume/Value Check
    const volumeViolation = this.checkVolumePolicy(context);
    if (volumeViolation) violations.push(volumeViolation);
    
    // Policy 3: Threat Level Check
    const threatViolations = this.checkThreatPolicy(context);
    violations.push(...threatViolations);
    
    // Calculate risk score (0-100)
    const riskScore = this.calculateRiskScore(violations, context);
    
    // Determine recommended action
    const recommendedAction = this.determineAction(violations, riskScore);
    
    return {
      passed: violations.length === 0,
      policy: 'sentinel-threat-assessment-v1',
      violations,
      recommendedAction,
      riskScore,
    };
  }

  /**
   * Policy: Blacklist compliance
   * Rejects transactions from known malicious addresses
   */
  private checkBlacklist(context: TransactionContext): PolicyViolation | null {
    const from = context.from.toLowerCase();
    
    if (ACE_CONFIG.BLACKLIST.includes(from)) {
      return {
        rule: 'BLACKLIST_COMPLIANCE',
        severity: 'CRITICAL',
        details: `Address ${context.from} is on the Sentinel blacklist`,
      };
    }
    
    return null;
  }

  /**
   * Policy: Volume limits
   * Enforces transaction value limits (ACE-style)
   */
  private checkVolumePolicy(context: TransactionContext): PolicyViolation | null {
    // Check single transaction limit
    if (context.value > ACE_CONFIG.MAX_TRANSACTION_VALUE) {
      return {
        rule: 'MAX_TRANSACTION_VALUE',
        severity: 'HIGH',
        details: `Value ${context.value.toString()} exceeds max ${ACE_CONFIG.MAX_TRANSACTION_VALUE.toString()}`,
      };
    }
    
    // Check daily volume (simplified - would need proper tracking)
    const dailyVol = this.dailyVolumes.get(context.from) || BigInt(0);
    if (dailyVol > ACE_CONFIG.MAX_DAILY_VOLUME) {
      return {
        rule: 'DAILY_VOLUME_LIMIT',
        severity: 'MEDIUM',
        details: 'Daily volume limit exceeded',
      };
    }
    
    return null;
  }

  /**
   * Policy: Threat level assessment
   * Evaluates detected threats against policy thresholds
   */
  private checkThreatPolicy(context: TransactionContext): PolicyViolation[] {
    const violations: PolicyViolation[] = [];
    
    for (const threat of context.threats) {
      if (threat.level === 'CRITICAL') {
        violations.push({
          rule: 'CRITICAL_THREAT_DETECTED',
          severity: 'CRITICAL',
          details: threat.details,
        });
      } else if (threat.level === 'HIGH') {
        violations.push({
          rule: 'HIGH_RISK_ACTIVITY',
          severity: 'HIGH',
          details: threat.details,
        });
      }
    }
    
    return violations;
  }

  /**
   * Calculate overall risk score (0-100)
   * Higher = more risky
   */
  private calculateRiskScore(violations: PolicyViolation[], context: TransactionContext): number {
    let score = 0;
    
    // Base score from violations
    for (const v of violations) {
      switch (v.severity) {
        case 'CRITICAL': score += 40; break;
        case 'HIGH': score += 25; break;
        case 'MEDIUM': score += 10; break;
        case 'LOW': score += 5; break;
      }
    }
    
    // Boost for high-value transactions
    const valueEth = Number(context.value) / 1e18;
    if (valueEth > 0.01) score += 10;
    if (valueEth > 0.1) score += 20;
    
    return Math.min(score, 100);
  }

  /**
   * Determine recommended action based on violations and score
   */
  private determineAction(violations: PolicyViolation[], riskScore: number): PolicyResult['recommendedAction'] {
    // Critical violations = immediate pause
    if (violations.some(v => v.severity === 'CRITICAL')) {
      return 'PAUSE_IMMEDIATELY';
    }
    
    // High violations or high score = pause
    if (violations.some(v => v.severity === 'HIGH') || riskScore >= 60) {
      return 'PAUSE';
    }
    
    // Medium violations = monitor
    if (violations.some(v => v.severity === 'MEDIUM') || riskScore >= 30) {
      return 'MONITOR';
    }
    
    return 'ALLOW';
  }

  /**
   * Add address to blacklist (runtime)
   */
  addToBlacklist(address: string): void {
    ACE_CONFIG.BLACKLIST.push(address.toLowerCase());
  }

  /**
   * Check if address is blacklisted
   */
  isBlacklisted(address: string): boolean {
    return ACE_CONFIG.BLACKLIST.includes(address.toLowerCase());
  }

  /**
   * Get current ACE config
   */
  getConfig(): typeof ACE_CONFIG {
    return { ...ACE_CONFIG };
  }
}

export const acePolicyService = new ACEPolicyService();
