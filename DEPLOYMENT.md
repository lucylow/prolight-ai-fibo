# ProLight AI - Production Deployment Guide

## Quick Start

### 1. Prerequisites
- Docker & Docker Compose installed
- Stripe account (for billing)
- PostgreSQL database (or use Docker Compose)
- Redis (or use Docker Compose)

### 2. Environment Setup

```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit with your actual keys
nano backend/.env
```

### 3. Start Services

```bash
# Start all services (Postgres, Redis, Backend, Worker, Nginx)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Run database migrations
docker-compose exec backend alembic upgrade head
```

### 4. Verify Deployment

- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/api/health
- Frontend: http://localhost:5173

## Production Deployment

### Railway / Render / Vercel

#### Backend (Railway/Render)

1. **Connect Repository**: Link your GitHub repo
2. **Set Environment Variables**: Add all vars from `.env.example`
3. **Build Command**: `cd backend && pip install -r requirements.txt`
4. **Start Command**: `cd backend && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

#### Database (PostgreSQL)

- **Railway**: Use Railway PostgreSQL plugin
- **Render**: Use Render PostgreSQL service
- **Supabase**: Use Supabase PostgreSQL

#### Redis

- **Railway**: Use Railway Redis plugin
- **Render**: Use Render Redis service
- **Upstash**: Use Upstash Redis

#### Frontend (Vercel)

1. **Connect Repository**
2. **Build Settings**:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. **Environment Variables**:
   - `VITE_API_URL`: Your backend API URL

## Database Migrations

```bash
# Create new migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Apply migrations
docker-compose exec backend alembic upgrade head

# Rollback
docker-compose exec backend alembic downgrade -1
```

## Stripe Setup

1. **Create Products**:
   - Pro Plan: $29/month
   - Enterprise Plan: $99/month

2. **Configure Webhooks**:
   - Endpoint: `https://your-backend.com/api/stripe/webhook`
   - Events: `customer.subscription.*`, `invoice.*`, `payment_intent.*`

3. **Enable Stripe Connect** (for marketplace):
   - Enable Connect in Stripe Dashboard
   - Set up Express accounts for creators

## Monitoring

### Health Checks

- Backend: `GET /api/health`
- Database: Check connection in `/api/health`
- Redis: Check connection in `/api/health`

### Logs

```bash
# Backend logs
docker-compose logs -f backend

# Worker logs
docker-compose logs -f worker

# All logs
docker-compose logs -f
```

## Scaling

### Horizontal Scaling

```yaml
# In docker-compose.yml
backend:
  deploy:
    replicas: 3
```

### Database Connection Pooling

Update `DATABASE_URL` with connection pooling:
```
DATABASE_URL=postgresql://user:pass@host:5432/db?pool_size=10&max_overflow=20
```

## Troubleshooting

### Database Connection Issues

```bash
# Check Postgres status
docker-compose ps postgres

# Connect to database
docker-compose exec postgres psql -U prolight -d prolight
```

### Redis Connection Issues

```bash
# Check Redis status
docker-compose ps redis

# Connect to Redis
docker-compose exec redis redis-cli ping
```

### Migration Issues

```bash
# Reset database (WARNING: Deletes all data)
docker-compose exec backend alembic downgrade base
docker-compose exec backend alembic upgrade head
```

## Security Checklist

- [ ] Change default database passwords
- [ ] Set strong JWT secret
- [ ] Enable HTTPS (SSL certificates)
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable Stripe webhook signature verification
- [ ] Use environment variables for secrets
- [ ] Enable database backups
- [ ] Set up monitoring/alerting

