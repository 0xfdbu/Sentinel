#!/bin/bash

# Sentinel Full Setup and Test Script
# This script sets up the entire environment and runs a full CRE integration test

set -e

echo "═══════════════════════════════════════════════════"
echo "   Sentinel Setup & Full Integration Test"
echo "═══════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "contracts" ]; then
    log_error "Please run this script from the sentinel root directory"
    exit 1
fi

# Step 1: Environment setup
echo ""
log_info "Step 1: Setting up environment..."
echo ""

if [ ! -f .env ]; then
    log_warning ".env file not found, copying from .env.example"
    cp .env.example .env
    log_info "Please edit .env with your API keys before running again"
fi

# Source environment variables
set -a
source .env 2>/dev/null || true
set +a

# Step 2: Install dependencies
echo ""
log_info "Step 2: Installing dependencies..."
echo ""

log_info "Installing root dependencies..."
npm install

log_info "Installing contract dependencies..."
cd contracts
npm install
cd ..

log_info "Installing frontend dependencies..."
cd frontend
npm install
cd ..

log_success "All dependencies installed"

# Step 3: Compile contracts
echo ""
log_info "Step 3: Compiling contracts..."
echo ""

cd contracts
npx hardhat compile
cd ..

log_success "Contracts compiled"

# Step 4: Start Hardhat node in background
echo ""
log_info "Step 4: Starting Hardhat node..."
echo ""

# Check if node is already running
if curl -s -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    http://127.0.0.1:8545 > /dev/null 2>&1; then
    log_warning "Hardhat node already running"
else
    cd contracts
    npx hardhat node > /tmp/hardhat-node.log 2>&1 &
    HARDHAT_PID=$!
    cd ..
    
    # Wait for node to start
    log_info "Waiting for Hardhat node to start..."
    for i in {1..30}; do
        if curl -s -X POST -H "Content-Type: application/json" \
            --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
            http://127.0.0.1:8545 > /dev/null 2>&1; then
            log_success "Hardhat node started (PID: $HARDHAT_PID)"
            break
        fi
        sleep 1
    done
    
    # Store PID for cleanup
    echo $HARDHAT_PID > /tmp/hardhat-node.pid
fi

# Step 5: Deploy contracts
echo ""
log_info "Step 5: Deploying contracts..."
echo ""

cd contracts
npx hardhat run scripts/deploy.js --network hardhat
cd ..

log_success "Contracts deployed"

# Step 6: Run CRE integration test
echo ""
log_info "Step 6: Running full CRE integration test..."
echo ""

cd contracts
node ../scripts/test-cre-flow.js
cd ..

log_success "CRE integration test completed"

# Step 7: Copy deployment info to frontend
echo ""
log_info "Step 7: Syncing deployment info to frontend..."
echo ""

mkdir -p frontend/public/contracts/deployments
cp contracts/deployments/hardhat-latest.json frontend/public/contracts/deployments/

log_success "Deployment info synced"

echo ""
echo "═══════════════════════════════════════════════════"
echo "   Setup Complete!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "Available commands:"
echo ""
echo "  Start frontend:"
echo "    npm run frontend"
echo ""
echo "  Run tests:"
echo "    npm run test"
echo ""
echo "  Run CRE workflow:"
echo "    npm run cre:simulate"
echo ""
echo "  View Hardhat logs:"
echo "    tail -f /tmp/hardhat-node.log"
echo ""
echo "  Stop Hardhat node:"
echo "    kill \$(cat /tmp/hardhat-node.pid)"
echo ""
echo "═══════════════════════════════════════════════════"
