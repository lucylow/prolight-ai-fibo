# ProLight AI - Deployment Guide

Complete guide for deploying ProLight AI in various environments.

## Table of Contents

1. [Local Development](#local-development)
2. [Docker Deployment](#docker-deployment)
3. [Production Deployment](#production-deployment)
4. [Environment Variables](#environment-variables)
5. [Troubleshooting](#troubleshooting)

## Local Development

### Prerequisites

- Node.js 18+
- Python 3.11+
- npm or yarn
- Git

### Setup

```bash
# Clone repository
git clone https://github.com/lucylow/prolight-ai-fibo.git
cd prolight-ai-fibo

# Frontend setup
npm install
cp .env.example .env.local

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env

# Return to root
cd ..
```

### Running Locally

**Terminal 1 - Frontend:**
```bash
npm run dev
# Frontend available at http://localhost:5173
```

**Terminal 2 - Backend:**
```bash
cd backend
source venv/bin/activate
python -m app.main
# Backend available at http://localhost:8000
# API docs at http://localhost:8000/docs
```

## Docker Deployment

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

### Quick Start

```bash
# Build and run containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

### Accessing Services

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Building Custom Images

```bash
# Build backend image
docker build -t prolight-ai-backend:latest ./backend

# Build frontend image
docker build -t prolight-ai-frontend:latest -f Dockerfile.frontend .

# Run backend
docker run -p 8000:8000 \
  -e FIBO_API_KEY=your_key \
  -e USE_MOCK_FIBO=True \
  prolight-ai-backend:latest

# Run frontend
docker run -p 5173:5173 \
  -e VITE_API_URL=http://localhost:8000 \
  prolight-ai-frontend:latest
```

## Production Deployment

### Frontend Deployment (Vercel)

```bash
# Build production bundle
npm run build

# Deploy to Vercel
vercel deploy --prod
```

**Environment Variables:**
```
VITE_API_URL=https://api.prolight-ai.com
```

### Backend Deployment (Railway/Heroku)

```bash
# Build and push Docker image
docker build -t prolight-ai-backend:latest ./backend
docker tag prolight-ai-backend:latest registry.example.com/prolight-ai-backend:latest
docker push registry.example.com/prolight-ai-backend:latest

# Deploy using Docker
docker run -d \
  -p 8000:8000 \
  -e FIBO_API_KEY=$FIBO_API_KEY \
  -e DATABASE_URL=$DATABASE_URL \
  -e CORS_ORIGINS='["https://prolight-ai.com"]' \
  -e DEBUG=False \
  registry.example.com/prolight-ai-backend:latest
```

### Using Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up

# View logs
railway logs
```

### Using Heroku

```bash
# Install Heroku CLI
brew tap heroku/brew && brew install heroku

# Login
heroku login

# Create app
heroku create prolight-ai

# Set environment variables
heroku config:set FIBO_API_KEY=your_key
heroku config:set USE_MOCK_FIBO=False

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

## Environment Variables

### Frontend (.env.local or .env)

```env
# API Configuration
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=ProLight AI
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_BATCH=true
VITE_ENABLE_ANALYSIS=true
VITE_ENABLE_HISTORY=true
```

### Backend (.env)

```env
# Application
APP_NAME=ProLight AI
APP_VERSION=1.0.0
DEBUG=False

# API
API_PREFIX=/api
API_TITLE=ProLight AI API

# FIBO
FIBO_API_URL=https://api.bria.ai/v1/models/fibo
FIBO_API_KEY=your_fibo_api_key_here
USE_MOCK_FIBO=True

# Gemini (optional)
GEMINI_API_KEY=your_gemini_api_key_here

# Database
DATABASE_URL=sqlite:///./prolight.db
# For PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost/prolight

# CORS
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# Server
HOST=0.0.0.0
PORT=8000
RELOAD=False  # Set to False in production

# Image Generation
MAX_IMAGE_RESOLUTION=4096
DEFAULT_IMAGE_RESOLUTION=2048
COST_PER_GENERATION=0.04
```

## Production Checklist

- [ ] Set `DEBUG=False` in backend
- [ ] Set `RELOAD=False` in backend
- [ ] Use PostgreSQL instead of SQLite
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS origins correctly
- [ ] Set strong `SECRET_KEY` for sessions
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline
- [ ] Enable API authentication
- [ ] Set up error tracking (Sentry)
- [ ] Configure CDN for static assets
- [ ] Set up database backups

## Monitoring

### Backend Health Check

```bash
curl http://localhost:8000/api/health
```

### Docker Health Check

```bash
docker inspect --format='{{.State.Health.Status}}' prolight-ai-backend
```

### Logs

```bash
# Docker
docker-compose logs -f backend

# Kubernetes
kubectl logs -f deployment/prolight-ai-backend

# Heroku
heroku logs --tail

# Railway
railway logs
```

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      replicas: 3
    environment:
      - WORKERS=4
```

### Load Balancing

```nginx
# nginx.conf
upstream backend {
    server backend-1:8000;
    server backend-2:8000;
    server backend-3:8000;
}

server {
    listen 80;
    location /api {
        proxy_pass http://backend;
    }
}
```

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
docker-compose logs backend

# Verify environment variables
docker-compose config

# Rebuild image
docker-compose build --no-cache backend
```

### CORS Errors

1. Check `CORS_ORIGINS` environment variable
2. Ensure frontend URL is in the list
3. Restart backend after changing

### Database Errors

```bash
# Reset database
rm prolight.db
# Backend will recreate on startup

# For PostgreSQL
psql -U user -d prolight -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

### FIBO API Errors

- Verify `FIBO_API_KEY` is correct
- Check API endpoint is accessible
- Enable `USE_MOCK_FIBO=True` for testing
- Check rate limits

## Support

For deployment issues, refer to:
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)
- [Docker Documentation](https://docs.docker.com/)
- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app/)

## License

MIT License - See LICENSE file for details
