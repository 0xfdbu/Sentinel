#!/bin/bash
#
# Test ETH Reserve Mint Workflow
# 1. Deposit ETH to vault
# 2. Trigger CRE workflow with EVM event
#

set -e

# Config
VAULT_ADDRESS="0x12fe97b889158380e1D94b69718F89E521b38c11"
USDA_TOKEN="0xFA93de331FCd870D83C21A0275d8b3E7aA883F45"
RPC_URL="https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH"
WORKFLOW_PATH="./workflows/eth-por-unified"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Sentinel ETH Reserve Mint Test ===${NC}"
echo ""

# Load private key
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$CRE_ETH_PRIVATE_KEY" ]; then
    echo "Error: CRE_ETH_PRIVATE_KEY not set"
    echo "Add it to .env file: CRE_ETH_PRIVATE_KEY=0x..."
    exit 1
fi

echo -e "${YELLOW}Step 1: Depositing 0.001 ETH to vault...${NC}"
echo "Vault: $VAULT_ADDRESS"
echo ""

# Send deposit transaction
RESULT=$(cast send $VAULT_ADDRESS \
    "depositETH()" \
    --value 0.001ether \
    --rpc-url $RPC_URL \
    --private-key $CRE_ETH_PRIVATE_KEY \
    2>&1)

if [ $? -ne 0 ]; then
    echo "Error: Deposit failed"
    echo "$RESULT"
    exit 1
fi

# Extract transaction hash
TX_HASH=$(echo "$RESULT" | grep "transactionHash" | awk '{print $2}')
BLOCK_NUMBER=$(echo "$RESULT" | grep "blockNumber" | awk '{print $2}')

echo -e "${GREEN}✓ Deposit successful!${NC}"
echo "  Transaction: $TX_HASH"
echo "  Block: $BLOCK_NUMBER"
echo ""

# Extract log index from the result
LOG_INDEX=$(echo "$RESULT" | grep "logIndex" | awk '{print $2}')

echo -e "${YELLOW}Step 2: Triggering CRE Workflow...${NC}"
echo "  Workflow: $WORKFLOW_PATH"
echo "  Log Index: $LOG_INDEX"
echo ""
echo "Command:"
echo "  cre workflow simulate $WORKFLOW_PATH --target local-simulation \\"
echo "    --evm-tx-hash $TX_HASH \\"
echo "    --evm-event-index $LOG_INDEX"
echo ""

# Check USDA balance before
BALANCE_BEFORE=$(cast call $USDA_TOKEN \
    "balanceOf(address)(uint256)" \
    $(cast wallet address --private-key $CRE_ETH_PRIVATE_KEY) \
    --rpc-url $RPC_URL 2>/dev/null || echo "0")

echo -e "${BLUE}USDA Balance before: $(echo "$BALANCE_BEFORE / 1000000" | bc 2>/dev/null || echo "N/A") USDA${NC}"
echo ""

# Ask to trigger workflow
read -p "Trigger CRE workflow now? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Running workflow... (this may take 60-120 seconds)${NC}"
    echo ""
    
    cre workflow simulate $WORKFLOW_PATH \
        --target local-simulation \
        --evm-tx-hash $TX_HASH \
        --evm-event-index $LOG_INDEX
    
    echo ""
    
    # Check USDA balance after
    BALANCE_AFTER=$(cast call $USDA_TOKEN \
        "balanceOf(address)(uint256)" \
        $(cast wallet address --private-key $CRE_ETH_PRIVATE_KEY) \
        --rpc-url $RPC_URL 2>/dev/null || echo "0")
    
    echo -e "${BLUE}USDA Balance after: $(echo "$BALANCE_AFTER / 1000000" | bc 2>/dev/null || echo "N/A") USDA${NC}"
    echo ""
fi

echo -e "${GREEN}=== Test Complete ===${NC}"
echo "View transaction: https://sepolia.etherscan.io/tx/$TX_HASH"
