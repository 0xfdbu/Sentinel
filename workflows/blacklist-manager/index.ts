// Chainlink CRE Workflow: Blacklist Manager
// Manages address blacklist via DON-signed reports
// Supports: ADD (instruction=1) and REMOVE (instruction=2)

import { ethers } from 'ethers'

// Contract addresses - Sepolia Testnet
const ADDRESSES = {
  blacklistPolicy: '0x1b4228DF8cB455020AF741A9C8Adb6Af44Dcc2F1',
}

// Instruction types
const INSTRUCTION_BLACKLIST = 1
const INSTRUCTION_UNBLACKLIST = 2

// Report types
interface BlacklistReport {
  reportHash: string
  instruction: number
  target: string
  reason: string
}

/**
 * HTTP Trigger Handler
 * Expected payload:
 * {
 *   action: "blacklist" | "unblacklist",
 *   address: "0x...",
 *   reason: "Reason for action"
 * }
 */
const onHTTPTrigger = async (runtime: any, payload: any) => {
  console.log('Blacklist Manager Workflow Triggered')
  console.log('Payload:', JSON.stringify(payload, null, 2))

  // Validate payload
  if (!payload.action || !payload.address) {
    return {
      success: false,
      error: 'Missing required fields: action, address'
    }
  }

  const action = payload.action.toLowerCase()
  const targetAddress = payload.address
  const reason = payload.reason || 'No reason provided'

  // Validate action
  if (action !== 'blacklist' && action !== 'unblacklist') {
    return {
      success: false,
      error: `Invalid action: ${action}. Must be "blacklist" or "unblacklist"`
    }
  }

  // Validate address
  if (!ethers.isAddress(targetAddress)) {
    return {
      success: false,
      error: `Invalid Ethereum address: ${targetAddress}`
    }
  }

  // Determine instruction
  const instruction = action === 'blacklist' ? INSTRUCTION_BLACKLIST : INSTRUCTION_UNBLACKLIST

  try {
    // Generate unique report hash
    const reportHash = generateReportHash(targetAddress, action, reason)

    // Encode report for writeReport
    const reportData = encodeReport({
      reportHash,
      instruction,
      target: targetAddress,
      reason
    })

    console.log(`Generating DON-signed report for ${action}:`)
    console.log(`  Target: ${targetAddress}`)
    console.log(`  Report Hash: ${reportHash}`)
    console.log(`  Instruction: ${instruction}`)
    console.log(`  Reason: ${reason}`)

    // Generate DON report (signed by DON nodes)
    const report = runtime.report({
      encodedPayload: reportData,
      encoderName: 'evm',
      signingAlgo: 'ecdsa',
      hashingAlgo: 'keccak256',
    }).result()

    console.log('DON Report Generated:', report.signature ? 'Signed' : 'Unsigned')

    // Broadcast to BlacklistPolicyDON contract
    console.log('Broadcasting to BlacklistPolicyDON...')
    
    const resp = evm.writeReport(runtime, {
      receiver: ADDRESSES.blacklistPolicy,
      report,
      gasConfig: { gasLimit: '300000' },
    }).result()

    console.log('Blacklist operation successful!')
    console.log('Transaction Hash:', resp.txHash)

    return {
      success: true,
      action,
      targetAddress,
      reportHash,
      txHash: resp.txHash,
      blockNumber: resp.blockNumber,
      reason
    }

  } catch (error: any) {
    console.error('Blacklist operation failed:', error)
    return {
      success: false,
      error: error.message || 'Unknown error',
      action,
      targetAddress
    }
  }
}

/**
 * Generate unique report hash
 */
function generateReportHash(target: string, action: string, reason: string): string {
  const data = ethers.solidityPackedKeccak256(
    ['address', 'string', 'string', 'uint256'],
    [target, action, reason, Date.now()]
  )
  return data
}

/**
 * Encode report for BlacklistPolicyDON.writeReport()
 * Format: (bytes32 reportHash, uint8 instruction, address target, string reason)
 */
function encodeReport(report: BlacklistReport): string {
  const abiCoder = new ethers.AbiCoder()
  
  const encoded = abiCoder.encode(
    ['bytes32', 'uint8', 'address', 'string'],
    [
      report.reportHash,
      report.instruction,
      report.target,
      report.reason
    ]
  )
  
  // Remove 0x prefix for CRE
  return encoded
}

// Export handlers
export { onHTTPTrigger }
