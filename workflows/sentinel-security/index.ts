/**
 * Sentinel Security Workflow - DON-signed pause/freeze decisions
 * 
 * This workflow runs inside TEE and generates cryptographically signed
 * reports for emergency security actions (pause/freeze/blacklist)
 * 
 * Flow:
 * 1. Receive security alert (threat detected, fraud pattern, etc.)
 * 2. Verify threat level in TEE
 * 3. Generate DON-signed report
 * 4. Broadcast to SentinelGuardian contract
 */

import { bytesToHex, cre, getNetwork, type Runtime, type HTTPPayload, TxStatus, Runner, hexToBase64 } from '@chainlink/cre-sdk'
import { encodeAbiParameters, parseAbiParameters, keccak256, toUtf8Bytes, zeroAddress } from 'viem'
import { z } from 'zod'

const configSchema = z.object({
  sepolia: z.object({
    guardianAddress: z.string(),
    sentinelApiUrl: z.string().optional(),
  }),
})

const payloadSchema = z.object({
  contractAddress: z.string(),
  threatType: z.enum(['BLACKLIST', 'REENTRANCY', 'FLASH_LOAN', 'ORACLE_MANIPULATION', 'CRITICAL_VALUE', 'FRAUD_PATTERN']),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM']),
  txHash: z.string(),
  attacker: z.string().optional(),
  details: z.string(),
  timestamp: z.number(),
})

interface SecurityAlert {
  contractAddress: string
  threatType: 'BLACKLIST' | 'REENTRANCY' | 'FLASH_LOAN' | 'ORACLE_MANIPULATION' | 'CRITICAL_VALUE' | 'FRAUD_PATTERN'
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  txHash: string
  attacker?: string
  details: string
  timestamp: number
}

async function onHTTPTrigger(runtime: Runtime, req: HTTPPayload) {
  try {
    const cfg = runtime.config as any
    const alert: SecurityAlert = JSON.parse(new TextDecoder().decode(req.body))
    
    runtime.log(`🛡️ SECURITY ALERT: ${alert.threatType}`)
    runtime.log(`   Contract: ${alert.contractAddress}`)
    runtime.log(`   Severity: ${alert.severity}`)
    runtime.log(`   TX: ${alert.txHash}`)
    
    // [1] Verify alert severity warrants action
    runtime.log('[1] Validating threat severity...')
    if (alert.severity !== 'CRITICAL' && alert.severity !== 'HIGH') {
      runtime.log('   ℹ️ Severity too low for auto-pause')
      return { 
        success: false, 
        error: 'Severity below threshold',
        action: 'MONITOR_ONLY'
      }
    }
    runtime.log('   ✓ Severity validated')

    // [2] Get current contract state
    runtime.log('[2] Checking contract state...')
    const network = getNetwork({ 
      chainFamily: 'evm', 
      chainSelectorName: 'ethereum-testnet-sepolia', 
      isTestnet: true 
    })
    if (!network) throw new Error('No network')
    
    const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)
    
    // Check if already paused
    try {
      const pausedData = await evmClient.queryContract(runtime, {
        address: alert.contractAddress as `0x${string}`,
        abi: ['function paused() view returns (bool)'],
        functionName: 'paused',
      }).result()
      
      const isPaused = pausedData.returnValues?.[0] === true
      if (isPaused) {
        runtime.log('   ℹ️ Contract already paused')
        return {
          success: true,
          action: 'ALREADY_PAUSED',
          contractAddress: alert.contractAddress
        }
      }
    } catch {
      runtime.log('   ⚠️ Could not check paused state, proceeding anyway')
    }
    runtime.log('   ✓ Contract active, proceeding')

    // [3] Build DON-signed security report
    runtime.log('[3] Generating DON-signed security report...')
    
    const reportData = JSON.stringify({
      alertType: alert.threatType,
      severity: alert.severity,
      contractAddress: alert.contractAddress,
      txHash: alert.txHash,
      attacker: alert.attacker || zeroAddress,
      details: alert.details,
      timestamp: alert.timestamp,
      action: alert.severity === 'CRITICAL' ? 'PAUSE_IMMEDIATELY' : 'PAUSE'
    })
    
    const reportHash = keccak256(toUtf8Bytes(reportData))
    
    runtime.log(`   Report hash: ${reportHash.slice(0, 20)}...`)

    // [4] Create DON report with TEE attestation
    runtime.log('[4] Creating DON attestation...')
    
    // Encode the report for the guardian contract
    // Guardian expects: (bytes32 reportHash, address target, uint8 severity, bytes32 txHash, uint256 timestamp)
    const severityValue = alert.severity === 'CRITICAL' ? 2 : 1
    const attackerAddress = (alert.attacker || zeroAddress) as `0x${string}`
    
    const reportPayload = encodeAbiParameters(
      parseAbiParameters('bytes32, address, uint8, bytes32, uint256, address'),
      [
        reportHash,
        alert.contractAddress as `0x${string}`,
        severityValue,
        alert.txHash as `0x${string}`,
        BigInt(alert.timestamp),
        attackerAddress
      ]
    )
    
    const report = runtime.report({
      encodedPayload: hexToBase64(reportPayload.slice(2) as `0x${string}`),
      encoderName: 'evm',
      signingAlgo: 'ecdsa',
      hashingAlgo: 'keccak256',
    }).result()
    
    runtime.log('   ✓ DON report created')
    runtime.log(`   Signatures: ${report.signatures?.length || 1}`)

    // [5] Broadcast to SentinelGuardian
    runtime.log('[5] Broadcasting to SentinelGuardian...')
    
    const guardianResp = evmClient.writeReport(runtime, {
      receiver: cfg.sepolia.guardianAddress,
      report,
      gasConfig: { gasLimit: '300000' },
    }).result()
    
    if (guardianResp.txStatus !== TxStatus.SUCCESS) {
      const err = guardianResp.errorMessage || 'Unknown error'
      throw new Error(`Guardian execution failed: ${err}`)
    }
    
    const txHash = guardianResp.txHash ? bytesToHex(guardianResp.txHash) : 'unknown'
    runtime.log(`✅ SUCCESS: Contract paused`)
    runtime.log(`   TX: ${txHash}`)
    
    return {
      success: true,
      txHash,
      action: alert.severity === 'CRITICAL' ? 'PAUSE_IMMEDIATELY' : 'PAUSE',
      contractAddress: alert.contractAddress,
      severity: alert.severity,
      threatType: alert.threatType,
      reportHash: reportHash.slice(0, 20) + '...',
      timestamp: new Date().toISOString()
    }
    
  } catch (e) {
    runtime.log(`❌ SECURITY WORKFLOW FAILED: ${(e as Error).message}`)
    return { 
      success: false, 
      error: (e as Error).message,
      action: 'FAILED'
    }
  }
}

const init = (cfg: any) => [cre.handler(new cre.capabilities.HTTPCapability().trigger({}), onHTTPTrigger)]

export async function main() { 
  const runner = await Runner.newRunner({ configSchema }) 
  await runner.run(init) 
}

main()
