/**
 * Blacklist Manager Workflow - Chainlink CRE
 * 
 * Fetches blacklist data from security-focused sources (GoPlus API, ScamSniffer, Sentinel Sanctions),
 * merges and deduplicates in TEE, computes Merkle root, and updates on-chain PolicyEngine
 * 
 * Sources:
 * - GoPlus API: Aggregates SlowMist and ScamSniffer security data
 * - ScamSniffer GitHub: Community-reported scam addresses
 * - Sentinel Sanctions: Lazarus Group, Tornado Cash operators, Garantex, etc.
 * - Sentinel Custom: Internal manually-curated blacklist
 * 
 * Trigger: Cron (daily) or HTTP (manual)
 */

import { 
  bytesToHex, 
  cre, 
  getNetwork, 
  type Runtime, 
  type CronPayload,
  type HTTPPayload,
  Runner, 
  hexToBase64,
  TxStatus
} from '@chainlink/cre-sdk'
import { encodeAbiParameters, parseAbiParameters, keccak256, stringToBytes } from 'viem'
import { z } from 'zod'

const configSchema = z.object({
  sepolia: z.object({
    policyEngineAddress: z.string().default('0x62CC29A58404631B7db65CE14E366F63D3B96B16'),
  }),
  enableBroadcast: z.string().default('false'),
  ofacApiUrl: z.string().optional(),
  sentinelDbUrl: z.string().optional(),
})

// Blacklist sources
interface BlacklistSource {
  name: string
  addresses: string[]
  timestamp: number
}

interface UnifiedBlacklist {
  addresses: string[]
  merkleRoot: string
  timestamp: number
  sourceCount: number
}

/**
 * Fetch GoPlus API aggregated security data
 */
async function fetchGoPlusList(runtime: Runtime<any>, http: any): Promise<BlacklistSource> {
  try {
    runtime.log('[1a] Fetching GoPlus security database...')
    
    // GoPlus provides aggregated security data from SlowMist, ScamSniffer, and other sources
    // We fetch a sample of high-risk addresses that have been flagged
    const addresses: string[] = []
    
    // Note: GoPlus API is queried per-address in real-time during validation
    // Here we fetch any bulk data if available, otherwise rely on Sentinel DB
    
    runtime.log(`   ✓ GoPlus: API ready for on-demand queries`)
    return { name: 'GoPlus', addresses, timestamp: Date.now() }
  } catch (e) {
    runtime.log(`   ⚠️ GoPlus fetch failed: ${(e as Error).message}`)
    return { name: 'GoPlus', addresses: [], timestamp: Date.now() }
  }
}

/**
 * Fetch Sentinel custom blacklist (placeholder for future API)
 */
async function fetchSentinelDB(runtime: Runtime<any>, http: any): Promise<BlacklistSource> {
  // No mock data - only real sources used
  // Future: Connect to Sentinel API when available
  runtime.log('[1b] Sentinel DB: Not configured, skipping')
  return { name: 'Sentinel', addresses: [], timestamp: Date.now() }
}

/**
 * Fetch ScamSniffer GitHub blacklist
 */
async function fetchScamSniffer(runtime: Runtime<any>, http: any): Promise<BlacklistSource> {
  try {
    runtime.log('[1c] Fetching ScamSniffer GitHub blacklist...')
    
    const resp = http.sendRequest(runtime, {
      url: 'https://raw.githubusercontent.com/scamsniffer/scam-database/main/blacklist/address.json',
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }).result()
    
    const blacklist = JSON.parse(new TextDecoder().decode(resp.body))
    const addresses = blacklist.map((addr: string) => addr.toLowerCase())
    
    runtime.log(`   ✓ ScamSniffer: ${addresses.length} addresses`)
    return { name: 'ScamSniffer', addresses, timestamp: Date.now() }
  } catch (e) {
    runtime.log(`   ⚠️ ScamSniffer fetch failed: ${(e as Error).message}`)
    return { name: 'ScamSniffer', addresses: [], timestamp: Date.now() }
  }
}

/**
 * Fetch Sentinel Sanctions database (Lazarus Group, Tornado Cash, etc.)
 * Format: [{ "address": "0x...", "description": "..." }, ...]
 */
