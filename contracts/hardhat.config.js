require('@nomicfoundation/hardhat-toolbox');
require('@nomicfoundation/hardhat-verify');
require('dotenv').config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000';
const ALCHEMY_KEY = process.env.ALCHEMY_KEY || '';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';

// Public Sepolia RPC endpoints (fallback if no Alchemy)
const SEPOLIA_RPC = ALCHEMY_KEY && ALCHEMY_KEY !== 'demo'
  ? `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : 'https://ethereum-sepolia.publicnode.com';

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.19',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_RPC,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  paths: {
    sources: "./test-contracts",
    tests: "../test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
