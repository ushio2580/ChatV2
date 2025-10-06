#!/bin/bash

echo "🔧 Configuring backend port..."

# Create .env file with correct port
cat > /home/neo/Chatv2/backend/.env << EOF
PORT=3003
NODE_ENV=development
MONGODB_URI=mongodb+srv://chatplatform:chatplatform123@cluster0.mongodb.net/chatplatform?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=30d
EOF

echo "✅ Backend configured to use port 3003"
echo "✅ Environment variables set"
echo ""
echo "Now restart the backend:"
echo "cd /home/neo/Chatv2/backend && npm run dev"
