/**
 * Configuration Management
 * 
 * Minimal config for PoR trigger
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
  
  rpc: {
    sepolia: parsed.data.SEPOLIA_RPC,
  },
  
  logging: {
    level: parsed.data.LOG_LEVEL,
  },
} as const;

export type Config = typeof config;
