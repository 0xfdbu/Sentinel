/**
 * Type Definitions
 * 
 * Minimal types for PoR trigger
 */

export interface PoRTriggerRequest {
  user: string;
  ethAmount: string;
  mintRequestId: string;
  depositIndex?: number;
}

export interface PoRTriggerResponse {
  success: boolean;
  txHash?: string;
  usdaMinted?: string;
  ethPrice?: number;
  reserves?: string;
  timestamp: number;
  logs: string[];
  error?: string;
}

export interface PoRStatus {
  status: string;
  timestamp: number;
  service: string;
  workflow: string;
  priceSources: string[];
  consensusRequired: number;
  maxDeviationBps: number;
}
