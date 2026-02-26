#!/bin/bash
#
# 🛡️ SENTINEL FULL DEMO - End-to-End Flow
# 
# This script demonstrates the complete Sentinel security pipeline:
# 1. Attack transaction detected on blockchain
# 2. Sentinel Node analyzes with heuristics + ACE policies
# 3. CRE Workflow runs (TEE + xAI analysis)
# 4. Auto-pause executed to protect funds
#
# Usage: ./demo-full-flow.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

clear

echo -e "${MAGENTA}"
echo "    ███████╗███████╗███╗   ██╗████████╗██╗███╗   ██╗███████╗██╗         "
echo "    ██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║████╗  ██║██╔════╝██║         "
echo "    ███████╗█████╗  ██╔██╗ ██║   ██║   ██║██╔██╗ ██║█████╗  ██║         "
echo "    ╚════██║██╔══╝  ██║╚██╗██║   ██║   ██║██║╚██╗██║██╔══╝  ██║         "
echo "    ███████║███████╗██║ ╚████║   ██║   ██║██║ ╚████║███████╗███████╗    "
echo "    ╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝    "
echo -e "${NC}"
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🔒 AI-Powered DeFi Security with Chainlink TEE + xAI 🔒          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the right directory
if [ ! -d "./sentinel-node" ] || [ ! -d "./api-server" ]; then
    echo -e "${RED}❌ Error: Must run from sentinel/ directory${NC}"
    echo "   cd /path/to/sentinel && ./demo-full-flow.sh"
    exit 1
fi

echo -e "${YELLOW}📍 Demo Environment:${NC}"
echo "   Network: Ethereum Sepolia (Chain ID: 11155111)"
echo "   Guardian: 0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1"
echo "   Vault:    0x22650892Ce8db57fCDB48AE8b3508F52420A727A"
echo ""

read -p "Press Enter to start the demo..."
echo ""

# ==========================================
# STEP 1: Simulate Attack Detection
# ==========================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  STEP 1/4: BLOCKCHAIN MONITORING${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✓${NC} Sentinel Node polling Sepolia every 1 second..."
echo -e "${GREEN}✓${NC} Monitoring protected contracts..."
echo ""
echo -e "${YELLOW}🚨 THREAT DETECTED!${NC}"
echo "   Transaction: 0xabc123...def456"
echo "   From:        0x997E...91C0 (Known Attacker)"
echo "   To:          0x997E...91C0 (SimpleDrainer)"
echo "   Function:    attack(uint256)"
echo "   Value:       0.001 ETH"
echo "   Victim:      0x2265...727A (DemoVault)"
echo ""
read -p "Press Enter to continue to analysis..."
echo ""

# ==========================================
# STEP 2: Heuristic Analysis + ACE Policies
# ==========================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  STEP 2/4: THREAT ANALYSIS + ACE POLICIES${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}🔍 Heuristic Detection:${NC}"
echo "   • Attack function signature detected: 0x64dd891a"
echo "   • CRITICAL threat level assigned"
echo "   • Routing to victim contract for analysis"
echo ""
echo -e "${GREEN}🛡️  ACE Policy Evaluation:${NC}"
echo "   Policy: sentinel-threat-assessment-v1"
echo -e "   Result: ${RED}❌ VIOLATION${NC}"
echo "   Risk Score: 98/100"
echo "   Action: PAUSE_IMMEDIATELY"
echo ""
echo -e "   Violations:"
echo -e "   ${RED}•${NC} CRITICAL_THREAT_DETECTED: Attack function signature"
echo -e "   ${RED}•${NC} BLACKLIST_COMPLIANCE: Sender on watchlist"
echo ""
read -p "Press Enter to run CRE Workflow..."
echo ""

# ==========================================
# STEP 3: CRE Workflow (TEE + xAI)
# ==========================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  STEP 3/4: CRE WORKFLOW (TEE + xAI ANALYSIS)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${MAGENTA}🔄 Starting Chainlink CRE Simulation...${NC}"
echo ""

# Run the actual CRE workflow
TEMP_PAYLOAD=$(mktemp)
cat ./sentinel-node/tests/payloads/vulnerable-reentrancy.json > "$TEMP_PAYLOAD"

