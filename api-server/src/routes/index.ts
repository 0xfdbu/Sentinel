/**
 * API Routes
 * 
 * Vault event listener + PoR trigger endpoints
 */

import { Router } from 'express';
import { vaultListener } from '../services/vault-listener.service';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'sentinel-vault-listener',
    },
  });
});

// Vault listener status
router.get('/vault/status', (req, res) => {
  res.json({
    success: true,
    data: vaultListener.getStatus(),
  });
});

// Get all pending mints
router.get('/vault/pending', (req, res) => {
  res.json({
    success: true,
    data: vaultListener.getPendingMints(),
  });
});

// Get specific mint status
router.get('/vault/mint/:mintRequestId', (req, res) => {
  const { mintRequestId } = req.params;
  const status = vaultListener.getMintStatus(mintRequestId);
  
  if (!status) {
    res.status(404).json({
      success: false,
      error: 'Mint request not found',
    });
    return;
  }
  
  res.json({
    success: true,
    data: status,
  });
});

// Manual trigger (for testing/debugging)
router.post('/vault/trigger', async (req, res) => {
  const { user, ethAmount, mintRequestId, depositIndex } = req.body;
  
  if (!user || !ethAmount || !mintRequestId) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields: user, ethAmount, mintRequestId',
    });
    return;
  }

  // This would trigger the CRE workflow directly
  // For now just return that vault listener is handling it
  res.json({
    success: true,
    data: {
      message: 'Vault listener automatically processes deposits',
      note: 'Call depositETH() on Vault V2 to trigger',
      vaultAddress: '0x69C8E369Ce1feC4444F070Df8093e5bDAEcE7D22',
    },
  });
});

export default router;