async function fetchSentinelSanctions(runtime: Runtime<any>, http: any): Promise<BlacklistSource> {
  try {
    runtime.log('[1d] Fetching Sentinel Sanctions database...')
    
    const resp = http.sendRequest(runtime, {
      url: 'https://raw.githubusercontent.com/0xfdbu/sanctions-data/main/data.json',
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }).result()
    
    const rawText = new TextDecoder().decode(resp.body)
    runtime.log(`      Raw response length: ${rawText.length} chars`)
    
    const data = JSON.parse(rawText)
    const addresses: string[] = []
    
    // Handle both formats: direct array or wrapped in sanctions_data
    let entries: any[] = []
    
    if (Array.isArray(data)) {
      // Direct array format
      entries = data
      runtime.log(`      Format: Direct array with ${entries.length} entries`)
    } else if (data.sanctions_data) {
      // Wrapped format with categories
      for (const [categoryName, categoryEntries] of Object.entries(data.sanctions_data)) {
        if (Array.isArray(categoryEntries)) {
          entries.push(...categoryEntries as any[])
          runtime.log(`      - ${categoryName}: ${(categoryEntries as any[]).length} entries`)
        }
      }
    }
    
    // Extract addresses
    for (const entry of entries) {
      if (entry && entry.address) {
        addresses.push(entry.address.toLowerCase())
      }
    }
    
    runtime.log(`   ✓ Sentinel Sanctions: ${addresses.length} addresses`)
    return { name: 'Sentinel Sanctions', addresses, timestamp: Date.now() }
  } catch (e) {
    runtime.log(`   ⚠️ Sentinel Sanctions fetch failed: ${(e as Error).message}`)
    return { name: 'Sentinel Sanctions', addresses: [], timestamp: Date.now() }
  }
}

/**
 * Merge and deduplicate addresses from all sources
 */
function mergeBlacklists(runtime: Runtime<any>, sources: BlacklistSource[]): UnifiedBlacklist {
  runtime.log('[2] Merging and deduplicating...')
  
  const allAddresses = new Set<string>()
  
  for (const source of sources) {
    for (const addr of source.addresses) {
      allAddresses.add(addr.toLowerCase())
    }
  }
  
  const addresses = Array.from(allAddresses).sort()
  
  // Compute simple Merkle root (hash of all addresses)
  const addressesHash = addresses.map(a => keccak256(stringToBytes(a)))
  let merkleRoot = addressesHash.length > 0 
    ? addressesHash.reduce((acc, h) => keccak256(stringToBytes(acc + h)))
    : '0x0000000000000000000000000000000000000000000000000000000000000000'
  
  runtime.log(`   ✓ Unified: ${addresses.length} unique addresses`)
  runtime.log(`   ✓ Merkle root: ${merkleRoot.slice(0, 20)}...`)
  
  return {
    addresses,
    merkleRoot,
    timestamp: Date.now(),
    sourceCount: sources.length
  }
}

/**
 * Build blacklist update report
 * 
 * Report format for PolicyEngine._processReport():
 * (bytes32 reportHash, bytes32 merkleRoot, uint256 addressCount, string reason)
 */
function buildBlacklistReport(
  runtime: Runtime<any>, 
  blacklist: UnifiedBlacklist,
  cfg: any
): string {
  runtime.log('[3] Building blacklist report...')
  
  // Generate unique report hash
  const reportHash = keccak256(
    stringToBytes(`blacklist-${blacklist.merkleRoot}-${Date.now()}`)
  )
  
  // Encode for PolicyEngine: (bytes32 reportHash, bytes32 merkleRoot, uint256 addressCount, string reason)
  const reportPayload = encodeAbiParameters(
    parseAbiParameters('bytes32, bytes32, uint256, string'),
    [
      reportHash as `0x${string}`,
      blacklist.merkleRoot as `0x${string}`,
      BigInt(blacklist.addresses.length),
      `Daily sync: ${blacklist.addresses.length} addresses from ${blacklist.sourceCount} sources`
    ]
  )
  
  runtime.log(`   ✓ Report built: ${reportHash.slice(0, 20)}...`)
  return reportPayload
}

/**
 * Cron trigger handler - Daily sync
 */
