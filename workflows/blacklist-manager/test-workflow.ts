// Test script for Blacklist Manager Workflow
// Run with: npx ts-node test-workflow.ts

import { ethers } from 'ethers'

// Test configuration
const BLACKLIST_POLICY = '0x1b4228DF8cB455020AF741A9C8Adb6Af44Dcc2F1'
const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com'

// ABI for BlacklistPolicyDON
const BLACKLIST_ABI = [
  'function writeReport(bytes calldata report) external',
  'function isBlacklisted(address addr) external view returns (bool)',
  'function blacklistReason(address addr) external view returns (string)',
  'function usedReports(bytes32 reportHash) external view returns (bool)',
  'event AddressBlacklisted(address indexed addr, string reason, bytes32 reportHash)',
  'event AddressUnblacklisted(address indexed addr, bytes32 reportHash)',
  'event ReportProcessed(bytes32 indexed reportHash, uint8 instruction)'
]

// Instruction types
const INSTRUCTION_BLACKLIST = 1
const INSTRUCTION_UNBLACKLIST = 2

interface TestResult {
  success: boolean
  action: string
  target: string
  reportHash: string
  txHash?: string
  error?: string
}

/**
 * Generate unique report hash
 */
function generateReportHash(target: string, action: string, reason: string): string {
  return ethers.solidityPackedKeccak256(
    ['address', 'string', 'string', 'uint256'],
    [target, action, reason, Date.now()]
  )
}

/**
 * Encode report for writeReport
 * Format: (bytes32 reportHash, uint8 instruction, address target, string reason)
 */
function encodeReport(reportHash: string, instruction: number, target: string, reason: string): string {
  const abiCoder = new ethers.AbiCoder()
  return abiCoder.encode(
    ['bytes32', 'uint8', 'address', 'string'],
    [reportHash, instruction, target, reason]
  )
}

/**
 * Test blacklisting an address
 */
async function testBlacklist(
  signer: ethers.Wallet,
  targetAddress: string,
  reason: string
): Promise<TestResult> {
  console.log('\n=== Testing Blacklist ===')
  console.log(`Target: ${targetAddress}`)
  console.log(`Reason: ${reason}`)

  try {
    const contract = new ethers.Contract(BLACKLIST_POLICY, BLACKLIST_ABI, signer)

    // Generate report
    const reportHash = generateReportHash(targetAddress, 'blacklist', reason)
    const reportData = encodeReport(reportHash, INSTRUCTION_BLACKLIST, targetAddress, reason)

    console.log('Report Hash:', reportHash)
    console.log('Report Data:', reportData.slice(0, 66) + '...')

    // Check if already blacklisted
    const isAlreadyBlacklisted = await contract.isBlacklisted(targetAddress)
    if (isAlreadyBlacklisted) {
      console.log('Address is already blacklisted!')
      return {
        success: false,
        action: 'blacklist',
        target: targetAddress,
        reportHash,
        error: 'Address already blacklisted'
      }
    }

    // Submit writeReport
    console.log('Submitting writeReport...')
    const tx = await contract.writeReport(reportData, {
      gasLimit: 300000
    })

    console.log('Transaction submitted:', tx.hash)
    console.log('Waiting for confirmation...')

    const receipt = await tx.wait()
    console.log('Confirmed! Block:', receipt?.blockNumber)

    // Verify
    const isBlacklisted = await contract.isBlacklisted(targetAddress)
    console.log('Verification - Is Blacklisted:', isBlacklisted)

    if (isBlacklisted) {
      const storedReason = await contract.blacklistReason(targetAddress)
      console.log('Stored Reason:', storedReason)
    }

    return {
      success: true,
      action: 'blacklist',
      target: targetAddress,
      reportHash,
      txHash: tx.hash
    }

  } catch (error: any) {
    console.error('Blacklist failed:', error.message)
    return {
      success: false,
      action: 'blacklist',
      target: targetAddress,
      reportHash: '',
      error: error.message
    }
  }
}

/**
 * Test unblacklisting an address
 */
async function testUnblacklist(
  signer: ethers.Wallet,
  targetAddress: string
): Promise<TestResult> {
  console.log('\n=== Testing Unblacklist ===')
  console.log(`Target: ${targetAddress}`)

  try {
    const contract = new ethers.Contract(BLACKLIST_POLICY, BLACKLIST_ABI, signer)

    // Generate report
    const reportHash = generateReportHash(targetAddress, 'unblacklist', 'Test removal')
    const reportData = encodeReport(reportHash, INSTRUCTION_UNBLACKLIST, targetAddress, 'Test removal')

    console.log('Report Hash:', reportHash)

    // Check if blacklisted
    const isCurrentlyBlacklisted = await contract.isBlacklisted(targetAddress)
    if (!isCurrentlyBlacklisted) {
      console.log('Address is not blacklisted!')
      return {
        success: false,
        action: 'unblacklist',
        target: targetAddress,
        reportHash,
        error: 'Address not blacklisted'
      }
    }

    // Submit writeReport
    console.log('Submitting writeReport...')
    const tx = await contract.writeReport(reportData, {
      gasLimit: 300000
    })

    console.log('Transaction submitted:', tx.hash)
    console.log('Waiting for confirmation...')

    const receipt = await tx.wait()
    console.log('Confirmed! Block:', receipt?.blockNumber)

    // Verify
    const isBlacklisted = await contract.isBlacklisted(targetAddress)
    console.log('Verification - Is Blacklisted:', isBlacklisted)

    return {
      success: true,
      action: 'unblacklist',
      target: targetAddress,
      reportHash,
      txHash: tx.hash
    }

  } catch (error: any) {
    console.error('Unblacklist failed:', error.message)
    return {
      success: false,
      action: 'unblacklist',
      target: targetAddress,
      reportHash: '',
      error: error.message
    }
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('=== Blacklist Manager Workflow Test ===')
  console.log('Network: Sepolia')
  console.log('Contract:', BLACKLIST_POLICY)

  // Get private key from environment
  const privateKey = process.env.PRIVATE_KEY
  if (!privateKey) {
    console.error('Error: PRIVATE_KEY environment variable not set')
    console.log('\nUsage: PRIVATE_KEY=0x... npx ts-node test-workflow.ts')
    process.exit(1)
  }

  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const signer = new ethers.Wallet(privateKey, provider)

  console.log('\nSigner:', signer.address)

  // Get balance
  const balance = await provider.getBalance(signer.address)
  console.log('Balance:', ethers.formatEther(balance), 'ETH')

  // Test address (use a random test address)
  const testAddress = '0x' + '1234567890abcdef'.repeat(5)
  console.log('\nTest Address:', testAddress)

  // Run tests
  const results: TestResult[] = []

  // Test 1: Blacklist
  results.push(await testBlacklist(signer, testAddress, 'Suspicious activity detected'))

  // Test 2: Try to blacklist again (should fail)
  results.push(await testBlacklist(signer, testAddress, 'Should fail - already blacklisted'))

  // Test 3: Unblacklist
  results.push(await testUnblacklist(signer, testAddress))

  // Test 4: Try to unblacklist again (should fail)
  results.push(await testUnblacklist(signer, testAddress))

  // Summary
  console.log('\n=== Test Summary ===')
  results.forEach((result, i) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL'
    console.log(`${i + 1}. ${status} - ${result.action} ${result.target.slice(0, 10)}...`)
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error}`)
    }
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`)
    }
  })
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

export { testBlacklist, testUnblacklist, generateReportHash, encodeReport }
