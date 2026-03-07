/**
 * Test Pause with DON Workflow
 * 
 * This test demonstrates the pause workflow with optional broadcast.
 * Run with: npx ts-node tests/test-pause-with-don.ts
 */

import { spawn } from 'child_process'
import * as path from 'path'

const GUARDIAN_ADDRESS = '0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1'
const WORKFLOW_PATH = path.join(__dirname, '../../workflows/pause-with-don')

interface TestResult {
  success: boolean
  action?: string
  target?: string
  reportHash?: string
  broadcast?: boolean
  txHash?: string | null
  message?: string
  error?: string
}

async function simulatePauseWorkflow(
  action: 'pause' | 'unpause' = 'pause',
  broadcast: boolean = false,
  reason: string = 'Test pause'
): Promise<TestResult> {
  console.log(`\n=== Testing ${action.toUpperCase()} (broadcast=${broadcast}) ===\n`)

  const payload = {
    action,
    target: GUARDIAN_ADDRESS,
    reason,
    broadcast,
  }

  return new Promise((resolve, reject) => {
    const creProcess = spawn('cre', [
      'workflow', 'simulate',
      'pause-with-don',
      '--target', 'local-simulation',
      '--payload', JSON.stringify(payload),
    ], {
      cwd: path.join(__dirname, '../../workflows'),
      env: { ...process.env },
    })

    let stdout = ''
    let stderr = ''

    creProcess.stdout.on('data', (data) => {
      stdout += data.toString()
      process.stdout.write(data)
    })

    creProcess.stderr.on('data', (data) => {
      stderr += data.toString()
      process.stderr.write(data)
    })

    creProcess.on('close', (code) => {
      if (code === 0) {
        // Parse the result from stdout
        try {
          const resultMatch = stdout.match(/Result:\s*(\{[^}]+\})/)
          if (resultMatch) {
            const result = JSON.parse(resultMatch[1])
            resolve(result)
          } else {
            resolve({
              success: true,
              action,
              broadcast,
              message: 'Workflow executed (result parsing failed)',
            })
          }
        } catch (e) {
          resolve({
            success: true,
            action,
            broadcast,
            message: 'Workflow executed',
          })
        }
      } else {
        reject(new Error(`CRE process exited with code ${code}: ${stderr}`))
      }
    })
  })
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║     Pause with DON - Workflow Test Suite              ║')
  console.log('╚════════════════════════════════════════════════════════╝')
  console.log(`\nGuardian Address: ${GUARDIAN_ADDRESS}`)

  try {
    // Test 1: Pause simulation (no broadcast)
    console.log('\n' + '═'.repeat(60))
    console.log('TEST 1: Pause Simulation (No Broadcast)')
    console.log('═'.repeat(60))
    
    const pauseResult = await simulatePauseWorkflow('pause', false, 'Test emergency pause')
    console.log('\n✅ Pause simulation result:', pauseResult)

    // Test 2: Unpause simulation (no broadcast)
    console.log('\n' + '═'.repeat(60))
    console.log('TEST 2: Unpause Simulation (No Broadcast)')
    console.log('═'.repeat(60))
    
    const unpauseResult = await simulatePauseWorkflow('unpause', false, 'Test unpause')
    console.log('\n✅ Unpause simulation result:', unpauseResult)

    // Test 3: Broadcast test (if private key is available)
    if (process.env.CRE_ETH_PRIVATE_KEY) {
      console.log('\n' + '═'.repeat(60))
      console.log('TEST 3: Pause with Broadcast')
      console.log('═'.repeat(60))
      console.log('⚠️  WARNING: This will actually pause the contract!')
      console.log('Make sure you have permission to pause.')
      console.log('')
      
      const broadcastResult = await simulatePauseWorkflow('pause', true, 'Broadcast test - emergency pause')
      console.log('\n✅ Broadcast result:', broadcastResult)
    } else {
      console.log('\n' + '═'.repeat(60))
      console.log('TEST 3: Broadcast Test (Skipped)')
      console.log('═'.repeat(60))
      console.log('CRE_ETH_PRIVATE_KEY not set. Set it to enable broadcast testing:')
      console.log('  export CRE_ETH_PRIVATE_KEY=0x...')
    }

    console.log('\n' + '═'.repeat(60))
    console.log('✅ All Tests Complete')
    console.log('═'.repeat(60))

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

main()
