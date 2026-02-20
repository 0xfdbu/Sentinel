/**
 * Scan Controller
 * 
 * Handles contract scanning workflow using Chainlink CRE with Confidential HTTP.
 * Returns actual CRE CLI logs for display to judges.
 */

import type { Request, Response } from 'express';
import { creWorkflowService, type CREWorkflowResult } from '../services/cre-workflow.service';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errors';
import { asyncHandler } from '../utils/errors';
import type { ScanRequest, ScanResponse } from '../types';

// In-memory store for scan jobs
const scanJobs = new Map<string, ScanResponse & { creLogs?: any[]; rawOutput?: string }>();

export class ScanController {
  /**
   * Trigger a new contract scan
   */
  scanContract = asyncHandler(async (req: Request, res: Response) => {
    const { contractAddress, chainId = 11155111 } = req.body as ScanRequest;
    
    // Validate input
    if (!contractAddress) {
      throw new ValidationError('contractAddress is required');
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      throw new ValidationError('Invalid contract address format');
    }
    
    const scanId = `scan_${Date.now()}_${contractAddress.slice(-8)}`;
    
    logger.info('Scan requested', { scanId, contractAddress, chainId });
    
    // Create pending job
    const job: ScanResponse & { creLogs?: any[] } = {
      scanId,
      status: 'pending',
      contractAddress,
      creLogs: [{
        timestamp: new Date().toISOString(),
        level: 'info',
        message: '⏳ Scan queued, waiting for CRE Workflow...'
      }]
    };
    scanJobs.set(scanId, job);
    
    // Start scan asynchronously
    this.executeScan(scanId, contractAddress, chainId);
    
    // Return immediately with job ID
    res.status(202).json({
      success: true,
      data: job,
    });
  });
  
  /**
   * Get scan result by ID
   */
  getScanResult = asyncHandler(async (req: Request, res: Response) => {
    const { scanId } = req.params;
    
    const job = scanJobs.get(scanId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Scan job not found' },
      });
    }
    
    res.json({
      success: true,
      data: job,
    });
  });
  
  /**
   * List recent scans
   */
  listScans = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    
    const scans = Array.from(scanJobs.values())
      .sort((a, b) => b.scanId.localeCompare(a.scanId))
      .slice(0, limit);
    
    res.json({
      success: true,
      data: scans,
    });
  });
  
  /**
   * Execute scan workflow using CRE with Confidential HTTP
   */
  private async executeScan(
    scanId: string,
    contractAddress: string,
    chainId: number
  ): Promise<void> {
    try {
      logger.info('Starting CRE Workflow scan', { 
        scanId, 
        mode: creWorkflowService.getMode(),
        confidentialHttp: true,
      });
      
      // Call CRE Workflow - this runs the actual CLI and captures logs
      const workflowResult = await creWorkflowService.analyzeContract(
        contractAddress,
        chainId
      );
      
      // Update job with result
      const job: ScanResponse & { creLogs?: any[]; rawOutput?: string } = {
        scanId,
        status: workflowResult.success ? 'completed' : 'error',
        contractAddress,
        result: workflowResult.result,
        error: workflowResult.error,
        creLogs: workflowResult.logs,
        rawOutput: workflowResult.rawOutput,
      };
      
      scanJobs.set(scanId, job);
      
      logger.info('Scan completed', { 
        scanId, 
        status: job.status,
        riskLevel: workflowResult.result?.riskLevel,
        logCount: workflowResult.logs.length,
      });
      
    } catch (error) {
      logger.error('Scan execution failed', { scanId, error });
      
      const job: ScanResponse & { creLogs?: any[] } = {
        scanId,
        status: 'error',
        contractAddress,
        error: (error as Error).message,
        creLogs: [{
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `❌ Scan failed: ${(error as Error).message}`
        }]
      };
      
      scanJobs.set(scanId, job);
    }
  }
}

export const scanController = new ScanController();
