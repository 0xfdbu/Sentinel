/**
 * Sentinel Node v3 - Type Definitions
 */

export interface SourceFile {
  name: string;
  content: string;
}

export interface ContractFunction {
  name: string;
  signature: string;
  type: string; // 'view', 'pure', 'nonpayable', 'payable'
}

export interface RegisteredContract {
  address: string;
  name: string;
  abi: any[];
  functions: ContractFunction[];
  sourceFiles: SourceFile[];
  compilerVersion: string;
  optimizationUsed: boolean;
  runs: number;
  proxy: boolean;
  implementation?: string;
  registeredAt: number;
  lastScanned: number;
}

export interface EtherscanContract {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  OptimizationUsed: string;
  Runs: string;
  Proxy: string;
  Implementation?: string;
}

export interface CREAnalysisResult {
  threatsFound: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: string[];
}

export interface CREPayload {
  address: string;
  name: string;
  sourceCode: string;
  functions: ContractFunction[];
  compilerVersion: string;
}
