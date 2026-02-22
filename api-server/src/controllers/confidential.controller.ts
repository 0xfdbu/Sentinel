/**
 * Confidential Transaction Controller
 * 
 * Handles confidential transactions through Chainlink TEE.
 * Uses REAL Compliant Private Transfer Demo API.
 */

import type { Request, Response } from 'express';
import { confidentialTxService } from '../services/confidential-tx.service';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errors';
import { asyncHandler } from '../utils/errors';

export class ConfidentialController {
  /**
   * Get shielded address for receiving private transfers
   * POST /api/confidential/shielded-address
   */
  getShieldedAddress = asyncHandler(async (req: Request, res: Response) => {
    const { walletAddress, privateKey } = req.body;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
      throw new ValidationError('Valid walletAddress is required');
    }
    if (!privateKey || !privateKey.startsWith('0x')) {
      throw new ValidationError('Valid privateKey is required');
    }

    const shieldedAddress = await confidentialTxService.getShieldedAddress(
      walletAddress,
      privateKey
    );

    if (!shieldedAddress) {
      return res.status(500).json({
        success: false,
        error: { code: 'TEE_ERROR', message: 'Failed to get shielded address from TEE' }
      });
    }

    res.json({
      success: true,
      data: {
        walletAddress: walletAddress.toLowerCase(),
        shieldedAddress,
        confidential: true,
        tee: true
      }
    });
  });

  /**
   * Get private balances from TEE
   * POST /api/confidential/balances
   */
  getPrivateBalances = asyncHandler(async (req: Request, res: Response) => {
    const { walletAddress, privateKey } = req.body;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
      throw new ValidationError('Valid walletAddress is required');
    }
    if (!privateKey || !privateKey.startsWith('0x')) {
      throw new ValidationError('Valid privateKey is required');
    }

    const balances = await confidentialTxService.getPrivateBalances(
      walletAddress,
      privateKey
    );

    res.json({
      success: true,
      data: {
        walletAddress: walletAddress.toLowerCase(),
        balances,
        confidential: true,
        tee: true
      }
    });
  });

  /**
   * Execute confidential transfer
   * POST /api/confidential/transfer
   */
  executeTransfer = asyncHandler(async (req: Request, res: Response) => {
    const { senderPrivateKey, recipientShieldedAddress, tokenAddress, amount, hideSender = true } = req.body;

    if (!senderPrivateKey || !senderPrivateKey.startsWith('0x')) {
      throw new ValidationError('Valid senderPrivateKey is required');
    }
    if (!recipientShieldedAddress || !/^0x[a-fA-F0-9]{40}$/i.test(recipientShieldedAddress)) {
      throw new ValidationError('Valid recipientShieldedAddress is required');
    }
    if (!tokenAddress || !/^0x[a-fA-F0-9]{40}$/i.test(tokenAddress)) {
      throw new ValidationError('Valid tokenAddress is required');
    }
    if (!amount || isNaN(Number(amount))) {
      throw new ValidationError('Valid amount is required');
    }

    logger.info('[CONFIDENTIAL] Executing confidential transfer', {
      recipient: recipientShieldedAddress,
      token: tokenAddress,
      amount
    });

    const result = await confidentialTxService.executeConfidentialTransfer(
      senderPrivateKey,
      recipientShieldedAddress,
      tokenAddress,
      amount,
      hideSender
    );

    if (result.success) {
      res.json({
        success: true,
        data: {
          transactionId: result.transactionId,
          confidential: true,
          tee: true
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'TRANSFER_FAILED',
          message: result.error || 'Confidential transfer failed'
        }
      });
    }
  });

  /**
   * Request withdrawal ticket
   * POST /api/confidential/withdraw
   */
  requestWithdrawal = asyncHandler(async (req: Request, res: Response) => {
    const { walletAddress, privateKey, tokenAddress, amount } = req.body;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
      throw new ValidationError('Valid walletAddress is required');
    }
    if (!privateKey || !privateKey.startsWith('0x')) {
      throw new ValidationError('Valid privateKey is required');
    }
    if (!tokenAddress || !/^0x[a-fA-F0-9]{40}$/i.test(tokenAddress)) {
      throw new ValidationError('Valid tokenAddress is required');
    }
    if (!amount || isNaN(Number(amount))) {
      throw new ValidationError('Valid amount is required');
    }

    const result = await confidentialTxService.requestWithdrawal(
      walletAddress,
      privateKey,
      tokenAddress,
      amount
    );

    if (!result) {
      return res.status(500).json({
        success: false,
        error: { code: 'WITHDRAWAL_FAILED', message: 'Failed to request withdrawal ticket' }
      });
    }

    res.json({
      success: true,
      data: {
        ticket: result.ticket,
        deadline: result.deadline,
        confidential: true,
        tee: true
      }
    });
  });

  /**
   * Get TEE status
   * GET /api/confidential/status
   */
  getStatus = asyncHandler(async (_req: Request, res: Response) => {
    const isAvailable = await confidentialTxService.isAvailable();
    
    res.json({
      success: true,
      data: {
        available: isAvailable,
        teeApi: process.env.TEE_API_URL || 'https://convergence2026-token-api.cldev.cloud',
        vaultAddress: '0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13',
        chainId: 11155111
      }
    });
  });
}

export const confidentialController = new ConfidentialController();
