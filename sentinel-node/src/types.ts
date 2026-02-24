/**
 * Sentinel Node Types
 */

export interface MonitoredContract {
  address: string;
  isPaused: boolean;
}

export interface ThreatEvent {
  id: string;
  type: 'THREAT_DETECTED';
  contractAddress: string;
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  details: string;
  txHash: string;
  timestamp: number;
  confidence: number;
  metadata?: any;
}

export interface AnalysisResult {
  riskLevel: string;
  overallScore: number;
  vulnerabilities: any[];
  contractName?: string;
}

export interface TransactionContext {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  data: string;
}
