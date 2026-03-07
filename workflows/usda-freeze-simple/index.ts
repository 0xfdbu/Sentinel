import { bytesToHex, cre, getNetwork, type Runtime, TxStatus, Runner, hexToBase64 } from '@chainlink/cre-sdk'
import { encodeAbiParameters, parseAbiParameters, keccak256, toBytes, getAddress } from 'viem'
import { z } from 'zod'

const configSchema = z.object({
  sepolia: z.object({
    freezerAddress: z.string(),
    guardianAddress: z.string(),
  }),
})

const onCronTrigger = async (runtime: Runtime<any>): Promise<object> => {
  runtime.log('=== Simple USDA Freeze (DON-signed via Forwarder) ===')
  
  try {
    const cfg = runtime.config
    const targetAddress = '0x2222222222222222222222222222222222222222'
    
    runtime.log(`Target to freeze: ${targetAddress}`)
    runtime.log(`Freezer: ${cfg.sepolia.freezerAddress}`)
    
    const network = getNetwork({ chainFamily: 'evm', chainSelectorName: 'ethereum-testnet-sepolia', isTestnet: true })
    if (!network) throw new Error('No network')
    
    const evm = new cre.capabilities.EVMClient(network.chainSelector.selector)
    
    // Generate unique report hash
    const reportHash = keccak256(toBytes(`freeze-${targetAddress}-${Date.now()}`))
    runtime.log(`Report hash: ${reportHash}`)
    
    // Build freeze report: (bytes32 reportHash, address target, string reason)
    runtime.log('[1] Building freeze report...')
    const reason = "Test freeze via CRE workflow - suspicious activity"
    
    const reportData = encodeAbiParameters(
      parseAbiParameters('bytes32 reportHash, address target, string reason'),
      [
        reportHash,
        getAddress(targetAddress),
        reason
      ]
    )
    
    runtime.log(`  Target: ${targetAddress}`)
    runtime.log(`  Reason: ${reason}`)
    
    // Generate DON-signed report
    runtime.log('[2] Generating DON attestation...')
    const report = runtime.report({
      encodedPayload: hexToBase64(reportData),
      encoderName: 'evm',
      signingAlgo: 'ecdsa',
      hashingAlgo: 'keccak256',
    }).result()
    
    runtime.log(`  Report generated`)
    
    // Submit to Freezer via writeReport (goes through Forwarder)
    runtime.log('[3] Broadcasting to SimpleFreezer via writeReport...')
    const resp = evm.writeReport(runtime, {
      receiver: cfg.sepolia.freezerAddress,
      report,
      gasConfig: { gasLimit: '500000' },
    }).result()
    
    if (resp.txStatus !== TxStatus.SUCCESS) {
      const err = resp.errorMessage || 'Unknown error'
      throw new Error(`Freeze failed: ${err}`)
    }
    
    const txHash = resp.txHash ? bytesToHex(resp.txHash) : 'unknown'
    runtime.log(`✅ SUCCESS: ${txHash}`)
    
    return {
      success: true,
      txHash,
      target: targetAddress,
      reason,
      reportHash: reportHash.slice(0, 20) + '...',
    }
    
  } catch (e) {
    runtime.log(`❌ ${(e as Error).message}`)
    return { success: false, error: (e as Error).message }
  }
}

const init = (cfg: any) => {
  return [
    cre.handler(
      new cre.capabilities.CronCapability().trigger({
        schedule: '0 * * * * *',
      }),
      onCronTrigger
    ),
  ]
}

export async function main() { 
  const runner = await Runner.newRunner({ configSchema }) 
  await runner.run(init) 
}
main()
