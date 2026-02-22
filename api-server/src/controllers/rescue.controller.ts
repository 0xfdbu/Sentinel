/**
 * Confidential Rescue Controller
 * 
 * API endpoints for confidential fund rescue using Chainlink TEE.
 */

import type { Request, Response } from 'express';
import { confidentialRescueService } from '../services/confidential-rescue.service';
import { confidentialTxService } from '../services/confidential-tx.service';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errors';
import { asyncHandler } from '../utils/errors';

export class RescueController {
  /**
   * Execute confidential rescue
   * POST /api/rescue/execute
   * 
   * Body: {
   *   contractAddress: string,    // Vault with vulnerability
   *   userAddress: string,        // User who owns funds
   *   userPrivateKey: string,     // User's private key (for signing)
   *   threatScore: number,        // Fraud score (0-100)
   *   threatFactors: string[]     // Why it's suspicious
   * }
   */
  executeRescue = asyncHandler(async (req: Request, res: Response) => {
    const { contractAddress, userAddress, userPrivateKey, threatScore, threatFactors } = req.body;

    // Validation
    if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/i.test(contractAddress)) {
      throw new ValidationError('Valid contractAddress is required');
    }
    if (!userAddress || !/^0x[a-fA-F0-9]{40}$/i.test(userAddress)) {
      throw new ValidationError('Valid userAddress is required');
    }
    if (!userPrivateKey || !userPrivateKey.startsWith('0x')) {
      throw new ValidationError('Valid userPrivateKey is required');
    }
    if (typeof threatScore !== 'number' || threatScore < 0 || threatScore > 100) {
      throw new ValidationError('Valid threatScore (0-100) is required');
    }

    logger.info('[RESCUE API] 🚨 Confidential rescue requested', {
      contract: contractAddress,
      user: userAddress,
      threatScore
    });

    // Execute confidential rescue
    const result = await confidentialRescueService.executeRescue({
      contractAddress,
      userAddress,
      userPrivateKey,
      threatScore,
      threatFactors: threatFactors || ['High risk transaction detected']
    });

    if (result.success && result.rescued) {
      res.json({
        success: true,
        data: {
          rescued: true,
          rescueTxId: result.rescueTxId,
          shieldedDestination: result.shieldedDestination,
          amountRescued: result.amountRescued,
          confidential: true,
          tee: true,
          message: 'Funds rescued confidentially via TEE private transfer. Attacker cannot trace destination.'
        }
      });
    } else if (result.success && !result.rescued) {
      res.json({
        success: true,
        data: {
          rescued: false,
          reason: result.error,
          confidential: true,
          tee: true,
          message: 'No funds to rescue in private vault'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'RESCUE_FAILED',
          message: result.error || 'Confidential rescue failed'
        }
      });
    }
  });

  /**
   * Check if user can be rescued (has private balance)
   * POST /api/rescue/check
   */
  checkRescueStatus = asyncHandler(async (req: Request, res: Response) => {
    const { userAddress, userPrivateKey } = req.body;

    if (!userAddress || !/^0x[a-fA-F0-9]{40}$/i.test(userAddress)) {
      throw new ValidationError('Valid userAddress is required');
    }
    if (!userPrivateKey || !userPrivateKey.startsWith('0x')) {
      throw new ValidationError('Valid userPrivateKey is required');
    }

    const balances = await confidentialTxService.getPrivateBalances(
      userAddress,
      userPrivateKey
    );

    const canRescue = balances && balances.length > 0;

    res.json({
      success: true,
      data: {
        userAddress: userAddress.toLowerCase(),
        canRescue,
        privateBalances: balances,
        teeAvailable: await confidentialTxService.isAvailable()
      }
    });
  });

  /**
   * Get rescue service stats
   * GET /api/rescue/stats
   */
  getStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await confidentialRescueService.getStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        features: [
          'Confidential fund rescue via TEE',
          'Shielded addresses for privacy',
          'Off-chain balance checking',
          'EIP-712 signed transactions',
          'Hide-sender protection'
        ]
      }
    });
  });
}

export const rescueController = new RescueController();
