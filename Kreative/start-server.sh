#!/bin/bash

# Kreative Dashboard Server Launcher
# This script starts a local development server

clear
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║         🎨 Kreative Dashboard PWA Server 🎨                ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if we're in the right directory
if [ ! -f "dashboard.html" ]; then
    echo "❌ Error: dashboard.html not found"
    echo "Please run this script from the kreative directory"
    exit 1
fi

# Check if icons exist
if [ ! -f "icons/icon-192.png" ]; then
    echo "⚠️  Warning: PWA icons not found"
    echo ""
    echo "To generate icons, visit:"
    echo "  http://localhost:8080/icon-generator.html"
    echo ""
    echo "Press Enter to continue anyway..."
    read
fi

# Find an available port
PORT=8080
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; do
    PORT=$((PORT + 1))
done

echo "Starting server on port $PORT..."
echo ""
echo "─────────────────────────────────────────────────────────────"
echo ""
echo "  📱 Dashboard:       http://localhost:$PORT/"
echo "  🎨 Projects:        http://localhost:$PORT/projects.html"
echo "  🔧 Icon Generator:  http://localhost:$PORT/icon-generator.html"
echo ""
echo "─────────────────────────────────────────────────────────────"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "Server starting..."
echo ""

# Start Python HTTP server
python3 -m http.server $PORT

