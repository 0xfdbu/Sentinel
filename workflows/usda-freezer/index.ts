/**
 * USDA Freezer - Address Freezing Workflow
 * 
 * Monitors suspicious addresses and freezes them via DON-signed reports.
 * Triggered by HTTP request with address to investigate.
 * 
 * Risk Sources:
 * - ScamSniffer database
 * - Chainalysis Sanctions API
 * - Internal Sentinel blacklist
 * - xAI Grok risk analysis
 */

import { bytesToHex, cre, getNetwork, type Runtime, type HttpPayload, TxStatus, Runner, hexToBase64 } from '@chainlink/cre-sdk'
import { encodeAbiParameters, parseAbiParameters, keccak256, toBytes, parseUnits } from 'viem'
import { z } from 'zod'

// Config schema
const configSchema = z.object({
  sepolia: z.object({
    freezerAddress: z.string(),
    registryAddress: z.string(),
  }),
  scamSnifferApiUrl: z.string().default('https://api.scamsniffer.io/v1/address'),
  chainalysisApiUrl: z.string().default('https://api.chainalysis.com/api/v1/address'),
  sentinelApiUrl: z.string().default('https://api.sentinel.local/blacklist'),
  xaiApiKey: z.string(),
  xaiModel: z.string().default('grok-4-1-fast-reasoning'),
  defaultFreezeDuration: z.number().default(604800), // 7 days in seconds
  simulationMode: z.boolean().default(true),
})

// HTTP trigger payload schema
const payloadSchema = z.object({
  address: z.string(), // Address to investigate
  reason: z.string().optional(), // Optional context
  forceFreeze: z.boolean().default(false), // Skip AI, force freeze
})

interface RiskCheck {
  source: string
  riskScore: number // 0-100
  isBlacklisted: boolean
  details: string
}

interface RiskAnalysis {
  overallScore: number
  severity: number // 0=LOW, 1=HIGH, 2=CRITICAL
  shouldFreeze: boolean
  reasoning: string
  sources: RiskCheck[]
}

/**
 * HTTP Trigger Handler - Investigate and potentially freeze address
 */
