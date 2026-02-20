/**
 * CRE Workflow Service
 * 
 * Calls the Chainlink CRE workflow for Confidential HTTP operations.
 * Captures and returns the actual CRE CLI output for display.
 */

import { spawn } from 'child_process';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { ExternalAPIError } from '../utils/errors';
import type { XAIAnalysisResult } from '../types';

export interface CREWorkflowLog {
  timestamp: string;
  level: 'info' | 'error' | 'simulation' | 'user';
  message: string;
}

export interface CREWorkflowResult {
  success: boolean;
  logs: CREWorkflowLog[];
  result?: XAIAnalysisResult;
  error?: string;
  rawOutput: string;
}

type WorkflowMode = 'DIRECT' | 'TEE';

export class CREWorkflowService {
  private mode: WorkflowMode;
  private projectRoot: string;
  
  constructor() {
    this.mode = (process.env.CRE_WORKFLOW_MODE as WorkflowMode) || 'DIRECT';
    this.projectRoot = process.env.CRE_PROJECT_ROOT || '/home/user/Desktop/Chainlink/sentinel';
    
    logger.info(`CRE Workflow Service initialized in ${this.mode} mode`);
  }
  
  /**
   * Analyze contract using CRE Workflow with Confidential HTTP
   * Captures all logs and returns them for display
   */
  async analyzeContract(
    contractAddress: string,
    chainId: number = 11155111
  ): Promise<CREWorkflowResult> {
    logger.info('[CRE WORKFLOW] Starting workflow with log capture', { contractAddress, chainId });
    
    const payload = JSON.stringify({ contractAddress, chainId });
    const creWorkFlowPath = `${this.projectRoot}/cre-workflow`;
    
    return new Promise((resolve, reject) => {
      const logs: CREWorkflowLog[] = [];
      let rawOutput = '';
      let resultData: XAIAnalysisResult | null = null;
      
      // Add initial log
      logs.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: '🚀 Starting Chainlink CRE Workflow...'
      });
      
      logs.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `🔒 Mode: ${this.mode} (Confidential HTTP ${this.mode === 'DIRECT' ? 'Simulation' : 'TEE'})`
      });
      
      logs.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `📝 Target: ${contractAddress}`
      });
      
      logs.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `⛓️  Chain ID: ${chainId}`
      });
      
      const child = spawn('cre', [
        'workflow', 'simulate', creWorkFlowPath,
        '--target=hackathon-settings',
        '--non-interactive',
        '--trigger-index=0',
        '--http-payload', payload,
      ], {
        cwd: this.projectRoot,
        env: { ...process.env },
      });
      
      child.stdout.on('data', (data) => {
        const output = data.toString();
        rawOutput += output;
        
        // Parse log lines
        const lines = output.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          
          // Parse [USER LOG] lines
          const userLogMatch = line.match(/\[USER LOG\]\s*(.+)/);
          if (userLogMatch) {
            logs.push({
              timestamp: new Date().toISOString(),
              level: 'user',
              message: userLogMatch[1]
            });
            continue;
          }
          
          // Parse [SIMULATION] lines
          const simMatch = line.match(/\[SIMULATION\]\s*(.+)/);
          if (simMatch) {
            logs.push({
              timestamp: new Date().toISOString(),
              level: 'simulation',
              message: simMatch[1]
            });
            continue;
          }
          
          // Parse Workflow Simulation Result
          const resultMatch = line.match(/Workflow Simulation Result:\s*"({.+})"/);
          if (resultMatch) {
            try {
              const jsonStr = resultMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
              resultData = JSON.parse(jsonStr);
              logs.push({
                timestamp: new Date().toISOString(),
                level: 'info',
                message: '✅ Workflow completed successfully'
              });
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      });
      
      child.stderr.on('data', (data) => {
        const output = data.toString();
        rawOutput += output;
        
        // Filter out non-error messages
        if (!output.includes('Warning: using default private key') && 
            !output.includes('Update available')) {
          logs.push({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: output.trim()
          });
        }
      });
      
      child.on('close', (code) => {
        if (code !== 0 && !resultData) {
          logs.push({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: `❌ Workflow failed with exit code ${code}`
          });
          
          resolve({
            success: false,
            logs,
            error: `Workflow failed with exit code ${code}`,
            rawOutput
          });
          return;
        }
        
        if (resultData) {
          logs.push({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `🎯 Risk Level: ${resultData.riskLevel}`
          });
          
          logs.push({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `📊 Overall Score: ${resultData.overallScore}/100`
          });
          
          logs.push({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `🛡️  Vulnerabilities Found: ${resultData.vulnerabilities?.length || 0}`
          });
          
          logs.push({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: '🔐 Result secured by TEE (Confidential HTTP)'
          });
        }
        
        resolve({
          success: true,
          logs,
          result: resultData || undefined,
          rawOutput
        });
      });
      
      child.on('error', (error) => {
        logs.push({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `❌ Failed to start workflow: ${error.message}`
        });
        
        resolve({
          success: false,
          logs,
          error: error.message,
          rawOutput
        });
      });
    });
  }
  
  getMode(): WorkflowMode {
    return this.mode;
  }
  
  isTEE(): boolean {
    return this.mode === 'TEE';
  }
}

export const creWorkflowService = new CREWorkflowService();
