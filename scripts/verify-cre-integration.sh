#!/bin/bash

# Sentinel CRE Integration Verification Script
# This script verifies that all CRE components are properly configured

set -e

echo "═══════════════════════════════════════════════════"
echo "   Sentinel CRE Integration Verification"
echo "═══════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check functions
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✅${NC} $1 is installed"
        return 0
    else
        echo -e "${RED}❌${NC} $1 is NOT installed"
        return 1
    fi
}

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} $2 found"
        return 0
    else
        echo -e "${RED}❌${NC} $2 NOT found"
        return 1
    fi
}

echo "📋 Checking prerequisites..."
echo ""

# Check Node.js
if check_command node; then
    NODE_VERSION=$(node --version)
    echo "   Version: $NODE_VERSION"
fi

# Check npm
check_command npm

# Check Hardhat
check_command npx

# Check contract files
echo ""
echo "📋 Checking contract files..."
echo ""

check_file "contracts/SentinelRegistry.sol" "SentinelRegistry.sol"
check_file "contracts/EmergencyGuardian.sol" "EmergencyGuardian.sol"
check_file "contracts/AuditLogger.sol" "AuditLogger.sol"

# Check workflow files
echo ""
echo "📋 Checking CRE workflow files..."
echo ""

check_file "workflow/sentinel-workflow.ts" "sentinel-workflow.ts"
check_file "cre.config.ts" "cre.config.ts"

# Check Hardhat configuration
echo ""
echo "📋 Checking Hardhat configuration..."
echo ""

cd contracts

if [ -f hardhat.config.js ]; then
    echo -e "${GREEN}✅${NC} hardhat.config.js found"
else
    echo -e "${RED}❌${NC} hardhat.config.js NOT found"
fi

# Check if dependencies installed
if [ -d node_modules ]; then
    echo -e "${GREEN}✅${NC} Dependencies installed"
else
    echo -e "${YELLOW}⚠️${NC} Dependencies NOT installed (run: npm install)"
fi

cd ..

# Network check
echo ""
echo "📋 Checking network connectivity..."
echo ""

# Check if Hardhat node is running
if curl -s -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    http://127.0.0.1:8545 > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} Hardhat node is running on port 8545"
else
    echo -e "${YELLOW}⚠️${NC} Hardhat node NOT running (start with: npm run chain)"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "   Verification Complete"
echo "═══════════════════════════════════════════════════"
echo ""

# Summary
echo "📖 Next steps:"
echo ""
echo "1. Install dependencies:"
echo "   cd contracts && npm install"
echo ""
echo "2. Start Hardhat node (in terminal 1):"
echo "   npm run chain"
echo ""
echo "3. Deploy contracts (in terminal 2):"
echo "   npm run deploy"
echo ""
echo "4. Run full CRE integration test:"
echo "   node scripts/test-cre-flow.js"
echo ""
echo "5. Start frontend (in terminal 3):"
echo "   npm run frontend"
echo ""
