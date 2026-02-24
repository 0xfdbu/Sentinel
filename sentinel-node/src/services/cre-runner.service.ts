/**
 * CRE Runner Service - Executes CRE workflow for security analysis
 */

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { CONFIG } from '../config';
import type { ThreatEvent, AnalysisResult } from '../types';

export class CRERunnerService {
  private projectRoot: string;
  private envFile: string;

  constructor() {
    this.projectRoot = join(CONFIG.CRE_WORKFLOW_PATH, '..');
    this.envFile = join(CONFIG.CRE_WORKFLOW_PATH, '.env');
  }

  /**
   * Run CRE workflow analysis with pre-fetched source code
   */
  async analyze(
    contractAddress: string,
    contractName: string,
    sourceCode: string | undefined,
    txHash: string,
    txFrom: string,
    txTo: string | null,
    txValue: bigint,
    txData: string,
    threats: ThreatEvent[]
  ): Promise<AnalysisResult> {
    // Write config with API keys
    const config = {
      etherscanApiKey: process.env.ETHERSCAN_API_KEY || '',
      xaiApiKey: process.env.XAI_API_KEY || '',
      xaiModel: process.env.XAI_MODEL || 'grok-4-1-fast-non-reasoning',
    };

    const configPath = join(CONFIG.CRE_WORKFLOW_PATH, 'config.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Build payload WITH source code (pre-fetched)
    const payload = JSON.stringify({
      contractAddress,
      chainId: 11155111,
      transactionHash: txHash,
      contractName: contractName || 'Unknown',
      sourceCode: sourceCode || '',  // Pre-fetched source!
      transactionContext: {
        hash: txHash,
        from: txFrom,
        to: txTo,
        value: formatEther(txValue),
        data: txData,
        threatSummary: threats.map(t => ({ level: t.level, details: t.details })),
      },
      urgency: 'critical',
    });

    return this.spawnCRE(payload);
  }

  /**
   * Spawn CRE process and capture output
   */
  private spawnCRE(payload: string): Promise<AnalysisResult> {
    return new Promise((resolve, reject) => {
      const child = spawn('cre', [
        'workflow',
        'simulate',
        CONFIG.CRE_WORKFLOW_PATH,
        '-R', this.projectRoot,
        '-e', this.envFile,
        '--target=hackathon-settings',
        '--non-interactive',
        '--trigger-index=0',
        '--http-payload',
        payload,
      ], {
        cwd: CONFIG.CRE_WORKFLOW_PATH,
        env: { ...process.env },
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
          if (this.shouldLogLine(cleanLine)) {
            console.log(`   │ ${cleanLine.slice(0, 58).padEnd(58)} │`);
          }
        }
        output += data.toString();
      });

      child.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        this.parseResult(output, code, errorOutput, resolve, reject);
      });
    });
  }

  /**
   * Determine if a log line should be displayed
   */
  private shouldLogLine(line: string): boolean {
    return line.includes('[STEP') ||
           line.includes('SENTINEL SECURITY SCAN') ||
           line.includes('Confidential HTTP') ||
           line.includes('xAI') ||
           line.includes('Risk Level') ||
           line.includes('tee') ||
           line.includes('✓') ||
           line.includes('🔒');
  }

  /**
   * Parse CRE output for result
   */
  private parseResult(
    output: string,
    code: number | null,
    errorOutput: string,
    resolve: (result: AnalysisResult) => void,
    reject: (error: Error) => void
  ): void {
    const match = output.match(/Workflow Simulation Result:\s*\n?\s*({[\s\S]*?}|"[\s\S]*?")\s*(?:\n\n|$)/);
    
    if (match) {
      try {
        let resultStr = match[1].trim();
        
        if (resultStr.startsWith('"') && resultStr.endsWith('"')) {
          resultStr = JSON.parse(resultStr);
        }
        
        const result = JSON.parse(resultStr);
        
        if (result.status === 'error') {
          reject(new Error(`CRE workflow error: ${result.error}`));
          return;
        }
        
        resolve({
          riskLevel: result.riskLevel || 'UNKNOWN',
          overallScore: result.overallScore || 0,
          vulnerabilities: result.vulnerabilities || [],
          contractName: result.contractName,
        });
      } catch (e) {
        reject(new Error('Failed to parse CRE result'));
      }
    } else if (code !== 0) {
      reject(new Error(`CRE failed: ${errorOutput}`));
    } else {
      reject(new Error('No result found in CRE output'));
    }
  }
}

// Helper to format ether values
function formatEther(value: bigint): string {
  // Simple formatter - in real code use ethers.formatEther
  const ether = Number(value) / 1e18;
  return ether.toString();
}
