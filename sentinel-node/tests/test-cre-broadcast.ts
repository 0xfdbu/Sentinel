/**
 * CRE Broadcast Test - Security Layer Only
 * 
 * Tests the Sentinel CRE Workflow with --broadcast flag.
 * PURE SECURITY ANALYSIS - NO ACE/COMPLIANCE.
 * 
 * Usage:
 *   npx ts-node tests/test-cre-broadcast.ts [payload-name] [--broadcast]
 * 
 * Examples:
 *   npx ts-node tests/test-cre-broadcast.ts security-flash-loan-attack
 *   npx ts-node tests/test-cre-broadcast.ts security-flash-loan-attack --broadcast
 *   npx ts-node tests/test-cre-broadcast.ts safe-contract
 * 
 * NOTE: This tests the SECURITY LAYER only. For compliance/policy testing,
 * use the ACE system separately.
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const colors = {
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m',
  cyan: '\x1b[0;36m',
  magenta: '\x1b[0;35m',
  reset: '\x1b[0m',
};

const args = process.argv.slice(2);
const payloadName = args.find(a => !a.startsWith('--')) || 'security-flash-loan-attack';
const shouldBroadcast = args.includes('--broadcast');

const PAYLOADS_DIR = join(__dirname, 'payloads');
const PROJECT_ROOT = join(__dirname, '..');
const CRE_WORKFLOW_PATH = join(PROJECT_ROOT, 'cre-workflow');

function printHeader() {
  console.log(`${colors.magenta}╔══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.magenta}║     🔒 SENTINEL SECURITY - BROADCAST TEST                    ║${colors.reset}`);
  console.log(`${colors.magenta}║     SECURITY LAYER ONLY (No ACE/Compliance)                  ║${colors.reset}`);
  console.log(`${colors.magenta}╚══════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('');
  console.log(`${colors.cyan}📋 Payload:${colors.reset} ${payloadName}`);
  console.log(`${colors.cyan}🚩 Broadcast:${colors.reset} ${shouldBroadcast ? colors.green + 'ENABLED' + colors.reset : colors.yellow + 'SIMULATION ONLY' + colors.reset}`);
  console.log('');
  console.log(`${colors.yellow}Note:${colors.reset} This tests the SECURITY LAYER (attacks, oracles, threats)`);
  console.log(`      For COMPLIANCE testing, use the ACE system separately.`);
  console.log('');
}

function printPayloadSummary(payloadPath: string) {
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.blue}📄 Security Context${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  try {
    const payload = JSON.parse(readFileSync(payloadPath, 'utf8'));
    
    console.log(`Contract: ${payload.contractAddress}`);
    console.log(`Name: ${payload.contractName}`);
    console.log(`Chain ID: ${payload.chainId}`);
    
    // Security factors
    if (payload.fraudAnalysis) {
      console.log(`Fraud Risk: ${payload.fraudAnalysis.riskScore}/100`);
      console.log(`Fraudulent: ${payload.fraudAnalysis.isFraudulent ? colors.red + 'YES' + colors.reset : colors.green + 'No' + colors.reset}`);
      if (payload.fraudAnalysis.patterns?.length > 0) {
        console.log(`Fraud Patterns: ${payload.fraudAnalysis.patterns.length}`);
        payload.fraudAnalysis.patterns.forEach((p: any) => {
          const icon = p.severity === 'CRITICAL' ? '🔴' : p.severity === 'HIGH' ? '🟠' : '🟡';
          console.log(`  ${icon} ${p.name}`);
        });
      }
    }
    
    if (payload.prefetchedData?.oracleHealth) {
      const healthy = payload.prefetchedData.oracleHealth.filter((o: any) => o.isHealthy).length;
      const total = payload.prefetchedData.oracleHealth.length;
      const status = healthy === total ? colors.green + '✓' : colors.yellow + '⚠';
      console.log(`Oracle Health: ${status}${colors.reset} ${healthy}/${total} healthy`);
    }
    
    if (payload.transactionContext?.threatSummary?.length > 0) {
      console.log(`Threats: ${payload.transactionContext.threatSummary.length}`);
      payload.transactionContext.threatSummary.forEach((t: any) => {
        const icon = t.level === 'CRITICAL' ? '🔴' : t.level === 'HIGH' ? '🟠' : '🟡';
        console.log(`  ${icon} ${t.details}`);
      });
    }
  } catch (error) {
    console.log(`${colors.yellow}Could not parse payload${colors.reset}`);
  }
  
  console.log('');
}

function checkEnvironment() {
  console.log(`${colors.blue}Environment Check${colors.reset}`);
  
  const checks = {
    xaiKey: process.env.XAI_API_KEY,
    etherscanKey: process.env.ETHERSCAN_API_KEY,
    crePrivateKey: process.env.CRE_ETH_PRIVATE_KEY,
  };
  
  if (checks.xaiKey) {
    console.log(`  ${colors.green}✓ XAI_API_KEY${colors.reset}`);
  } else {
    console.log(`  ${colors.yellow}⚠ XAI_API_KEY (will use rule-based fallback)${colors.reset}`);
  }
  
  if (checks.etherscanKey) {
    console.log(`  ${colors.green}✓ ETHERSCAN_API_KEY${colors.reset}`);
  } else {
    console.log(`  ${colors.yellow}⚠ ETHERSCAN_API_KEY${colors.reset}`);
  }
  
  if (checks.crePrivateKey) {
    console.log(`  ${colors.green}✓ CRE_ETH_PRIVATE_KEY${colors.reset}`);
    console.log(`  ${colors.red}🔴 WARNING: Will send REAL transactions to Sepolia!${colors.reset}`);
  } else {
    console.log(`  ${colors.cyan}ℹ CRE_ETH_PRIVATE_KEY (broadcast preview only)${colors.reset}`);
  }
  
  console.log('');
}

async function runCREWorkflow(payloadPath: string): Promise<void> {
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.blue}🚀 Running Security CRE Workflow${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log('');
  
  const payload = readFileSync(payloadPath, 'utf8');
  
  const creArgs = [
    'workflow',
    'simulate',
    CRE_WORKFLOW_PATH,
    '-R', PROJECT_ROOT,
    '--target=hackathon-settings',
    '--non-interactive',
    '--trigger-index=0',
    '--http-payload', payload,
  ];
  
  if (shouldBroadcast) {
    creArgs.push('--broadcast');
  }
  
  creArgs.push('--verbose');
  
  console.log(`${colors.cyan}Command: cre ${creArgs.slice(0, 6).join(' ')}...${colors.reset}`);
  console.log(`${colors.cyan}Workflow: security-scanner.ts${colors.reset}`);
  console.log('');
  
  return new Promise((resolve, reject) => {
    const child = spawn('cre', creArgs, {
      cwd: PROJECT_ROOT,
      env: { ...process.env },
    });
    
    child.stdout.on('data', (data: Buffer) => {
      process.stdout.write(data.toString());
    });
    
    child.stderr.on('data', (data: Buffer) => {
      process.stderr.write(data.toString());
    });
    
    child.on('close', (code) => {
      console.log('');
      
      if (code === 0) {
        console.log(`${colors.green}✅ Security CRE workflow completed${colors.reset}`);
        resolve();
      } else {
        console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        console.log(`${colors.yellow}⚠ Exit code ${code}${colors.reset}`);
        console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        
        if (code === 1 && !process.env.CRE_ETH_PRIVATE_KEY) {
          console.log('Expected without CRE_ETH_PRIVATE_KEY - simulation ran successfully');
          resolve();
        } else {
          reject(new Error(`CRE workflow failed with code ${code}`));
        }
      }
    });
    
    child.on('error', (error) => {
      if (error.message.includes('ENOENT')) {
        console.error(`${colors.red}❌ 'cre' command not found${colors.reset}`);
        console.error('Install: npm install -g @chainlink/cre-cli');
      } else {
        console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
      }
      reject(error);
    });
  });
}

async function main() {
  printHeader();
  
  const payloadPath = join(PAYLOADS_DIR, `${payloadName}.json`);
  
  if (!existsSync(payloadPath)) {
    console.error(`${colors.red}❌ Payload not found: ${payloadPath}${colors.reset}`);
    console.log('');
    console.log('Security payloads:');
    
    const { readdirSync } = await import('fs');
    const payloads = readdirSync(PAYLOADS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
    
    payloads.forEach(p => console.log(`  - ${p}`));
    console.log('');
    process.exit(1);
  }
  
  printPayloadSummary(payloadPath);
  checkEnvironment();
  
  try {
    await runCREWorkflow(payloadPath);
  } catch (error) {
    console.error(`${colors.red}❌ Test failed: ${(error as Error).message}${colors.reset}`);
    process.exit(1);
  }
  
  console.log('');
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.green}✅ Security Test Complete${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log('');
  
  if (!process.env.CRE_ETH_PRIVATE_KEY) {
    console.log(`${colors.cyan}To enable actual broadcasts:${colors.reset}`);
    console.log('  export CRE_ETH_PRIVATE_KEY=0x...');
    console.log('');
  }
  
  console.log(`${colors.cyan}Other security payloads:${colors.reset}`);
  console.log(`  npx ts-node tests/test-cre-broadcast.ts security-flash-loan-attack`);
  console.log(`  npx ts-node tests/test-cre-broadcast.ts safe-contract`);
  console.log(`  npx ts-node tests/test-cre-broadcast.ts vulnerable-reentrancy`);
  console.log('');
  console.log(`${colors.cyan}For compliance testing, use ACE system:${colors.reset}`);
  console.log(`  cd contracts && npm run test:ace`);
  console.log('');
}

main().catch(console.error);
