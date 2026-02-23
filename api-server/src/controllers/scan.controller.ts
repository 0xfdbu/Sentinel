/**
 * Scan Controller - Synchronous version for testing
 */

import type { Request, Response } from 'express';
import { creWorkflowService } from '../services/cre-workflow.service';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errors';
import { asyncHandler } from '../utils/errors';
import type { ScanRequest, ScanResponse, CRELogEntry } from '../types';

// Simple in-memory store
const scanJobs = new Map<string, any>();

export class ScanController {
  /**
   * Trigger scan - runs synchronously for immediate results
   * Supports transaction context for real-time threat analysis from Sentinel Node
   */
  scanContract = asyncHandler(async (req: Request, res: Response) => {
    const { contractAddress, chainId = 11155111, transactionContext, urgency } = req.body as ScanRequest & { 
      transactionContext?: any;
      urgency?: 'critical' | 'high' | 'normal';
    };
    
    if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/i.test(contractAddress)) {
      throw new ValidationError('Valid contractAddress is required');
    }
    
    const normalizedAddress = contractAddress.toLowerCase();
    const scanId = `scan_${Date.now()}_${normalizedAddress.slice(-8)}`;
    
    logger.info('[SCAN] Starting', { 
      scanId, 
      contractAddress: normalizedAddress, 
      chainId,
      hasTransactionContext: !!transactionContext,
      urgency 
    });
    
    // eslint-disable-next-line no-console
    console.log(`\n🔍 Starting scan: ${scanId}`);
    // eslint-disable-next-line no-console
    console.log(`   Target: ${normalizedAddress}`);
    // eslint-disable-next-line no-console
    console.log(`   Chain: ${chainId}`);
    if (transactionContext) {
      // eslint-disable-next-line no-console
      console.log(`   Context: Transaction ${transactionContext.hash.slice(0, 20)}...`);
      // eslint-disable-next-line no-console
      console.log(`   Threats: ${transactionContext.threatSummary?.length || 0} heuristic hits`);
    }
    // eslint-disable-next-line no-console
    console.log();
    
    try {
      // Run CRE workflow synchronously with transaction context
      const result = await creWorkflowService.analyzeContract(
        normalizedAddress, 
        chainId,
        transactionContext
      );
      
      // Print raw CRE output to console (just like CRE CLI)
      // eslint-disable-next-line no-console
      console.log('\n' + result.rawOutput);
      
      const job = {
        scanId,
        status: result.success ? 'completed' : 'error',
        contractAddress: normalizedAddress,
        result: result.result,
        error: result.error,
        creLogs: result.logs,
        rawOutput: result.rawOutput
      };
      
      scanJobs.set(scanId, job);
      
      // eslint-disable-next-line no-console
      console.log(`\n✅ Scan complete: ${result.result?.riskLevel || 'UNKNOWN'} risk\n`);
      
      logger.info('[SCAN] Done', { scanId, status: job.status, logs: result.logs.length });
      
      res.json({ success: true, data: job });
      
    } catch (error) {
      logger.error('[SCAN] Error', { scanId, error: (error as Error).message });
      
      const job = {
        scanId,
        status: 'error',
        contractAddress: normalizedAddress,
        error: (error as Error).message,
        creLogs: [{
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `❌ Error: ${(error as Error).message}`
        }]
      };
      
      scanJobs.set(scanId, job);
      res.status(500).json({ success: false, error: { message: (error as Error).message } });
    }
  });
  
  /**
   * Get scan result
   */
  getScanResult = asyncHandler(async (req: Request, res: Response) => {
    const { scanId } = req.params;
    const job = scanJobs.get(scanId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Scan not found' }
      });
    }
    
    res.json({ success: true, data: job });
  });
  
  /**
   * List scans
   */
  listScans = asyncHandler(async (_req: Request, res: Response) => {
    const scans = Array.from(scanJobs.values()).slice(-10);
    res.json({ success: true, data: scans });
  });
}

export const scanController = new ScanController();
