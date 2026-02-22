require('@nomicfoundation/hardhat-toolbox');
require('@nomicfoundation/hardhat-verify');
require('dotenv').config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000';
const ALCHEMY_KEY = process.env.ALCHEMY_KEY || '';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';

// Tenderly Sepolia Gateway
const SEPOLIA_RPC = 'https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH';

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.20',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.8.26',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: 'cancun',
        },
      },
    ],
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
    sources: "./deploy-contracts",
    tests: "../test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
};
