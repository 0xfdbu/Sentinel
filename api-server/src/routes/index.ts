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
import { rescueController } from '../controllers/rescue.controller';

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

// Confidential transaction routes (REAL TEE API)
router.get('/confidential/status', confidentialController.getStatus);
router.post('/confidential/shielded-address', confidentialController.getShieldedAddress);
router.post('/confidential/balances', confidentialController.getPrivateBalances);
router.post('/confidential/transfer', confidentialController.executeTransfer);
router.post('/confidential/withdraw', confidentialController.requestWithdrawal);

// Confidential rescue routes
router.get('/rescue/stats', rescueController.getStats);
router.post('/rescue/check', rescueController.checkRescueStatus);
router.post('/rescue/execute', rescueController.executeRescue);

export default router;
