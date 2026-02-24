/**
 * CRE Workflow Service - Parses and captures CRE CLI output
 * 
 * This service runs the CRE workflow simulation and captures:
 * - USER LOG entries (the main scan progress logs)
 * - SIMULATION logs (runtime events)
 * - Workflow result JSON
 */

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';
import type { CREWorkflowResult, CREWorkflowLog } from '../types';

export class CREWorkflowService {
  private projectRoot: string;
  private creWorkflowPath: string;
  private configPath: string;

  constructor() {
    // API Server's own CRE workflow (inside api-server folder)
    this.creWorkflowPath = join(__dirname, '../../cre-workflow');
    this.projectRoot = join(this.creWorkflowPath, '..');
    this.configPath = join(this.creWorkflowPath, 'config.json');
  }

  /**
   * Create temporary config.json with API keys
   */
  private createWorkflowConfig(): void {
    const config = {
      etherscanApiKey: process.env.ETHERSCAN_API_KEY || '',
      xaiApiKey: process.env.XAI_API_KEY || '',
      xaiModel: process.env.XAI_MODEL || 'grok-4-1-fast-reasoning',
    };
    
    writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    logger.info('[CRE] Config created', { 
      etherscanKeySet: !!config.etherscanApiKey, 
      xaiKeySet: !!config.xaiApiKey,
      xaiModel: config.xaiModel 
    });
  }

