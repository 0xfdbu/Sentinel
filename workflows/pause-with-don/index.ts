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
  guardianAddress: z.string().default('0x777403644f2eE19f887FBB129674a93dCEEda7d4'), // EmergencyGuardianDON
  registryAddress: z.string().optional(),
  pauseReason: z.string().default('Emergency pause triggered by Sentinel investigation'),
  enableBroadcast: z.string().default('true'), // Enable broadcast for automatic execution
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
  error?: string
}

/**
 * Check address security via GoPlus API
 * Returns risk score 0-100 (higher = more risky)
 */
async function checkGoPlusSecurity(
  runtime: Runtime<any>,
  cfg: any,
  address: string
): Promise<{ isMalicious: boolean; riskScore: number; riskFactors: string[] }> {
  runtime.log(`[1.6] Checking GoPlus security for ${address.slice(0, 8)}...`)
  
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    runtime.log('   ⚠️ Invalid address for GoPlus check')
    return { isMalicious: false, riskScore: 0, riskFactors: [] }
  }
  
  try {
    const http = new cre.capabilities.HTTPClient()
    
    // GoPlus Token Security API v1 - no API key required
    // Chain ID 1 = Ethereum mainnet, 11155111 = Sepolia
    const url = `https://api.gopluslabs.io/api/v1/token_security/11155111?contract_addresses=${address}`
    
    const resp = http.sendRequest(runtime, {
      url,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    }).result()
    
    const data = JSON.parse(new TextDecoder().decode(resp.body))
    
    if (data.code !== 1 || !data.result) {
      runtime.log(`   ⚠️ GoPlus API returned no data: ${data.message || 'unknown'}`)
      return { isMalicious: false, riskScore: 0, riskFactors: [] }
    }
    
    const result = data.result[address.toLowerCase()]
    if (!result) {
      runtime.log('   ℹ️ No GoPlus data for this address')
      return { isMalicious: false, riskScore: 0, riskFactors: [] }
    }
    
    const riskFactors: string[] = []
    let riskScore = 0
    
    // Check various risk indicators
    if (result.is_honeypot === '1') {
      riskScore += 40
      riskFactors.push('Honeypot detected')
    }
    if (result.is_mintable === '1') {
      riskScore += 15
      riskFactors.push('Token is mintable')
    }
    if (result.is_proxy === '1') {
      riskScore += 10
      riskFactors.push('Proxy contract')
    }
    if (result.is_blacklisted === '1') {
      riskScore += 50
      riskFactors.push('Blacklisted address')
    }
    if (result.transfer_pausable === '1') {
      riskScore += 20
      riskFactors.push('Transfers can be paused')
    }
    if (result.is_in_dex === '0' && result.holder_count && parseInt(result.holder_count) < 10) {
      riskScore += 15
      riskFactors.push('Low holder count / not in DEX')
    }
    
    // Check trust score if available
    if (result.trust_list === '1') {
      riskScore = Math.max(0, riskScore - 30)
      riskFactors.push('Listed in trust list (reduces risk)')
    }
    
    const isMalicious = riskScore >= 30
    
    runtime.log(`   ✓ GoPlus risk score: ${riskScore}/100`)
    if (riskFactors.length > 0) {
      runtime.log(`   Risk factors: ${riskFactors.join(', ')}`)
    }
    
    return { isMalicious, riskScore, riskFactors }
    
  } catch (e) {
    runtime.log(`   ⚠️ GoPlus check failed: ${(e as Error).message}`)
    return { isMalicious: false, riskScore: 0, riskFactors: [] }
  }
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
        balance: 0,
        currency: 'USD',
        timestamp: new Date().toISOString(),
        error: 'PoR API unavailable'
      }
    }
  }
}

interface GoPlusData {
  from: { riskScore: number; riskFactors: string[] }
  to: { riskScore: number; riskFactors: string[] }
}

/**
 * Analyze threat with xAI Grok
 * xAI makes the final decision based on all investigation data
 */
