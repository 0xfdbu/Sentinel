/**
 * Emergency Pause API
 * 
 * This endpoint handles pause requests from:
 * 1. Chainlink Functions (via CRE Consumer)
 * 2. Frontend direct requests
 * 3. Sentinel Node auto-detection
 */

import { Router } from 'express';
import { ethers } from 'ethers';

// Configuration
const CONFIG = {
  RPC_URL: process.env.RPC_URL || 'https://ethereum-sepolia.publicnode.com',
  GUARDIAN_ADDRESS: process.env.GUARDIAN_ADDRESS || '0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1',
  PRIVATE_KEY: process.env.PRIVATE_KEY || '',
  API_KEY: process.env.SENTINEL_API_KEY || '',
  ALLOWED_SENTINELS: (process.env.ALLOWED_SENTINELS || '').split(',').filter(Boolean),
};

// Guardian ABI (minimal)
const GUARDIAN_ABI = [
  {
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'vulnHash', type: 'bytes32' }
    ],
    name: 'emergencyPause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'target', type: 'address' }],
    name: 'isPaused',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'target', type: 'address' }],
    name: 'liftPause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];

export function createPauseRouter(): Router {
  const router = Router();

  // Validate API Key middleware
  const validateApiKey = (req: any, res: any, next: any) => {
    const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];
    
    // Skip validation if no API key configured (dev mode)
    if (!CONFIG.API_KEY || CONFIG.API_KEY.startsWith('dev-key')) {
      return next();
    }
    
    if (apiKey !== CONFIG.API_KEY) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    next();
  };

  /**
   * POST /api/v1/emergency-pause
   * Execute emergency pause on target contract
   */
  router.post('/emergency-pause', validateApiKey, async (req, res) => {
    try {
      const { target, vulnHash, source = 'api' } = req.body;
      const sentinelNode = req.headers['x-sentinel-node'] as string || 'unknown';

      // Validate inputs
      if (!target || !ethers.isAddress(target)) {
        return res.status(400).json({ error: 'Invalid target address' });
      }

      if (!vulnHash) {
        return res.status(400).json({ error: 'Missing vulnHash' });
      }

      // Validate sentinel if list configured
      if (CONFIG.ALLOWED_SENTINELS.length > 0 && !CONFIG.ALLOWED_SENTINELS.includes(sentinelNode)) {
        return res.status(403).json({ error: 'Unauthorized sentinel node' });
      }

      // Check wallet configured
      if (!CONFIG.PRIVATE_KEY) {
        return res.status(500).json({ 
          error: 'Private key not configured',
          message: 'Set PRIVATE_KEY environment variable'
        });
      }

      console.log(`🚨 Emergency pause request [${source}]:`);
      console.log(`   Target: ${target}`);
      console.log(`   VulnHash: ${vulnHash}`);
      console.log(`   Sentinel: ${sentinelNode}`);

      // Connect and execute
      const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
      const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
      
      const guardian = new ethers.Contract(CONFIG.GUARDIAN_ADDRESS, GUARDIAN_ABI, wallet);

      // Check already paused
      const isPaused = await guardian.isPaused(target);
      if (isPaused) {
        return res.json({
          success: true,
          message: 'Contract already paused',
          target,
          txHash: null,
          alreadyPaused: true
        });
      }

      // Execute pause
      const tx = await guardian.emergencyPause(target, vulnHash, { gasLimit: 500000 });
      console.log(`⏳ Transaction: ${tx.hash}`);
      
      const receipt = await tx.wait();
      
      console.log(`✅ Executed in block ${receipt?.blockNumber}`);

      return res.json({
        success: true,
        message: 'Emergency pause executed successfully',
        target,
        txHash: tx.hash,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed.toString(),
        source
      });

    } catch (error: any) {
      console.error('❌ Pause execution failed:', error);
      
      // Check for specific errors
      if (error.code === 'INSUFFICIENT_FUNDS') {
        return res.status(500).json({
          success: false,
          error: 'Insufficient funds for gas',
          solution: 'Fund the sentinel wallet with Sepolia ETH'
        });
      }
      
      if (error.reason?.includes('NotAuthorized')) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to pause this contract',
          solution: 'Authorize the sentinel address in the Guardian contract'
        });
      }

      return res.status(500).json({
        success: false,
        error: error.message,
        reason: error.reason || 'Unknown error'
      });
    }
  });

  /**
   * POST /api/v1/lift-pause
   * Lift pause on target contract
   */
  router.post('/lift-pause', validateApiKey, async (req, res) => {
    try {
      const { target } = req.body;

      if (!target || !ethers.isAddress(target)) {
        return res.status(400).json({ error: 'Invalid target address' });
      }

      if (!CONFIG.PRIVATE_KEY) {
        return res.status(500).json({ error: 'Private key not configured' });
      }

      const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
      const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
      const guardian = new ethers.Contract(CONFIG.GUARDIAN_ADDRESS, GUARDIAN_ABI, wallet);

      const tx = await guardian.liftPause(target, { gasLimit: 500000 });
      const receipt = await tx.wait();

      return res.json({
        success: true,
        message: 'Pause lifted',
        target,
        txHash: tx.hash,
        blockNumber: receipt?.blockNumber
      });

    } catch (error: any) {
      console.error('❌ Lift pause failed:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/v1/pause-status/:address
   * Check pause status of contract
   */
  router.get('/pause-status/:address', async (req, res) => {
    try {
      const { address } = req.params;

      if (!ethers.isAddress(address)) {
        return res.status(400).json({ error: 'Invalid address' });
      }

      const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
      const guardian = new ethers.Contract(CONFIG.GUARDIAN_ADDRESS, GUARDIAN_ABI, provider);
      
      const isPaused = await guardian.isPaused(address);

      return res.json({
        address,
        isPaused,
        guardian: CONFIG.GUARDIAN_ADDRESS
      });

    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/v1/threats
   * Get recent threats (requires Supabase or implement memory store)
   */
  router.get('/threats', (req, res) => {
    // This would query your database
    res.json({
      threats: [],
      message: 'Connect Supabase to enable threat history'
    });
  });

  return router;
}

export default createPauseRouter;
