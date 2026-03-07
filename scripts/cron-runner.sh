#!/bin/bash
# Volume Sentinel Cron Runner
# Runs every 15 minutes to simulate production cron behavior

SENTINEL_DIR="/home/user/Desktop/Chainlink/sentinel"
LOG_FILE="/tmp/volume-sentinel-cron.log"

cd "$SENTINEL_DIR"

# Load environment
source contracts/.env 2>/dev/null || true

echo "========================================" >> "$LOG_FILE"
echo "$(date): Running Volume Sentinel..." >> "$LOG_FILE"

timeout 120 cre workflow simulate ./workflows/volume-sentinel \
  --target local-simulation \
  --broadcast \
  --trigger-index 0 \
  --non-interactive \
  2>&1 | tee -a "$LOG_FILE"

echo "$(date): Completed" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
