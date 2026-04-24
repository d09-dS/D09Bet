#!/usr/bin/env bash
set -euo pipefail

echo ""
echo "  ==================================="
echo "   Windsurf Dashboard"
echo "  ==================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "  [ERROR] Node.js is not installed or not in PATH."
    echo "          Install from: https://nodejs.org/"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_FILE="${SCRIPT_DIR}/config-server.js"

if [ ! -f "$SERVER_FILE" ]; then
    echo "  [ERROR] config-server.js not found at: $SERVER_FILE"
    exit 1
fi

PORT=3847

# Check if port is already in use
if lsof -i ":$PORT" -sTCP:LISTEN &> /dev/null 2>&1 || ss -tlnp 2>/dev/null | grep -q ":$PORT "; then
    echo "  [INFO] Server already running on port $PORT."
    echo "         Opening dashboard..."
else
    # Start server in background
    echo "  [START] Starting config server on port $PORT..."
    node "$SERVER_FILE" &
    SERVER_PID=$!

    # Wait for server to be ready
    RETRIES=0
    while [ $RETRIES -lt 10 ]; do
        sleep 1
        if curl -s "http://localhost:$PORT/health" > /dev/null 2>&1; then
            break
        fi
        RETRIES=$((RETRIES + 1))
    done

    if [ $RETRIES -ge 10 ]; then
        echo "  [ERROR] Server did not start within 10 seconds."
        kill "$SERVER_PID" 2>/dev/null || true
        exit 1
    fi

    echo "  [OK] Server is running."

    # Run full scan
    echo "  [SCAN] Running full dashboard scan..."
    curl -s "http://localhost:$PORT/dashboard-full-scan" > /dev/null 2>&1
    echo "  [OK] Scan complete."
fi

echo "  [OPEN] Opening dashboard at http://localhost:$PORT/dashboard"
echo ""

# Open browser (cross-platform)
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:$PORT/dashboard" 2>/dev/null &
elif command -v open &> /dev/null; then
    open "http://localhost:$PORT/dashboard"
else
    echo "  Please open http://localhost:$PORT/dashboard manually."
fi

echo "  Press Enter to stop the server..."
read -r

# Cleanup
if [ -n "${SERVER_PID:-}" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
    echo "  [STOP] Server stopped."
fi
