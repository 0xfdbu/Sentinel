/**
 * Pause with DON - Emergency Pause Workflow
 * 
 * Triggered by Sentinel Node when suspicious activity is detected.
 * Uses xAI Grok for final analysis + Proof of Reserve validation before executing pause.
 * 
 * Trigger: HTTP (from Sentinel Node)
 */

import { 
  bytesToHex, 
  cre, 
  getNetwork, 
  type Runtime, 
  type HTTPPayload,
  Runner, 
  hexToBase64,
  TxStatus
} from '@chainlink/cre-sdk'
import { encodeAbiParameters, parseAbiParameters, keccak256, toBytes, getAddress } from 'viem'
import { z } from 'zod'

const configSchema = z.object({
  guardianAddress: z.string().default('0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1'),
  registryAddress: z.string().optional(),
  pauseReason: z.string().default('Emergency pause triggered by Sentinel'),
  enableBroadcast: z.string().default('false'),
  authorizedAddress: z.string().optional(),
  xaiApiKey: z.string().optional(),
  xaiModel: z.string().default('grok-4-1-fast-reasoning'),
  // Proof of Reserve config
  porApiUrl: z.string().default('https://api.firstplaidypusbank.plaid.com/fdx/v6/accounts/deposit_01_checking'),
  porApiToken: z.string().default('sentinel-demo-token'),
})

interface ThreatAnalysis {
  fraudScore: number
  riskFactors: string[]
  suspiciousTx: string
  from: string
  to: string
  value: string
}

interface BankReserve {
  balance: number
  currency: string
  timestamp: string
}

/**
 * Check Proof of Reserve via HTTP (Confidential in production)
 */
