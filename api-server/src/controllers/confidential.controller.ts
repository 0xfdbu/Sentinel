/**
 * Confidential Transaction Controller
 * 
 * Handles confidential pause execution through TEE (Trusted Execution Environment).
 * This ensures the pause reason and admin identity remain private.
 */

import type { Request, Response } from 'express';
import { confidentialTxService } from '../services/confidential-tx.service';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errors';
import { asyncHandler } from '../utils/errors';

export class ConfidentialController {
  /**
   * Execute confidential pause
   * POST /api/confidential/pause
   */
  executePause = asyncHandler(async (req: Request, res: Response) => {
    const { contractAddress, reason = 'Fraud detection' } = req.body;

    if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/i.test(contractAddress)) {
      throw new ValidationError('Valid contractAddress is required');
    }

    if (!confidentialTxService.isAvailable()) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'NOT_CONFIGURED',
          message: 'Confidential transactions not configured - ADMIN_PRIVATE_KEY missing'
        }
      });
    }

    logger.info('[CONFIDENTIAL] Pause requested', { contractAddress, reason });

    const result = await confidentialTxService.executeConfidentialPause(
      contractAddress,
      reason
    );

    if (result.success) {
      res.json({
        success: true,
        data: {
          contractAddress: contractAddress.toLowerCase(),
          txHash: result.txHash,
          confidential: result.confidential,
          tee: result.tee,
          adminAddress: confidentialTxService.getAdminAddress()
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'PAUSE_FAILED',
          message: result.error || 'Confidential pause failed'
        }
      });
    }
  });

  /**
   * Get confidential transaction status
   * GET /api/confidential/status
   */
  getStatus = asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        available: confidentialTxService.isAvailable(),
        adminAddress: confidentialTxService.getAdminAddress(),
        teeApi: process.env.TEE_API_URL || 'https://convergence2026-token-api.cldev.cloud'
      }
    });
  });
}

export const confidentialController = new ConfidentialController();
