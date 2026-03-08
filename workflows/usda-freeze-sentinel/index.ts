import { bytesToHex, cre, getNetwork, type Runtime, type EVMLog, TxStatus, Runner, hexToBase64, ConfidentialHTTPClient } from '@chainlink/cre-sdk'
import { encodeAbiParameters, parseAbiParameters, keccak256, toBytes, getAddress, hexToBigInt } from 'viem'
import { z } from 'zod'

const configSchema = z.object({
  sepolia: z.object({
    usdaToken: z.string(),
    freezerAddress: z.string(),
    guardianAddress: z.string(),
  }),
  goplusApiKey: z.string().optional(),
  xaiApiKey: z.string(),
  xaiModel: z.string().default('grok-4-1-fast-reasoning'),
})

// Transfer event signature: Transfer(address indexed from, address indexed to, uint256 value)
const TRANSFER_EVENT_SIG = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

// Risk thresholds
const RISK_THRESHOLDS = {
  phishing: 1,
  blacklistDoubt: 1,
  sanctioned: 1,
  stealingAttack: 1,
  maliciousMining: 1,
  mixer: 1,
  fakeToken: 1,
  honeypot: 1,
}

interface SecurityCheck {
  address: string
  goplus: {
    phishing: boolean
    blacklistDoubt: boolean
    sanctioned: boolean
    stealingAttack: boolean
    maliciousMining: boolean
    mixer: boolean
    fakeToken: boolean
    honeypot: boolean
    cybercrime: boolean
    moneyLaundering: boolean
    financialCrime: boolean
    dataSource: string
  } | null
  scamSniffer: {
    isBlacklisted: boolean
    listSize: number
  }
  sentinelSanctions: {
    isSanctioned: boolean
    source: string
    entities: string[]
  }
  riskScore: number
  riskFactors: string[]
}

// Decode Transfer event from EVM log
const decodeTransfer = (log: EVMLog): { from: string; to: string; value: bigint } => {
  const from = getAddress(bytesToHex(log.topics[1].slice(12)))
  const to = getAddress(bytesToHex(log.topics[2].slice(12)))
  const value = hexToBigInt(bytesToHex(log.data))
  return { from, to, value }
}