async function checkProofOfReserve(
  runtime: Runtime<any>,
  cfg: any
): Promise<{ hasReserves: boolean; reserveRatio: number; details: BankReserve }> {
  runtime.log('[1.5] Checking Proof of Reserve via HTTP...')
  
  try {
    // In production, use ConfidentialHTTPClient. In simulation, use regular HTTP
    const http = new cre.capabilities.HTTPClient()
    
    const resp = http.sendRequest(runtime, {
      url: cfg.porApiUrl,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${cfg.porApiToken}`
      }
    }).result()
    
    const data = JSON.parse(new TextDecoder().decode(resp.body))
    
    // Parse bank response - handle different response formats
    let balance = 0
    if (data.balance !== undefined) {
      balance = Number(data.balance)
    } else if (data.availableBalance !== undefined) {
      balance = Number(data.availableBalance)
    } else if (data.account && data.account.balance) {
      balance = Number(data.account.balance)
    }
    
    const currency = data.currency || data.accountCurrency || 'USD'
    
    runtime.log(`   ✓ Bank reserves: $${balance.toLocaleString()} ${currency}`)
    
    // Calculate reserve ratio (simplified - would compare to total supply)
    // For demo, assume we need at least $1M in reserves
    const minimumReserve = 1000000
    const hasReserves = balance >= minimumReserve
    const reserveRatio = hasReserves ? (balance / minimumReserve) : 0
    
    if (!hasReserves) {
      runtime.log(`   🚨 LOW RESERVES: $${balance.toLocaleString()} < $${minimumReserve.toLocaleString()}`)
    } else {
      runtime.log(`   ✓ Reserve ratio: ${reserveRatio.toFixed(2)}x`)
    }
    
    return {
      hasReserves,
      reserveRatio,
      details: {
        balance,
        currency,
        timestamp: new Date().toISOString()
      }
    }
    
  } catch (e) {
    runtime.log(`   ⚠️ PoR check failed: ${(e as Error).message}`)
    // Use mock data for demo
    runtime.log(`   Using mock reserve data for demo`)
    const mockBalance = 1800000 // $1.8M mock reserves
    return {
      hasReserves: true,
      reserveRatio: 1.8,
      details: { 
        balance: mockBalance, 
        currency: 'USD', 
        timestamp: new Date().toISOString() 
      }
    }
  }
}

/**
 * Analyze threat with xAI Grok
 */
async function analyzeThreatWithAI(
  runtime: Runtime<any>,
  cfg: any,
  threat: ThreatAnalysis
): Promise<{ shouldPause: boolean; confidence: number; reasoning: string }> {
  runtime.log('[2] Analyzing threat with xAI Grok...')
  
  const prompt = `You are a blockchain security expert analyzing a potentially fraudulent transaction.

TRANSACTION DETAILS:
- Hash: ${threat.suspiciousTx}
- From: ${threat.from}
- To: ${threat.to}
- Value: ${threat.value} USDA

SENTINEL NODE HEURISTIC ANALYSIS:
- Fraud Score: ${threat.fraudScore}/100
- Risk Factors Detected: ${threat.riskFactors.join(', ')}

Your task:
1. Evaluate if this transaction represents a real threat
2. Consider if a contract pause is warranted
3. Provide your confidence level and reasoning

Respond in JSON format:
{
  "shouldPause": true/false,
  "confidence": 0-100,
  "reasoning": "brief explanation"
}

Be conservative - only recommend pause if you're confident this is malicious activity.`

  // Check if we have xAI config
  if (!cfg.xaiApiKey) {
    runtime.log('   ⚠️ No xAI API key, using heuristic score only')
    return {
      shouldPause: threat.fraudScore >= 70,
      confidence: threat.fraudScore,
      reasoning: `Heuristic score ${threat.fraudScore}/100: ${threat.riskFactors.join(', ')}`
    }
  }

  try {
    const http = new cre.capabilities.HTTPClient()
    
    const resp = http.sendRequest(runtime, {
      url: 'https://api.x.ai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.xaiApiKey}`
      },
      body: new TextEncoder().encode(JSON.stringify({
        model: cfg.xaiModel,
        messages: [
          { role: 'system', content: 'You are a blockchain security expert. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 300
      }))
    }).result()
    
    const data = JSON.parse(new TextDecoder().decode(resp.body))
    const content = data.choices?.[0]?.message?.content || ''
    
    // Extract JSON
    const jsonMatch = content.match(/\{[\s\S]*?\}/)
    if (jsonMatch) {
      const decision = JSON.parse(jsonMatch[0])
      runtime.log(`   ✓ AI Decision: ${decision.shouldPause ? 'PAUSE' : 'MONITOR'}`)
      runtime.log(`   ✓ Confidence: ${decision.confidence}%`)
      return {
        shouldPause: decision.shouldPause || false,
        confidence: decision.confidence || 0,
        reasoning: decision.reasoning || 'No reasoning provided'
      }
    }
  } catch (e) {
    runtime.log(`   ⚠️ xAI analysis failed: ${(e as Error).message}`)
  }
  
  // Fallback to heuristic
  return {
    shouldPause: threat.fraudScore >= 70,
    confidence: threat.fraudScore,
    reasoning: `Fallback to heuristic: ${threat.riskFactors.join(', ')}`
  }
}

/**
 * Generate DON-signed pause report
 */
function generatePauseReport(
  runtime: Runtime<any>,
  cfg: any,
  action: 'pause' | 'unpause',
  targetAddress: string,
  reason: string,
  porDetails?: BankReserve
): { reportData: string; reportHash: string } {
  runtime.log(`[3] Generating DON-signed ${action} report...`)
  
  const reportHash = keccak256(toBytes(`${action}-${targetAddress}-${Date.now()}`))
  
  // Include PoR data in reason if available
  let fullReason = reason
  if (porDetails && porDetails.balance > 0) {
    fullReason += ` | Bank reserves: $${porDetails.balance.toLocaleString()} ${porDetails.currency}`
  }
  
  const reportData = encodeAbiParameters(
    parseAbiParameters('bytes32 reportHash, address target, string reason, uint8 action'),
    [
      reportHash,
      getAddress(targetAddress),
      fullReason,
      action === 'pause' ? 1 : 0
    ]
  )
  
  runtime.log(`   ✓ Report hash: ${reportHash.slice(0, 20)}...`)
  
  return { reportData, reportHash }
}

/**
 * HTTP trigger handler - Called by Sentinel Node
 */
async function onHTTPTrigger(runtime: Runtime<any>, payload: HTTPPayload): Promise<object> {
  runtime.log('=== Pause with DON (Sentinel Node Alert) ===')
  
  try {
    const cfg = runtime.config
    
    // Parse payload
    let body: any = {}
    try {
      const payloadText = new TextDecoder().decode(payload.input)
      runtime.log(`    Raw payload: ${payloadText}`)
      if (payloadText && payloadText.trim()) {
        body = JSON.parse(payloadText)
      }
    } catch (parseError) {
      runtime.log(`   ⚠️ Could not parse payload: ${(parseError as Error).message}`)
    }
    
    const action = body.action || 'pause'
    const targetAddress = body.target || cfg.guardianAddress
    const metadata: ThreatAnalysis = body.metadata || {}
    
    runtime.log(`[1] Alert received from Sentinel Node`)
    runtime.log(`    Action: ${action}`)
    runtime.log(`    Target: ${targetAddress}`)
    
    if (metadata.fraudScore) {
      runtime.log(`    Fraud Score: ${metadata.fraudScore}`)
      runtime.log(`    Risk Factors: ${metadata.riskFactors?.join(', ')}`)
      runtime.log(`    Suspicious Tx: ${metadata.suspiciousTx}`)
    }
    
    // Step 1.5: Check Proof of Reserve (Confidential HTTP)
    const porResult = await checkProofOfReserve(runtime, cfg)
    
    // If reserves are critically low, pause immediately regardless of threat
    if (!porResult.hasReserves) {
      runtime.log(`\n🚨 CRITICAL: Bank reserves insufficient - Emergency pause triggered`)
    }
    
    // Step 2: AI Analysis (if we have threat metadata)
    let aiDecision = { shouldPause: true, confidence: 100, reasoning: 'Emergency - Low reserves' }
    
    if (metadata.fraudScore && porResult.hasReserves) {
      // Only do AI analysis if reserves are OK and we have threat data
      aiDecision = await analyzeThreatWithAI(runtime, cfg, metadata)
      
      if (!aiDecision.shouldPause) {
        runtime.log(`\n⏸️  AI recommends MONITOR (not pause)`)
        runtime.log(`    Reasoning: ${aiDecision.reasoning}`)
        return {
          success: true,
          action: 'MONITOR',
          fraudScore: metadata.fraudScore,
          aiConfidence: aiDecision.confidence,
          reasoning: aiDecision.reasoning,
          bankReserves: porResult.details.balance,
          message: 'Threat analyzed by AI - no pause required'
        }
      }
      
      runtime.log(`\n🚨 AI confirms PAUSE is warranted`)
      runtime.log(`    Confidence: ${aiDecision.confidence}%`)
    } else if (!porResult.hasReserves) {
      aiDecision.reasoning = `Emergency pause: Bank reserves insufficient ($${porResult.details.balance.toLocaleString()})`
    }
    
    // Step 3: Generate DON-signed report (includes PoR data)
    const reason = metadata.fraudScore 
      ? `AI-confirmed threat (score: ${metadata.fraudScore}). ${aiDecision.reasoning}. Tx: ${metadata.suspiciousTx}`
      : body.reason || cfg.pauseReason
      
    const { reportData, reportHash } = generatePauseReport(runtime, cfg, action, targetAddress, reason, porResult.details)
    
    // Step 4: Create DON attestation
    runtime.log('[4] Creating DON attestation...')
    const report = runtime.report({
      encodedPayload: hexToBase64(reportData.slice(2) as `0x${string}`),
      encoderName: 'evm',
      signingAlgo: 'ecdsa',
      hashingAlgo: 'keccak256',
    }).result()
    
    runtime.log(`   ✓ Report signed: ${report.signatures?.length || 1} signatures`)
    
    // Step 5: Broadcast
    const shouldBroadcast = body.broadcast === true || cfg.enableBroadcast === 'true'
    let txHash = null
    let txStatus = null
    
    if (shouldBroadcast) {
      runtime.log('[5] Broadcasting to EmergencyGuardian...')
      
      const network = getNetwork({ chainFamily: 'evm', chainSelectorName: 'ethereum-testnet-sepolia', isTestnet: true })
      if (!network) throw new Error('Network not found')
      
      const evm = new cre.capabilities.EVMClient(network.chainSelector.selector)
      
      try {
        const resp = evm.writeReport(runtime, {
          receiver: cfg.guardianAddress,
          report,
          gasConfig: { gasLimit: '300000' },
        }).result()
        
        txStatus = resp.txStatus
        txHash = resp.txHash ? bytesToHex(resp.txHash) : null
        
        if (resp.txStatus === TxStatus.SUCCESS) {
          runtime.log(`   ✅ PAUSE EXECUTED!`)
          runtime.log(`   Tx Hash: ${txHash}`)
        } else {
          runtime.log(`   ⚠️ Broadcast failed: ${resp.errorMessage || 'Unknown error'}`)
        }
      } catch (broadcastError) {
        runtime.log(`   ⚠️ Broadcast error: ${(broadcastError as Error).message}`)
      }
    } else {
      runtime.log('[5] Simulation mode - skipping broadcast')
    }
    
    runtime.log('\n✅ WORKFLOW COMPLETE')
    
    return {
      success: true,
      action: action.toUpperCase(),
      target: targetAddress,
      fraudScore: metadata.fraudScore,
      aiConfidence: aiDecision.confidence,
      aiReasoning: aiDecision.reasoning,
      bankReserves: porResult.details.balance,
      reserveRatio: porResult.reserveRatio,
      reportHash: reportHash,
      broadcast: shouldBroadcast,
      txHash: txHash || 'N/A',
      txStatus: txStatus,
      timestamp: new Date().toISOString(),
      message: txStatus === TxStatus.SUCCESS 
        ? 'Contract PAUSED successfully'
        : 'DON-signed pause report generated'
    }
    
  } catch (e) {
    runtime.log(`❌ FAILED: ${(e as Error).message}`)
    return { success: false, error: (e as Error).message }
  }
}

// HTTP trigger only - Sentinel Node calls this
const init = (cfg: any) => [
  cre.handler(
    new cre.capabilities.HTTPCapability().trigger({
      authorizedKeys: cfg.authorizedAddress ? [
        { type: "KEY_TYPE_ECDSA_EVM", publicKey: cfg.authorizedAddress }
      ] : [],
    }),
    onHTTPTrigger
  )
]

export async function main() { 
  const runner = await Runner.newRunner({ configSchema }) 
  await runner.run(init) 
}

main()
