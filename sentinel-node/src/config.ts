/**
 * Sentinel Node - Contract Data Service Configuration
 */

import * as dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
  // Server
  API_PORT: parseInt(process.env.API_PORT || '9001'),
  
  // Blockchain (for Etherscan API)
  CHAIN_ID: 11155111,
  
  // API Keys
  ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY || '',
};

// Default contracts to auto-register on startup
// Updated to latest contract addresses (March 2026)
export const DEFAULT_CONTRACTS: Array<{ address: string; name: string }> = [
  { address: '0xFA93de331FCd870D83C21A0275d8b3E7aA883F45', name: 'USDA V8' },
  { address: '0x07532372Aef9D76c1Fe08CB1C26AAB224E01d347', name: 'PolicyEngine (ACE)' },
  { address: '0x84e1b5E100393105608Ab05d549Da936cD7E995a', name: 'VolumePolicyDON' },
  { address: '0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1', name: 'EmergencyGuardian' },
  { address: '0x774B96F8d892A1e4482B52b3d255Fa269136A0E9', name: 'SentinelRegistry' },
  { address: '0x0F2672C6624540633171f4E38b316ea1ED50E3A9', name: 'SimpleFreezer' },
  { address: '0x12fe97b889158380e1D94b69718F89E521b38c11', name: 'SentinelVaultETH' },
  { address: '0xb59f7feb8e609faec000783661d4197ee38a8b07', name: 'MintingConsumerV8' },
];