const onHttpTrigger = (runtime: Runtime<any>, payload: HttpPayload): object => {
  runtime.log(`=== USDA Freezer - Address Risk Investigation ===`)
  
  try {
    const cfg = runtime.config
    const body = payload.body
    
    // Parse input
    let input: any
    try {
      input = JSON.parse(new TextDecoder().decode(body))
    } catch {
      throw new Error('Invalid JSON payload')
    }
    
    const parsed = payloadSchema.safeParse(input)
    if (!parsed.success) {
      throw new Error(`Invalid payload: ${parsed.error.message}`)
    }
    
    const targetAddress = parsed.data.address.toLowerCase()
    const context = parsed.data.reason || 'Manual investigation'
    const forceFreeze = parsed.data.forceFreeze
    
    runtime.log(`Target: ${targetAddress}`)
    runtime.log(`Context: ${context}`)
    runtime.log('')
    
    // Get network config
    const network = getNetwork({
      chainFamily: 'evm',
      chainSelectorName: 'ethereum-testnet-sepolia',
      isTestnet: true
    })
    if (!network) throw new Error('Network configuration failed')
    
    const evm = new cre.capabilities.EVMClient(network.chainSelector.selector)
    const http = new cre.capabilities.HTTPClient()
    
    // Step 1: Check multiple risk sources
    runtime.log('[1] Checking risk sources...')
    const riskSources: RiskCheck[] = []
    
    // Check ScamSniffer
    try {
      const scamCheck = checkScamSniffer(runtime, http, cfg.scamSnifferApiUrl, targetAddress)
      riskSources.push(scamCheck)
      runtime.log(`   🔍 ScamSniffer: ${scamCheck.riskScore}/100 ${scamCheck.isBlacklisted ? '⚠️ BLACKLISTED' : ''}`)
    } catch (e) {
      runtime.log(`   ⚠️ ScamSniffer check failed: ${(e as Error).message}`)
    }
    
    // Check Chainalysis
    try {
      const chainalysisCheck = checkChainalysis(runtime, http, cfg.chainalysisApiUrl, targetAddress)
      riskSources.push(chainalysisCheck)
      runtime.log(`   🔍 Chainalysis: ${chainalysisCheck.riskScore}/100 ${chainalysisCheck.isBlacklisted ? '⚠️ SANCTIONED' : ''}`)
    } catch (e) {
      runtime.log(`   ⚠️ Chainalysis check failed: ${(e as Error).message}`)
    }
    
    // Check Sentinel internal blacklist
    try {
      const sentinelCheck = checkSentinelBlacklist(runtime, http, cfg.sentinelApiUrl, targetAddress)
      riskSources.push(sentinelCheck)
      runtime.log(`   🔍 Sentinel DB: ${sentinelCheck.riskScore}/100 ${sentinelCheck.isBlacklisted ? '⚠️ BLACKLISTED' : ''}`)
    } catch (e) {
      runtime.log(`   ⚠️ Sentinel check failed: ${(e as Error).message}`)
    }
    
    if (riskSources.length === 0) {
      throw new Error('All risk checks failed - cannot determine risk')
    }
    
    // Step 2: Aggregate risk scores
    runtime.log('')
    runtime.log('[2] Aggregating risk analysis...')
    const avgRiskScore = riskSources.reduce((sum, r) => sum + r.riskScore, 0) / riskSources.length
    const anyBlacklisted = riskSources.some(r => r.isBlacklisted)
    
    runtime.log(`   📊 Average Risk Score: ${avgRiskScore.toFixed(1)}/100`)
    runtime.log(`   🚫 Blacklisted: ${anyBlacklisted ? 'YES' : 'NO'}`)
    
    // Step 3: AI Analysis (unless force freeze)
    let analysis: RiskAnalysis
    
    if (forceFreeze) {
      runtime.log('')
      runtime.log('[3] Force freeze enabled - skipping AI analysis')
      analysis = {
        overallScore: 100,
        severity: 2, // CRITICAL
        shouldFreeze: true,
        reasoning: 'Manual force freeze requested',
        sources: riskSources
      }
    } else if (anyBlacklisted || avgRiskScore >= 70) {
      // Auto-freeze if clearly dangerous
      runtime.log('')
      runtime.log('[3] High risk detected - auto-freezing')
      analysis = {
        overallScore: avgRiskScore,
        severity: anyBlacklisted ? 2 : 1,
        shouldFreeze: true,
        reasoning: anyBlacklisted 
          ? `Address found in blacklist (${riskSources.find(r => r.isBlacklisted)?.source})`
          : `High risk score: ${avgRiskScore.toFixed(1)}/100`,
        sources: riskSources
      }
    } else {
      // Use AI for borderline cases
      runtime.log('')
      runtime.log('[3] Analyzing with xAI Grok...')
      analysis = analyzeRiskWithAI(runtime, http, cfg.xaiApiKey, cfg.xaiModel, targetAddress, riskSources, context)
    }
    
    runtime.log(`   🤖 AI Recommendation: ${analysis.shouldFreeze ? 'FREEZE' : 'NO ACTION'}`)
    runtime.log(`   📈 Severity: ${analysis.severity === 2 ? 'CRITICAL' : analysis.severity === 1 ? 'HIGH' : 'LOW'}`)
    runtime.log(`   💭 Reasoning: ${analysis.reasoning}`)
    
    // Step 4: Generate DON-signed report if freezing
    if (!analysis.shouldFreeze) {
      runtime.log('')
      runtime.log('✅ No freeze required - address cleared')
      return {
        success: true,
        action: 'cleared',
        address: targetAddress,
        riskScore: analysis.overallScore,
        reasoning: analysis.reasoning,
        sources: riskSources.length
      }
    }
    
    runtime.log('')
    runtime.log('[4] Generating DON-signed freeze report...')
    
    const reportHash = runtime.keccak256(
      `FREEZE-${targetAddress}-${Date.now()}-${analysis.severity}`
    )
    
    // Encode report for USDAFreezer.writeReport():
    // (bytes32 reportHash, address target, uint8 severity, uint256 duration, address guardian, uint256 nonce, string reason)
    const guardianAddress = cfg.sepolia.registryAddress // Using registry as proxy for guardian
    const nonce = Date.now()
    
    const reportData = encodeAbiParameters(
      parseAbiParameters('bytes32 reportHash, address target, uint8 severity, uint256 duration, address guardian, uint256 nonce, string reason'),
      [
        reportHash as `0x${string}`,
        targetAddress as `0x${string}`,
        analysis.severity,
        BigInt(cfg.defaultFreezeDuration),
        guardianAddress as `0x${string}`,
        BigInt(nonce),
        analysis.reasoning
      ]
    )
    
    if (cfg.simulationMode) {
      runtime.log('   🔒 Simulation mode - skipping DON report generation')
      
      return {
        success: true,
        action: 'freeze',
        address: targetAddress,
        severity: analysis.severity,
        duration: cfg.defaultFreezeDuration,
        reasoning: analysis.reasoning,
        riskScore: analysis.overallScore,
        sources: riskSources.map(s => ({ source: s.source, score: s.riskScore, blacklisted: s.isBlacklisted })),
        reportHash: reportHash.slice(0, 20) + '...',
        simulation: true
      }
    }
    
    const report = runtime.report({
      encodedPayload: hexToBase64(reportData),
      encoderName: 'evm',
      signingAlgo: 'ecdsa',
      hashingAlgo: 'keccak256',
    }).result()
    
    runtime.log('   ✅ DON Report generated with ECDSA signature')
    
    // Step 5: Broadcast to USDAFreezer
    runtime.log('[5] Broadcasting to USDAFreezer...')
    
    const resp = evm.writeReport(runtime, {
      receiver: cfg.sepolia.freezerAddress,
      report,
      gasConfig: { gasLimit: '500000' },
    }).result()
    
    if (resp.txStatus !== TxStatus.SUCCESS) {
      throw new Error(`Freeze failed: ${resp.errorMessage || 'Unknown error'}`)
    }
    
    const txHash = resp.txHash ? bytesToHex(resp.txHash) : 'unknown'
    runtime.log(`   ✅ SUCCESS: Address frozen`)
    runtime.log(`   🔗 TxHash: ${txHash.slice(0, 30)}...`)
    
    return {
      success: true,
      txHash,
      action: 'freeze',
      address: targetAddress,
      severity: analysis.severity,
      duration: cfg.defaultFreezeDuration,
      reasoning: analysis.reasoning,
      riskScore: analysis.overallScore,
      sources: riskSources.map(s => ({ source: s.source, score: s.riskScore, blacklisted: s.isBlacklisted })),
      expiresAt: new Date(Date.now() + cfg.defaultFreezeDuration * 1000).toISOString()
    }
    
  } catch (e) {
    runtime.log(`\n❌ ERROR: ${(e as Error).message}`)
    return {
      success: false,
      error: (e as Error).message
    }
  }
}

