#!/bin/bash
# ==========================================================================
# SENTINEL CRE - STAGING DEPLOYMENT SCRIPT
# ==========================================================================
# Deploys the Sentinel Security Oracle workflow to CRE staging environment
# 
# Prerequisites:
#   - CRE CLI installed and authenticated (`cre login`)
#   - Secrets configured in Vault DON or .env file
#   - Sepolia testnet funded account
# ==========================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WORKFLOW_DIR="${WORKFLOW_DIR:-./cre-workflow}"
TARGET="${TARGET:-staging-settings}"
ENV="${ENV:-staging}"

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     🛡️  SENTINEL CRE - STAGING DEPLOYMENT                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Step 1: Verify CRE CLI
echo -e "\n${YELLOW}Step 1: Verifying CRE CLI...${NC}"
if ! command -v cre &> /dev/null; then
    echo -e "${RED}❌ CRE CLI not found. Install with: npm install -g @chainlink/cre-cli${NC}"
    exit 1
fi

CRE_VERSION=$(cre version 2>/dev/null || echo "unknown")
echo -e "${GREEN}✅ CRE CLI found: $CRE_VERSION${NC}"

# Step 2: Verify authentication
echo -e "\n${YELLOW}Step 2: Verifying CRE authentication...${NC}"
if ! cre whoami &> /dev/null; then
    echo -e "${RED}❌ Not authenticated. Run: cre login${NC}"
    exit 1
fi

CRE_USER=$(cre whoami 2>/dev/null | grep -oP '(?<=Username: ).*' || echo "unknown")
echo -e "${GREEN}✅ Authenticated as: $CRE_USER${NC}"

# Step 3: Check secrets
echo -e "\n${YELLOW}Step 3: Checking secrets configuration...${NC}"

if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file found${NC}"
    
    # Source .env for local checks
    export $(grep -v '^#' .env | xargs) 2>/dev/null || true
    
    if [ -z "${ETHERSCAN_API_KEY:-}" ]; then
        echo -e "${RED}❌ ETHERSCAN_API_KEY not set in .env${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ ETHERSCAN_API_KEY configured${NC}"
    
    if [ -z "${AES_KEY_ALL:-}" ]; then
        echo -e "${YELLOW}⚠️  AES_KEY_ALL not set - encryption will be disabled${NC}"
    else
        echo -e "${GREEN}✅ AES_KEY_ALL configured${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No .env file found - assuming Vault DON will provide secrets${NC}"
fi

# Step 4: Test workflow with simulation
echo -e "\n${YELLOW}Step 4: Testing workflow with simulation...${NC}"
cd "$WORKFLOW_DIR"

if ! cre workflow simulate . --target="$TARGET" --non-interactive 2>&1 | head -50; then
    echo -e "${RED}❌ Workflow simulation failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Workflow simulation passed${NC}"

# Step 5: Run simulation
echo -e "\n${YELLOW}Step 5: Running simulation...${NC}"
echo -e "${BLUE}   This tests the workflow locally before deployment${NC}\n"

if ! cre workflow simulate . --target="$TARGET" --non-interactive 2>&1; then
    echo -e "${RED}❌ Simulation failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Simulation passed${NC}"

# Step 6: Deploy to staging
echo -e "\n${YELLOW}Step 6: Deploying to staging...${NC}"
echo -e "${BLUE}   Target: $TARGET${NC}"
echo -e "${BLUE}   Workflow: $WORKFLOW_DIR${NC}\n"

DEPLOY_OUTPUT=$(cre workflow deploy . --target="$TARGET" 2>&1) || {
    echo -e "${RED}❌ Deployment failed:${NC}"
    echo "$DEPLOY_OUTPUT"
    exit 1
}

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo "$DEPLOY_OUTPUT"

# Step 7: Verify deployment
echo -e "\n${YELLOW}Step 7: Verifying deployment...${NC}"

# Extract workflow ID from deploy output
WORKFLOW_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP '(?<=Workflow ID: )[a-f0-9-]+' || echo "")

if [ -n "$WORKFLOW_ID" ]; then
    echo -e "${GREEN}✅ Workflow ID: $WORKFLOW_ID${NC}"
    
    # Check logs
    echo -e "\n${BLUE}Recent logs:${NC}"
    cre workflow logs --workflow-id="$WORKFLOW_ID" --tail 5 2>&1 || true
else
    echo -e "${YELLOW}⚠️  Could not extract workflow ID from deploy output${NC}"
fi

# Step 8: Health check
echo -e "\n${YELLOW}Step 8: Health check...${NC}"

echo -e "\n${BLUE}Checking TEE execution status:${NC}"
cre workflow status 2>&1 || true

echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ STAGING DEPLOYMENT COMPLETE${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Monitor logs: ${BLUE}cre workflow logs --tail${NC}"
echo -e "  2. Test scan: ${BLUE}curl -X POST http://localhost:3001/api/scan${NC}"
echo -e "  3. Check health: ${BLUE}curl http://localhost:3001/health${NC}"
echo ""
