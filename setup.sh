#!/bin/bash

# Chat Platform Setup Script
echo "🚀 Setting up Chat Platform..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js version check passed: $(node -v)"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL is not installed. Please install PostgreSQL 13+ first."
    print_warning "You can install it with: sudo apt-get install postgresql postgresql-contrib"
    exit 1
fi

print_success "PostgreSQL is installed"

# Setup Backend
print_status "Setting up backend..."
cd backend

# Install dependencies
print_status "Installing backend dependencies..."
npm install

# Setup environment file
if [ ! -f .env ]; then
    print_status "Creating .env file..."
    cp env.example .env
    print_warning "Please edit .env file with your database credentials"
else
    print_success ".env file already exists"
fi

# Setup database
print_status "Setting up database..."
npx prisma generate
npx prisma db push

print_success "Backend setup completed"

# Setup Frontend
print_status "Setting up frontend..."
cd ../frontend

# Install dependencies
print_status "Installing frontend dependencies..."
npm install

print_success "Frontend setup completed"

# Go back to root directory
cd ..

print_success "🎉 Setup completed successfully!"
echo ""
print_status "Next steps:"
echo "1. Edit backend/.env with your database credentials"
echo "2. Start PostgreSQL service: sudo systemctl start postgresql"
echo "3. Create database: createdb chat_platform"
echo "4. Start backend: cd backend && npm run dev"
echo "5. Start frontend: cd frontend && npm run dev"
echo ""
print_status "Or use Docker:"
echo "docker-compose up -d"
echo ""
print_status "Access the application at: http://localhost:3000"
