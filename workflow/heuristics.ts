/**
 * Sentinel Heuristic Detection Engine
 * 
 * Runtime transaction analysis for detecting 0-day exploits
 * Uses deterministic pattern matching (no AI)
 * 
 * @track Chainlink Convergence Hackathon 2026
 */

export interface TransactionTrace {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasUsed: number;
  gasPrice: string;
  calls: InternalCall[];
  events: EventLog[];
  timestamp: number;
  blockNumber: number;
}

export interface InternalCall {
  to: string;
  from: string;
  input: string;
  value: string;
  type: 'CALL' | 'DELEGATECALL' | 'STATICCALL' | 'CREATE';
  gasUsed?: number;
}

export interface EventLog {
  name: string;
  address: string;
  topics: string[];
  data: string;
  // Decoded fields
  amount?: string;
  sender?: string;
  recipient?: string;
  token?: string;
}

export interface Threat {
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  pattern: ThreatPattern;
  confidence: number;
  victim: string;
  attacker: string;
  txHash: string;
  timestamp: number;
  estimatedLoss?: string;
  details: string;
}

export type ThreatPattern = 
  | 'FLASH_LOAN_DRAIN'
  | 'PRICE_MANIPULATION'
  | 'REENTRANCY_DRAIN'
  | 'GAS_ANOMALY'
  | 'SANDWICH_ATTACK'
  | 'LIQUIDATION_CASCADE'
  | 'INVARIANT_VIOLATION';

// Event signatures for detection
const FLASH_LOAN_SIGNATURES = [
  '0x6318967b', // Aave FlashLoan
  '0xefefaba7', // Uniswap V3 Flash
  '0xc42079f9', // Balancer FlashLoan
  '0xe5e5e5e5', // Generic flash loan
];

const TRANSFER_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const SWAP_SIGNATURES = [
  '0xc42079f9', // Uniswap V3 Swap
  '0xd78ad95f', // Uniswap V2 Swap
  '0x128acb08', // Swap exact input
];

const BORROW_SIGNATURES = [
  '0xc5ebeaec', // Aave borrow
  '0x13e7c9d8', // Compound borrow
];

// HEURISTIC 1: Flash Loan Attack Pattern
export function detectFlashLoanDrain(tx: TransactionTrace): Threat | null {
  const events = tx.events;
  
  // Pattern: FlashLoan → Multiple Transfers → FlashLoanRepay (same tx)
  const hasFlashLoanBorrow = events.some(e => {
    const topic0 = e.topics[0]?.toLowerCase();
    return FLASH_LOAN_SIGNATURES.includes(topic0 || '');
  });
  
  const hasFlashLoanRepay = events.some(e => {
    const topic0 = e.topics[0]?.toLowerCase();
    return topic0?.includes('flash') && topic0?.includes('repay');
  });
  
  const transfers = events.filter(e => {
    const topic0 = e.topics[0]?.toLowerCase();
    return topic0 === TRANSFER_SIGNATURE;
  });
  
  const transferCount = transfers.length;
  
  // Calculate large transfers (> $100k equivalent)
  const largeTransfers = transfers.filter(e => {
    const amount = BigInt(e.amount || '0');
    return amount > BigInt('100000000000'); // 100k with 6 decimals
  });
  
  // Flash loan + high transfer count + large amounts = drain
  if (hasFlashLoanBorrow && transferCount > 3 && largeTransfers.length > 0) {
    const totalOut = calculateTotalOut(transfers, tx.to);
    const totalIn = calculateTotalIn(transfers, tx.to);
    const estimatedLoss = (BigInt(totalOut) - BigInt(totalIn)).toString();
    
    return {
      level: 'CRITICAL',
      pattern: 'FLASH_LOAN_DRAIN',
      confidence: 0.95,
      victim: tx.to,
      attacker: tx.from,
      txHash: tx.hash,
      timestamp: tx.timestamp,
      estimatedLoss,
      details: `Flash loan with ${transferCount} transfers, ${largeTransfers.length} large transfers. Net outflow detected.`
    };
  }
  return null;
}

