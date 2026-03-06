import { ethers } from 'ethers';
import { logger } from '../utils/logger';

const RPC_URL = process.env.SEPOLIA_RPC || 'https://rpc.sepolia.org';
const VAULT_V2_ADDRESS = '0x69C8E369Ce1feC4444F070Df8093e5bDAEcE7D22';

// ABIs
const VAULT_ABI = [
  'event ETHDeposited(address indexed user, uint256 ethAmount, uint256 ethPrice, bytes32 mintRequestId, uint256 depositIndex)',
  'event USDAMinted(address indexed user, uint256 usdaAmount, uint256 medianPrice, bytes32 indexed mintRequestId, bytes32 indexed reportHash)',
  'function getDeposit(address user, uint256 index) external view returns (tuple(uint256 ethAmount, uint256 usdaMinted, uint256 ethPriceAtDeposit, uint256 timestamp, bool active, bool mintCompleted))',
  'function userDeposits(address, uint256) external view returns (uint256 ethAmount, uint256 usdaMinted, uint256 ethPriceAtDeposit, uint256 timestamp, bool active, bool mintCompleted)',
];

interface PendingMint {
  user: string;
  ethAmount: string;
  mintRequestId: string;
  depositIndex: number;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  txHash?: string;
  error?: string;
  usdaMinted?: string;
  // DON verification details
  verification?: {
    priceConsensus: string;      // e.g. "$2,090.50"
    priceSources: string[];      // ['Coinbase', 'Kraken', 'Binance']
    bankReserves: string;        // e.g. "$1800.21"
    signaturesVerified: number;  // Number of DON signatures
  };
}

class VaultListenerService {
  private provider: ethers.JsonRpcProvider | null = null;
  private vault: ethers.Contract | null = null;
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private lastBlockChecked = 0;
  
  // Track pending mints
  private pendingMints = new Map<string, PendingMint>();
  
