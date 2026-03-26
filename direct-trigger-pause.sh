#!/bin/bash
# Directly trigger Pause-with-DON workflow (bypass sentinel node)
# This calls the CRE CLI directly with the HTTP payload
#
# Usage: ./direct-trigger-pause.sh [fraud_score]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load .env file if it exists
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

FRAUD_SCORE="${1:-85}"

echo "================================================"
echo "🔴 Direct Pause Workflow Trigger"
echo "================================================"
echo ""
echo "Fraud Score: $FRAUD_SCORE"
echo ""

# Build HTTP payload
PAYLOAD=$(cat <<EOF
{
  "action": "pause",
  "target": "0xFA93de331FCd870D83C21A0275d8b3E7aA883F45",
  "reason": "Test trigger - fraud detected",
  "broadcast": true,
  "metadata": {
    "fraudScore": $FRAUD_SCORE,
    "riskFactors": ["Large transfer", "Suspicious pattern", "Test trigger"],
    "suspiciousTx": "0x0000000000000000000000000000000000000000000000000000000000000000",
    "from": "0x1234567890123456789012345678901234567890",
    "to": "0xFA93de331FCd870D83C21A0275d8b3E7aA883F45",
    "value": "1000000000",
    "timestamp": $(date +%s)
  }
}
EOF
)

echo "Payload:"
echo "$PAYLOAD" | jq . 2>/dev/null || echo "$PAYLOAD"
echo ""

echo "Running: cre workflow simulate ..."
echo ""

cd /home/user/Desktop/Chainlink/sentinel

cre workflow simulate ./workflows/pause-with-don \
  --target local-simulation \
  --broadcast \
  --http-payload "$PAYLOAD"

echo ""
echo "================================================"
echo "✅ Workflow triggered"
echo "================================================"
