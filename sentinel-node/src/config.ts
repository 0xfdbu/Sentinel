/**
 * Sentinel Node Configuration
 */

import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

export const CONFIG = {
  // Server ports
  WS_PORT: parseInt(process.env.WS_PORT || '9000'),
  API_PORT: parseInt(process.env.API_PORT || '9001'),
  
  // Blockchain
  RPC_URL: process.env.SEPOLIA_RPC || 'https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH',
  CHAIN_ID: 11155111,
  
  // Contracts
  GUARDIAN_ADDRESS: process.env.GUARDIAN_ADDRESS || '0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1',
  REGISTRY_ADDRESS: process.env.REGISTRY_ADDRESS || '0x774B96F8d892A1e4482B52b3d255Fa269136A0E9',
  
  // Demo contracts
  VAULT_ADDRESS: '0x22650892Ce8db57fCDB48AE8b3508F52420A727A',
  DRAINER_ADDRESS: '0x997E47e8169b1A9112F9Bc746De6b2b74c3B5AE1',
  
  // Credentials
  PRIVATE_KEY: process.env.SENTINEL_PRIVATE_KEY || '',
  
  // CRE (Sentinel's own workflow)
  CRE_WORKFLOW_PATH: process.env.CRE_WORKFLOW_PATH || join(__dirname, '../cre-workflow'),
  
  // Polling
  POLL_INTERVAL_MS: parseInt(process.env.POLL_INTERVAL_MS || '1000'),
  MAX_BLOCKS_PER_POLL: parseInt(process.env.MAX_BLOCKS_PER_POLL || '10'),
  
  // Thresholds
  SUSPICIOUS_VALUE_ETH: parseFloat(process.env.SUSPICIOUS_VALUE_ETH || '0.0001'),
};

// ABIs
export const GUARDIAN_ABI = [
  'function emergencyPause(address target, bytes32 vulnerabilityHash) external',
  'function emergencyUnpause(address target) external',
  'function isPaused(address target) view returns (bool)',
];

export const REGISTRY_ABI = [
  'function getProtectedContracts(uint256 offset, uint256 limit) view returns (address[])',
];

// Known attack signatures
export const ATTACK_SIGNATURES: Record<string, string> = {
  '0x64dd891a': 'attack(uint256)',
};

export const SUSPICIOUS_SIGNATURES: Record<string, string> = {
  '0x3ccfd60b': 'withdraw()',
  '0x2e1a7d4d': 'withdraw(uint256)',
  '0x3659cfe6': 'upgradeTo(address)',
};
