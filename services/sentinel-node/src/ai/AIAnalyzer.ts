/**
 * AI Analysis Trigger Algorithm
 * 
 * Multi-tier threat detection with intelligent escalation to xAI Grok
 * via Chainlink CRE for confidential analysis and response.
 */

import { ethers } from 'ethers'

// Configuration
const AI_CONFIG = {
  // Trigger thresholds
  HEURISTIC_TRIGGER_THRESHOLD: 0.65,    // Min heuristic score to trigger AI
  AI_CRITICAL_THRESHOLD: 0.85,          // Min AI confidence for auto-pause
  
  // Rate limiting
  MAX_AI_CALLS_PER_MINUTE: 5,           // Prevent API abuse
  MAX_AI_CALLS_PER_HOUR: 50,
  COOLDOWN_BETWEEN_CALLS_MS: 10000,     // 10 second minimum between AI calls
  
  // High-value triggers (immediate AI analysis)
  HIGH_VALUE_THRESHOLD_ETH: 50,         // >50 ETH always triggers AI
  HIGH_GAS_THRESHOLD: 3000000,          // >3M gas always triggers AI
  
  // Pattern recognition
  NOVEL_PATTERN_WINDOW_MS: 3600000,     // 1 hour window for "novel" detection
  MAX_SAME_CONTRACT_CALLS: 3,           // Max AI calls per contract per hour
}

// Rate limiting state
interface RateLimitState {
  callsLastMinute: number
  callsLastHour: number
  lastCallTimestamp: number
  contractCallCounts: Map<string, number>
}

const rateLimitState: RateLimitState = {
  callsLastMinute: 0,
  callsLastHour: 0,
  lastCallTimestamp: 0,
  contractCallCounts: new Map()
}

// Heuristic scoring weights
const HEURISTIC_WEIGHTS = {
  FLASH_LOAN: 0.95,
  LARGE_TRANSFER: 0.70,
  HIGH_GAS: 0.60,
  MULTIPLE_TRANSFERS: 0.75,
  REENTRANCY_PATTERN: 0.90,
  SUSPICIOUS_ORIGIN: 0.80,
  KNOWN_ATTACKER: 1.00,
  UNVERIFIED_CONTRACT: 0.50,
}