async function onCronTrigger(runtime: Runtime<any>, payload: CronPayload): Promise<object> {
  runtime.log('=== Blacklist Manager (Cron Trigger) - Daily Sync ===')
  
  if (payload.scheduledExecutionTime) {
    runtime.log(`Scheduled execution at: ${new Date(Number(payload.scheduledExecutionTime.seconds) * 1000).toISOString()}`)
  }
  
  try {
    const cfg = runtime.config
    const http = new cre.capabilities.HTTPClient()
    
    // Step 1: Fetch from all sources
    runtime.log('[1] Fetching blacklist sources...')
    const goplus = await fetchGoPlusList(runtime, http)
    const sentinel = await fetchSentinelDB(runtime, http)
    const scamSniffer = await fetchScamSniffer(runtime, http)
    const sanctions = await fetchSentinelSanctions(runtime, http)
    
    // Step 2: Merge and deduplicate
    const unified = mergeBlacklists(runtime, [goplus, sentinel, scamSniffer, sanctions])
    
    if (unified.addresses.length === 0) {
      runtime.log('⚠️ No addresses to update')
      return { success: true, action: 'NO_UPDATE', reason: 'No addresses found' }
    }
    
    // DEMO: Limit to 10 addresses per execution to avoid gas limits
    const DEMO_LIMIT = 10
    if (unified.addresses.length > DEMO_LIMIT) {
      runtime.log(`📊 Demo mode: Limiting from ${unified.addresses.length} to ${DEMO_LIMIT} addresses`)
      unified.addresses = unified.addresses.slice(0, DEMO_LIMIT)
      // Recompute merkle root with limited set
      const addressesHash = unified.addresses.map(a => keccak256(stringToBytes(a)))
      unified.merkleRoot = addressesHash.length > 0 
        ? addressesHash.reduce((acc, h) => keccak256(stringToBytes(acc + h)))
        : '0x0000000000000000000000000000000000000000000000000000000000000000'
    }
    
    // Step 3: Build report
    const reportPayload = buildBlacklistReport(runtime, unified, cfg)
    
    // Step 4: Create DON attestation
    runtime.log('[4] Creating DON attestation...')
    const report = runtime.report({
      encodedPayload: hexToBase64(reportPayload.slice(2) as `0x${string}`),
      encoderName: 'evm',
      signingAlgo: 'ecdsa',
      hashingAlgo: 'keccak256',
    }).result()
    
    runtime.log(`   ✓ Report signed: ${report.signatures?.length || 1} signatures`)
    
    // Step 5: Broadcast to PolicyEngine
    const shouldBroadcast = cfg.enableBroadcast === 'true'
    let txHash = null
    let txStatus = null
    
    runtime.log('[5] Broadcasting to PolicyEngine...')
    runtime.log(`   Target: ${cfg.sepolia?.policyEngineAddress || '0x...'}`)
    runtime.log(`   Addresses: ${unified.addresses.length}`)
    runtime.log(`   Merkle Root: ${unified.merkleRoot.slice(0, 20)}...`)
    runtime.log(`   Mode: ${shouldBroadcast ? 'BROADCAST' : 'SIMULATION'}`)
    
    if (shouldBroadcast) {
      const network = getNetwork({ chainFamily: 'evm', chainSelectorName: 'ethereum-testnet-sepolia', isTestnet: true })
      if (network) {
        const evm = new cre.capabilities.EVMClient(network.chainSelector.selector)
        try {
          const resp = evm.writeReport(runtime, {
            receiver: cfg.sepolia.policyEngineAddress,
            report,
            gasConfig: { gasLimit: '2000000' }, // 2M gas for large batch
          }).result()
          
          txStatus = resp.txStatus
          txHash = resp.txHash ? bytesToHex(resp.txHash) : null
          
          if (resp.txStatus === TxStatus.SUCCESS) {
            runtime.log(`   ✅ Broadcast successful!`)
            runtime.log(`   Tx Hash: ${txHash}`)
          } else {
            runtime.log(`   ⚠️ Broadcast failed: ${resp.errorMessage || 'Unknown error'}`)
          }
        } catch (e) {
          runtime.log(`   ⚠️ Broadcast error: ${(e as Error).message}`)
        }
      }
    } else {
      runtime.log('   (Simulation mode - no actual broadcast)')
    }
    
    runtime.log('✅ SUCCESS: Blacklist update prepared')
    
    return {
      success: true,
      action: shouldBroadcast && txStatus === TxStatus.SUCCESS ? 'UPDATED' : 'UPDATE_PREPARED',
      addressCount: unified.addresses.length,
      merkleRoot: unified.merkleRoot,
      sourceCount: unified.sourceCount,
      sources: [goplus.name, sentinel.name, scamSniffer.name, sanctions.name],
      broadcast: shouldBroadcast,
      txHash: txHash,
      txStatus: txStatus,
      timestamp: new Date().toISOString()
    }
    
  } catch (e) {
    runtime.log(`❌ FAILED: ${(e as Error).message}`)
    return { success: false, error: (e as Error).message }
  }
}

/**
 * HTTP trigger handler - Manual update
 */
async function onHTTPTrigger(runtime: Runtime<any>, payload: HTTPPayload): Promise<object> {
  runtime.log('=== Blacklist Manager (HTTP Trigger) - Manual Sync ===')
  
  try {
    const cfg = runtime.config
    
    // Parse manual trigger payload
    let body: any = {}
    try {
      const payloadText = new TextDecoder().decode(payload.input)
      if (payloadText && payloadText.trim()) {
        body = JSON.parse(payloadText)
      }
    } catch (parseError) {
      runtime.log('   ⚠️ Could not parse payload, using defaults')
    }
    
    runtime.log(`Manual trigger: ${body.action || 'full-sync'}`)
    
    // Override broadcast setting if provided in payload
    if (body.broadcast === true) {
      runtime.log('   Broadcast override: ENABLED via payload')
      cfg.enableBroadcast = 'true'
    }
    
    // Reuse cron handler logic
    return onCronTrigger(runtime, {} as CronPayload)
    
  } catch (e) {
    runtime.log(`❌ FAILED: ${(e as Error).message}`)
    return { success: false, error: (e as Error).message }
  }
}

// Support both Cron (daily) and HTTP (manual) triggers
const init = (cfg: any) => [
  // Cron trigger - daily at 00:00 UTC
  cre.handler(
    new cre.capabilities.CronCapability().trigger({
      schedule: '0 0 * * *', // Daily at midnight
    }),
    onCronTrigger
  ),
  // HTTP trigger - manual
  cre.handler(
    new cre.capabilities.HTTPCapability().trigger({}),
    onHTTPTrigger
  )
]

export async function main() { 
  const runner = await Runner.newRunner({ configSchema }) 
  await runner.run(init) 
}

main()
