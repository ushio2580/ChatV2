#!/bin/bash

echo "🔍 Checking users in database..."

# Test users endpoint
echo "Fetching users..."
response=$(curl -s http://localhost:3003/api/users 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Users response: $response"
else
    echo "❌ Failed to fetch users"
fi

echo ""
echo "Testing login with existing user..."
# Try to login with a user that might exist
response=$(curl -s -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Login response: $response"
else
    echo "❌ Login failed"
fi

echo ""
echo "✅ User check completed"
