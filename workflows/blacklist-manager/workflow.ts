// Chainlink CRE Workflow: Blacklist Manager
// Simple CLI-triggered workflow for testing DON broadcast
// Usage: cre workflow simulate . --target local-simulation --broadcast --payload '{...}'

import { 
  encodeAbiParameters, 
  parseAbiParameters,
  getAddress,
  stringToHex,
  hexToBytes
} from 'viem'
import { cre } from '@chainlink/cre-sdk'
import { bytesToBase64 } from '@chainlink/cre-sdk/utils'

// Contract addresses - Sepolia Testnet
const BLACKLIST_POLICY = '0x1b4228DF8cB455020AF741A9C8Adb6Af44Dcc2F1'

// Instruction types
const INSTRUCTION_BLACKLIST = 1
const INSTRUCTION_UNBLACKLIST = 2

/**
 * Workflow entry point - triggered via CRE CLI
 * Payload: { action: "blacklist" | "unblacklist", address: "0x...", reason: "..." }
 */
export default async function workflow(runtime: any, payload: any) {
  runtime.log('=== Blacklist Manager ===')
  runtime.log('Payload:', JSON.stringify(payload, null, 2))

  // Validate
  if (!payload?.action || !payload?.address) {
    throw new Error('Missing action or address in payload')
  }

  const action = payload.action.toLowerCase()
  const target = getAddress(payload.address)
  const reason = payload.reason || 'No reason'

  if (!['blacklist', 'unblacklist'].includes(action)) {
    throw new Error(`Invalid action: ${action}`)
  }

  const instruction = action === 'blacklist' ? INSTRUCTION_BLACKLIST : INSTRUCTION_UNBLACKLIST

  // Generate report hash
  const reportHash = stringToHex(
    `${action}-${target}-${Date.now()}`,
    { size: 32 }
  )

  // Encode report
  const reportData = encodeAbiParameters(
    parseAbiParameters('bytes32, uint8, address, string'),
    [reportHash, instruction, target, reason]
  )

  runtime.log(`Action: ${action}`)
  runtime.log(`Target: ${target}`)
  runtime.log(`Report Hash: ${reportHash}`)

  // Generate DON-signed report
  runtime.log('Generating DON attestation...')
  const report = runtime.report({
    encodedPayload: bytesToBase64(hexToBytes(reportData)),
    encoderName: 'evm',
    signingAlgo: 'ecdsa',
    hashingAlgo: 'keccak256',
  }).result()

  runtime.log('DON signature received ✓')

  // Broadcast via writeReport
  runtime.log('Broadcasting to BlacklistPolicyDON...')
  
  const resp = cre.evm.writeReport(runtime, {
    receiver: BLACKLIST_POLICY,
    report,
    gasConfig: { gasLimit: '300000' },
  }).result()

  if (resp.txStatus !== 'SUCCESS') {
    throw new Error(resp.errorMessage || 'Transaction failed')
  }

  runtime.log(`✅ SUCCESS!`)
  runtime.log(`Transaction: ${resp.txHash ? '0x' + Buffer.from(resp.txHash).toString('hex') : 'unknown'}`)

  return {
    success: true,
    action,
    target,
    txHash: resp.txHash ? '0x' + Buffer.from(resp.txHash).toString('hex') : null,
    reportHash
  }
}
