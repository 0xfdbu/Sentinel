#!/usr/bin/env node
/**
 * CRE Workflow Test Runner
 * 
 * Runs the CRE workflow against various test payloads to validate:
 * - Safe contracts pass
 * - Vulnerable contracts are detected
 * - Blacklist violations trigger CRITICAL
 * - Attack functions are caught
 * - High value transactions alert
 * 
 * Usage:
 *   npx ts-node tests/run-cre-tests.ts [test-name]
 *   npx ts-node tests/run-cre-tests.ts all
 *   npx ts-node tests/run-cre-tests.ts vulnerable-reentrancy
 */

import { spawn } from 'child_process';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Configuration
const CRE_WORKFLOW_PATH = join(__dirname, '../../cre-workflow');
const PAYLOADS_DIR = join(__dirname, 'payloads');
const PROJECT_ROOT = join(CRE_WORKFLOW_PATH, '..');

// Test result tracking
interface TestResult {
  name: string;
  passed: boolean;
  expectedRisk: string;
  actualRisk: string;
  aceAction: string;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

/**
 * Run single test with payload
 */
async function runTest(payloadName: string): Promise<TestResult> {
  const payloadPath = join(PAYLOADS_DIR, `${payloadName}.json`);
  const startTime = Date.now();
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 Running test: ${payloadName}`);
  console.log('='.repeat(70));
  
  try {
    // Read and parse payload
    const payload = JSON.parse(readFileSync(payloadPath, 'utf8'));
    const expectedRisk = payload._description.includes('CRITICAL') ? 'CRITICAL' :
                        payload._description.includes('HIGH') ? 'HIGH' :
                        payload._description.includes('MEDIUM') ? 'MEDIUM' : 'SAFE';
    
    console.log(`📋 ${payload._description}`);
    console.log(`🎯 Expected Risk: ${expectedRisk}`);
    console.log('');
    
    // Run CRE workflow
    const result = await spawnCRE(payload);
    const duration = Date.now() - startTime;
    
    // Parse result
    const actualRisk = result.riskLevel || 'UNKNOWN';
    const aceAction = result.compliance?.recommendedAction || 'UNKNOWN';
    
    // Determine pass/fail
    let passed = false;
    if (expectedRisk === 'SAFE') {
      passed = actualRisk === 'SAFE' || actualRisk === 'LOW';
    } else if (expectedRisk === 'CRITICAL') {
      passed = actualRisk === 'CRITICAL' || actualRisk === 'HIGH';
    } else {
      passed = actualRisk === expectedRisk;
    }
    
    const testResult: TestResult = {
      name: payloadName,
      passed,
      expectedRisk,
      actualRisk,
      aceAction,
      duration,
    };
    
    console.log(`\n${passed ? '✅ PASS' : '❌ FAIL'} (took ${duration}ms)`);
    console.log(`   Expected: ${expectedRisk}, Got: ${actualRisk}`);
    console.log(`   ACE Action: ${aceAction}`);
    
    return testResult;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ ERROR: ${error}`);
    
    return {
      name: payloadName,
      passed: false,
      expectedRisk: 'UNKNOWN',
      actualRisk: 'ERROR',
      aceAction: 'ERROR',
      duration,
      error: String(error),
    };
  }
}

/**
 * Spawn CRE process and capture result
 * Supports BROADCAST env var to show on-chain calls
 */
function spawnCRE(payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const useBroadcast = process.env.BROADCAST === 'true';
    
    const args = [
      'workflow',
      'simulate',
      CRE_WORKFLOW_PATH,
      '-R', PROJECT_ROOT,
      '--target=hackathon-settings',
      '--non-interactive',
      '--trigger-index=0',
      '--http-payload',
      JSON.stringify(payload),
    ];
    
    // Add broadcast flag if enabled
    if (useBroadcast) {
      args.push('--broadcast');
      console.log('🚩 Broadcast mode: Showing on-chain transaction details\n');
    }
    
    const child = spawn('cre', args, {
      cwd: CRE_WORKFLOW_PATH,
      env: { ...process.env },
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      output += text;
      // Stream output to console
      process.stdout.write(text);
    });

    child.stderr.on('data', (data: Buffer) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`CRE exited with code ${code}: ${errorOutput}`));
        return;
      }

      // Parse result from output
      try {
        const match = output.match(/Workflow Simulation Result:\s*\n?\s*({[\s\S]*?})\s*(?:\n\n|$)/);
        if (match) {
          const result = JSON.parse(match[1]);
          resolve(result);
        } else {
          // Try to find any JSON result in output
          const jsonMatch = output.match(/{[\s\S]*"riskLevel"[\s\S]*}/);
          if (jsonMatch) {
            resolve(JSON.parse(jsonMatch[0]));
          } else {
            reject(new Error('No result found in CRE output'));
          }
        }
      } catch (e) {
        reject(new Error(`Failed to parse result: ${e}`));
      }
    });
  });
}

/**
 * Print test summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`\nTotal: ${total} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   • ${r.name}: Expected ${r.expectedRisk}, got ${r.actualRisk}`);
      if (r.error) console.log(`     Error: ${r.error}`);
    });
  }
  
  console.log('\n📈 Detailed Results:');
  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`   ${icon} ${r.name.padEnd(25)} | Risk: ${r.actualRisk.padEnd(8)} | ACE: ${r.aceAction.padEnd(15)} | ${r.duration}ms`);
  });
  
  console.log('');
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const testName = args[0] || 'all';
  
  console.log('🛡️  Sentinel CRE Workflow Test Suite');
  console.log('=====================================\n');
  
  if (testName === 'all') {
    // Run all tests
    const payloadFiles = readdirSync(PAYLOADS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
    
    console.log(`Found ${payloadFiles.length} test payloads:`);
    payloadFiles.forEach(f => console.log(`  • ${f}`));
    console.log('');
    
    for (const name of payloadFiles) {
      const result = await runTest(name);
      results.push(result);
    }
  } else {
    // Run single test
    const result = await runTest(testName);
    results.push(result);
  }
  
  printSummary();
  
  // Exit with appropriate code
  const failedCount = results.filter(r => !r.passed).length;
  process.exit(failedCount > 0 ? 1 : 0);
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