  /**
   * Run CRE workflow and capture all output with proper log parsing
   * @param transactionContext - Optional transaction details for real-time threat analysis
   */
  async analyzeContract(
    contractAddress: string, 
    chainId: number,
    transactionContext?: any
  ): Promise<CREWorkflowResult> {
    this.createWorkflowConfig();
    
    const payload = JSON.stringify({ 
      contractAddress, 
      chainId,
      transactionContext 
    });
    logger.info('[CRE] Starting workflow', { 
      contractAddress, 
      chainId,
      hasTransactionContext: !!transactionContext 
    });

    return new Promise((resolve, reject) => {
      const logs: CREWorkflowLog[] = [];
      let rawOutput = '';
      
      const child = spawn('cre', [
        'workflow',
        'simulate',
        this.creWorkflowPath,
        '-R', this.projectRoot,
        '--target=hackathon-settings',
        '--non-interactive',
        '--trigger-index=0',
        '--http-payload',
        payload,
      ], {
        cwd: this.projectRoot,
        env: { ...process.env },
      });

      // Buffer for incomplete lines
      let stdoutBuffer = '';
      let stderrBuffer = '';

      // Capture stdout
      child.stdout.on('data', (data: Buffer) => {
        stdoutBuffer += data.toString();
        rawOutput += data.toString();
        
        // Process complete lines
        const lines = stdoutBuffer.split('\n');
        stdoutBuffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        lines.forEach((line: string) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          
          const parsed = this.parseLogLine(trimmed);
          if (parsed) {
            logs.push(parsed);
          }
        });
      });

      // Capture stderr
      child.stderr.on('data', (data: Buffer) => {
        stderrBuffer += data.toString();
        rawOutput += data.toString();
        
        const lines = stderrBuffer.split('\n');
        stderrBuffer = lines.pop() || '';
        
        lines.forEach((line: string) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          
          logs.push({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: this.stripAnsi(trimmed)
          });
        });
      });

      // Handle completion
      child.on('close', (code: number | null) => {
        // Process any remaining buffered content
        if (stdoutBuffer.trim()) {
          const parsed = this.parseLogLine(stdoutBuffer.trim());
          if (parsed) logs.push(parsed);
        }
        
        const success = code === 0;
        logger.info('[CRE] Process closed', { code, success, logsCaptured: logs.length });
        
        // Parse result from logs - look for the JSON result
        let resultData = null;
        
        // Look for "Workflow Simulation Result:" line and parse the JSON
        for (let i = 0; i < logs.length; i++) {
          const logMsg = logs[i].message;
          
          if (logMsg.includes('Workflow Simulation Result:')) {
            // Check if JSON is on the same line after the colon
            const sameLineMatch = logMsg.match(/Workflow Simulation Result:\s*(.+)$/);
            if (sameLineMatch && sameLineMatch[1].trim() !== '' && sameLineMatch[1].trim() !== '...') {
              try {
                const jsonStr = this.cleanJsonString(sameLineMatch[1].trim());
                resultData = JSON.parse(jsonStr);
                logger.info('[CRE] Result parsed from same line');
                break;
              } catch (e) {
                logger.warn('[CRE] Failed to parse same-line result', { error: (e as Error).message });
              }
            }
            // Check next log entry for the JSON
            if (i + 1 < logs.length) {
              try {
                const nextLine = this.cleanJsonString(logs[i + 1].message);
                resultData = JSON.parse(nextLine);
                logger.info('[CRE] Result parsed from next line');
                break;
              } catch (e) {
                logger.warn('[CRE] Failed to parse next-line result', { error: (e as Error).message });
              }
            }
          }
        }
        
        // Also try to extract directly from raw output as fallback
        if (!resultData) {
          // Try multiple patterns to find the JSON result
          const patterns = [
            /Workflow Simulation Result:\s*\n?\s*({[\s\S]+?})(?:\n\n|\n2026|$)/,
            /Workflow Simulation Result:\s*\n?\s*"({[\s\S]+?})"(?:\n\n|\n2026|$)/,
            /Workflow Simulation Result:\s*\n?\s*"({[\s\S]+})"/,
          ];
          
          for (const pattern of patterns) {
            const rawMatch = rawOutput.match(pattern);
            if (rawMatch) {
              try {
                const jsonStr = this.cleanJsonString(rawMatch[1].trim());
                resultData = JSON.parse(jsonStr);
                logger.info('[CRE] Result parsed from raw output');
                break;
              } catch (e) {
                logger.warn('[CRE] Failed to parse with pattern', { error: (e as Error).message });
              }
            }
          }
        }
        
        // Last resort: try to find any JSON object with riskLevel in the raw output
        if (!resultData) {
          const jsonMatch = rawOutput.match(/{[\s\S]*"riskLevel"[\s\S]*}/);
          if (jsonMatch) {
            try {
              const jsonStr = this.cleanJsonString(jsonMatch[0]);
              resultData = JSON.parse(jsonStr);
              logger.info('[CRE] Result parsed from riskLevel pattern');
            } catch (e) {
              logger.warn('[CRE] Failed to parse riskLevel pattern', { error: (e as Error).message });
            }
          }
        }
        
        resolve({
          success,
          logs,
          result: resultData,
          rawOutput,
          error: success ? undefined : `Process exited with code ${code}`
        });
      });

      child.on('error', (error: Error) => {
        logger.error('[CRE] Spawn error', { error: error.message });
        reject(error);
      });
    });
  }

  /**
   * Strip ANSI escape codes from string
   */
  private stripAnsi(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\u001b\[\d+(?:;\d+)*m/g, '');
  }

  /**
   * Clean JSON string for parsing
   * Handles double-escaped JSON from CRE CLI output
   * Uses JSON.parse on the string as a JSON string literal to handle all escaping
   */
  private cleanJsonString(str: string): string {
    let cleaned = str.trim();
    
    // If the string is wrapped in quotes, parse it as a JSON string literal
    // This handles all escape sequences correctly
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      try {
        cleaned = JSON.parse(cleaned);
      } catch (e) {
        // If parsing fails, continue with manual cleaning
        logger.warn('[CRE] Failed to parse as JSON string literal, using manual cleaning');
        cleaned = cleaned.slice(1, -1);
      }
    }
    
    return cleaned.trim();
  }

  /**
   * Parse a log line from CRE CLI output
   * Extracts structured logs from various formats
   */
  private parseLogLine(line: string): CREWorkflowLog | null {
    // Strip ANSI codes first
    const clean = this.stripAnsi(line);
    
    // Skip empty lines
    if (!clean.trim()) return null;
    
    // Parse timestamp format: 2026-02-20T15:01:13Z [SIMULATION] ...
    // or: 2026-02-20T15:01:13Z [USER LOG] ...
    const timestampMatch = clean.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\s+\[([^\]]+)\]\s*(.+)$/);
    
    if (timestampMatch) {
      const [, timestamp, logType, message] = timestampMatch;
      
      // Handle USER LOG entries (the main user-facing logs)
      if (logType === 'USER LOG') {
        return {
          timestamp,
          level: this.parseUserLogLevel(message),
          message: this.formatUserLogMessage(message)
        };
      }
      
      // Handle SIMULATION entries
      if (logType === 'SIMULATION') {
        return {
          timestamp,
          level: 'simulation',
          message
        };
      }
      
      // Other timestamped logs
      return {
        timestamp,
        level: logType.toLowerCase(),
        message: `[${logType}] ${message}`
      };
    }
    
    // Parse Workflow Simulation Result line
    if (clean.includes('Workflow Simulation Result:')) {
      const resultMatch = clean.match(/Workflow Simulation Result:\s*(.+)$/);
      if (resultMatch && resultMatch[1].trim()) {
        return {
          timestamp: new Date().toISOString(),
          level: 'result',
          message: `Workflow Simulation Result: ${resultMatch[1].trim().substring(0, 200)}...`
        };
      }
      return {
        timestamp: new Date().toISOString(),
        level: 'result',
        message: 'Workflow Simulation Result:'
      };
    }
    
    // Parse other output lines
    if (clean.includes('Workflow compiled') || 
        clean.includes('HTTP Trigger Configuration') ||
        clean.includes('Parsed JSON input') ||
        clean.includes('Created HTTP trigger')) {
      return {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: clean
      };
    }
    
    // Skip warning/update lines
    if (clean.startsWith('⚠️') || clean.includes('Update available') || clean.includes('cre update')) {
      return null;
    }
    
    // Default: log as raw output
    return {
      timestamp: new Date().toISOString(),
      level: 'raw',
      message: clean
    };
  }

  /**
   * Parse the log level from USER LOG messages
   */
  private parseUserLogLevel(message: string): 'success' | 'error' | 'warn' | 'info' | 'user' {
    const lower = message.toLowerCase();
    
    // Check for success indicators
    if (message.includes('✓') || 
        message.includes('SCAN COMPLETE') || 
        lower.includes('secured by tee') ||
        message.includes('Source fetched')) {
      return 'success';
    }
    
    // Check for step/info indicators
    if (message.includes('[STEP') || 
        message.includes('Fetching') || 
        message.includes('Analysis') ||
        message.includes('Target:') ||
        message.includes('Chain:') ||
        message.includes('SENTINEL SECURITY SCAN') ||
        message.includes('🔒')) {
      return 'info';
    }
    
    // Check for warnings
    if (lower.includes('warning') || lower.includes('⚠️') || message.includes('Risk Level: MEDIUM')) {
      return 'warn';
    }
    
    // Check for errors
    if (lower.includes('error') || lower.includes('failed') || message.includes('❌') ||
        message.includes('Risk Level: HIGH') || message.includes('Risk Level: CRITICAL')) {
      return 'error';
    }
    
    // Risk levels
    if (message.includes('Risk Level: LOW') || message.includes('Risk Level: SAFE')) {
      return 'success';
    }
    
    return 'user';
  }

  /**
   * Format user log messages for better readability
   */
  private formatUserLogMessage(message: string): string {
    // Clean up the message but preserve the structure
    return message
      .replace(/={10,}/g, '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      .trim();
  }
}

export const creWorkflowService = new CREWorkflowService();
