import { bytesToHex, cre, getNetwork, type Runtime, type EVMLog, TxStatus, Runner, hexToBase64 } from '@chainlink/cre-sdk'
import { encodeAbiParameters, parseAbiParameters, keccak256, toBytes, getAddress, hexToBigInt } from 'viem'

const TRANSFER_EVENT_SIG = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

const decodeTransfer = (log: EVMLog): { from: string; to: string; value: bigint } => {
  const from = getAddress(bytesToHex(log.topics[1].slice(12)))
  const to = getAddress(bytesToHex(log.topics[2].slice(12)))
  const value = hexToBigInt(bytesToHex(log.data))
  return { from, to, value }
}

const onLogTrigger = async (runtime: Runtime<any>, log: EVMLog): Promise<object> => {
  runtime.log('=== USDA Freeze Sentinel (Simulation Test) ===')
  
  const cfg = runtime.config
  const { from, to, value } = decodeTransfer(log)
  
  runtime.log(`Transfer detected: ${from} -> ${to}, Value: ${value.toString()} USDA`)
  
  // Skip mint/burn
  if (from === '0x0000000000000000000000000000000000000000' || 
      to === '0x0000000000000000000000000000000000000000') {
    runtime.log('Skipping mint/burn')
    return { success: true, skipped: true }
  }
  
  // Mock risk assessment for vitalik.eth address
  const isHighRisk = to.toLowerCase() === '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'.toLowerCase()
  const riskScore = isHighRisk ? 75 : 10
  
  runtime.log(`Risk score: ${riskScore}/100`)
  
  if (riskScore < 50) {
    runtime.log('Low risk, no action needed')
    return { success: true, action: 'no_action', riskScore }
  }
  
  runtime.log('High risk! Executing freeze...')
  
  const network = getNetwork({ chainFamily: 'evm', chainSelectorName: 'ethereum-testnet-sepolia', isTestnet: true })
  if (!network) throw new Error('No network')
  
  const evm = new cre.capabilities.EVMClient(network.chainSelector.selector)
  
  const reportHash = keccak256(toBytes(`freeze-${to}-${Date.now()}`))
  const reason = `Risk score ${riskScore}: Suspicious transfer detected`
  
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
    gasConfig: { gasLimit: '500000' },
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
    riskScore
  }
}

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
  const runner = await Runner.newRunner({ 
    configSchema: undefined as any
  }) 
  await runner.run(init) 
}
main()