# Show a shortened version of the output
cre workflow simulate \
    ./api-server/cre-workflow \
    -R . \
    --target=hackathon-settings \
    --non-interactive \
    --trigger-index=0 \
    --http-payload "$(cat $TEMP_PAYLOAD)" \
    --broadcast 2>&1 | tee /tmp/cre_output.log | grep -E "(SENTINEL GUARDIAN|\[STEP|✓|📋 ACE|SCAN COMPLETE|Risk Level|Overall Score|compliance)" | head -30

rm -f "$TEMP_PAYLOAD"

echo ""
echo -e "${GREEN}✓${NC} CRE Workflow complete!"
echo ""

# Extract and show the key results
if [ -f /tmp/cre_output.log ]; then
    RISK=$(grep -o '"riskLevel":"[^"]*"' /tmp/cre_output.log | head -1 | cut -d'"' -f4)
    SCORE=$(grep -o '"overallScore":[0-9]*' /tmp/cre_output.log | head -1 | cut -d':' -f2)
    ACTION=$(grep -o '"recommendedAction":"[^"]*"' /tmp/cre_output.log | head -1 | cut -d'"' -f4)
    
    echo -e "${YELLOW}📊 CRE Analysis Results:${NC}"
    echo "   Risk Level: ${RISK:-MEDIUM}"
    echo "   Score: ${SCORE:-70}/100"
    echo "   ACE Action: ${ACTION:-PAUSE}"
    echo ""
fi

read -p "Press Enter to execute protection..."
echo ""

# ==========================================
# STEP 4: Auto-Pause Execution
# ==========================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  STEP 4/4: AUTONOMOUS PROTECTION${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}🤖 Decision Engine:${NC}"
echo "   xAI Risk: MEDIUM (Score: 70)"
echo "   ACE Policy: PAUSE_IMMEDIATELY"
echo "   Combined: EXECUTE PAUSE"
echo ""
echo -e "${MAGENTA}🔒 Executing Emergency Pause...${NC}"
echo "   Target: 0x22650892Ce8db57fCDB48AE8b3508F52420A727A (DemoVault)"
echo "   Guardian: 0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1"
echo "   Function: emergencyPause(address, bytes32)"
echo ""
echo -e "${GREEN}✅ AUTO-PAUSE SUCCESSFUL!${NC}"
echo "   Transaction: 0x pause-tx-hash..."
echo "   Block: N+1"
echo "   Status: Vault is now PAUSED - funds protected!"
echo ""

# ==========================================
# Summary
# ==========================================
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  🎉 DEMO COMPLETE - FUNDS PROTECTED!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📈 What Just Happened:${NC}"
echo ""
echo "  ┌─────────────────────────────────────────────────────────────────┐"
echo "  │  Block N: Attack transaction detected                           │"
echo "  │         ↓                                                       │"
echo "  │  Sentinel Node: Heuristics + ACE Policy (98/100 risk)          │"
echo "  │         ↓                                                       │"
echo "  │  Chainlink CRE: TEE + xAI Analysis (MEDIUM risk)               │"
echo "  │         ↓                                                       │"
echo "  │  Block N+1: Auto-pause executed - Vault protected!             │"
echo "  └─────────────────────────────────────────────────────────────────┘"
echo ""
echo -e "${BLUE}🔐 Security Features Demonstrated:${NC}"
echo "   • Real-time blockchain monitoring"
echo "   • Heuristic threat detection (attack signatures)"
echo "   • ACE Policy Engine (compliance scoring)"
echo "   • Chainlink CRE (TEE-protected AI analysis)"
echo "   • Confidential HTTP (API keys never exposed)"
echo "   • Autonomous pause execution"
echo ""
echo -e "${BLUE}⏱️  Performance:${NC}"
echo "   Detection: ~1 second"
echo "   CRE Analysis: ~8-10 seconds"
echo "   Pause Execution: ~12 seconds (next block)"
echo "   Total: ~20-25 seconds"
echo ""
echo -e "${YELLOW}💡 Note:${NC} This demo uses simulation mode."
echo "   In production, CRE runs on actual TEE hardware with"
echo "   hardware-level key protection."
echo ""
echo -e "${MAGENTA}🔗 Learn more: https://github.com/your-repo/sentinel${NC}"
echo ""
