/**
 * Configuration Management
 * 
 * Loads and validates environment configuration
 */

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  // Server
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Frontend
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  
  // API Keys
  ETHERSCAN_API_KEY: z.string().min(1, 'Etherscan API key is required'),
  XAI_API_KEY: z.string().min(1, 'XAI API key is required'),
  XAI_MODEL: z.string().default('grok-4-1-fast-reasoning'),
  
  // RPC
  SEPOLIA_RPC: z.string().default('https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid configuration:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const config = {
  server: {
    port: parseInt(parsed.data.PORT, 10),
    env: parsed.data.NODE_ENV,
    isDev: parsed.data.NODE_ENV === 'development',
    isProd: parsed.data.NODE_ENV === 'production',
  },
  
  frontend: {
    url: parsed.data.FRONTEND_URL,
  },
  
  apis: {
    etherscan: {
      key: parsed.data.ETHERSCAN_API_KEY,
      baseUrl: 'https://api.etherscan.io/v2/api',
    },
    xai: {
      key: parsed.data.XAI_API_KEY,
      model: parsed.data.XAI_MODEL,
      baseUrl: 'https://api.x.ai/v1',
    },
  },
  
  rpc: {
    sepolia: parsed.data.SEPOLIA_RPC,
  },
  
  logging: {
    level: parsed.data.LOG_LEVEL,
  },
} as const;

export type Config = typeof config;