/**
 * Check ScamSniffer database
 */
function checkScamSniffer(runtime: Runtime<any>, http: any, apiUrl: string, address: string): RiskCheck {
  try {
    const resp = http.sendRequest(runtime, {
      url: `${apiUrl}/${address}`,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }).result()
    
    const data = JSON.parse(new TextDecoder().decode(resp.body))
    
    return {
      source: 'ScamSniffer',
      riskScore: data.risk_score || 0,
      isBlacklisted: data.is_scam || false,
      details: data.details || 'No details'
    }
  } catch (e) {
    // If API fails, return unknown risk
    return {
      source: 'ScamSniffer',
      riskScore: 0,
      isBlacklisted: false,
      details: `API error: ${(e as Error).message}`
    }
  }
}

/**
 * Check Chainalysis sanctions
 */
function checkChainalysis(runtime: Runtime<any>, http: any, apiUrl: string, address: string): RiskCheck {
  try {
    const resp = http.sendRequest(runtime, {
      url: `${apiUrl}/${address}`,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }).result()
    
    const data = JSON.parse(new TextDecoder().decode(resp.body))
    
    const isSanctioned = data.sanctions || data.risk === 'high'
    
    return {
      source: 'Chainalysis',
      riskScore: isSanctioned ? 100 : (data.risk_score || 0),
      isBlacklisted: isSanctioned,
      details: data.sanctions_list || 'No sanctions'
    }
  } catch (e) {
    return {
      source: 'Chainalysis',
      riskScore: 0,
      isBlacklisted: false,
      details: `API error: ${(e as Error).message}`
    }
  }
}

