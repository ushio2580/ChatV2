#!/bin/bash

echo "🚀 Starting Chat Platform"
echo "=========================="

# Kill any existing processes
echo "🔄 Stopping existing processes..."
pkill -f "nodemon.*index" 2>/dev/null || true
pkill -f "ts-node.*index" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# Start backend
echo "🔧 Starting backend..."
cd /home/neo/Chatv2/backend
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
if curl -s http://localhost:3003/health > /dev/null; then
    echo "✅ Backend is running on http://localhost:3003"
else
    echo "❌ Backend failed to start"
    exit 1
fi

# Start frontend
echo "🎨 Starting frontend..."
cd /home/neo/Chatv2/frontend
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 5

# Check if frontend is running
if curl -s http://localhost:5173 > /dev/null; then
    echo "✅ Frontend is running on http://localhost:5173"
else
    echo "❌ Frontend failed to start"
    exit 1
fi

echo ""
echo "🎉 Chat Platform is ready!"
echo "=========================="
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend:  http://localhost:3003"
echo ""
echo "📋 Test Credentials:"
echo "   Email: test@test.com"
echo "   Password: 123456"
echo ""
echo "💬 How to use:"
echo "   1. Open http://localhost:5173 in your browser"
echo "   2. Click 'Login'"
echo "   3. Enter: test@test.com / 123456"
echo "   4. Start chatting!"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user interrupt
trap "echo ''; echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '✅ All services stopped'; exit 0" INT

# Keep script running
wait