  // Sequential processing queue
  private processingQueue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  
  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.vault = new ethers.Contract(VAULT_V2_ADDRESS, VAULT_ABI, this.provider);
  }

  /**
   * Start listening for vault events
   */
  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    logger.info('[VaultListener] Starting...');

    try {
      // Get current block - only listen for NEW events, not historical
      const currentBlock = await this.provider!.getBlockNumber();
      this.lastBlockChecked = currentBlock; // Start from current block only
      
      // Clear any stale pending mints from previous runs
      this.pendingMints.clear();
      this.processingQueue = [];
      this.isProcessing = false;
      
      logger.info('[VaultListener] Starting fresh - only new events from current block', { 
        currentBlock 
      });

      // Start polling
      this.pollInterval = setInterval(() => this.checkForEvents(), 5000);
      
    } catch (error) {
      logger.error('[VaultListener] Failed to start:', error);
      this.isRunning = false;
    }
  }

  /**
   * Stop listening
   */
  stop() {
    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    logger.info('[VaultListener] Stopped');
  }

  /**
   * Check for new vault events
   */
  private async checkForEvents() {
    if (!this.provider || !this.vault) return;

    try {
      const currentBlock = await this.provider.getBlockNumber();
      
      // Avoid checking too frequently
      if (currentBlock <= this.lastBlockChecked) return;

      // Query for ETHDeposited events
      const events = await this.vault.queryFilter(
        this.vault.filters.ETHDeposited(),
        this.lastBlockChecked + 1,
        currentBlock
      );

      this.lastBlockChecked = currentBlock;

      for (const event of events) {
        await this.handleETHDeposited(event);
      }

      // Also check for completed mints (USDAMinted)
      const mintedEvents = await this.vault.queryFilter(
        this.vault.filters.USDAMinted(),
        currentBlock - 100,
        currentBlock
      );
      
      for (const event of mintedEvents) {
        this.handleUSDAMinted(event);
      }

    } catch (error) {
      logger.error('[VaultListener] Error checking events:', error);
    }
  }

  /**
   * Handle ETHDeposited event - Trigger CRE workflow
   */
  private async handleETHDeposited(event: ethers.EventLog | ethers.Log) {
    if (!('args' in event)) return;

    const { user, ethAmount, ethPrice, mintRequestId, depositIndex } = event.args!;
    const requestId = mintRequestId as string;

    // Skip if already processing
    if (this.pendingMints.has(requestId)) {
      logger.debug('[VaultListener] Already processing', { requestId: requestId.slice(0, 20) });
      return;
    }
    
    // Skip old deposits (> 50 blocks behind current) - likely already processed or missed
    if (this.lastBlockChecked > 0 && event.blockNumber && (this.lastBlockChecked - event.blockNumber) > 50) {
      logger.info('[VaultListener] Skipping old deposit', {
        mintRequestId: requestId.slice(0, 20) + '...',
        depositBlock: event.blockNumber,
        currentBlock: this.lastBlockChecked,
      });
      return;
    }

    logger.info('[VaultListener] New ETH deposit detected', {
      user,
      ethAmount: ethAmount.toString(),
      mintRequestId: requestId.slice(0, 20) + '...',
      depositIndex: depositIndex.toString(),
      block: event.blockNumber,
    });

    // Add to pending
    this.pendingMints.set(requestId, {
      user,
      ethAmount: ethAmount.toString(),
      mintRequestId: requestId,
      depositIndex: Number(depositIndex),
      timestamp: Date.now(),
      status: 'pending',
    });

    // Queue CRE workflow for sequential processing
    this.queueCREWorkflow(user, ethAmount.toString(), requestId, Number(depositIndex));
  }

  /**
   * Handle USDAMinted event - Mark as completed
   */
  private handleUSDAMinted(event: ethers.EventLog | ethers.Log) {
    if (!('args' in event)) return;

    const { user, usdaAmount, medianPrice, mintRequestId } = event.args!;
    const requestId = mintRequestId as string;

    const pending = this.pendingMints.get(requestId);
    if (pending) {
      pending.status = 'completed';
      pending.usdaMinted = usdaAmount.toString();
      logger.info('[VaultListener] Mint completed', {
        user,
        usdaAmount: usdaAmount.toString(),
        mintRequestId: requestId.slice(0, 20) + '...',
      });
    }
  }

  /**
   * Queue CRE workflow for sequential processing
   */
  private queueCREWorkflow(
    user: string,
    ethAmount: string,
    mintRequestId: string,
    depositIndex: number
  ) {
    const pending = this.pendingMints.get(mintRequestId);
    if (pending) {
      pending.status = 'processing';
    }

    // Add to queue
    this.processingQueue.push(async () => {
      await this.executeCREWorkflow(user, ethAmount, mintRequestId, depositIndex);
    });

    // Process queue
    this.processQueue();
  }

  /**
   * Process queue sequentially - ONE workflow at a time to prevent nonce collisions
   */
  private async processQueue() {
    if (this.isProcessing || this.processingQueue.length === 0) return;
    
    this.isProcessing = true;
    logger.info('[VaultListener] Starting sequential workflow processing', { 
      queueLength: this.processingQueue.length 
    });
    
    while (this.processingQueue.length > 0) {
      const task = this.processingQueue.shift();
      if (task) {
        try {
          await task();
          // Wait 3s after workflow completes for blockchain nonce to sync
          logger.info('[VaultListener] Workflow complete, waiting 3s for nonce sync...');
          await new Promise(r => setTimeout(r, 3000));
        } catch (e) {
          logger.error('[VaultListener] Workflow task failed:', e);
        }
        // Additional wait between workflows
        if (this.processingQueue.length > 0) {
          logger.info(`[VaultListener] ${this.processingQueue.length} more in queue, waiting...`);
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }
    
    this.isProcessing = false;
    logger.info('[VaultListener] Queue processing complete');
  }

  /**
   * Execute CRE workflow (actual implementation)
   * Returns a Promise that resolves when the workflow COMPLETES (success or failure)
   */
  private async executeCREWorkflow(
    user: string,
    ethAmount: string,
    mintRequestId: string,
    depositIndex: number
  ): Promise<void> {
    return new Promise((resolve) => {
      logger.info('[VaultListener] Executing CRE workflow', {
        user,
        ethAmount,
        mintRequestId: mintRequestId.slice(0, 20) + '...',
      });

      const { spawn } = require('child_process');
      const path = require('path');

      const WORKFLOW_DIR = path.resolve(__dirname, '../../../workflows/eth-por-unified');
      const CRE_BIN = '/home/user/.cre/bin/cre';

      const httpPayload = JSON.stringify({
        user,
        ethAmount,
        mintRequestId,
        depositIndex,
      });

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
          CRE_ETH_PRIVATE_KEY: '0xe587e35e24afdae4e37706c9e457c81bc0932a053b13a48752f9a88d93e98115'
        },
        cwd: path.resolve(__dirname, '../../..'),
      });

      let stdout = '';
      let stderr = '';

      creProcess.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        // Log ALL CRE output lines
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            logger.info(`[CRE-OUT] ${line.trim()}`);
          }
        }
      });

      creProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      creProcess.on('close', (code: number) => {
        // Parse result - look for success result with txHash
        let success = false;
        let txHash: string | undefined;
        let resultData: any = null;

        try {
          // Find the JSON result by looking for txHash pattern
          // The workflow returns: {"success":true,"txHash":"0x...",...}
          const txHashMatch = stdout.match(/"txHash"\s*:\s*"(0x[a-fA-F0-9]{64})"/);
          if (txHashMatch) {
            const foundTxHash = txHashMatch[1];
            // Find the complete JSON object containing this txHash using brace counting
            const txHashPos = stdout.indexOf(txHashMatch[0]);
            let braceCount = 0;
            let jsonStart = -1;
            
            // Search backwards to find opening brace
            for (let i = txHashPos; i >= 0; i--) {
              if (stdout[i] === '}') braceCount++;
              if (stdout[i] === '{') {
                if (braceCount === 0) {
                  jsonStart = i;
                  break;
                }
                braceCount--;
              }
            }
            
            // Search forwards to find closing brace
            braceCount = 0;
            let jsonEnd = -1;
            for (let i = jsonStart; i < stdout.length; i++) {
              if (stdout[i] === '{') braceCount++;
              if (stdout[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                  jsonEnd = i + 1;
                  break;
                }
              }
            }
            
            if (jsonStart >= 0 && jsonEnd > jsonStart) {
              const jsonStr = stdout.substring(jsonStart, jsonEnd);
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.txHash === foundTxHash) {
                  resultData = parsed;
                  success = parsed.success === true;
                  txHash = parsed.txHash;
                  logger.info('[VaultListener] Parsed CRE result:', { 
                    success,
                    txHash: (txHash as string).slice(0, 20) + '...',
                    usdaMinted: parsed.usdaMinted 
                  });
                }
              } catch (e) {
                logger.warn('[VaultListener] JSON parse error:', { error: (e as Error).message });
              }
            } else {
              logger.warn('[VaultListener] Could not find JSON boundaries');
            }
          } else {
            logger.warn('[VaultListener] No txHash found in stdout');
          }
          
          if (!success) {
            logger.warn('[VaultListener] Could not find valid result in CRE output');
          }
        } catch (e) {
          logger.error('[VaultListener] Failed to parse CRE output:', e);
        }

        const pending = this.pendingMints.get(mintRequestId);
        if (pending) {
          if (success && txHash) {
            pending.status = 'completed';
            pending.txHash = txHash;
            pending.usdaMinted = resultData?.usdaMinted;
            // Store DON verification details
            if (resultData?.verification) {
              pending.verification = resultData.verification;
            }
            logger.info('[VaultListener] CRE workflow completed successfully', {
              mintRequestId: mintRequestId.slice(0, 20) + '...',
              txHash,
              usdaMinted: resultData?.usdaMinted,
              ethPrice: resultData?.ethPrice,
              verification: resultData?.verification,
            });
          } else {
            pending.status = 'failed';
            // Don't treat "update available" as the error if we have a real error
            const realError = stderr?.includes('replacement transaction underpriced') 
              ? 'Transaction nonce collision - retrying'
              : (resultData?.error || (stderr && !stderr.includes('Update available')) || 'CRE workflow failed');
            pending.error = realError;
            logger.error('[VaultListener] CRE workflow failed', {
              mintRequestId: mintRequestId.slice(0, 20) + '...',
              error: realError,
              code,
            });
          }
        }
        
        // RESOLVE the promise so the queue can continue to the next workflow
        resolve();
      });
    });
  }

  /**
   * Get status of all pending mints
   */
  getPendingMints(): PendingMint[] {
    return Array.from(this.pendingMints.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get status of a specific mint
   */
  getMintStatus(mintRequestId: string): PendingMint | undefined {
    return this.pendingMints.get(mintRequestId);
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastBlockChecked: this.lastBlockChecked,
      pendingCount: this.pendingMints.size,
      pendingMints: this.getPendingMints().slice(0, 10), // Last 10
    };
  }
}

export const vaultListener = new VaultListenerService();