/**
 * Check Sentinel internal blacklist
 */
function checkSentinelBlacklist(runtime: Runtime<any>, http: any, apiUrl: string, address: string): RiskCheck {
  try {
    const resp = http.sendRequest(runtime, {
      url: `${apiUrl}/${address}`,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }).result()
    
    const data = JSON.parse(new TextDecoder().decode(resp.body))
    
    return {
      source: 'Sentinel DB',
      riskScore: data.blacklisted ? 100 : 0,
      isBlacklisted: data.blacklisted || false,
      details: data.reason || 'Not in database'
    }
  } catch (e) {
    return {
      source: 'Sentinel DB',
      riskScore: 0,
      isBlacklisted: false,
      details: `API error: ${(e as Error).message}`
    }
  }
}

/**
 * Analyze risk with xAI Grok for borderline cases
 */
function analyzeRiskWithAI(
  runtime: Runtime<any>,
  http: any,
  apiKey: string,
  model: string,
  address: string,
  sources: RiskCheck[],
  context: string
): RiskAnalysis {
  try {
    const sourceSummary = sources.map(s => 
      `- ${s.source}: ${s.riskScore}/100 ${s.isBlacklisted ? '(BLACKLISTED)' : ''}`
    ).join('\n')
    
    const prompt = `You are a DeFi security AI. Analyze the risk of this Ethereum address.

ADDRESS: ${address}
CONTEXT: ${context}

RISK SOURCE DATA:
${sourceSummary}

Average Risk Score: ${sources.reduce((sum, s) => sum + s.riskScore, 0) / sources.length}/100

TASK: Determine if this address should be FROZEN (prevented from transferring USDA tokens).

GUIDELINES:
- Risk >= 70: FREEZE (HIGH severity)
- Risk >= 90: FREEZE (CRITICAL severity)
- Any blacklist match: FREEZE (CRITICAL severity)
- Risk < 50: NO ACTION
- Borderline (50-70): Use judgment based on context

Respond ONLY in JSON:
{
  "shouldFreeze": true/false,
  "severity": 0-2 (0=LOW, 1=HIGH, 2=CRITICAL),
  "reasoning": "brief explanation"
}`

    const resp = http.sendRequest(runtime, {
      url: 'https://api.x.ai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: new TextEncoder().encode(JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'You are a DeFi security AI. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 300
      }))
    }).result()
    
    const data = JSON.parse(new TextDecoder().decode(resp.body))
    const content = data.choices?.[0]?.message?.content || ''
    
    // Extract JSON
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonMatch = content.match(/\{[\s\S]*?\}/)
    
    let jsonText = ''
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim()
    } else if (jsonMatch) {
      jsonText = jsonMatch[0]
    } else {
      throw new Error('No JSON found in AI response')
    }
    
    const result = JSON.parse(jsonText)
    
    return {
      overallScore: sources.reduce((sum, s) => sum + s.riskScore, 0) / sources.length,
      severity: result.severity || 0,
      shouldFreeze: result.shouldFreeze || false,
      reasoning: result.reasoning || 'AI analysis completed',
      sources
    }
    
  } catch (e) {
    runtime.log(`   ⚠️  xAI error: ${(e as Error).message}. Using fallback.`)
    
    // Fallback: freeze if avg risk >= 70
    const avgScore = sources.reduce((sum, s) => sum + s.riskScore, 0) / sources.length
    const anyBlacklisted = sources.some(s => s.isBlacklisted)
    
    return {
      overallScore: avgScore,
      severity: anyBlacklisted ? 2 : (avgScore >= 70 ? 1 : 0),
      shouldFreeze: anyBlacklisted || avgScore >= 70,
      reasoning: anyBlacklisted ? 'Blacklisted in database' : `Risk score ${avgScore.toFixed(1)}/100`,
      sources
    }
  }
}

// HTTP Trigger
const init = (cfg: any) => [
  cre.handler(
    new cre.capabilities.HttpCapability().trigger({
      method: 'POST',
      path: '/freeze',
    }),
    onHttpTrigger
  )
]

export async function main() {
  const runner = await Runner.newRunner({ configSchema })
  await runner.run(init)
}

main()