export interface HeuristicResult {
  score: number
  flags: string[]
  confidence: number
  shouldTriggerAI: boolean
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export interface AIAnalysisRequest {
  contractAddress: string
  txHash: string
  from: string
  to: string
  value: string
  data: string
  gasUsed: number
  heuristicScore: number
  heuristicFlags: string[]
  timestamp: number
}

export interface AIAnalysisResult {
  requestId: string
  threatDetected: boolean
  confidence: number
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  attackType?: string
  explanation: string
  recommendedAction: 'MONITOR' | 'ALERT' | 'PAUSE'
  vulnerabilityDetails?: string
}

/**
 * Calculate heuristic threat score
 */
export function calculateHeuristicScore(
  tx: ethers.TransactionResponse,
  receipt: ethers.TransactionReceipt,
  contractHistory: any[]
): HeuristicResult {
  const flags: string[] = []
  let score = 0
  let maxConfidence = 0

  // 1. Flash Loan Detection
  const input = (tx.data || '').toLowerCase()
  const flashLoanSigs = ['0x6318967b', '0xefefaba7', '0xc42079f9', '0xab9c4b5d']
  const hasFlashLoan = flashLoanSigs.some(sig => input.includes(sig.slice(2)))
  if (hasFlashLoan) {
    score += HEURISTIC_WEIGHTS.FLASH_LOAN
    flags.push('FLASH_LOAN_PATTERN')
    maxConfidence = Math.max(maxConfidence, 0.95)
  }

  // 2. Large Transfer
  const valueEth = Number(ethers.formatEther(tx.value || 0))
  if (valueEth > AI_CONFIG.HIGH_VALUE_THRESHOLD_ETH) {
    score += HEURISTIC_WEIGHTS.LARGE_TRANSFER
    flags.push('HIGH_VALUE_TRANSFER')
    maxConfidence = Math.max(maxConfidence, 0.80)
  }

  // 3. High Gas Usage
  const gasUsed = Number(receipt.gasUsed)
  if (gasUsed > AI_CONFIG.HIGH_GAS_THRESHOLD) {
    score += HEURISTIC_WEIGHTS.HIGH_GAS
    flags.push('HIGH_GAS_USAGE')
    maxConfidence = Math.max(maxConfidence, 0.70)
  }

  // 4. Multiple Transfers (Drain Pattern)
  const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
  const transferCount = receipt.logs.filter(log => log.topics[0] === transferTopic).length
  if (transferCount > 5) {
    score += HEURISTIC_WEIGHTS.MULTIPLE_TRANSFERS * Math.min(transferCount / 10, 1)
    flags.push(`MULTIPLE_TRANSFERS:${transferCount}`)
    maxConfidence = Math.max(maxConfidence, 0.85)
  }

  // 5. Reentrancy Pattern
  const internalCalls = receipt.logs.filter(log => 
    log.address.toLowerCase() === tx.to?.toLowerCase()
  ).length
  if (internalCalls > 3) {
    score += HEURISTIC_WEIGHTS.REENTRANCY_PATTERN
    flags.push('REENTRANCY_PATTERN')
    maxConfidence = Math.max(maxConfidence, 0.90)
  }

  // 6. Suspicious Origin (fresh wallet, no prior history)
  // This would require additional data source

  // Normalize score to 0-1
  const normalizedScore = Math.min(score / 3, 1)

  // Determine priority
  let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'
  if (normalizedScore > 0.9) priority = 'CRITICAL'
  else if (normalizedScore > 0.75) priority = 'HIGH'
  else if (normalizedScore > 0.5) priority = 'MEDIUM'

  // Should trigger AI?
  const shouldTriggerAI = shouldTriggerAIAnalysis(
    normalizedScore,
    flags,
    tx.to || '',
    valueEth,
    gasUsed
  )

  return {
    score: normalizedScore,
    flags,
    confidence: maxConfidence,
    shouldTriggerAI,
    priority
  }
}

/**
 * Determine if AI analysis should be triggered
 */
function shouldTriggerAIAnalysis(
  heuristicScore: number,
  flags: string[],
  contractAddress: string,
  valueEth: number,
  gasUsed: number
): boolean {
  const now = Date.now()

  // 1. Hard threshold - high heuristic score always triggers
  if (heuristicScore >= AI_CONFIG.HEURISTIC_TRIGGER_THRESHOLD) {
    // But check rate limits
    if (!checkRateLimits(contractAddress)) {
      console.log(`⏳ Rate limit hit for ${contractAddress}, skipping AI analysis`)
      return false
    }
    return true
  }

  // 2. High-value transaction triggers AI regardless of other heuristics
  if (valueEth >= AI_CONFIG.HIGH_VALUE_THRESHOLD_ETH) {
    if (!checkRateLimits(contractAddress)) return false
    console.log(`💰 High value tx (${valueEth} ETH) triggers AI analysis`)
    return true
  }

  // 3. Extreme gas usage triggers AI
  if (gasUsed >= AI_CONFIG.HIGH_GAS_THRESHOLD) {
    if (!checkRateLimits(contractAddress)) return false
    console.log(`⛽ High gas tx (${gasUsed}) triggers AI analysis`)
    return true
  }

  // 4. Novel pattern detection (first time seeing this flag combo)
  const novelPattern = isNovelPattern(flags, contractAddress)
  if (novelPattern && heuristicScore > 0.4) {
    if (!checkRateLimits(contractAddress)) return false
    console.log(`🔍 Novel pattern detected, triggering AI analysis`)
    return true
  }

  return false
}

/**
 * Check rate limits for AI calls
 */
function checkRateLimits(contractAddress: string): boolean {
  const now = Date.now()

  // Reset counters if needed
  if (now - rateLimitState.lastCallTimestamp > 60000) {
    rateLimitState.callsLastMinute = 0
  }
  if (now - rateLimitState.lastCallTimestamp > 3600000) {
    rateLimitState.callsLastHour = 0
    rateLimitState.contractCallCounts.clear()
  }

  // Check cooldown
  if (now - rateLimitState.lastCallTimestamp < AI_CONFIG.COOLDOWN_BETWEEN_CALLS_MS) {
    return false
  }

  // Check global rate limits
  if (rateLimitState.callsLastMinute >= AI_CONFIG.MAX_AI_CALLS_PER_MINUTE) {
    return false
  }
  if (rateLimitState.callsLastHour >= AI_CONFIG.MAX_AI_CALLS_PER_HOUR) {
    return false
  }

  // Check per-contract limit
  const contractCalls = rateLimitState.contractCallCounts.get(contractAddress) || 0
  if (contractCalls >= AI_CONFIG.MAX_SAME_CONTRACT_CALLS) {
    return false
  }

  // Update counters
  rateLimitState.callsLastMinute++
  rateLimitState.callsLastHour++
  rateLimitState.lastCallTimestamp = now
  rateLimitState.contractCallCounts.set(contractAddress, contractCalls + 1)

  return true
}

/**
 * Check if this is a novel pattern we haven't seen recently
 */
function isNovelPattern(flags: string[], contractAddress: string): boolean {
  // In production, this would check against a database of previous patterns
  // For now, we'll consider any flag combo with FLASH_LOAN as novel if
  // combined with other flags
  const hasFlashLoan = flags.includes('FLASH_LOAN_PATTERN')
  const hasMultipleFlags = flags.length > 1
  
  return hasFlashLoan && hasMultipleFlags
}

/**
 * Build AI prompt for Grok analysis
 */
export function buildAIPrompt(request: AIAnalysisRequest): string {
  return `
Analyze this Ethereum transaction for security threats:

TRANSACTION DETAILS:
- Contract: ${request.contractAddress}
- From: ${request.from}
- To: ${request.to}
- Value: ${ethers.formatEther(request.value)} ETH
- Gas Used: ${request.gasUsed}
- Transaction Hash: ${request.txHash}
- Data: ${request.data.slice(0, 100)}...

HEURISTIC ANALYSIS:
- Threat Score: ${(request.heuristicScore * 100).toFixed(1)}%
- Flags Detected: ${request.heuristicFlags.join(', ')}

TASK:
1. Analyze if this transaction contains exploit patterns
2. Identify the attack type (if any): reentrancy, flash loan, price manipulation, etc.
3. Assess confidence level (0-1)
4. Recommend action: MONITOR, ALERT, or PAUSE

Respond in JSON format:
{
  "threatDetected": boolean,
  "confidence": number,
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "attackType": string | null,
  "explanation": string,
  "recommendedAction": "MONITOR" | "ALERT" | "PAUSE",
  "vulnerabilityDetails": string
}
`
}

/**
 * Call xAI Grok API via Chainlink CRE
 */
export async function callGrokAI(
  prompt: string,
  creConsumerAddress: string,
  wallet: ethers.Wallet
): Promise<AIAnalysisResult> {
  console.log('🤖 Triggering xAI Grok analysis via CRE...')

  try {
    // In production, this would:
    // 1. Encrypt the prompt for confidential compute
    // 2. Send to Chainlink Functions
    // 3. Wait for callback with results
    
    // For hackathon demo, we'll simulate the API call
    // In real implementation, use Chainlink Functions to call xAI API
    
    const mockResult: AIAnalysisResult = await simulateGrokCall(prompt)
    
    console.log(`✅ AI Analysis complete: ${mockResult.threatDetected ? 'THREAT' : 'SAFE'} (${(mockResult.confidence * 100).toFixed(0)}%)`)
    
    return mockResult
  } catch (error) {
    console.error('❌ AI analysis failed:', error)
    return {
      requestId: `error-${Date.now()}`,
      threatDetected: false,
      confidence: 0,
      severity: 'LOW',
      explanation: 'AI analysis failed, falling back to heuristics',
      recommendedAction: 'ALERT'
    }
  }
}

/**
 * Simulate Grok AI call (replace with actual Chainlink Functions integration)
 */
async function simulateGrokCall(prompt: string): Promise<AIAnalysisResult> {
  // In production, this would be:
  // const response = await secrets.grokApiRequest(prompt)
  
  // Mock response based on prompt content
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  if (prompt.includes('FLASH_LOAN_PATTERN')) {
    return {
      requestId: `ai-${Date.now()}`,
      threatDetected: true,
      confidence: 0.92,
      severity: 'CRITICAL',
      attackType: 'Flash Loan Attack',
      explanation: 'Transaction exhibits classic flash loan pattern with multiple swaps and price manipulation',
      recommendedAction: 'PAUSE',
      vulnerabilityDetails: 'Price oracle manipulation via flash loan liquidity injection'
    }
  }
  
  if (prompt.includes('REENTRANCY_PATTERN')) {
    return {
      requestId: `ai-${Date.now()}`,
      threatDetected: true,
      confidence: 0.88,
      severity: 'HIGH',
      attackType: 'Reentrancy Attack',
      explanation: 'Multiple external calls detected with state modification pattern',
      recommendedAction: 'PAUSE',
      vulnerabilityDetails: 'External call before state update allows recursive execution'
    }
  }
  
  return {
    requestId: `ai-${Date.now()}`,
    threatDetected: false,
    confidence: 0.75,
    severity: 'LOW',
    attackType: undefined,
    explanation: 'Transaction appears legitimate after deep analysis',
    recommendedAction: 'MONITOR'
  }
}

/**
 * Execute response based on AI recommendation
 */
export async function executeAIResponse(
  result: AIAnalysisResult,
  contractAddress: string,
  guardian: ethers.Contract,
  wallet: ethers.Wallet
): Promise<void> {
  if (result.recommendedAction === 'PAUSE' && result.confidence > AI_CONFIG.AI_CRITICAL_THRESHOLD) {
    console.log(`🚨 Executing emergency pause for ${contractAddress}`)
    console.log(`   Reason: ${result.attackType} (${(result.confidence * 100).toFixed(0)}% confidence)`)
    
    try {
      const vulnHash = ethers.keccak256(ethers.toUtf8Bytes(result.explanation))
      const tx = await guardian.emergencyPause(contractAddress, vulnHash, { gasLimit: 500000 })
      await tx.wait()
      console.log(`✅ Contract paused: ${tx.hash}`)
    } catch (error) {
      console.error('❌ Failed to execute pause:', error)
    }
  } else if (result.recommendedAction === 'ALERT') {
    console.log(`⚠️ ALERT: Suspicious activity detected on ${contractAddress}`)
    console.log(`   ${result.explanation}`)
    // Send webhook/notification
  } else {
    console.log(`✓ Transaction safe: ${result.explanation}`)
  }
}

export default {
  calculateHeuristicScore,
  buildAIPrompt,
  callGrokAI,
  executeAIResponse
}
