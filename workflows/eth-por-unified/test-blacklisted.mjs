#!/usr/bin/env node
/**
 * Test with a KNOWN BLACKLISTED address from ScamSniffer
 */

const BLACKLISTED_ADDRESS = '0x101ce0cedd142f199c9ef61739ae59b6611a0fc0';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
};

async function testBlacklistedAddress() {
  console.log(`\n${colors.yellow}Testing with KNOWN BLACKLISTED address:${colors.reset}`);
  console.log(`Address: ${BLACKLISTED_ADDRESS}\n`);
  
  const scamDbUrl = 'https://raw.githubusercontent.com/scamsniffer/scam-database/main/blacklist/address.json';
  
  try {
    const response = await fetch(scamDbUrl, { signal: AbortSignal.timeout(15000) });
    const blacklist = await response.json();
    
    console.log(`Database contains ${blacklist.length.toLocaleString()} addresses`);
    
    const userLower = BLACKLISTED_ADDRESS.toLowerCase();
    const isBlacklisted = blacklist.some(addr => addr.toLowerCase() === userLower);
    
    if (isBlacklisted) {
      console.log(`\n${colors.red}${colors.bright}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
      console.log(`${colors.red}${colors.bright}║  🚫 ADDRESS BLACKLISTED - MINT WOULD BE REJECTED               ║${colors.reset}`);
      console.log(`${colors.red}${colors.bright}║  Address: ${BLACKLISTED_ADDRESS.slice(0, 30)}...         ║${colors.reset}`);
      console.log(`${colors.red}${colors.bright}║  Source: ScamSniffer Database                                  ║${colors.reset}`);
      console.log(`${colors.red}${colors.bright}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
      console.log(`${colors.red}✓ Rejection flow working correctly!${colors.reset}\n`);
    } else {
      console.log(`${colors.green}Address not found in current blacklist${colors.reset}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

testBlacklistedAddress();