const onLogTrigger = async (runtime: Runtime<any>, log: EVMLog): Promise<object> => {
  runtime.log('=== USDA Freeze Sentinel (Transfer → Scam Check → AI Decision) ===')
  
  try {
    const cfg = runtime.config
    const { from, to, value } = decodeTransfer(log)
    
    runtime.log(`Transfer detected:`)
    runtime.log(`  From: ${from}`)
    runtime.log(`  To: ${to}`)
    runtime.log(`  Value: ${value.toString()} USDA`)
    
    // Skip if transfer is from zero address (mint) or to zero address (burn)
    if (from === '0x0000000000000000000000000000000000000000' || 
        to === '0x0000000000000000000000000000000000000000') {
      runtime.log('Skipping mint/burn transaction')
      return { success: true, skipped: true, reason: 'mint_or_burn' }
    }
    
    const network = getNetwork({ chainFamily: 'evm', chainSelectorName: 'ethereum-testnet-sepolia', isTestnet: true })
    if (!network) throw new Error('No network')
    
    const evm = new cre.capabilities.EVMClient(network.chainSelector.selector)
    const http = new cre.capabilities.HTTPClient()
    const confHttp = new ConfidentialHTTPClient()
    
    // Step 1: Check GoPlusLabs API
    runtime.log('[1] Checking GoPlusLabs security API...')
    const securityCheck: SecurityCheck = {
      address: to,
      goplus: null,
      scamSniffer: { isBlacklisted: false, listSize: 0 },
      sentinelSanctions: { isSanctioned: false, source: '', entities: [] },
      riskScore: 0,
      riskFactors: []
    }
    
    // Step 1: Check GoPlusLabs API (REAL API CALL)
    runtime.log('[1] Checking GoPlusLabs security API...')
    try {
      const goplusUrl = `https://api.gopluslabs.io/api/v1/address_security/${to.toLowerCase()}`
      const goplusResp = http.sendRequest(runtime, {
        url: goplusUrl,
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      }).result()
      
      const goplusData = JSON.parse(new TextDecoder().decode(goplusResp.body))
      
      if (goplusData.code === 1 && goplusData.result) {
        const r = goplusData.result
        securityCheck.goplus = {
          phishing: r.phishing_activities === '1',
          blacklistDoubt: r.blacklist_doubt === '1',
          sanctioned: r.sanctioned === '1',
          stealingAttack: r.stealing_attack === '1',
          maliciousMining: r.malicious_mining_activities === '1',
          mixer: r.mixer === '1',
          fakeToken: r.fake_token === '1',
          honeypot: r.honeypot_related_address === '1',
          cybercrime: r.cybercrime === '1',
          moneyLaundering: r.money_laundering === '1',
          financialCrime: r.financial_crime === '1',
          dataSource: r.data_source || 'Unknown'
        }
        
        // Calculate risk score
        if (securityCheck.goplus.phishing) {
          securityCheck.riskScore += 30
          securityCheck.riskFactors.push('Phishing activities detected')
        }
        if (securityCheck.goplus.blacklistDoubt) {
          securityCheck.riskScore += 25
          securityCheck.riskFactors.push('Blacklist doubt')
        }
        if (securityCheck.goplus.sanctioned) {
          securityCheck.riskScore += 50
          securityCheck.riskFactors.push('Sanctioned address')
        }
        if (securityCheck.goplus.stealingAttack) {
          securityCheck.riskScore += 40
          securityCheck.riskFactors.push('Stealing attack history')
        }
        if (securityCheck.goplus.mixer) {
          securityCheck.riskScore += 20
          securityCheck.riskFactors.push('Mixer usage')
        }
        if (securityCheck.goplus.honeypot) {
          securityCheck.riskScore += 35
          securityCheck.riskFactors.push('Honeypot related')
        }
        
        runtime.log(`  ✅ GoPlus: Risk score ${securityCheck.riskScore}`)
        runtime.log(`  Data sources: ${securityCheck.goplus.dataSource}`)
      } else {
        runtime.log('  ⚠️ GoPlus: No data or error')
      }
    } catch (e) {
      runtime.log(`  ⚠️ GoPlus API error: ${(e as Error).message}`)
    }
    
    // Step 2: Check ScamSniffer GitHub blacklist (REAL API CALL)
    runtime.log('[2] Checking ScamSniffer blacklist...')
    try {
      const scamResp = http.sendRequest(runtime, {
        url: 'https://raw.githubusercontent.com/scamsniffer/scam-database/main/blacklist/address.json',
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      }).result()
      
      const blacklist = JSON.parse(new TextDecoder().decode(scamResp.body))
      securityCheck.scamSniffer.listSize = blacklist.length
      
      const toLower = to.toLowerCase()
      securityCheck.scamSniffer.isBlacklisted = blacklist.some((addr: string) => 
        addr.toLowerCase() === toLower
      )
      
      if (securityCheck.scamSniffer.isBlacklisted) {
        securityCheck.riskScore += 45
        securityCheck.riskFactors.push('Listed in ScamSniffer database')
        runtime.log(`  🚨 SCAM DETECTED in ScamSniffer (${blacklist.length} addresses checked)`)
      } else {
        runtime.log(`  ✅ Clean (${blacklist.length.toLocaleString()} addresses checked)`)
      }
    } catch (e) {
      runtime.log(`  ⚠️ ScamSniffer check failed: ${(e as Error).message}`)
    }

    // Step 3: Check Sentinel Sanctions database (REAL API CALL)
    runtime.log('[3] Checking Sentinel Sanctions database...')
    try {
      const sanctionsResp = http.sendRequest(runtime, {
        url: 'https://raw.githubusercontent.com/0xfdbu/sanctions-data/main/data.json',
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      }).result()
      
      const sanctionsData = JSON.parse(new TextDecoder().decode(sanctionsResp.body))
      const toLower = to.toLowerCase()
      
      // Parse sanctions data - it's an array of { address, description } objects
      const matchedEntities: string[] = []
      
      // sanctionsData is array format: [{ address: "0x...", description: "ENTITY - ..." }, ...]
      for (const entry of sanctionsData) {
        if (entry.address && entry.address.toLowerCase() === toLower) {
          // Extract entity name from description (e.g., "LAZARUS GROUP - ...")
          const entityName = entry.description.split(' - ')[0] || 'Unknown Entity'
          matchedEntities.push(entityName)
        }
      }
      
      securityCheck.sentinelSanctions.isSanctioned = matchedEntities.length > 0
      securityCheck.sentinelSanctions.entities = matchedEntities
      securityCheck.sentinelSanctions.source = 'Sentinel Sanctions Database'
      
      if (securityCheck.sentinelSanctions.isSanctioned) {
        securityCheck.riskScore += 60  // Higher penalty for sanctions
        securityCheck.riskFactors.push(`Sanctioned entity: ${matchedEntities.join(', ')}`)
        runtime.log(`  🚨 SANCTIONED: ${matchedEntities.join(', ')}`)
      } else {
        runtime.log(`  ✅ Not in sanctions database`)
      }
    } catch (e) {
      runtime.log(`  ⚠️ Sanctions check failed: ${(e as Error).message}`)
    }
    
    runtime.log(`\n📊 Total Risk Score: ${securityCheck.riskScore}/100`)
    securityCheck.riskFactors.forEach(f => runtime.log(`  - ${f}`))
    
    // Step 4: If low risk, skip further processing
    if (securityCheck.riskScore < 20) {
      runtime.log('\n✅ Low risk, skipping AI review')
      return {
        success: true,
        skipped: true,
        reason: 'low_risk',
        riskScore: securityCheck.riskScore,
        to
      }
    }
    
    // Step 5: Send to xAI for final decision
    runtime.log('\n[4] High risk detected - Sending to xAI for review...')
    
    const aiDecision = await performAIReview(runtime, http, confHttp, cfg, {
      transfer: { from, to, value: value.toString() },
      securityCheck,
      timestamp: Date.now()
    })
    
    runtime.log(`\n🤖 AI Decision:`)
    runtime.log(`  Action: ${aiDecision.action.toUpperCase()}`)
    runtime.log(`  Confidence: ${(aiDecision.confidence * 100).toFixed(1)}%`)
    runtime.log(`  Reasoning: ${aiDecision.reasoning}`)
    
    // Step 6: Execute freeze if AI approves
    if (aiDecision.action === 'freeze') {
      runtime.log('\n[4] Executing freeze via CRE DON...')
      
      const reportHash = keccak256(toBytes(`freeze-${to}-${Date.now()}`))
      const reason = `AI Security Review: ${aiDecision.reasoning}. Risk factors: ${securityCheck.riskFactors.join(', ')}`
      
      // SimpleFreezer expects: (bytes32 reportHash, address target, string reason)
      const reportData = encodeAbiParameters(
        parseAbiParameters('bytes32 reportHash, address target, string reason'),
        [reportHash, getAddress(to), reason]
      )
      
      const report = runtime.report({
        encodedPayload: hexToBase64(reportData),
        encoderName: 'evm',
        signingAlgo: 'ecdsa',
        hashingAlgo: 'keccak256',
      }).result()
      
      const resp = evm.writeReport(runtime, {
        receiver: cfg.sepolia.freezerAddress,
        report,
        gasConfig: { 
          gasLimit: '500000',
          gasPrice: '25000000000' // 25 gwei
        },
      }).result()
      
      if (resp.txStatus !== TxStatus.SUCCESS) {
        throw new Error(`Freeze failed: ${resp.errorMessage || 'Unknown error'}`)
      }
      
      const txHash = resp.txHash ? bytesToHex(resp.txHash) : 'unknown'
      runtime.log(`✅ FREEZE EXECUTED: ${txHash}`)
      
      return {
        success: true,
        action: 'freeze',
        txHash,
        target: to,
        riskScore: securityCheck.riskScore,
        aiConfidence: aiDecision.confidence,
        reason: aiDecision.reasoning,
        riskFactors: securityCheck.riskFactors
      }
    } else {
      runtime.log('\n⏸️ AI decided not to freeze')
      return {
        success: true,
        action: 'no_action',
        target: to,
        riskScore: securityCheck.riskScore,
        aiConfidence: aiDecision.confidence,
        reason: aiDecision.reasoning
      }
    }
    
  } catch (e) {
    runtime.log(`❌ Error: ${(e as Error).message}`)
    return { success: false, error: (e as Error).message }
  }
}

