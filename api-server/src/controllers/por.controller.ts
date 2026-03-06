/**
 * PoR Controller
 * 
 * Proof of Reserves trigger for ETH-collateralized USDA minting
 * Triggers the eth-por-unified CRE workflow with 3-source price consensus
 */

import type { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { asyncHandler } from '../utils/errors';
import { spawn } from 'child_process';
import path from 'path';

// Path to unified ETH+PoR workflow
const WORKFLOW_DIR = path.resolve(__dirname, '../../../workflows/eth-por-unified');
const CRE_BIN = '/home/user/.cre/bin/cre';

export class PoRController {
  /**
   * GET /api/por/status
   * Health check for PoR service
   */
  getStatus = asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        status: 'online',
        timestamp: Date.now(),
        service: 'PoR + Price Consensus Trigger',
        workflow: 'eth-por-unified',
        creBinary: CRE_BIN,
        workflowDir: WORKFLOW_DIR,
        priceSources: ['CoinGecko', 'CryptoCompare', 'Binance'],
        consensusRequired: 3,
        maxDeviationBps: 100, // 1%
      },
    });
  });

  /**
   * Execute CRE CLI and capture ALL output
   */
  private executeCRE(
    user: string,
    ethAmount: string,
    mintRequestId: string,
    depositIndex: number
  ): Promise<{
    success: boolean;
    txHash?: string;
    usdaMinted?: string;
    ethPrice?: number;
    reserves?: string;
    logs: string[];
    error?: string;
  }> {
    return new Promise((resolve) => {
      const rawLogs: string[] = [];
      
      // Build HTTP payload for the workflow
      const httpPayload = JSON.stringify({
        user,
        ethAmount,
        mintRequestId,
        depositIndex,
      });
      
      logger.info(`[PoR] Executing CRE: eth-por-unified`, { user, ethAmount, depositIndex });

      // Spawn CRE process
      const creProcess = spawn(CRE_BIN, [
        'workflow',
        'simulate',
        WORKFLOW_DIR,
        '--target', 'local-simulation',
        '--http-payload', httpPayload,
        '--non-interactive',
        '--trigger-index', '0',
        '--broadcast',
      ], {
        env: {
          ...process.env,
          PATH: `${process.env.PATH}:/home/user/.cre/bin`,
        },
        cwd: path.resolve(__dirname, '../../..'),
      });

      let stdout = '';
      let stderr = '';

      creProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        const lines = chunk.split('\n');
        for (const line of lines) {
          const clean = line.replace(/\x1b\[[0-9;]*m/g, '');
          rawLogs.push(clean);
          if (clean.trim()) {
            logger.info(`[CRE] ${clean}`);
          }
        }
      });

      creProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        const lines = chunk.split('\n');
        for (const line of lines) {
          const clean = line.replace(/\x1b\[[0-9;]*m/g, '');
          rawLogs.push(clean);
          if (clean.trim()) {
            logger.warn(`[CRE-ERR] ${clean}`);
          }
        }
      });

      creProcess.on('close', (code) => {
        // Parse result from stdout
        let result: any = {};
        try {
          // Look for JSON result
          const jsonMatch = stdout.match(/\{[\s\S]*"success"[\s\S]*\}/g);
          if (jsonMatch) {
            for (const match of jsonMatch) {
              try {
                const parsed = JSON.parse(match);
                if (parsed.success !== undefined) {
                  result = parsed;
                  break;
                }
              } catch {
                continue;
              }
            }
          }
        } catch (e) {
          logger.error('Failed to parse CRE output:', e);
        }

        const success = result.success === true;

        resolve({
          success,
          txHash: result.txHash,
          usdaMinted: result.usdaMinted,
          ethPrice: result.ethPrice,
          reserves: result.reserves,
          logs: rawLogs.filter(l => l.trim()),
          error: !success ? (result.error || stderr || 'Workflow failed') : undefined,
        });
      });

      creProcess.on('error', (err) => {
        logger.error('[PoR] CRE execution error:', err);
        resolve({
          success: false,
          logs: rawLogs,
          error: err.message,
        });
      });

      // Timeout after 120 seconds
      setTimeout(() => {
        creProcess.kill();
        resolve({
          success: false,
          logs: [...rawLogs, 'CRE execution timed out after 120 seconds'],
          error: 'Execution timeout',
        });
      }, 120000);
    });
  }

  /**
   * POST /api/por/trigger
   * Trigger PoR verification + minting with price consensus
   * 
   * Body: {
   *   user: string,           // User address
   *   ethAmount: string,      // ETH amount in wei
   *   mintRequestId: string,  // Unique mint request ID (bytes32)
   *   depositIndex: number    // Deposit index
   * }
   */
  trigger = asyncHandler(async (req: Request, res: Response) => {
    const { user, ethAmount, mintRequestId, depositIndex = 0 } = req.body;
    
    // Validate inputs
    if (!user || !ethAmount || !mintRequestId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: user, ethAmount, mintRequestId',
      });
      return;
    }

    logger.info('[PoR] Triggering mint with price check', { 
      user, 
      ethAmount, 
      mintRequestId: mintRequestId.slice(0, 20) + '...',
      depositIndex 
    });

    // Execute CRE workflow
    const result = await this.executeCRE(user, ethAmount, mintRequestId, depositIndex);

    if (!result.success) {
      res.status(503).json({
        success: false,
        error: result.error,
        data: {
          logs: result.logs,
          timestamp: Date.now(),
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        txHash: result.txHash,
        usdaMinted: result.usdaMinted,
        ethPrice: result.ethPrice,
        reserves: result.reserves,
        timestamp: Date.now(),
        logs: result.logs,
      },
    });
  });
}

export const porController = new PoRController();
