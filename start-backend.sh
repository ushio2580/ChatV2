#!/bin/bash

echo "🚀 Iniciando Chat Platform Backend..."
echo "====================================="

# Kill any existing processes
echo "🔄 Deteniendo procesos anteriores..."
pkill -f "nodemon.*index" 2>/dev/null || true
pkill -f "ts-node.*index" 2>/dev/null || true
sleep 2

# Change to backend directory
cd /home/neo/Chatv2/backend

# Check if the file exists
if [ ! -f "src/index-simple-3003.ts" ]; then
    echo "❌ Error: Archivo src/index-simple-3003.ts no encontrado"
    exit 1
fi

echo "✅ Archivo encontrado: src/index-simple-3003.ts"

# Start the backend
echo "🚀 Iniciando backend en puerto 3003..."
npx ts-node src/index-simple-3003.ts
