#!/bin/bash

# Sentinel CRE CLI Installer
# This script attempts to install the Chainlink CRE CLI

set -e

echo "═══════════════════════════════════════════════════════════"
echo "  Installing Chainlink CRE CLI"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$ARCH" in
    x86_64) ARCH="x64" ;;
    amd64) ARCH="x64" ;;
    arm64) ARCH="arm64" ;;
    aarch64) ARCH="arm64" ;;
    *) echo "❌ Unsupported architecture: $ARCH"; exit 1 ;;
esac

echo "Detected: $OS ($ARCH)"
echo ""

# Try official install script first
echo "📥 Attempting official install script..."
if curl -fsSL https://cre.chain.link/install | bash; then
    echo ""
    echo "✅ CRE CLI installed successfully!"
    exit 0
fi

echo "⚠️  Official install script failed, trying alternative methods..."
echo ""

# Try to download from GitHub releases
# Note: The actual URL may vary - this is a placeholder
GITHUB_REPO="smartcontractkit/cre-sdk-typescript"
RELEASE_URL="https://api.github.com/repos/$GITHUB_REPO/releases/latest"

echo "📥 Checking GitHub releases..."
DOWNLOAD_URL=$(curl -s "$RELEASE_URL" | grep -o '"browser_download_url": "[^"]*cre[^"]*'$OS'[^"]*'$ARCH'[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$DOWNLOAD_URL" ]; then
    echo "Found: $DOWNLOAD_URL"
    TMP_DIR=$(mktemp -d)
    curl -fsSL "$DOWNLOAD_URL" -o "$TMP_DIR/cre"
    chmod +x "$TMP_DIR/cre"
    
    # Install to ~/.local/bin or /usr/local/bin
    if [ -d "$HOME/.local/bin" ]; then
        mv "$TMP_DIR/cre" "$HOME/.local/bin/"
        echo "✅ Installed to ~/.local/bin/cre"
    else
        mkdir -p "$HOME/.local/bin"
        mv "$TMP_DIR/cre" "$HOME/.local/bin/"
        echo "✅ Installed to ~/.local/bin/cre"
        echo ""
        echo "⚠️  Please add ~/.local/bin to your PATH:"
        echo '   export PATH="$HOME/.local/bin:$PATH"'
    fi
    
    rm -rf "$TMP_DIR"
else
    echo "❌ Could not find GitHub release"
    echo ""
    echo "Please install manually from:"
    echo "https://docs.chain.link/cre/getting-started/cli-installation"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Installation Complete"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Verify installation:"
echo "   cre --version"
echo ""