async function analyzeThreatWithAI(
  runtime: Runtime<any>,
  cfg: any,
  threat: ThreatAnalysis,
  goplus: GoPlusData,
  porHasReserves: boolean
): Promise<{ shouldPause: boolean; confidence: number; reasoning: string }> {
  runtime.log('[2] Analyzing threat with xAI Grok...')
  runtime.log('   Letting xAI investigate and decide based on all evidence...')
  
  const prompt = `You are a blockchain security expert analyzing a potentially fraudulent transaction. Your task is to INVESTIGATE and DECIDE whether to PAUSE the contract.

🚨 SENTINEL NODE ALERT (Initial Detection):
- Fraud Score: ${threat.fraudScore}/100 (threshold triggered)
- Risk Factors: ${threat.riskFactors.join(', ') || 'None detected'}

🔗 TRANSACTION DETAILS:
- Hash: ${threat.suspiciousTx || 'N/A'}
- From: ${threat.from || 'N/A'}
- To: ${threat.to || 'N/A'}
- Value: ${threat.value || 'N/A'} USDA

🔍 GOPLUS SECURITY INVESTIGATION (from GoPlus API):
Sender Address (${threat.from}):
- Risk Score: ${goplus.from.riskScore}/100
- Issues: ${goplus.from.riskFactors.join(', ') || 'None detected'}

Recipient Address (${threat.to}):
- Risk Score: ${goplus.to.riskScore}/100  
- Issues: ${goplus.to.riskFactors.join(', ') || 'None detected'}

🏦 PROOF OF RESERVE:
- Bank Reserves: ${porHasReserves ? 'SUFFICIENT (>$1M)' : 'INSUFFICIENT (<$1M) - CRITICAL'}

YOUR TASK:
You are the final decision maker. Analyze ALL evidence above and decide:
1. Is this a real attack/threat?
2. Should we PAUSE the contract immediately?
3. What is your confidence level?

CONSIDER:
- Flash loan patterns, honeypots, blacklisted addresses
- High value transfers to suspicious addresses
- Low reserves + suspicious activity = EMERGENCY
- Be conservative - false pauses are better than stolen funds

Respond ONLY in JSON format:
{
  "shouldPause": true/false,
  "confidence": 0-100,
  "reasoning": "brief explanation citing specific evidence"
}`

  // Check if we have xAI config
  if (!cfg.xaiApiKey) {
    runtime.log('   ⚠️ No xAI API key, using investigation data only')
    // Without xAI, pause if GoPlus found issues OR reserves are low
    const hasGoPlusIssues = goplus.from.riskScore >= 30 || goplus.to.riskScore >= 30
    const shouldPause = hasGoPlusIssues || !porHasReserves
    return {
      shouldPause,
      confidence: hasGoPlusIssues ? 75 : (!porHasReserves ? 95 : 50),
      reasoning: hasGoPlusIssues 
        ? `GoPlus detected risks: ${[...goplus.from.riskFactors, ...goplus.to.riskFactors].join(', ')}`
        : (!porHasReserves ? 'CRITICAL: Bank reserves insufficient' : 'No clear threat detected')
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
    
    // Step 1.6: Check GoPlus security for involved addresses
    // GoPlus provides INVESTIGATION data - NOT scoring. xAI decides.
    const goplusData: GoPlusData = {
      from: { riskScore: 0, riskFactors: [] },
      to: { riskScore: 0, riskFactors: [] }
    }
    
    if (metadata.from) {
      const fromCheck = await checkGoPlusSecurity(runtime, cfg, metadata.from)
      goplusData.from = fromCheck
    }
    if (metadata.to) {
      const toCheck = await checkGoPlusSecurity(runtime, cfg, metadata.to)
      goplusData.to = toCheck
    }
    
    // Step 2: AI Investigation & Decision
    // xAI analyzes ALL evidence (Sentinel alert + GoPlus data + PoR) and DECIDES
    runtime.log(`\n[2] xAI Investigation starting...`)
    runtime.log(`    Evidence: Sentinel alert + GoPlus investigation + PoR status`)
    
    let aiDecision: { shouldPause: boolean; confidence: number; reasoning: string }
    
    // If reserves are critically low, that's an automatic emergency
    if (!porResult.hasReserves) {
      runtime.log(`\n🚨 CRITICAL: Bank reserves insufficient - Emergency condition`)
      aiDecision = {
        shouldPause: true,
        confidence: 95,
        reasoning: `EMERGENCY: Bank reserves $${porResult.details.balance.toLocaleString()} below $1M threshold`
      }
    } else {
      // Let xAI investigate and decide
      aiDecision = await analyzeThreatWithAI(runtime, cfg, metadata, goplusData, porResult.hasReserves)
    }
    
    if (!aiDecision.shouldPause) {
      runtime.log(`\n⏸️  AI recommends MONITOR (not pause)`)
      runtime.log(`    Reasoning: ${aiDecision.reasoning}`)
      return {
        success: true,
        action: 'MONITOR',
        fraudScore: metadata.fraudScore,
        goplusFromScore: goplusData.from.riskScore,
        goplusToScore: goplusData.to.riskScore,
        aiConfidence: aiDecision.confidence,
        reasoning: aiDecision.reasoning,
        bankReserves: porResult.details.balance,
        message: 'Threat analyzed by AI - no pause required'
      }
    }
    
    runtime.log(`\n🚨 AI confirms PAUSE is warranted`)
    runtime.log(`    Confidence: ${aiDecision.confidence}%`)
    
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
          gasConfig: { 
            gasLimit: '300000',
            gasPrice: '25000000000' // 25 gwei
          },
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
      sentinelFraudScore: metadata.fraudScore,
      goplusFromScore: goplusData.from.riskScore,
      goplusFromFactors: goplusData.from.riskFactors,
      goplusToScore: goplusData.to.riskScore,
      goplusToFactors: goplusData.to.riskFactors,
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