interface AIReviewResult {
  action: 'freeze' | 'monitor' | 'no_action'
  confidence: number
  reasoning: string
}

async function performAIReview(
  runtime: Runtime<any>,
  http: any,
  confHttp: ConfidentialHTTPClient,
  cfg: any,
  data: {
    transfer: { from: string; to: string; value: string }
    securityCheck: SecurityCheck
    timestamp: number
  }
): Promise<AIReviewResult> {
  const prompt = `You are a blockchain security AI for a DeFi stablecoin (USDA) protocol.

YOUR TASK: Review a token transfer recipient and decide if the address should be FROZEN.

TRANSFER DETAILS:
- From: ${data.transfer.from}
- To: ${data.transfer.to}
- Amount: ${data.transfer.value} USDA

SECURITY ANALYSIS:
- Risk Score: ${data.securityCheck.riskScore}/100
- GoPlus Data Sources: ${data.securityCheck.goplus?.dataSource || 'None'}
- ScamSniffer Blacklisted: ${data.securityCheck.scamSniffer.isBlacklisted ? 'YES' : 'No'}
- Sentinel Sanctions: ${data.securityCheck.sentinelSanctions.isSanctioned ? 'YES - ' + data.securityCheck.sentinelSanctions.entities.join(', ') : 'No'}

RISK FACTORS DETECTED:
${data.securityCheck.riskFactors.map(f => `- ${f}`).join('\n') || '- None'}

GOPLE DETAILS:
${data.securityCheck.goplus ? `
- Phishing: ${data.securityCheck.goplus.phishing ? 'YES' : 'No'}
- Blacklist Doubt: ${data.securityCheck.goplus.blacklistDoubt ? 'YES' : 'No'}
- Sanctioned: ${data.securityCheck.goplus.sanctioned ? 'YES' : 'No'}
- Stealing Attack: ${data.securityCheck.goplus.stealingAttack ? 'YES' : 'No'}
- Mixer: ${data.securityCheck.goplus.mixer ? 'YES' : 'No'}
- Honeypot Related: ${data.securityCheck.goplus.honeypot ? 'YES' : 'No'}
- Financial Crime: ${data.securityCheck.goplus.financialCrime ? 'YES' : 'No'}
- Money Laundering: ${data.securityCheck.goplus.moneyLaundering ? 'YES' : 'No'}
` : '- No GoPlus data available'}

DECISION GUIDELINES:
- FREEZE if: Risk score > 50, sanctioned, or confirmed scam
- MONITOR if: Risk score 20-50, some suspicious activity but not confirmed
- NO_ACTION if: Risk score < 20, likely false positive

Respond ONLY in JSON:
{
  "action": "freeze|monitor|no_action",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of decision"
}

Be conservative - freezing prevents transfers and should only be done with high confidence.`

  // Call xAI API for real decision (REAL API CALL)
  runtime.log('  → Calling xAI Grok for risk assessment...')
  try {
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
          { role: 'system', content: 'You are a blockchain security AI. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 300
      }))
    }).result()
    
    const responseData = JSON.parse(new TextDecoder().decode(resp.body))
    const content = responseData.choices?.[0]?.message?.content || ''
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*?\}/)
    if (jsonMatch) {
      const decision = JSON.parse(jsonMatch[0])
      runtime.log(`  ✅ xAI decision: ${decision.action}`)
      return {
        action: decision.action || 'no_action',
        confidence: decision.confidence || 0.5,
        reasoning: decision.reasoning || 'No reasoning provided'
      }
    }
  } catch (e) {
    runtime.log(`  ⚠️ xAI API error: ${(e as Error).message}`)
  }
  
  // If xAI fails, use risk score based decision (not mock - based on real data collected)
  runtime.log('  → Using risk-score based decision (xAI unavailable)')
  if (data.securityCheck.riskScore >= 50) {
    return {
      action: 'freeze',
      confidence: 0.8,
      reasoning: `High risk score (${data.securityCheck.riskScore}/100) from security APIs`
    }
  } else if (data.securityCheck.riskScore >= 30) {
    return {
      action: 'monitor',
      confidence: 0.6,
      reasoning: `Medium risk score (${data.securityCheck.riskScore}/100)`
    }
  } else {
    return {
      action: 'no_action',
      confidence: 0.7,
      reasoning: 'Low risk score from security checks'
    }
  }
}

// EVM Log Trigger - Listen for USDA Transfer events
const init = (cfg: any) => {
  const network = getNetwork({ chainFamily: 'evm', chainSelectorName: 'ethereum-testnet-sepolia', isTestnet: true })
  if (!network) throw new Error('No network')
  
  const evm = new cre.capabilities.EVMClient(network.chainSelector.selector)
  
  return [
    cre.handler(
      evm.logTrigger({
        addresses: [hexToBase64(cfg.sepolia.usdaToken)],
        topics: [{ values: [hexToBase64(TRANSFER_EVENT_SIG)] }],
        confidence: 'CONFIDENCE_LEVEL_FINALIZED',
      }),
      onLogTrigger
    ),
  ]
}

export async function main() { 
  const runner = await Runner.newRunner({ configSchema }) 
  await runner.run(init) 
}
main()
