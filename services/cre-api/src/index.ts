/**
 * Sentinel CRE API Server - SDK-Based Implementation
 * 
 * PRODUCTION-GRADE REFACTOR:
 * - Replaces brittle CLI spawning with type-safe SDK client
 * - Proper error handling with typed errors
 * - Direct SDK integration path (transitional: CLI → SDK)
 * 
 * Architecture:
 * 1. Receives scan requests from frontend
 * 2. Uses CRESdkClient for workflow execution
 * 3. Returns type-safe, decrypted JSON responses
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import winston from 'winston';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import path from 'path';
import { creSdkClient, ScanOptions } from './cre-sdk-client';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Add pretty console transport
logger.add(new winston.transports.Console({
  format: winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      const color = {
        info: '\x1b[36m',
        warn: '\x1b[33m',
        error: '\x1b[31m',
        debug: '\x1b[35m',
      }[level] || '\x1b[0m';
      const reset = '\x1b[0m';
      
      let msg = `${color}[${timestamp}]${reset} ${message}`;
      if (Object.keys(meta).length > 0) {
        msg += ` ${JSON.stringify(meta)}`;
      }
      return msg;
    })
  )
}));

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
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📥 INCOMING REQUEST`);
  console.log(`   ${req.method} ${req.path}`);
  console.log(`   IP: ${req.ip}`);
  console.log(`${'='.repeat(60)}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'sentinel-cre-api',
    mode: 'sdk-based',
    timestamp: new Date().toISOString() 
  });
});

/**
 * Trigger CRE workflow for contract scanning
 * POST /api/scan
 * 
 * SDK-BASED: Uses CRESdkClient instead of CLI spawning
 */
app.post('/api/scan', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Rate limiting
    try {
      await rateLimiter.consume(req.ip || 'unknown');
    } catch {
      return res.status(429).json({ error: 'Too many requests, please try again later' });
    }

    const { contractAddress, chainId = 31337, encryptionEnabled } = req.body;

    // Validate input
    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      return res.status(400).json({ error: 'Invalid contract address' });
    }

    console.log(`\n🚀 STARTING SENTINEL SECURITY SCAN (SDK Mode)`);
    console.log(`   Contract: ${contractAddress}`);
    console.log(`   Chain ID: ${chainId}`);
    console.log(`   Network:  ${chainId === 11155111 ? 'Sepolia' : 'Local'}`);
    console.log(`   Mode:     ${encryptionEnabled ? 'Confidential (Encrypted)' : 'Simulation'}`);
    console.log(`\n⚡ Executing via CRE SDK Client...\n`);

    // Execute scan using SDK client
    const scanOptions: ScanOptions = {
      contractAddress,
      chainId: Number(chainId),
      target: chainId === 11155111 ? 'hackathon-settings' : 'staging-settings',
      encryptionEnabled: encryptionEnabled ?? false,
    };

    const result = await creSdkClient.executeScan(scanOptions);
    const duration = Date.now() - startTime;

    console.log(`\n✅ SCAN COMPLETED in ${duration}ms`);
    console.log(`   Severity: ${result.severity}`);
    console.log(`   Action:   ${result.action}`);
    console.log(`   Issues:   ${result.lines.length}`);
    console.log(`${'='.repeat(60)}\n`);

    res.json({
      success: result.success,
      contractAddress,
      chainId,
      result: {
        scanResult: {
          severity: result.severity,
          category: result.category,
          vector: result.vector,
          lines: result.lines,
          confidence: result.confidence,
          recommendation: result.recommendation,
        },
        action: result.action,
        vulnerabilityHash: result.vulnerabilityHash,
        isRegistered: true,
        paused: result.paused,
        auditLogged: result.auditLogged,
        executionTime: result.executionTime,
        encrypted: result.encrypted,
      },
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`\n❌ SCAN FAILED after ${duration}ms`);
    console.log(`   Error: ${(error as Error).message}`);
    console.log(`${'='.repeat(60)}\n`);
    
    res.status(500).json({
      error: 'Scan failed',
      message: (error as Error).message,
      duration: `${duration}ms`,
    });
  }
});

/**
 * Get workflow execution status
 */
app.get('/api/scan/:executionId/status', (req, res) => {
  res.json({
    executionId: req.params.executionId,
    status: 'completed',
    timestamp: new Date().toISOString(),
  });
});

/**
 * REAL-TIME TRANSACTION SCANNING
 * POST /api/scan-realtime
 * 
 * SDK-BASED: Uses CRESdkClient.analyzeRealtime()
 */
app.post('/api/scan-realtime', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const txEvent = req.body;
    
    console.log(`\n🚨 REAL-TIME TRANSACTION ALERT`);
    console.log(`   TX: ${txEvent.txHash}`);
    console.log(`   Contract: ${txEvent.contractAddress}`);
    console.log(`   Quick Score: ${txEvent.quickScore}/100`);
    console.log(`   From: ${txEvent.from}`);
    console.log(`\n⚡ Executing via CRE SDK Client (Realtime)...\n`);

    // Execute real-time analysis using SDK client
    const decision = await creSdkClient.analyzeRealtime(txEvent);
    const duration = Date.now() - startTime;
    
    console.log(`\n✅ REAL-TIME ANALYSIS COMPLETE in ${duration}ms`);
    console.log(`   Decision: ${decision.action}`);
    console.log(`   Severity: ${decision.fraudScore.severity}`);
    console.log(`   Score:    ${decision.fraudScore.score}`);
    console.log(`${'='.repeat(60)}\n`);
    
    res.json({
      success: true,
      decision,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ REAL-TIME SCAN FAILED after ${duration}ms`);
    console.error(`   Error: ${(error as Error).message}`);
    
    res.status(500).json({
      error: 'Real-time scan failed',
      message: (error as Error).message,
    });
  }
});

/**
 * SDK Status Endpoint
 * GET /api/sdk-status
 * 
 * Returns SDK client configuration status
 */
app.get('/api/sdk-status', (req, res) => {
  res.json({
    sdkMode: 'CRESdkClient',
    workflowPath: path.resolve(__dirname, '../../../cre-workflow'),
    environment: process.env.NODE_ENV || 'development',
    configValid: !!process.env.ETHERSCAN_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`\n💥 UNHANDLED ERROR: ${err.message}\n`);
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           🛡️  SENTINEL CRE API SERVER                       ║
║                                                              ║
║   Status:     ✅ Running                                     ║
║   Port:       ${PORT}                                           ║
║   Mode:       SDK-Based (Transitional)                      ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(30)}║
╚══════════════════════════════════════════════════════════════╝
`);
});

export default app;
