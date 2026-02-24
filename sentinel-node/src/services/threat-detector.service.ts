/**
 * Threat Detector Service - Analyzes transactions for attack patterns
 */

import { ethers } from 'ethers';
import { CONFIG, ATTACK_SIGNATURES, SUSPICIOUS_SIGNATURES } from '../config';
import type { ThreatEvent } from '../types';

export class ThreatDetectorService {
  /**
   * Analyze transaction for threat patterns
   */
  analyzeTransaction(
    tx: ethers.TransactionResponse,
    contractAddress: string
  ): ThreatEvent[] {
    const threats: ThreatEvent[] = [];
    const toAddress = tx.to?.toLowerCase() || '';
    const valueEth = parseFloat(ethers.formatEther(tx.value));

    if (!tx.data || tx.data.length < 10) return threats;

    const funcSelector = tx.data.toLowerCase().slice(0, 10);

    // Check for attack function
    if (ATTACK_SIGNATURES[funcSelector]) {
      threats.push({
        id: `threat-${tx.hash}-${Date.now()}`,
        type: 'THREAT_DETECTED',
        contractAddress: toAddress,
        level: 'CRITICAL',
        details: `🚨 ATTACK FUNCTION DETECTED: ${ATTACK_SIGNATURES[funcSelector]}`,
        txHash: tx.hash,
        timestamp: Date.now(),
        confidence: 0.98,
        metadata: { funcSelector },
      });
    }

    // Check for suspicious functions with value
    if (SUSPICIOUS_SIGNATURES[funcSelector] && valueEth > CONFIG.SUSPICIOUS_VALUE_ETH) {
      threats.push({
        id: `threat-${tx.hash}-${Date.now()}`,
        type: 'THREAT_DETECTED',
        contractAddress: toAddress,
        level: 'HIGH',
        details: `Sensitive function: ${SUSPICIOUS_SIGNATURES[funcSelector]}`,
        txHash: tx.hash,
        timestamp: Date.now(),
        confidence: 0.85,
      });
    }

    return threats;
  }

  /**
   * Check if any threats are critical/high
   */
  hasCriticalThreats(threats: ThreatEvent[]): boolean {
    return threats.some(t => t.level === 'CRITICAL' || t.level === 'HIGH');
  }
}
