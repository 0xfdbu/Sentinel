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
  guardianAddress: z.string().default('0x777403644f2eE19f887FBB129674a93dCEEda7d4'),
  registryAddress: z.string().optional(),
  pauseReason: z.string().default('Emergency pause triggered by Sentinel'),
  enableBroadcast: z.string().default('false'),
  authorizedAddress: z.string().optional(),
  xaiApiKey: z.string().optional(),
  xaiModel: z.string().default('grok-4-1-fast-reasoning'),
  // Proof of Reserve config
  porApiUrl: z.string().default('https://api.firstplaidypusbank.plaid.com/fdx/v6/accounts/deposit_01_checking'),
  porApiToken: z.string().default('sentinel-demo-token'),
  // Guardian address for DON reports (must be active in SentinelRegistryV3)
  reportGuardianAddress: z.string().default('0x9Eb4168b419F2311DaeD5eD8E072513520178f0C'),
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
    // No mock data - require real PoR check
    return {
      hasReserves: false,
      reserveRatio: 0,
      details: { 
        error: 'PoR API unavailable',
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
 * Generate DON-signed pause report for EmergencyGuardianV2
 * 
 * EmergencyGuardianV2 report format (abi.encode):
 * - bytes32 reportHash: Unique hash of the report
 * - address target: Contract to pause
 * - uint8 severity: 1=HIGH, 2=CRITICAL (must be >= 1 to trigger pause)
 * - bytes32 txHash: Related transaction hash
 * - uint256 timestamp: Report timestamp
 * - address guardian: Guardian who submitted the report (must be active in registry)
 * - uint256 nonce: Guardian nonce for replay protection
 */
function generatePauseReport(
  runtime: Runtime<any>,
  cfg: any,
  action: 'pause' | 'unpause',
  targetAddress: string,
  reason: string,
  suspiciousTx: string,
  porDetails?: BankReserve
): { reportData: string; reportHash: string; severity: number } {
  runtime.log(`[3] Generating DON-signed ${action} report...`)
  
  const now = Date.now()
  const reportHash = keccak256(toBytes(`${action}-${targetAddress}-${now}`))
  
  // Severity: 1=HIGH, 2=CRITICAL (contract only auto-pauses if severity >= 1)
  const severity = action === 'pause' ? 2 : 0
  
  // Transaction hash
  const txHash = suspiciousTx && suspiciousTx.startsWith('0x') && suspiciousTx.length === 66
    ? suspiciousTx as `0x${string}`
    : keccak256(toBytes(`tx-${now}`))
  
  // Guardian address (must match active guardian in registry)
  const guardian = getAddress(cfg.reportGuardianAddress || '0x9Eb4168b419F2311DaeD5eD8E072513520178f0C')
  
  // Timestamp for the report
  const timestamp = BigInt(Math.floor(now / 1000))
  
  runtime.log(`   Report params:`)
  runtime.log(`     target: ${targetAddress}`)
  runtime.log(`     severity: ${severity} (${severity === 2 ? 'CRITICAL' : severity === 1 ? 'HIGH' : 'LOW'})`)
  runtime.log(`     guardian: ${guardian}`)
  runtime.log(`     timestamp: ${timestamp}`)
  
  // Encode report in the format EmergencyGuardianCRE expects (6 params)
  // (bytes32 reportHash, address target, uint8 severity, bytes32 txHash, uint256 timestamp, address attacker)
  const reportData = encodeAbiParameters(
    parseAbiParameters('bytes32 reportHash, address target, uint8 severity, bytes32 txHash, uint256 timestamp, address attacker'),
    [
      reportHash,
      getAddress(targetAddress),
      severity,
      txHash,
      timestamp,
      guardian  // Used as attacker address in this context
    ]
  )
  
  runtime.log(`   ✓ Report hash: ${reportHash.slice(0, 20)}...`)
  runtime.log(`   ✓ Report data length: ${(reportData.length - 2) / 2} bytes`)
  
  return { reportData, reportHash, severity }
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
      
    const { reportData, reportHash, severity } = generatePauseReport(runtime, cfg, action, targetAddress, reason, metadata.suspiciousTx || '', porResult.details)
    
    // Step 4: Create DON attestation
    runtime.log('[4] Creating DON attestation...')
    const report = runtime.report({
      encodedPayload: hexToBase64(reportData),
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
        runtime.log(`   Sending writeReport to ${cfg.guardianAddress}`)
        
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
      severity: severity,
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
        ? action === 'pause' ? 'Contract PAUSED successfully' : 'Contract UNPAUSED successfully'
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
