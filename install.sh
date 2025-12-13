#!/bin/bash

# ProLight AI Installation Script
# Installs both frontend and backend dependencies

set -e

echo "🚀 ProLight AI Installation Script"
echo "=================================="
echo ""

# Check for required tools
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11+ from https://www.python.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ Python version: $(python3 --version)"
echo ""

# Frontend setup
echo "📦 Installing Frontend Dependencies..."
npm install
echo "✅ Frontend dependencies installed"
echo ""

# Backend setup
echo "📦 Setting up Backend..."
cd backend

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt
echo "✅ Backend dependencies installed"

# Setup environment file
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit backend/.env with your API keys"
fi

cd ..

# Frontend environment
if [ ! -f ".env.local" ]; then
    echo "Creating frontend .env.local..."
    cat > .env.local << EOF
VITE_API_URL=http://localhost:8000
EOF
    echo "✅ Frontend .env.local created"
fi

echo ""
echo "✅ Installation Complete!"
echo ""
echo "📚 Next Steps:"
echo "============="
echo ""
echo "1. Configure API Keys:"
echo "   - Edit backend/.env"
echo "   - Add FIBO_API_KEY from https://www.bria.ai/"
echo "   - (Optional) Add GEMINI_API_KEY"
echo ""
echo "2. Start Development Servers:"
echo ""
echo "   Terminal 1 - Frontend:"
echo "   npm run dev"
echo ""
echo "   Terminal 2 - Backend:"
echo "   cd backend"
echo "   source venv/bin/activate  # Windows: venv\\Scripts\\activate"
echo "   python -m app.main"
echo ""
echo "3. Access the Application:"
echo "   - Frontend: http://localhost:5173"
echo "   - Backend: http://localhost:8000"
echo "   - API Docs: http://localhost:8000/docs"
echo ""
echo "📖 For more information, see SETUP.md"
echo ""
