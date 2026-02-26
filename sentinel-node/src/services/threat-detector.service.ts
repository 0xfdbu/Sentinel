/**
 * Threat Detector Service - Analyzes transactions for attack patterns
 * 
 * Enhanced with ACE-style policies:
 * - Blacklist compliance checks
 * - Volume/threshold monitoring
 * - Pattern-based threat detection
 */

import { ethers } from 'ethers';
import { CONFIG, ATTACK_SIGNATURES, SUSPICIOUS_SIGNATURES } from '../config';
import type { ThreatEvent } from '../types';
import { acePolicyService, type PolicyResult } from './ace-policy.service';

// Blacklist of known malicious addresses (ACE-style compliance)
const SENTINEL_BLACKLIST = [
  '0xBadActor0000000000000000000000000000000000', // Example placeholder
  // Add known malicious addresses here
].map(a => a.toLowerCase());

export class ThreatDetectorService {
  private blacklist: Set<string> = new Set(SENTINEL_BLACKLIST);

  /**
   * Analyze transaction for threat patterns
   * Enhanced with ACE policy evaluation
   */
  analyzeTransaction(
    tx: ethers.TransactionResponse,
    contractAddress: string
  ): ThreatEvent[] {
    const threats: ThreatEvent[] = [];
    const toAddress = tx.to?.toLowerCase() || '';
    const fromAddress = tx.from.toLowerCase();
    const valueEth = parseFloat(ethers.formatEther(tx.value));

    // ==========================================
    // 1. BLACKLIST CHECK (ACE Policy)
    // ==========================================
    if (this.blacklist.has(fromAddress)) {
      threats.push({
        id: `threat-${tx.hash}-${Date.now()}-blacklist`,
        type: 'THREAT_DETECTED',
        contractAddress: toAddress,
        level: 'CRITICAL',
        details: `🚫 BLACKLISTED SENDER: ${tx.from} (ACE Policy Violation)`,
        txHash: tx.hash,
        timestamp: Date.now(),
        confidence: 1.0,
        metadata: { policy: 'BLACKLIST_COMPLIANCE', sender: tx.from },
      });
    }

    // ==========================================
    // 2. FUNCTION SIGNATURE ANALYSIS
    // ==========================================
    if (!tx.data || tx.data.length < 10) return threats;

    const funcSelector = tx.data.toLowerCase().slice(0, 10);

    // Check for attack function
    if (ATTACK_SIGNATURES[funcSelector]) {
      threats.push({
        id: `threat-${tx.hash}-${Date.now()}-attack`,
        type: 'THREAT_DETECTED',
        contractAddress: toAddress,
        level: 'CRITICAL',
        details: `🚨 ATTACK FUNCTION DETECTED: ${ATTACK_SIGNATURES[funcSelector]}`,
        txHash: tx.hash,
        timestamp: Date.now(),
        confidence: 0.98,
        metadata: { funcSelector, type: 'ATTACK_SIGNATURE' },
      });
    }

    // Check for suspicious functions with value
    if (SUSPICIOUS_SIGNATURES[funcSelector] && valueEth > CONFIG.SUSPICIOUS_VALUE_ETH) {
      threats.push({
        id: `threat-${tx.hash}-${Date.now()}-suspicious`,
        type: 'THREAT_DETECTED',
        contractAddress: toAddress,
        level: 'HIGH',
        details: `⚠️ SENSITIVE FUNCTION: ${SUSPICIOUS_SIGNATURES[funcSelector]} with ${valueEth.toFixed(4)} ETH`,
        txHash: tx.hash,
        timestamp: Date.now(),
        confidence: 0.85,
        metadata: { funcSelector, value: valueEth.toString() },
      });
    }

    // ==========================================
    // 3. VOLUME/VALUE POLICY (ACE-style)
    // ==========================================
    if (valueEth > 1.0) {
      threats.push({
        id: `threat-${tx.hash}-${Date.now()}-volume`,
        type: 'THREAT_DETECTED',
        contractAddress: toAddress,
        level: 'HIGH',
        details: `💰 LARGE VALUE TRANSFER: ${valueEth.toFixed(4)} ETH (ACE Volume Policy)`,
        txHash: tx.hash,
        timestamp: Date.now(),
        confidence: 0.9,
        metadata: { policy: 'MAX_TRANSACTION_VALUE', value: valueEth.toString() },
      });
    }

    // ==========================================
    // 4. REENTRANCY PATTERN DETECTION
    // ==========================================
    if (this.detectReentrancyPattern(tx.data)) {
      threats.push({
        id: `threat-${tx.hash}-${Date.now()}-reentrancy`,
        type: 'THREAT_DETECTED',
        contractAddress: toAddress,
        level: 'CRITICAL',
        details: `🔍 POTENTIAL REENTRANCY PATTERN in call data`,
        txHash: tx.hash,
        timestamp: Date.now(),
        confidence: 0.75,
        metadata: { type: 'REENTRANCY_PATTERN' },
      });
    }

    return threats;
  }

  /**
   * Run full ACE policy evaluation on transaction
   * Returns structured policy result for CRE workflow
   */
  evaluateACEPolicies(
    tx: ethers.TransactionResponse,
    existingThreats: ThreatEvent[]
  ): PolicyResult {
    return acePolicyService.evaluatePolicies({
      from: tx.from,
      to: tx.to,
      value: tx.value,
      data: tx.data || '0x',
      threats: existingThreats,
    });
  }

  /**
   * Check if any threats are critical/high
   */
  hasCriticalThreats(threats: ThreatEvent[]): boolean {
    return threats.some(t => t.level === 'CRITICAL' || t.level === 'HIGH');
  }

  /**
   * Add address to runtime blacklist
   */
  addToBlacklist(address: string): void {
    this.blacklist.add(address.toLowerCase());
  }

  /**
   * Check if address is blacklisted
   */
  isBlacklisted(address: string): boolean {
    return this.blacklist.has(address.toLowerCase());
  }

  /**
   * Get current blacklist
   */
  getBlacklist(): string[] {
    return Array.from(this.blacklist);
  }

  /**
   * Detect potential reentrancy patterns in call data
   * Looks for multiple call operations or recursive patterns
   */
  private detectReentrancyPattern(data: string): boolean {
    // Simple heuristic: look for multiple external call opcodes
    // In a real implementation, you'd use bytecode analysis
    const externalCallSigs = ['0x40', '0xf1', '0xf2', '0xf4']; // CALL, CALLCODE, DELEGATECALL, STATICCALL
    let callCount = 0;
    
    for (let i = 0; i < data.length - 2; i += 2) {
      const byte = data.slice(i, i + 2);
      if (externalCallSigs.includes('0x' + byte)) {
        callCount++;
      }
    }
    
    // Multiple calls in single transaction is suspicious
    return callCount > 1;
  }
}
