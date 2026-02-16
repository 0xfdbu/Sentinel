#!/bin/bash
# Quick push helper - use: ./push.sh
# Requires GITHUB_TOKEN environment variable

if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: Set GITHUB_TOKEN environment variable"
  echo "Example: GITHUB_TOKEN=ghp_xxx ./push.sh"
  exit 1
fi

git remote set-url origin https://${GITHUB_TOKEN}@github.com/0xfdbu/Sentinel.git
git push origin main
git remote set-url origin https://github.com/0xfdbu/Sentinel.git
echo "✅ Pushed successfully!"
