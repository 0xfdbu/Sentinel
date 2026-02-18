/**
 * Sentinel CRE API Server
 * 
 * This backend service:
 * 1. Receives scan requests from the frontend
 * 2. Triggers Chainlink CRE workflows via the CRE CLI/SDK
 * 3. Returns workflow execution results
 * 4. Keeps all API keys server-side (never exposed to browser)
 * 
 * The CRE workflow then:
 * - Uses Confidential HTTP to call Etherscan (hiding API key)
 * - Uses LLM integration to call xAI Grok (hiding API key)
 * - Uses Confidential Compute for emergency pauses
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import { ethers } from 'ethers';
import winston from 'winston';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Rate limiter: 10 requests per minute per IP
const rateLimiter = new RateLimiterMemory({
  keyPrefix: 'scan_limit',
  points: 10,
  duration: 60,
});

const app = express();
const PORT = process.env.CRE_API_PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'sentinel-cre-api', timestamp: new Date().toISOString() });
});

/**
 * Trigger CRE workflow for contract scanning
 * POST /api/scan
 */
app.post('/api/scan', async (req, res) => {
  try {
    // Rate limiting
    try {
      await rateLimiter.consume(req.ip || 'unknown');
    } catch {
      return res.status(429).json({ error: 'Too many requests, please try again later' });
    }

    const { contractAddress, chainId = 31337 } = req.body;

    // Validate input
    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      return res.status(400).json({ error: 'Invalid contract address' });
    }

    logger.info('Starting CRE workflow scan', { contractAddress, chainId });

    // Trigger CRE workflow
    const result = await triggerCREWorkflow(contractAddress, Number(chainId));

    logger.info('CRE workflow completed', { contractAddress, result });

    res.json({
      success: true,
      contractAddress,
      chainId,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Scan failed', { error: (error as Error).message, body: req.body });
    res.status(500).json({
      error: 'Scan failed',
      message: (error as Error).message,
    });
  }
});

/**
 * Trigger CRE workflow using the CRE CLI
 * In production, this uses the actual CRE infrastructure
 * In development, it simulates the workflow locally
 */
async function triggerCREWorkflow(contractAddress: string, chainId: number): Promise<any> {
  return new Promise((resolve, reject) => {
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.CRE_SIMULATE === 'true';
    
    if (isDevelopment) {
      // Development mode: Simulate CRE workflow locally
      logger.info('Running CRE workflow in simulation mode');
      simulateCREWorkflow(contractAddress, chainId)
        .then(resolve)
        .catch(reject);
      return;
    }

    // Production mode: Use CRE CLI to trigger workflow
    const workflowPath = path.join(__dirname, '../../../workflow/sentinel-workflow.ts');
    const secretsPath = path.join(__dirname, '../../../workflow/secrets.yaml');
    
    const creProcess = spawn('cre', [
      'workflow', 'execute', workflowPath,
      '--input', JSON.stringify({ contractAddress, chainId }),
      '--secrets', secretsPath,
      '--json'
    ], {
      env: { ...process.env },
      timeout: 120000, // 2 minute timeout
    });

    let output = '';
    let errorOutput = '';

    creProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    creProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      logger.error('CRE stderr', { data: data.toString() });
    });

    creProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`CRE workflow failed with code ${code}: ${errorOutput}`));
        return;
      }

      try {
        const result = JSON.parse(output);
        resolve(result);
      } catch {
        resolve({ output, raw: true });
      }
    });

    creProcess.on('error', (error) => {
      reject(new Error(`Failed to spawn CRE process: ${error.message}`));
    });
  });
}

/**
 * Simulate CRE workflow for local development
 * This mimics what the actual CRE workflow would do
 */
async function simulateCREWorkflow(contractAddress: string, chainId: number): Promise<any> {
  const { WorkflowSimulator } = await import('./workflow-simulator');
  const simulator = new WorkflowSimulator();
  
  return simulator.run(contractAddress, chainId);
}

/**
 * Get workflow execution status
 * GET /api/scan/:executionId/status
 */
app.get('/api/scan/:executionId/status', (req, res) => {
  // In production, this would query CRE for workflow status
  res.json({
    executionId: req.params.executionId,
    status: 'completed', // or 'running', 'failed'
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Sentinel CRE API server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`CRE Simulation mode: ${process.env.CRE_SIMULATE === 'true' ? 'ENABLED' : 'DISABLED'}`);
});

export default app;
