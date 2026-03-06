/**
 * Test script for Volume Sentinel workflow
 * Tests the HTTP trigger with sample payloads
 */

const TEST_PAYLOADS = [
  {
    name: "Normal Market - Maintain",
    payload: {
      tokenSymbol: "USDA",
      tokenAddress: "0x500D640f4fE39dAF609C6E14C83b89A68373EaFe",
      currentLimit: "1000000000000000000000",
      forceAdjust: false
    }
  },
  {
    name: "Force Adjustment",
    payload: {
      tokenSymbol: "USDA",
      tokenAddress: "0x500D640f4fE39dAF609C6E14C83b89A68373EaFe",
      currentLimit: "1000000000000000000000",
      forceAdjust: true
    }
  },
  {
    name: "High Volume Token",
    payload: {
      tokenSymbol: "ETH",
      tokenAddress: "0x0000000000000000000000000000000000000000",
      currentLimit: "5000000000000000000000",
      forceAdjust: false
    }
  }
]

console.log('Volume Sentinel Test Payloads:')
console.log('================================')

TEST_PAYLOADS.forEach((test, i) => {
  console.log(`\n${i + 1}. ${test.name}`)
  console.log('Payload:')
  console.log(JSON.stringify(test.payload, null, 2))
})

console.log('\n\nTo test locally:')
console.log('cre workflow simulate volume-sentinel --target local-simulation')
console.log('\nOr send HTTP POST to trigger with one of the above payloads.')
