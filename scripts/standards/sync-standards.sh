#!/usr/bin/env bash

# Standards Sync Script
# Syncs CLAUDE.md and AGENTS.md from orryx-standards to all product repos

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTROL_PLANE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Standards source
STANDARDS_ROOT="$CONTROL_PLANE_ROOT/../orryx-standards"
CLAUDE_MD="$STANDARDS_ROOT/CLAUDE.md"
AGENTS_MD="$STANDARDS_ROOT/AGENTS.md"

# Registry
REGISTRY_FILE="$CONTROL_PLANE_ROOT/repos/registry.yaml"

echo "========================================"
echo "Orryx Standards Sync"
echo "========================================"

# Check if standards repo exists
if [ ! -d "$STANDARDS_ROOT" ]; then
    echo -e "${RED}✗ orryx-standards not found at: $STANDARDS_ROOT${NC}"
    exit 1
fi

# Check if CLAUDE.md exists
if [ ! -f "$CLAUDE_MD" ]; then
    echo -e "${RED}✗ CLAUDE.md not found at: $CLAUDE_MD${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found orryx-standards${NC}"

# Function to sync standards to a product repo
sync_to_repo() {
    local REPO_NAME=$1
    local REPO_PATH=$2

    echo ""
    echo "Syncing to: $REPO_NAME"
    echo "  Path: $REPO_PATH"

    # Check if repo exists
    if [ ! -d "$REPO_PATH" ]; then
        echo -e "${YELLOW}  ⚠ Repository not found, skipping${NC}"
        return
    fi

    # Copy CLAUDE.md
    if [ -f "$CLAUDE_MD" ]; then
        cp "$CLAUDE_MD" "$REPO_PATH/CLAUDE.md"
        echo -e "${GREEN}  ✓ CLAUDE.md synced${NC}"

        # Update last synced timestamp
        TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
        # Update the "Last synced" line in the file (platform-agnostic)
        if command -v sed &> /dev/null; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' "s/> Last synced: .*/> Last synced: $TIMESTAMP/" "$REPO_PATH/CLAUDE.md"
            else
                # Linux
                sed -i "s/> Last synced: .*/> Last synced: $TIMESTAMP/" "$REPO_PATH/CLAUDE.md"
            fi
        fi
    fi

    # Copy AGENTS.md if it exists
    if [ -f "$AGENTS_MD" ]; then
        cp "$AGENTS_MD" "$REPO_PATH/AGENTS.md"
        echo -e "${GREEN}  ✓ AGENTS.md synced${NC}"
    fi

    # Create sync marker file
    echo "$TIMESTAMP" > "$REPO_PATH/.orryx-standards-sync"
}

# Parse registry and sync to each product
# For now, hardcode the product repos (later can parse YAML)
PRODUCT_REPOS=(
    "pillarworks:$CONTROL_PLANE_ROOT/../pillarworks-build-mvp"
    "triora:$CONTROL_PLANE_ROOT/../triora"
    "orryx:$CONTROL_PLANE_ROOT/../orryx"
    "orryx-flow:$CONTROL_PLANE_ROOT/../orryx-flow"
)

echo ""
echo "Syncing to product repositories..."

for REPO_ENTRY in "${PRODUCT_REPOS[@]}"; do
    IFS=':' read -r REPO_NAME REPO_PATH <<< "$REPO_ENTRY"
    sync_to_repo "$REPO_NAME" "$REPO_PATH"
done

echo ""
echo "========================================"
echo -e "${GREEN}Standards sync complete${NC}"
echo "========================================"

# Show summary
echo ""
echo "Next steps:"
echo "1. Review changes in each product repo"
echo "2. Commit changes if appropriate"
echo "3. Push to remote if ready"
echo ""
echo "To verify sync status:"
echo "  cat <repo-path>/.orryx-standards-sync"
