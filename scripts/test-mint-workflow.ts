/**
 * Test ETH Reserve Mint Workflow
 * 
 * 1. Deposit 0.001 ETH to vault
 * 2. Capture ETHDeposited event
 * 3. Trigger CRE workflow with event data
 */

import { ethers } from 'ethers'
import { execSync } from 'child_process'
import * as fs from 'fs'

// Config
const VAULT_ADDRESS = '0x12fe97b889158380e1D94b69718F89E521b38c11'
const RPC_URL = 'https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH'
const WORKFLOW_PATH = './workflows/eth-por-unified'

// Vault ABI (minimal)
const VAULT_ABI = [
  'function depositETH() payable returns (bytes32 mintRequestId, uint256 depositIndex)',
  'function getChainlinkPrice() view returns (uint256)',
  'event ETHDeposited(address indexed user, uint256 ethAmount, uint256 ethPrice, bytes32 mintRequestId, uint256 depositIndex)'
]

async function main() {
  console.log('=== Testing ETH Reserve Mint Workflow ===\n')
  
  // Setup provider
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  
  // Get private key from env
  const privateKey = process.env.SENTINEL_PRIVATE_KEY
  if (!privateKey) {
    console.error('Error: SENTINEL_PRIVATE_KEY not set')
    console.log('Set it with: export SENTINEL_PRIVATE_KEY=0x...')
    process.exit(1)
  }
  
  const wallet = new ethers.Wallet(privateKey, provider)
  console.log(`Using wallet: ${wallet.address}`)
  
  // Check balance
  const balance = await provider.getBalance(wallet.address)
  console.log(`ETH Balance: ${ethers.formatEther(balance)} ETH`)
  
  if (balance < ethers.parseEther('0.0011')) {
    console.error('Error: Insufficient balance. Need at least 0.0011 ETH')
    process.exit(1)
  }
  
  // Create vault contract
  const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, wallet)
  
  // Step 1: Deposit ETH
  console.log('\n[Step 1] Depositing 0.001 ETH to vault...')
  const depositAmount = ethers.parseEther('0.001')
  
  try {
    const tx = await vault.depositETH({
      value: depositAmount,
      gasLimit: 300000
    })
    
    console.log(`  Transaction: ${tx.hash}`)
    console.log('  Waiting for confirmation...')
    
    const receipt = await tx.wait()
    console.log(`  ✓ Confirmed in block ${receipt?.blockNumber}`)
    
    // Step 2: Parse ETHDeposited event
    console.log('\n[Step 2] Parsing ETHDeposited event...')
    
    const eventSignature = 'ETHDeposited(address,uint256,uint256,bytes32,uint256)'
    const eventTopic = ethers.id(eventSignature)
    
    const eventLog = receipt?.logs.find((log: any) => 
      log.topics[0]?.toLowerCase() === eventTopic.toLowerCase()
    )
    
    if (!eventLog) {
      console.error('  ✗ ETHDeposited event not found!')
      process.exit(1)
    }
    
    // Decode event data
    const abi = new ethers.AbiCoder()
    const user = ethers.getAddress('0x' + eventLog.topics[1].slice(26))
    
    // Decode data: ethAmount (32 bytes), ethPrice (32 bytes), mintRequestId (32 bytes), depositIndex (32 bytes)
    const data = eventLog.data
    const ethAmount = BigInt('0x' + data.slice(2, 66))
    const ethPrice = BigInt('0x' + data.slice(66, 130))
    const mintRequestId = '0x' + data.slice(130, 194)
    const depositIndex = parseInt(data.slice(194, 258), 16)
    
    console.log(`  User: ${user}`)
    console.log(`  ETH Amount: ${ethers.formatEther(ethAmount)} ETH`)
    console.log(`  ETH Price: $${ethers.formatUnits(ethPrice, 8)}`)
    console.log(`  Mint Request ID: ${mintRequestId}`)
    console.log(`  Deposit Index: ${depositIndex}`)
    
    // Step 3: Trigger CRE workflow
    console.log('\n[Step 3] Triggering CRE workflow...')
    console.log('  This will run the workflow in simulation mode')
    console.log('  In production, the Chainlink DON would automatically trigger this\n')
    
    // Create payload file for the workflow
    const payload = {
      transactionHash: receipt?.hash,
      blockNumber: receipt?.blockNumber,
      logIndex: eventLog.index,
      topics: eventLog.topics,
      data: eventLog.data,
      decoded: {
        user,
        ethAmount: ethAmount.toString(),
        ethPrice: ethPrice.toString(),
        mintRequestId,
        depositIndex
      }
    }
    
    const payloadPath = '/tmp/eth-deposit-payload.json'
    fs.writeFileSync(payloadPath, JSON.stringify(payload, null, 2))
    
    console.log(`  Payload saved to: ${payloadPath}`)
    console.log('\nTo manually trigger the workflow, run:')
    console.log(`  cd sentinel && cre workflow simulate ${WORKFLOW_PATH} --target local-simulation`)
    console.log('\nOr with the event data:')
    console.log(`  cre workflow simulate ${WORKFLOW_PATH} --target local-simulation \\")
    console.log(`    --evm-tx-hash ${receipt?.hash} \\")
    console.log(`    --evm-event-index ${eventLog.index}`)
    
    // Optionally auto-trigger
    console.log('\n[Step 4] Auto-triggering workflow...')
    try {
      const result = execSync(
        `cre workflow simulate ${WORKFLOW_PATH} --target local-simulation --evm-tx-hash ${receipt?.hash} --evm-event-index ${eventLog.index}`,
        { 
          cwd: '/home/user/Desktop/Chainlink/sentinel',
          encoding: 'utf-8',
          timeout: 120000,
          stdio: 'pipe'
        }
      )
      console.log(result)
    } catch (e: any) {
      console.log('  Workflow output:', e.stdout || e.message)
    }
    
    console.log('\n=== Test Complete ===')
    console.log('Check your USDA balance on the Stablecoin page!')
    
  } catch (error: any) {
    console.error('\n✗ Error:', error.message)
    if (error.reason) console.error('  Reason:', error.reason)
    process.exit(1)
  }
}

main()
