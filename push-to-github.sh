#!/bin/bash
# Helper script to push to GitHub with token

if [ -z "$1" ]; then
  echo "Usage: ./push-to-github.sh <YOUR_GITHUB_TOKEN>"
  echo ""
  echo "Get your token at: https://github.com/settings/tokens"
  exit 1
fi

TOKEN=$1
echo "Pushing to GitHub..."
git push https://${TOKEN}@github.com/0xfdbu/Sentinel.git main
echo "Done!"
