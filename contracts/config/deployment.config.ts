/**
 * Sentinel ACE Deployment Configuration
 * @notice Network-specific configurations for Sentinel ACE deployment
 * @dev Configure gas limits, policy settings, and sentinel nodes per network
 */

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  blockConfirmations: number;
  gasSettings: {
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    gasLimit: number;
  };
  policies: {
    volumePolicy: {
      enabled: boolean;
      minValue: string; // in wei
      maxValue: string; // in wei
      dailyVolumeLimit: string; // in wei
    };
    blacklistPolicy: {
      enabled: boolean;
      initialBlacklist: string[];
    };
    functionSigPolicy: {
      enabled: boolean;
    };
  };
  policyPriorities: {
    blacklist: number;
    volume: number;
    functionSig: number;
  };
  sentinelNodes: string[];
  pauseThreshold: number; // 0-4 (OK to CRITICAL)
  verifyContracts: boolean;
}

export const networkConfigs: Record<string, NetworkConfig> = {
  hardhat: {
    name: "hardhat",
    chainId: 31337,
    rpcUrl: "http://localhost:8545",
    blockConfirmations: 1,
    gasSettings: {
      gasLimit: 3000000,
    },
    policies: {
      volumePolicy: {
        enabled: true,
        minValue: "1000000000000000", // 0.001 ETH
        maxValue: "100000000000000000000", // 100 ETH
        dailyVolumeLimit: "1000000000000000000000", // 1000 ETH
      },
      blacklistPolicy: {
        enabled: true,
        initialBlacklist: [
          "0x0000000000000000000000000000000000000001", // Known phishing
          "0x0000000000000000000000000000000000000002", // Suspicious bot
          "0x0000000000000000000000000000000000000bad", // Scam contract
        ],
      },
      functionSigPolicy: {
        enabled: true,
      },
    },
    policyPriorities: {
      blacklist: 100, // Highest priority - block first
      volume: 80,
      functionSig: 60,
    },
    sentinelNodes: [],
    pauseThreshold: 3, // HIGH severity triggers pause
    verifyContracts: false,
  },

  sepolia: {
    name: "sepolia",
    chainId: 11155111,
    rpcUrl: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
    blockConfirmations: 3,
    gasSettings: {
      maxFeePerGas: "50000000000", // 50 gwei
      maxPriorityFeePerGas: "2000000000", // 2 gwei
      gasLimit: 3000000,
    },
    policies: {
      volumePolicy: {
        enabled: true,
        minValue: "1000000000000000", // 0.001 ETH
        maxValue: "100000000000000000000", // 100 ETH
        dailyVolumeLimit: "1000000000000000000000", // 1000 ETH
      },
      blacklistPolicy: {
        enabled: true,
        initialBlacklist: [
          "0x0000000000000000000000000000000000000001",
          "0x0000000000000000000000000000000000000002",
          "0x0000000000000000000000000000000000000bad",
        ],
      },
      functionSigPolicy: {
        enabled: true,
      },
    },
    policyPriorities: {
      blacklist: 100,
      volume: 80,
      functionSig: 60,
    },
    sentinelNodes: [
      // Add Sepolia CRE workflow addresses here after deployment
    ],
    pauseThreshold: 3,
    verifyContracts: true,
  },

  mainnet: {
    name: "mainnet",
    chainId: 1,
    rpcUrl: process.env.MAINNET_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}",
    blockConfirmations: 5,
    gasSettings: {
      maxFeePerGas: "100000000000", // 100 gwei max
      maxPriorityFeePerGas: "2000000000", // 2 gwei
      gasLimit: 3000000,
    },
    policies: {
      volumePolicy: {
        enabled: true,
        minValue: "100000000000000000", // 0.1 ETH
        maxValue: "500000000000000000000", // 500 ETH
        dailyVolumeLimit: "5000000000000000000000", // 5000 ETH
      },
      blacklistPolicy: {
        enabled: true,
        initialBlacklist: [],
        // Load from external threat intelligence source
      },
      functionSigPolicy: {
        enabled: true,
      },
    },
    policyPriorities: {
      blacklist: 100,
      volume: 80,
      functionSig: 60,
    },
    sentinelNodes: [],
    pauseThreshold: 3,
    verifyContracts: true,
  },

  arbitrumSepolia: {
    name: "arbitrumSepolia",
    chainId: 421614,
    rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
    blockConfirmations: 3,
    gasSettings: {
      gasLimit: 10000000, // Arbitrum has different gas mechanics
    },
    policies: {
      volumePolicy: {
        enabled: true,
        minValue: "1000000000000000",
        maxValue: "100000000000000000000",
        dailyVolumeLimit: "1000000000000000000000",
      },
      blacklistPolicy: {
        enabled: true,
        initialBlacklist: [],
      },
      functionSigPolicy: {
        enabled: true,
      },
    },
    policyPriorities: {
      blacklist: 100,
      volume: 80,
      functionSig: 60,
    },
    sentinelNodes: [],
    pauseThreshold: 3,
    verifyContracts: true,
  },

  baseSepolia: {
    name: "baseSepolia",
    chainId: 84532,
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    blockConfirmations: 3,
    gasSettings: {
      gasLimit: 3000000,
    },
    policies: {
      volumePolicy: {
        enabled: true,
        minValue: "1000000000000000",
        maxValue: "100000000000000000000",
        dailyVolumeLimit: "1000000000000000000000",
      },
      blacklistPolicy: {
        enabled: true,
        initialBlacklist: [],
      },
      functionSigPolicy: {
        enabled: true,
      },
    },
    policyPriorities: {
      blacklist: 100,
      volume: 80,
      functionSig: 60,
    },
    sentinelNodes: [],
    pauseThreshold: 3,
    verifyContracts: true,
  },
};

/**
 * Contract verification settings
 */
export const verificationConfig = {
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
    apiUrls: {
      mainnet: "https://api.etherscan.io/api",
      sepolia: "https://api-sepolia.etherscan.io/api",
      arbitrumSepolia: "https://api-sepolia.arbiscan.io/api",
      baseSepolia: "https://api-sepolia.basescan.org/api",
    },
  },
  sourcify: {
    enabled: true,
  },
};

/**
 * Get configuration for a specific network
 */
export function getNetworkConfig(networkName: string): NetworkConfig {
  const config = networkConfigs[networkName];
  if (!config) {
    throw new Error(`Unknown network: ${networkName}. Available: ${Object.keys(networkConfigs).join(", ")}`);
  }
  return config;
}

/**
 * Load custom configuration from environment
 */
export function loadCustomConfig(): Partial<NetworkConfig> {
  return {
    sentinelNodes: process.env.SENTINEL_NODES?.split(",") || [],
    pauseThreshold: process.env.PAUSE_THRESHOLD ? parseInt(process.env.PAUSE_THRESHOLD) : undefined,
  };
}

export default networkConfigs;
