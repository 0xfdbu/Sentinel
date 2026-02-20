/**
 * Monitor Controller
 * 
 * Handles monitoring status and events
 */

import type { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { asyncHandler } from '../utils/errors';
import type { MonitorEvent, MonitorStatus } from '../types';

// In-memory event store (use database in production)
const events: MonitorEvent[] = [];
const MAX_EVENTS = 1000;

// Simulated monitor state
let monitorState: MonitorStatus = {
  isRunning: true,
  lastBlock: 0,
  contractsMonitored: 0,
  threatsDetected: 0,
  websocketClients: 0,
};

// CRE mode indicator
let creMode: 'DIRECT' | 'TEE' = (process.env.CRE_WORKFLOW_MODE as any) || 'DIRECT';
let confidentialHttp = true; // Always true when using CRE Workflow

export class MonitorController {
  /**
   * Get monitor status
   */
  getStatus = asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        ...monitorState,
        creMode,
        confidentialHttp,
        teeEnabled: creMode === 'TEE',
      },
    });
  });
  
  /**
   * Get monitor events
   */
  getEvents = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const level = req.query.level as string | undefined;
    const contract = req.query.contract as string | undefined;
    
    let filtered = [...events];
    
    if (level) {
      filtered = filtered.filter(e => e.level === level);
    }
    
    if (contract) {
      filtered = filtered.filter(e => 
        e.contractAddress.toLowerCase() === contract.toLowerCase()
      );
    }
    
    const sorted = filtered
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
    
    res.json({
      success: true,
      data: sorted,
    });
  });
  
  /**
   * Add a new event (called internally)
   */
  addEvent(event: MonitorEvent): void {
    events.unshift(event);
    
    // Trim old events
    if (events.length > MAX_EVENTS) {
      events.pop();
    }
    
    // Update stats
    if (event.level === 'CRITICAL' || event.level === 'HIGH') {
      monitorState.threatsDetected++;
    }
    
    logger.info('Monitor event added', {
      type: event.type,
      level: event.level,
      contract: event.contractAddress,
    });
  }
  
  /**
   * Update monitor status
   */
  updateStatus(updates: Partial<MonitorStatus>): void {
    monitorState = { ...monitorState, ...updates };
  }
  
  /**
   * Get current status
   */
  getCurrentStatus(): MonitorStatus {
    return monitorState;
  }
}

export const monitorController = new MonitorController();
