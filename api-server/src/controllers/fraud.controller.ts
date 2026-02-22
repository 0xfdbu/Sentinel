/**
 * Fraud Detection Controller
 * 
 * Analyzes transactions for exploit patterns
 */

import type { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errors';
import { asyncHandler } from '../utils/errors';
import type { FraudCheckRequest, FraudCheckResult } from '../types';

// Flash loan function signatures
const FLASH_LOAN_SIGNATURES = [
  '0x6318967b', // flashLoan
  '0xefefaba7', // flashLoan (Aave)
  '0xc42079f9', // flash (Balancer)
  '0xab9c4b5d', // flashLoan (Uniswap)
];

// Known attacker addresses (example)
const KNOWN_ATTACKERS: string[] = [];

export class FraudController {
  /**
   * Check transaction for fraud indicators
   */
  checkFraud = asyncHandler(async (req: Request, res: Response) => {
    const { tx, contractAddress } = req.body as FraudCheckRequest;
    
    if (!tx || !contractAddress) {
      throw new ValidationError('tx and contractAddress are required');
    }
    
    logger.info('Fraud check requested', { 
      txHash: tx.hash, 
      contractAddress,
      from: tx.from,
    });
    
    const result = this.analyzeTransaction(tx);
    
    res.json({
      success: true,
      data: {
        ...result,
        rescueAvailable: result.shouldRescue,
        rescueEndpoint: result.shouldRescue ? '/api/rescue/execute' : undefined,
        rescueDescription: result.shouldRescue 
          ? 'Confidential fund rescue via Chainlink TEE - funds moved privately before attack' 
          : undefined,
      },
    });
  });
  
  /**
   * Analyze transaction for threat patterns
   */
  private analyzeTransaction(tx: FraudCheckRequest['tx']): FraudCheckResult {
    const factors: string[] = [];
    let score = 0;
    
    // Check 1: Flash loan pattern
    const input = (tx.input || '').toLowerCase();
    const hasFlashLoan = FLASH_LOAN_SIGNATURES.some(sig => 
      input.includes(sig.toLowerCase())
    );
    
    if (hasFlashLoan) {
      score += 40;
      factors.push('Flash loan pattern detected');
    }
    
    // Check 2: Large transfer
    const valueEth = parseInt(tx.value || '0', 16) / 1e18;
    if (valueEth > 500) {
      score += 50;
      factors.push(`Very large transfer: ${valueEth.toFixed(2)} ETH`);
    } else if (valueEth > 100) {
      score += 20;
      factors.push(`Large transfer: ${valueEth.toFixed(2)} ETH`);
    }
    
    // Check 3: High gas usage
    if (tx.gas > 5000000) {
      score += 30;
      factors.push('High gas usage (complex operation)');
    }
    
    // Check 4: Known attacker
    const from = tx.from.toLowerCase();
    if (KNOWN_ATTACKERS.includes(from)) {
      score += 100;
      factors.push('Known attacker address');
    }
    
    // Calculate confidence based on number of factors
    const confidence = factors.length > 0 
      ? Math.min(0.5 + (factors.length * 0.15), 0.95) 
      : 0.1;
    
    // Determine if we should suggest confidential rescue
    const shouldRescue = score >= 70; // Lower threshold for rescue than pause
    const shouldPause = score >= 85;
    
    const result: FraudCheckResult = {
      score: Math.min(score, 100),
      factors,
      shouldPause,
      shouldRescue,
      confidence,
      timestamp: Date.now(),
      recommendedAction: shouldRescue 
        ? 'CONFIDENTIAL_RESCUE' 
        : shouldPause 
          ? 'PAUSE' 
          : 'MONITOR',
    };
    
    logger.info('Fraud analysis complete', {
      txHash: tx.hash,
      score: result.score,
      shouldPause: result.shouldPause,
      shouldRescue: result.shouldRescue,
      factors: factors.length,
    });
    
    return result;
  }
}

export const fraudController = new FraudController();
