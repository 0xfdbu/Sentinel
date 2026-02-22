import { defineConfig } from '@chainlink/cre-sdk';

/**
 * Chainlink Runtime Environment (CRE) Configuration
 * 
 * This config enables:
 * - Confidential HTTP (hiding API keys)
 * - LLM integration (xAI Grok for security analysis)
 * - Confidential Compute (private transaction execution)
 * - Hardhat local network integration
 */

export default defineConfig({
  name: 'sentinel',
  version: '1.0.0',
  
  // Network configuration
  networks: {
    hardhat: {
      chainId: 31337,
      url: 'http://127.0.0.1:8545',
      // Accounts are auto-fetched from Hardhat
    },
    sepolia: {
      chainId: 11155111,
      url: process.env.SEPOLIA_RPC || 'https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH',
    },
  },

  // Workflow defaults
  defaults: {
    gasLimit: 500000,
    maxFeePerGas: '50000000000', // 50 gwei
    maxPriorityFeePerGas: '2000000000', // 2 gwei
  },

  // Secrets configuration
  secrets: {
    // API Keys
    etherscanApiKey: process.env.ETHERSCAN_API_KEY,
    grokApiKey: process.env.GROK_API_KEY,
    
    // Contract addresses (update after deployment)
    guardianContractAddress: process.env.GUARDIAN_ADDRESS,
    auditLoggerAddress: process.env.AUDIT_LOGGER_ADDRESS,
    registryContractAddress: process.env.REGISTRY_ADDRESS,
    
    // Execution wallet (should be authorized as Sentinel)
    sentinelPrivateKey: process.env.SENTINEL_PRIVATE_KEY,
  },

  // Workflow settings
  workflow: {
    // Timeout for each step
    stepTimeout: 30000,
    
    // Retry configuration
    retries: 3,
    retryDelay: 1000,
    
    // Logging
    logLevel: 'info',
    
    // Confidential compute settings
    confidentialCompute: {
      // TEE endpoint (for production)
      endpoint: process.env.CRE_TEE_ENDPOINT,
      
      // Local simulation mode (for Hardhat testing)
      simulate: process.env.NODE_ENV === 'development',
    },
  },

  // External services
  services: {
    // Etherscan API for contract source
    etherscan: {
      baseUrl: 'https://api.etherscan.io/v2',
      apiKey: process.env.ETHERSCAN_API_KEY,
    },
    
    // xAI Grok for security analysis
    xai: {
      baseUrl: 'https://api.x.ai/v1',
      apiKey: process.env.GROK_API_KEY,
      model: 'grok-4-1-fast-reasoning',
    },
  },
});
