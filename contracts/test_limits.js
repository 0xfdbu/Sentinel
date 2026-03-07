const { ethers } = require('ethers');

// Contracts
const VOLUME_POLICY = '0x2e3Df8D5b19e1576Ec5aAd849438C41897974E33';
const USDA_TOKEN = '0xFA93de331FCd870D83C21A0275d8b3E7aA883F45';
const POLICY_ENGINE = '0x62CC29A58404631B7db65CE14E366F63D3B96B16';

// ABIs
const VolumePolicyABI = [
  'function dailyVolumeLimit() view returns (uint256)',
  'function setDailyLimit(uint256 limit, string calldata reason) external',
  'function POLICY_MANAGER_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function evaluate(address from, address to, uint256 value, bytes calldata) external view returns (bool, string memory, uint8)',
  'function getRemainingDailyVolume(address user) external view returns (uint256)',
  'function dailyVolume(address user) external view returns (uint256)',
  'function lastVolumeReset(address user) external view returns (uint256)'
];

const USDAABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function policyEngine() external view returns (address)'
];

const PolicyEngineABI = [
  'function enforce(address from, address to, uint256 value, bytes calldata data) external view returns (bool, string memory)'
];

async function main() {
  const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
  
  // Use the private key from env
  const pk = '0xe587e35e24afdae4e37706c9e457c81bc0932a053b13a48752f9a88d93e98115';
  const wallet = new ethers.Wallet(pk, provider);
  
  console.log('Wallet address:', wallet.address);
  
  const volumePolicy = new ethers.Contract(VOLUME_POLICY, VolumePolicyABI, wallet);
  const usda = new ethers.Contract(USDA_TOKEN, USDAABI, wallet);
  const policyEngine = new ethers.Contract(POLICY_ENGINE, PolicyEngineABI, wallet);
  
  // Check if wallet has POLICY_MANAGER_ROLE
  const managerRole = await volumePolicy.POLICY_MANAGER_ROLE();
  const hasRole = await volumePolicy.hasRole(managerRole, wallet.address);
  console.log('Has POLICY_MANAGER_ROLE:', hasRole);
  
  // Check current limit
  const currentLimit = await volumePolicy.dailyVolumeLimit();
  console.log('\n=== Current VolumePolicyDON Limits ===');
  console.log('Daily Volume Limit:', ethers.formatUnits(currentLimit, 18), 'USDA');
  
  // Check USDA balance
  const balance = await usda.balanceOf(wallet.address);
  const decimals = await usda.decimals();
  console.log('USDA Balance:', ethers.formatUnits(balance, decimals), 'USDA');
  
  // Set a low limit for testing (10 USDA) if we have the role
  if (hasRole) {
    console.log('\n=== Setting low limit (10 USDA) for testing ===');
    const lowLimit = ethers.parseUnits('10', 18);
    try {
      const tx = await volumePolicy.setDailyLimit(lowLimit, 'Test: setting low limit');
      await tx.wait();
      console.log('Transaction hash:', tx.hash);
      
      const newLimit = await volumePolicy.dailyVolumeLimit();
      console.log('New Daily Volume Limit:', ethers.formatUnits(newLimit, 18), 'USDA');
    } catch (e) {
      console.log('Error setting limit:', e.message);
    }
  }
  
  // Check remaining daily volume
  const remaining = await volumePolicy.getRemainingDailyVolume(wallet.address);
  console.log('\nRemaining Daily Volume:', ethers.formatUnits(remaining, 18), 'USDA');
  
  // Check current daily volume used
  const used = await volumePolicy.dailyVolume(wallet.address);
  console.log('Daily Volume Used:', ethers.formatUnits(used, 18), 'USDA');
  
  // Test 1: Try to evaluate a transfer of 20 USDA (should fail if limit is 10)
  const testAmount = ethers.parseUnits('20', 18);
  console.log('\n=== Test 1: Evaluate transfer of 20 USDA ===');
  console.log('Expected: Should FAIL if limit < 20');
  
  try {
    const [allowed, reason, severity] = await volumePolicy.evaluate(wallet.address, '0x0000000000000000000000000000000000000001', testAmount, '0x');
    console.log('Allowed:', allowed);
    console.log('Reason:', reason);
    console.log('Severity:', severity);
    console.log(allowed ? '✅ PASS: Transfer would be allowed' : '❌ BLOCKED: Transfer would be rejected');
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  // Test 2: Try a smaller amount (5 USDA) that should pass
  const smallAmount = ethers.parseUnits('5', 18);
  console.log('\n=== Test 2: Evaluate transfer of 5 USDA ===');
  console.log('Expected: Should PASS');
  
  try {
    const [allowed, reason, severity] = await volumePolicy.evaluate(wallet.address, '0x0000000000000000000000000000000000000001', smallAmount, '0x');
    console.log('Allowed:', allowed);
    console.log('Reason:', reason);
    console.log('Severity:', severity);
    console.log(allowed ? '✅ PASS: Transfer would be allowed' : '❌ BLOCKED: Transfer would be rejected');
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  // Test 3: Check PolicyEngine integration
  console.log('\n=== Test 3: PolicyEngine.enforce() for 20 USDA ===');
  try {
    const [allowed, reason] = await policyEngine.enforce(wallet.address, '0x0000000000000000000000000000000000000001', testAmount, '0x');
    console.log('Allowed:', allowed);
    console.log('Reason:', reason);
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  // Restore original limit if we have the role
  if (hasRole) {
    console.log('\n=== Restoring original limit ===');
    try {
      const tx = await volumePolicy.setDailyLimit(currentLimit, 'Test: restoring original limit');
      await tx.wait();
      const restoredLimit = await volumePolicy.dailyVolumeLimit();
      console.log('Restored Daily Volume Limit:', ethers.formatUnits(restoredLimit, 18), 'USDA');
    } catch (e) {
      console.log('Error restoring limit:', e.message);
    }
  }
}

main().catch(console.error);
