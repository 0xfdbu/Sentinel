/**
 * Type Definitions
 * 
 * Centralized type definitions for the Sentinel API Server
 */

// ============================================================================
// Etherscan Types
// ============================================================================

export interface EtherscanSourceResult {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  OptimizationUsed: string;
  Runs: string;
  ConstructorArguments: string;
  EVMVersion: string;
  Library: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
  SwarmSource: string;
}

export interface EtherscanResponse {
  status: string;
  message: string;
  result: EtherscanSourceResult[];
}

// ============================================================================
// XAI Analysis Types
// ============================================================================

export interface VulnerabilityFinding {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  description: string;
  lineNumbers?: number[];
  codeSnippet?: string;
  confidence: number;
  recommendation: string;
}

export interface XAIAnalysisResult {
  status: 'success' | 'error';
  contractAddress: string;
  contractName: string;
  chainId: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE';
  summary: string;
  vulnerabilities: VulnerabilityFinding[];
  overallScore: number;
  timestamp: number;
  error?: string;
  confidential?: boolean;
  tee?: boolean;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface ScanRequest {
  contractAddress: string;
  chainId?: number;
}

export interface CRELogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn' | 'success' | 'raw' | 'simulation' | 'user' | 'result';
  message: string;
}

export interface ScanResponse {
  scanId: string;
  status: 'pending' | 'completed' | 'error';
  contractAddress: string;
  result?: XAIAnalysisResult;
  error?: string;
  creLogs?: CRELogEntry[];
  rawOutput?: string;
}

export interface FraudCheckRequest {
  tx: {
    hash: string;
    from: string;
    to?: string;
    value: string;
    gas: number;
    gasPrice: string;
    input: string;
  };
  contractAddress: string;
}

export interface FraudCheckResult {
  score: number;
  factors: string[];
  shouldPause: boolean;
  shouldRescue?: boolean;
  recommendedAction?: 'MONITOR' | 'PAUSE' | 'CONFIDENTIAL_RESCUE';
  confidence: number;
  timestamp: number;
}

// ============================================================================
// WebSocket Event Types
// ============================================================================

export type EventType = 
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'SCAN_STARTED'
  | 'SCAN_COMPLETED'
  | 'SCAN_ERROR'
  | 'ALERT'
  | 'AUTO_PAUSE_TRIGGERED';

export interface WebSocketEvent {
  type: EventType;
  timestamp: number;
  data?: any;
}

// ============================================================================
// Monitor Types
// ============================================================================

export type ThreatLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type EventAction = 'PAUSED' | 'ALERTED' | 'LOGGED';

export interface MonitorEvent {
  id: string;
  timestamp: number;
  level: ThreatLevel;
  type: string;
  contractAddress: string;
  txHash: string;
  from: string;
  details: string;
  value?: string;
  confidence: number;
  action?: EventAction;
}

export interface MonitorStatus {
  isRunning: boolean;
  lastBlock: number;
  contractsMonitored: number;
  threatsDetected: number;
  websocketClients: number;
}

// ============================================================================
// CRE Workflow Types
// ============================================================================

export interface CREWorkflowLog {
  timestamp: string;
  level: 'info' | 'error' | 'warn' | 'success' | 'raw' | 'simulation' | 'user' | 'result' | string;
  message: string;
}

export interface CREWorkflowResult {
  success: boolean;
  logs: CREWorkflowLog[];
  result: any;
  rawOutput: string;
  error?: string;
}
