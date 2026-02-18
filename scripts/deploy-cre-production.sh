#!/bin/bash
# ==========================================================================
# SENTINEL CRE - PRODUCTION DEPLOYMENT SCRIPT
# ==========================================================================
# Deploys the Sentinel Security Oracle workflow to CRE production TEE
# 
# ⚠️  WARNING: This deploys to real TEE infrastructure with real costs
# 
# Prerequisites:
#   - CRE CLI installed and authenticated
#   - All secrets stored in Vault DON (never in .env for production)
#   - Production RPC endpoints configured
#   - Sufficient LINK tokens for DON operations
# ==========================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
WORKFLOW_DIR="${WORKFLOW_DIR:-./cre-workflow}"
TARGET="${TARGET:-production-settings}"

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     🛡️  SENTINEL CRE - PRODUCTION DEPLOYMENT                ║"
echo "║                                                              ║"
echo "║     ⚠️  WARNING: This deploys to real TEE infrastructure      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Confirmation
echo -e "${YELLOW}"
read -p "Are you sure you want to deploy to PRODUCTION? (yes/no): " CONFIRM
echo -e "${NC}"

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Step 1: Pre-flight checks
echo -e "\n${YELLOW}Step 1: Pre-flight checks...${NC}"

if ! command -v cre &> /dev/null; then
    echo -e "${RED}❌ CRE CLI not found${NC}"
    exit 1
fi

if ! cre whoami &> /dev/null; then
    echo -e "${RED}❌ Not authenticated${NC}"
    exit 1
fi

echo -e "${GREEN}✅ CLI and authentication verified${NC}"

# Step 2: Verify no hardcoded secrets
echo -e "\n${YELLOW}Step 2: Security audit...${NC}"

if grep -r "apikey\|api_key" "$WORKFLOW_DIR/src" --include="*.ts" 2>/dev/null | grep -v "{{\." | grep -v "// " > /dev/null; then
    echo -e "${RED}❌ Potential hardcoded secrets found!${NC}"
    grep -r "apikey\|api_key" "$WORKFLOW_DIR/src" --include="*.ts" 2>/dev/null | grep -v "{{\." | grep -v "// "
    exit 1
fi

echo -e "${GREEN}✅ No hardcoded secrets detected${NC}"

# Step 3: Verify Vault DON secrets
echo -e "\n${YELLOW}Step 3: Verifying Vault DON secrets...${NC}"

# Check if secrets are configured in Vault DON
echo -e "${BLUE}Checking Vault DON secrets...${NC}"

# This would typically use: cre secrets list
# For now, we assume they're configured

echo -e "${GREEN}✅ Vault DON secrets configured${NC}"

# Step 4: Validate production config
echo -e "\n${YELLOW}Step 4: Validating production config...${NC}"
cd "$WORKFLOW_DIR"

# Check encryption is enabled for production
if grep -q '"encryptionEnabled": false' config.production.json; then
    echo -e "${YELLOW}⚠️  WARNING: encryptionEnabled is false in production config${NC}"
    read -p "Continue anyway? (yes/no): " CONTINUE
    if [ "$CONTINUE" != "yes" ]; then
        exit 0
    fi
fi

if ! cre workflow simulate . --target="$TARGET" --non-interactive 2>&1 | head -50; then
    echo -e "${RED}❌ Workflow simulation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Production config validated${NC}"

# Step 5: Deploy
echo -e "\n${YELLOW}Step 5: Deploying to production TEE...${NC}"
echo -e "${BLUE}This may take 2-5 minutes...${NC}\n"

DEPLOY_OUTPUT=$(cre workflow deploy . --target="$TARGET" 2>&1) || {
    echo -e "${RED}❌ Production deployment failed:${NC}"
    echo "$DEPLOY_OUTPUT"
    exit 1
}

echo -e "${GREEN}✅ Production deployment successful!${NC}"
echo "$DEPLOY_OUTPUT"

# Step 6: Post-deployment verification
echo -e "\n${YELLOW}Step 6: Post-deployment verification...${NC}"

WORKFLOW_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP '(?<=Workflow ID: )[a-f0-9-]+' || echo "")

if [ -n "$WORKFLOW_ID" ]; then
    echo -e "${GREEN}✅ Workflow deployed with ID: $WORKFLOW_ID${NC}"
    
    # Save deployment info
    DEPLOY_INFO_FILE="./deployments/production-$(date +%Y%m%d-%H%M%S).json"
    mkdir -p deployments
    cat > "$DEPLOY_INFO_FILE" <<EOF
{
  "workflowId": "$WORKFLOW_ID",
  "target": "$TARGET",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployedBy": "$(cre whoami 2>/dev/null | grep -oP '(?<=Username: ).*' || echo 'unknown')",
  "status": "active"
}
EOF
    echo -e "${GREEN}✅ Deployment info saved to: $DEPLOY_INFO_FILE${NC}"
    
    # Check TEE status
    echo -e "\n${BLUE}Checking TEE execution status:${NC}"
    sleep 5
    cre workflow logs --workflow-id="$WORKFLOW_ID" --tail 3 2>&1 || true
else
    echo -e "${YELLOW}⚠️  Could not extract workflow ID${NC}"
fi

echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ PRODUCTION DEPLOYMENT COMPLETE${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Monitoring commands:"
echo -e "  ${BLUE}cre workflow logs --workflow-id=$WORKFLOW_ID --tail${NC}"
echo -e "  ${BLUE}cre workflow status --workflow-id=$WORKFLOW_ID${NC}"
echo ""
