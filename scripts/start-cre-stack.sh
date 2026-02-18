#!/bin/bash

# Sentinel CRE Stack Launcher
# ============================
# This script starts all required services for Chainlink CRE integration:
# 1. Hardhat blockchain node
# 2. CRE API backend (keeps API keys server-side)
# 3. Frontend React app
# 
# The xAI/Grok API is NEVER called from the browser.
# All API calls go through Chainlink CRE's Confidential HTTP.

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       Sentinel Chainlink CRE Stack Launcher                 ║"
echo "║                                                              ║"
echo "║  ✓ API keys stay server-side (never exposed to browser)     ║"
echo "║  ✓ xAI Grok via CRE Confidential HTTP                       ║"
echo "║  ✓ Emergency pauses via Confidential Compute                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check dependencies
command -v node >/dev/null 2>&1 || { echo -e "${RED}Error: node is required${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}Error: npm is required${NC}"; exit 1; }

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup EXIT INT TERM

# Step 1: Install dependencies if needed
echo -e "${GREEN}[1/5] Checking dependencies...${NC}"

if [ ! -d "contracts/node_modules" ]; then
    echo "Installing contract dependencies..."
    cd contracts && npm install && cd ..
fi

if [ ! -d "services/cre-api/node_modules" ]; then
    echo "Installing CRE API dependencies..."
    cd services/cre-api && npm install && cd ../..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Step 2: Start Hardhat node
echo ""
echo -e "${GREEN}[2/5] Starting Hardhat blockchain node...${NC}"
cd contracts
npx hardhat node --fork-block-number 0 > /tmp/hardhat.log 2>&1 &
HARDHAT_PID=$!
cd ..

# Wait for Hardhat to start
echo "Waiting for Hardhat to start..."
for i in {1..30}; do
    if curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        http://127.0.0.1:8545 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Hardhat node running (PID: $HARDHAT_PID)${NC}"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Failed to start Hardhat${NC}"
        exit 1
    fi
done

# Step 3: Deploy contracts if not already deployed
echo ""
echo -e "${GREEN}[3/5] Deploying contracts to Hardhat...${NC}"
cd contracts
if [ ! -f "deployments/hardhat.json" ]; then
    npx hardhat run scripts/deploy.js --network hardhat
else
    echo -e "${YELLOW}Contracts already deployed, skipping...${NC}"
fi
cd ..

# Step 4: Start CRE API backend
echo ""
echo -e "${GREEN}[4/5] Starting CRE API backend...${NC}"
cd services/cre-api

# Build if needed
if [ ! -d "dist" ]; then
    echo "Building CRE API..."
    npm run build
fi

# Create logs directory
mkdir -p logs

# Start the API server
npm start > /tmp/cre-api.log 2>&1 &
CRE_API_PID=$!
cd ../..

# Wait for API to start
echo "Waiting for CRE API to start..."
for i in {1..30}; do
    if curl -s http://127.0.0.1:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ CRE API running (PID: $CRE_API_PID)${NC}"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Failed to start CRE API${NC}"
        echo "Check logs: /tmp/cre-api.log"
        exit 1
    fi
done

# Step 5: Start frontend
echo ""
echo -e "${GREEN}[5/5] Starting frontend...${NC}"
cd frontend
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend
echo "Waiting for frontend to start..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend running (PID: $FRONTEND_PID)${NC}"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠ Frontend may still be starting...${NC}"
    fi
done

# Print summary
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                   Services Running                           ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Hardhat Node:    http://127.0.0.1:8545                     ║"
echo "║  CRE API:         http://localhost:3001                     ║"
echo "║  Frontend:        http://localhost:3000                     ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║                                                              ║"
echo "║  API Keys Status:                                            ║"
echo "║  • Etherscan:  Server-side only ✓                           ║"
echo "║  • xAI Grok:   Server-side only ✓                           ║"
echo "║  • Private Key: Server-side only ✓                          ║"
echo "║                                                              ║"
echo "║  No API keys are exposed to the browser!                     ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Tail logs
sleep 2
echo "Recent logs:"
echo "---"
tail -n 20 /tmp/cre-api.log 2>/dev/null || true

# Keep script running
wait
