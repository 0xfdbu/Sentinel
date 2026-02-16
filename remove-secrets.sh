#!/bin/bash
# Remove API keys from git history

echo "Removing secrets from git history..."

# Remove the API key from specific files in history
git filter-branch --force --index-filter \
  'git checkout --index -- CRE_INTEGRATION.md
   git checkout --index -- workflow/secrets.yaml.example
   git checkout --index -- frontend/src/hooks/useScanner.ts' \
  --prune-empty --tag-name-filter cat -- --all

# Now update the files with placeholders