// HEURISTIC 2: Price Oracle Manipulation
export function detectPriceManipulation(tx: TransactionTrace): Threat | null {
  const internalCalls = tx.calls;
  const events = tx.events;
  
  // Pattern: Huge swap (>$1M) → Immediate borrow/withdrawal
  const largeSwap = internalCalls.some(call => {
    const isSwap = SWAP_SIGNATURES.some(sig => 
      call.input.toLowerCase().includes(sig.slice(2, 10))
    ) || call.input.toLowerCase().includes('swap');
    
    const value = BigInt(call.value || '0');
    const isLarge = value > BigInt('1000000000000000000000000'); // > $1M
    
    return isSwap && isLarge;
  });
  
  const immediateBorrow = internalCalls.some(call => {
    return BORROW_SIGNATURES.some(sig => 
      call.input.toLowerCase().includes(sig.slice(2, 10))
    ) || call.input.toLowerCase().includes('borrow');
  });
  
  const immediateWithdraw = internalCalls.some(call => {
    return call.input.toLowerCase().includes('withdraw') ||
           call.input.toLowerCase().includes('redeem');
  });
  
  // Check if swap and borrow/withdraw happen in sequence
  if (largeSwap && (immediateBorrow || immediateWithdraw)) {
    return {
      level: 'CRITICAL',
      pattern: 'PRICE_MANIPULATION',
      confidence: 0.88,
      victim: tx.to,
      attacker: tx.from,
      txHash: tx.hash,
      timestamp: tx.timestamp,
      details: 'Large swap followed by immediate borrow/withdrawal. Price manipulation likely.'
    };
  }
  return null;
}

// HEURISTIC 3: Reentrancy Drain Pattern
export function detectReentrancy(tx: TransactionTrace): Threat | null {
  const callsToTarget = tx.calls.filter(c => c.to.toLowerCase() === tx.to.toLowerCase());
  
  if (callsToTarget.length < 3) return null;
  
  // Check for repeating function signature (reentrancy)
  const sigs = callsToTarget.map(c => c.input.slice(0, 10).toLowerCase());
  const uniqueSigs = [...new Set(sigs)];
  
  // If calling same function multiple times recursively
  if (uniqueSigs.length === 1 && callsToTarget.length >= 3) {
    const values = callsToTarget.map(c => BigInt(c.value || '0'));
    
    // Check if values are increasing (drain pattern)
    let isIncreasing = true;
    for (let i = 1; i < values.length; i++) {
      if (values[i] < values[i-1]) {
        isIncreasing = false;
        break;
      }
    }
    
    // Total drain should be significant
    const totalValue = values.reduce((a, b) => a + b, BigInt(0));
    const firstValue = values[0];
    
    if (isIncreasing && totalValue > firstValue * BigInt(3)) {
      return {
        level: 'CRITICAL',
        pattern: 'REENTRANCY_DRAIN',
        confidence: 0.92,
        victim: tx.to,
        attacker: tx.from,
        txHash: tx.hash,
        timestamp: tx.timestamp,
        details: `Recursive calls with increasing values. ${callsToTarget.length} reentrant calls detected.`
      };
    }
  }
  return null;
}

// HEURISTIC 4: Gas Anomaly (Infinite loops or computation attacks)
export function detectGasAnomaly(tx: TransactionTrace, avgGas: number): Threat | null {
  const gasUsed = tx.gasUsed;
  
  // 5x average gas and > 5M gas suggests an attack
  if (gasUsed > avgGas * 5 && gasUsed > 5000000) {
    return {
      level: 'HIGH',
      pattern: 'GAS_ANOMALY',
      confidence: 0.75,
      victim: tx.to,
      attacker: tx.from,
      txHash: tx.hash,
      timestamp: tx.timestamp,
      details: `Gas anomaly: ${gasUsed} gas used (${Math.round(gasUsed/avgGas)}x average). Possible DoS or infinite loop.`
    };
  }
  return null;
}

