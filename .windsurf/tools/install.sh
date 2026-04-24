#!/usr/bin/env bash
# Windsurf Agent Skills - Setup Script (macOS/Linux)
# Starts config server (if Node.js available) and opens the Tech Stack UI.
# Detects existing AGENTS.md and performs smart merge with backup.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_PATH="$SCRIPT_DIR/project-init-ui.html"
SERVER_PATH="$SCRIPT_DIR/config-server.js"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
AGENTS_MD="$PROJECT_ROOT/AGENTS.md"

echo ""
echo "========================================"
echo "  Windsurf Agent Skills - Setup"
echo "========================================"
echo ""

# Pre-flight: Check for existing AGENTS.md
if [ -f "$AGENTS_MD" ]; then
  if grep -q "<!-- ASP:" "$AGENTS_MD" 2>/dev/null; then
    echo "[INFO] Existing AGENTS.md found with ASP markers."
    echo "       ASP sections will be updated in-place when config is saved."
  else
    echo "[WARN] Existing AGENTS.md found WITHOUT ASP markers."
    echo "       A backup will be created in .windsurf/backups/"
    echo "       Your project-specific content will be preserved."
  fi
  echo ""
else
  echo "[INFO] No existing AGENTS.md found. Will create from template."
  echo ""
fi

open_browser() {
  local target="$1"
  if command -v xdg-open &> /dev/null; then
    xdg-open "$target" &
  elif command -v open &> /dev/null; then
    open "$target"
  else
    echo "[INFO] Please open manually: $target"
  fi
}

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "[INFO] Node.js not found -- starting in offline mode."
  echo "       You can still configure your stack manually."
  echo "       The config will be downloaded as a file."
  echo ""
  open_browser "$UI_PATH"
  echo "[OK] UI opened in browser."
  echo ""
  echo "Move the downloaded project-init-config.json to .windsurf/"
  echo "Then run /project-init in Windsurf."
  echo ""
  exit 0
fi

# Check if port 3847 is already in use
if command -v lsof &> /dev/null; then
  if lsof -i :3847 -sTCP:LISTEN &> /dev/null; then
    echo "[WARN] Port 3847 is already in use."
    echo "       Another config server may be running."
    echo "       Opening UI anyway..."
    echo ""
    open_browser "$UI_PATH"
    exit 0
  fi
elif command -v ss &> /dev/null; then
  if ss -tlnp | grep -q ":3847 "; then
    echo "[WARN] Port 3847 is already in use."
    echo "       Opening UI anyway..."
    echo ""
    open_browser "$UI_PATH"
    exit 0
  fi
fi

# Start config server
echo "[INFO] Starting Config Server on port 3847..."
open_browser "$UI_PATH"

echo "[OK] Config Server running. UI opened in browser."
echo ""
echo "Fill out the form and click 'Save & Generate'."
echo "The server will shut down automatically after saving."
echo "You can also click 'Analyze Project' to auto-detect your stack."
echo "AGENTS.md merge happens automatically when config is saved."
echo ""

# Run server in foreground (will exit after save)
node "$SERVER_PATH"

echo ""
echo "========================================"
echo "  Config saved successfully!"
echo "========================================"
echo ""
echo "Run /project-init in Windsurf to generate skills."
echo ""
