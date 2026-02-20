/**
 * API Routes
 * 
 * Route definitions for all API endpoints
 */

import { Router } from 'express';
import { scanController } from '../controllers/scan.controller';
import { fraudController } from '../controllers/fraud.controller';
import { monitorController } from '../controllers/monitor.controller';
import { confidentialController } from '../controllers/confidential.controller';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

// Scan routes
router.post('/scan', scanController.scanContract);
router.get('/scan', scanController.listScans);
router.get('/scan/:scanId', scanController.getScanResult);

// Fraud detection routes
router.post('/fraud-check', fraudController.checkFraud);

// Monitor routes
router.get('/monitor/status', monitorController.getStatus);
router.get('/monitor/events', monitorController.getEvents);

// Confidential transaction routes
router.post('/confidential/pause', confidentialController.executePause);
router.get('/confidential/status', confidentialController.getStatus);

export default router;
