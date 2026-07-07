#!/bin/bash
# SPPL Dashboard Startup Script for macOS/Linux

echo ""
echo "========================================"
echo "   SPPL Operations Dashboard"
echo "========================================"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js from https://nodejs.org"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "Starting backend server..."
npm run dev:backend &
BACKEND_PID=$!

sleep 2

echo ""
echo "Starting frontend..."
npm run dev:frontend &
FRONTEND_PID=$!

sleep 3

echo ""
echo "========================================"
echo "✅ Dashboard is starting!"
echo "========================================"
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the dashboard"
echo "========================================"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
