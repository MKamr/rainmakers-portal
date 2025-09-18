#!/bin/bash

echo "🚀 Setting up Rainmakers Portal..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Create environment files
echo "⚙️ Creating environment files..."

# Backend .env
if [ ! -f "backend/.env" ]; then
    echo "Creating backend/.env from template..."
    cp backend/env.example backend/.env
    echo "⚠️  Please update backend/.env with your actual configuration values"
else
    echo "✅ backend/.env already exists"
fi

# Frontend .env
if [ ! -f "frontend/.env" ]; then
    echo "Creating frontend/.env from template..."
    cp frontend/env.example frontend/.env
    echo "⚠️  Please update frontend/.env with your actual configuration values"
else
    echo "✅ frontend/.env already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set up Firebase project and download service account key"
echo "2. Update backend/.env with your Firebase configuration"
echo "3. Update frontend/.env with your Discord and Microsoft app IDs"
echo "4. Run 'npm run dev' to start both frontend and backend"
echo ""
echo "🔧 Configuration needed:"
echo "- Firebase project ID and service account key"
echo "- Discord OAuth app credentials"
echo "- GoHighLevel API key"
echo "- Microsoft Graph API credentials"
echo ""
echo "📚 See README.md for detailed setup instructions"
