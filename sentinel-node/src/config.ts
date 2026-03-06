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
export const DEFAULT_CONTRACTS: Array<{ address: string; name: string }> = [
  { address: '0x500D640f4fE39dAF609C6E14C83b89A68373EaFe', name: 'USDA V7' },
  { address: '0x1b4228DF8cB455020AF741A9C8Adb6Af44Dcc2F1', name: 'BlacklistPolicyDON' },
  { address: '0x2e3Df8D5b19e1576Ec5aAd849438C41897974E33', name: 'VolumePolicyDON V2' },
  { address: '0x846dAf7FD884e7a8D4bBDa74462d50AafebE0BFA', name: 'EmergencyGuardianV2' },
  { address: '0xd8E5061dCde3dC7e5Ff01f54b9B5b369DEf1fDB9', name: 'SentinelRegistryV3' },
];
