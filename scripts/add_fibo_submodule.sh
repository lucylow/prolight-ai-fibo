#!/usr/bin/env bash
set -euo pipefail

# Add FIBO as a git submodule for direct local usage and reference
# This allows us to reference the official Bria-AI/FIBO repository code and schemas

echo "Adding FIBO as git submodule..."

# Check if submodule already exists
if [ -d "libs/fibo" ] && [ -f "libs/fibo/.git" ]; then
    echo "FIBO submodule already exists at libs/fibo"
    echo "Updating submodule..."
    git submodule update --init --recursive libs/fibo
else
    echo "Adding new FIBO submodule..."
    git submodule add https://github.com/Bria-AI/FIBO.git libs/fibo || {
        echo "Warning: Failed to add submodule. This might be because:"
        echo "  1. libs/fibo already exists (not as submodule)"
        echo "  2. Git submodule command failed"
        echo "You can manually clone: git clone https://github.com/Bria-AI/FIBO.git libs/fibo"
        exit 1
    }
    git submodule update --init --recursive
fi

echo "✓ FIBO submodule added/updated at libs/fibo"
echo ""
echo "To update the submodule later, run:"
echo "  git submodule update --remote libs/fibo"