// HEURISTIC 5: Invariant Violation (State manipulation)
export function detectInvariantViolation(tx: TransactionTrace): Threat | null {
  const calls = tx.calls;
  
  // Pattern: State read → External call → State write with wrong order
  // This is common in novel exploits where state is not updated before external call
  
  const stateChangingCalls = calls.filter(c => {
    return c.input.toLowerCase().includes('transfer') ||
           c.input.toLowerCase().includes('send') ||
           c.input.toLowerCase().includes('call');
  });
  
  const stateUpdatesAfterExternal = calls.some((call, idx) => {
    // If there's an external call followed by a state update
    const isExternal = call.type === 'CALL' && BigInt(call.value || '0') > 0;
    const hasStateUpdateAfter = calls.slice(idx + 1).some(c => {
      return c.input.toLowerCase().includes('update') ||
             c.input.toLowerCase().includes('set') ||
             c.input.toLowerCase().includes('write');
    });
    return isExternal && hasStateUpdateAfter;
  });
  
  // Multiple external calls with state updates after = suspicious
  if (stateChangingCalls.length >= 3 && stateUpdatesAfterExternal) {
    return {
      level: 'HIGH',
      pattern: 'INVARIANT_VIOLATION',
      confidence: 0.80,
      victim: tx.to,
      attacker: tx.from,
      txHash: tx.hash,
      timestamp: tx.timestamp,
      details: 'Multiple external calls with delayed state updates. Possible invariant violation.'
    };
  }
  return null;
}

// Helper functions
function calculateTotalOut(transfers: EventLog[], contractAddress: string): string {
  let total = BigInt(0);
  for (const t of transfers) {
    if (t.sender?.toLowerCase() === contractAddress.toLowerCase()) {
      total += BigInt(t.amount || '0');
    }
  }
  return total.toString();
}

function calculateTotalIn(transfers: EventLog[], contractAddress: string): string {
  let total = BigInt(0);
  for (const t of transfers) {
    if (t.recipient?.toLowerCase() === contractAddress.toLowerCase()) {
      total += BigInt(t.amount || '0');
    }
  }
  return total.toString();
}

// Main aggregation function
export function analyzeTransactions(
  txs: TransactionTrace[],
  avgGas: number = 100000
): Threat[] {
  const threats: Threat[] = [];
  
  for (const tx of txs) {
    // Run all heuristics
    const heuristics = [
      detectFlashLoanDrain(tx),
      detectPriceManipulation(tx),
      detectReentrancy(tx),
      detectGasAnomaly(tx, avgGas),
      detectInvariantViolation(tx)
    ];
    
    for (const threat of heuristics) {
      if (threat && threat.level === 'CRITICAL') {
        threats.push(threat);
      }
    }
  }
  
  // Sort by confidence (highest first)
  return threats.sort((a, b) => b.confidence - a.confidence);
}

// Get highest priority threat
export function getTopThreat(threats: Threat[]): Threat | null {
  if (threats.length === 0) return null;
  
  // Prioritize CRITICAL > HIGH > MEDIUM > LOW
  const priority = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  
  return threats.sort((a, b) => {
    const priorityDiff = priority[b.level] - priority[a.level];
    if (priorityDiff !== 0) return priorityDiff;
    return b.confidence - a.confidence;
  })[0];
}

// Format threat for logging
export function formatThreat(threat: Threat): string {
  return `[${threat.level}] ${threat.pattern} | ${threat.victim} | Confidence: ${(threat.confidence * 100).toFixed(1)}% | Tx: ${threat.txHash.slice(0, 20)}...`;
}

export default {
  analyzeTransactions,
  getTopThreat,
  formatThreat,
  detectFlashLoanDrain,
  detectPriceManipulation,
  detectReentrancy,
  detectGasAnomaly,
  detectInvariantViolation
};
