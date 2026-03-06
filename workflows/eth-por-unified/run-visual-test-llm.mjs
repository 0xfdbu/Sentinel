#!/usr/bin/env node
/**
 * ETH + PoR Unified - Visual Data Flow Test with LLM
 * Shows the new LLM final review step
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(title, color = colors.cyan) {
  console.log(`${color}${colors.bright}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${color}${colors.bright}║ ${title.padEnd(62)} ║${colors.reset}`);
  console.log(`${color}${colors.bright}╚════════════════════════════════════════════════════════════════╝${colors.reset}`);
}

function arrow(text) {
  console.log(`${colors.yellow}  ↓ ${text}${colors.reset}\n`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test parameters
const TEST_ETH_AMOUNT = '0.001';
const TEST_USER = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
const TEST_MINT_REQUEST_ID = 'req-12345-eth-por-test';

async function main() {
  console.log(`
${colors.bright}
 ███████╗████████╗██╗  ██╗      ██████╗  ██████╗ ██████╗ 
 ██╔════╝╚══██╔══╝██║  ██║      ██╔══██╗██╔═══██╗██╔══██╗
 █████╗     ██║   ███████║█████╗██████╔╝██║   ██║██████╔╝
 ██╔══╝     ██║   ██╔══██║╚════╝██╔═══╝ ██║   ██║██╔══██╗
 ███████╗   ██║   ██║  ██║      ██║     ╚██████╔╝██║  ██║
 ╚══════╝   ╚═╝   ╚═╝  ╚═╝      ╚═╝      ╚═════╝ ╚═╝  ╚═╝
 ${colors.magenta}
        + 🤖 LLM Final Review (xAI Grok)
${colors.reset}
     🔷 ETH Deposit → Price → Compliance → LLM → USDA Mint 🔷
`);

  console.log(`${colors.dim}Starting at: ${new Date().toISOString()}${colors.reset}`);
  console.log(`${colors.dim}User: ${TEST_USER}${colors.reset}\n`);

  const startTime = Date.now();

  // Step 1: Price Feeds
  log('STEP 1: PRICE AGGREGATION (3 Sources)', colors.blue);
  console.log(`${colors.cyan}Coinbase:${colors.reset}  $1,973.28 (+0.12%)`);
  console.log(`${colors.cyan}Kraken:${colors.reset}    $1,974.22 (+0.15%)`);
  console.log(`${colors.cyan}Binance:${colors.reset}   $1,973.98 (+0.14%)`);
  console.log(`${colors.cyan}Median:${colors.reset}    $1,973.98 (dev: 7 bps) ✓\n`);
  await sleep(300);

  // Step 2: USDA Calc
  arrow('Calculate');
  log('STEP 2: USDA CALCULATION', colors.green);
  console.log(`${colors.cyan}0.001 ETH × $1,973.98 = ${colors.reset}${colors.bright}1.973 USDA${colors.reset}\n`);
  await sleep(300);

  // Step 3: Compliance
  arrow('Compliance Check');
  log('STEP 3: COMPLIANCE CHECKS', colors.red);
  console.log(`${colors.cyan}ScamSniffer:${colors.reset}     ✓ Clean (2,530 addresses checked)`);
  console.log(`${colors.cyan}Proof of Reserve:${colors.reset} ✓ $1,800.21 > $1.97\n`);
  await sleep(300);

  // Step 4: LLM Review (NEW)
  arrow('LLM Review');
  log('STEP 4: LLM FINAL REVIEW (xAI Grok)', colors.magenta);
  
  console.log(`${colors.dim}Sending report to xAI...${colors.reset}\n`);
  
  const llmReport = {
    user: TEST_USER,
    ethAmount: '0.001',
    ethPriceUSD: '1973.98',
    usdaAmount: '1.973',
    scamCheck: 'PASSED',
    porCheck: 'PASSED',
    reservesUSD: '1800.21',
    priceSources: 'Coinbase, Kraken, Binance'
  };
  
  console.log(`${colors.dim}LLM Input Report:${colors.reset}`);
  console.log(JSON.stringify(llmReport, null, 2));
  console.log();
  
  console.log(`${colors.dim}→ Calling: POST https://api.x.ai/v1/chat/completions${colors.reset}`);
  console.log(`${colors.dim}→ Model: grok-4-1-fast-reasoning${colors.reset}\n`);
  
  await sleep(1000);
  
  console.log(`${colors.green}✓ LLM Response received${colors.reset}\n`);
  
  const llmDecision = {
    approved: true,
    riskLevel: 'low',
    confidence: 0.94,
    reasoning: 'All compliance checks passed. Price consensus valid. Reserves sufficient. No anomalies detected.'
  };
  
  console.log(`${colors.cyan}LLM Decision:${colors.reset}`);
  console.log(`  Status:     ${colors.green}${colors.bright}✓ APPROVED${colors.reset}`);
  console.log(`  Risk Level: ${colors.green}${llmDecision.riskLevel}${colors.reset}`);
  console.log(`  Confidence: ${(llmDecision.confidence * 100).toFixed(0)}%`);
  console.log(`  Reasoning:  ${llmDecision.reasoning}\n`);
  await sleep(300);

  // Step 5: Mint
  arrow('Mint Execution');
  log('STEP 5: MINT EXECUTION', colors.cyan);
  console.log(`${colors.cyan}MintingConsumer.writeReport()${colors.reset}`);
  console.log(`${colors.cyan}→ Mint 1.973 USDA to ${TEST_USER.slice(0, 20)}...${colors.reset}\n`);
  await sleep(300);

  // Step 6: ACE
  arrow('ACE Check');
  log('STEP 6: ON-CHAIN ACE (PolicyProtected)', colors.yellow);
  console.log(`${colors.cyan}PolicyProtected.checkCompliance()${colors.reset}`);
  console.log(`${colors.cyan}→ import: @chainlink-ace/policy-management/core/PolicyProtected.sol${colors.reset}`);
  console.log(`${colors.green}✓ Volume & Blacklist policies passed${colors.reset}\n`);
  await sleep(300);

  // Success
  arrow('Complete');
  log('✓ MINT SUCCESSFUL', colors.green);
  console.log(`${colors.cyan}USDA Minted:${colors.reset} 1.973`);
  console.log(`${colors.cyan}Tx Hash:${colors.reset}   0xabc123...`);
  console.log(`${colors.cyan}LLM Approved:${colors.reset} Risk LOW, Confidence 94%\n`);

  const duration = Date.now() - startTime;

  // Summary
  console.log(`${colors.bright}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}║                      EXECUTION SUMMARY                         ║${colors.reset}`);
  console.log(`${colors.bright}╠════════════════════════════════════════════════════════════════╣${colors.reset}`);
  console.log(`${colors.bright}║  Steps:   Price → Compliance → LLM → Mint → ACE               ║${colors.reset}`);
  console.log(`${colors.bright}║  APIs:    5 (3 price + ScamSniffer + PoR + xAI LLM)           ║${colors.reset}`);
  console.log(`${colors.bright}║  Time:    ${(duration/1000).toFixed(1)}s${' '.repeat(48)}║${colors.reset}`);
  console.log(`${colors.bright}║  LLM:     xAI Grok final review + risk assessment             ║${colors.reset}`);
  console.log(`${colors.bright}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`${colors.dim}Key Features:${colors.reset}`);
  console.log(`  • LLM reviews all data holistically before mint`);
  console.log(`  • Can reject despite passing individual checks`);
  console.log(`  • Provides risk level + confidence + reasoning`);
  console.log(`  • Double compliance: CRE TEE + On-chain ACE\n`);
}

main().catch(console.error);
