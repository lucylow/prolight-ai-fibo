#!/bin/bash
# ProLight AI - Production Setup Script

set -e

echo "🚀 ProLight AI - Production Setup"
echo "=================================="

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "📝 Creating .env file from template..."
    cp backend/.env.example backend/.env
    echo "⚠️  Please edit backend/.env with your actual API keys and secrets"
fi

# Create nginx directories
echo "📁 Creating nginx directories..."
mkdir -p nginx/ssl

# Build and start services
echo "🐳 Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d postgres redis

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Run migrations
echo "🗄️  Running database migrations..."
docker-compose exec -T backend alembic upgrade head || echo "⚠️  Migrations failed (backend may not be ready yet)"

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your API keys"
echo "2. Start all services: docker-compose up -d"
echo "3. Run migrations: docker-compose exec backend alembic upgrade head"
echo "4. Visit http://localhost:8000/docs for API documentation"

