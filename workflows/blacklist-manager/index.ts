/**
 * Blacklist Manager Workflow - Chainlink CRE
 * 
 * Fetches blacklist data from multiple sources (OFAC, custom DB, Chainalysis),
 * merges and deduplicates in TEE, computes Merkle root, and updates on-chain PolicyEngine
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
  hexToBase64 
} from '@chainlink/cre-sdk'
import { encodeAbiParameters, parseAbiParameters, keccak256, stringToBytes } from 'viem'
import { z } from 'zod'

const configSchema = z.object({
  sepolia: z.object({
    policyEngineAddress: z.string(),
  }),
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
 * Fetch OFAC sanctions list
 */
async function fetchOFACList(runtime: Runtime<any>, http: any): Promise<BlacklistSource> {
  try {
    runtime.log('[1a] Fetching OFAC sanctions list...')
    
    // In production, this would fetch from api.treasury.gov
    // For simulation, we'll use a mock
    const resp = http.sendRequest(runtime, {
      url: 'https://www.treasury.gov/ofac/downloads/sdn.csv',
      method: 'GET',
      headers: { 'Accept': 'text/csv' }
    }).result()
    
    // Parse CSV and extract crypto addresses
    const csvData = new TextDecoder().decode(resp.body)
    const addresses: string[] = []
    
    // Simple CSV parsing - extract Ethereum addresses
    const lines = csvData.split('\n')
    for (const line of lines.slice(1)) {
      const match = line.match(/0x[a-fA-F0-9]{40}/)
      if (match) {
        addresses.push(match[0].toLowerCase())
      }
    }
    
    runtime.log(`   ✓ OFAC: ${addresses.length} addresses`)
    return { name: 'OFAC', addresses, timestamp: Date.now() }
  } catch (e) {
    runtime.log(`   ⚠️ OFAC fetch failed: ${(e as Error).message}`)
    return { name: 'OFAC', addresses: [], timestamp: Date.now() }
  }
}

/**
 * Fetch Sentinel custom blacklist
 */
async function fetchSentinelDB(runtime: Runtime<any>, http: any): Promise<BlacklistSource> {
  try {
    runtime.log('[1b] Fetching Sentinel custom blacklist...')
    
    // Mock data for simulation
    const mockAddresses = [
      '0x1234567890123456789012345678901234567890',
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    ]
    
    runtime.log(`   ✓ Sentinel DB: ${mockAddresses.length} addresses`)
    return { name: 'Sentinel', addresses: mockAddresses, timestamp: Date.now() }
  } catch (e) {
    runtime.log(`   ⚠️ Sentinel DB fetch failed: ${(e as Error).message}`)
    return { name: 'Sentinel', addresses: [], timestamp: Date.now() }
  }
}

/**
 * Fetch Chainalysis data
 */
async function fetchChainalysis(runtime: Runtime<any>, http: any): Promise<BlacklistSource> {
  try {
    runtime.log('[1c] Fetching Chainalysis data...')
    
    // Mock data for simulation
    const mockAddresses: string[] = []
    
    runtime.log(`   ✓ Chainalysis: ${mockAddresses.length} addresses`)
    return { name: 'Chainalysis', addresses: mockAddresses, timestamp: Date.now() }
  } catch (e) {
    runtime.log(`   ⚠️ Chainalysis fetch failed: ${(e as Error).message}`)
    return { name: 'Chainalysis', addresses: [], timestamp: Date.now() }
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
 */
function buildBlacklistReport(
  runtime: Runtime<any>, 
  blacklist: UnifiedBlacklist,
  cfg: any
): string {
  runtime.log('[3] Building blacklist report...')
  
  // Encode for PolicyEngine: (bytes32 merkleRoot, uint256 count, address[] addresses)
  const reportPayload = encodeAbiParameters(
    parseAbiParameters('bytes32, uint256, address[]'),
    [
      blacklist.merkleRoot as `0x${string}`,
      BigInt(blacklist.addresses.length),
      blacklist.addresses as `0x${string}`[]
    ]
  )
  
  runtime.log('   ✓ Report built')
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
    const ofac = await fetchOFACList(runtime, http)
    const sentinel = await fetchSentinelDB(runtime, http)
    const chainalysis = await fetchChainalysis(runtime, http)
    
    // Step 2: Merge and deduplicate
    const unified = mergeBlacklists(runtime, [ofac, sentinel, chainalysis])
    
    if (unified.addresses.length === 0) {
      runtime.log('⚠️ No addresses to update')
      return { success: true, action: 'NO_UPDATE', reason: 'No addresses found' }
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
    
    // Step 5: Broadcast to PolicyEngine (simulation mode - no actual broadcast)
    runtime.log('[5] Broadcasting to PolicyEngine...')
    runtime.log(`   Target: ${cfg.sepolia?.policyEngineAddress || '0x...'}`)
    runtime.log(`   Addresses: ${unified.addresses.length}`)
    runtime.log(`   Merkle Root: ${unified.merkleRoot.slice(0, 20)}...`)
    
    // In simulation, we don't actually broadcast
    // In production: evmClient.writeReport(...)
    
    runtime.log('✅ SUCCESS: Blacklist update prepared')
    
    return {
      success: true,
      action: 'UPDATE_PREPARED',
      addressCount: unified.addresses.length,
      merkleRoot: unified.merkleRoot,
      sourceCount: unified.sourceCount,
      sources: [ofac.name, sentinel.name, chainalysis.name],
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
    // Parse manual trigger payload
    const body = JSON.parse(new TextDecoder().decode(payload.body))
    runtime.log(`Manual trigger: ${body.action || 'full-sync'}`)
    
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
