# ProLight AI - Quick Start Guide

## 🚀 Get Running in 5 Minutes

### 1. Prerequisites
- Docker & Docker Compose
- Git

### 2. Clone & Setup

```bash
git clone https://github.com/lucylow/prolight-ai-fibo
cd prolight-ai-fibo

# Run setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# Or manually:
cp backend/.env.example backend/.env
# Edit backend/.env with your keys
```

### 3. Start Services

```bash
docker-compose up -d
```

### 4. Run Migrations

```bash
docker-compose exec backend alembic upgrade head
```

### 5. Access

- **API Docs**: http://localhost:8000/docs
- **Frontend**: http://localhost:5173
- **Health**: http://localhost:8000/api/health

## 📦 What's Included

### ✅ Production Features

1. **Billing System**
   - Stripe subscriptions (Free/Pro/Enterprise)
   - Credit-based usage
   - Usage metering
   - Invoice history

2. **Marketplace**
   - Buy/sell presets and templates
   - Creator payouts via Stripe Connect
   - Reviews and ratings
   - Admin moderation

3. **Admin Dashboard**
   - Revenue analytics (MRR, ARR, churn)
   - User management
   - Content moderation
   - Generation analytics

4. **Infrastructure**
   - PostgreSQL database
   - Redis caching
   - Celery async workers
   - Nginx reverse proxy
   - Docker Compose

## 🔧 Configuration

Edit `backend/.env`:

```bash
# Required for production
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
FIBO_API_KEY=your_key
DATABASE_URL=postgresql://user:pass@host/db
REDIS_URL=redis://host:6379/0
```

## 📚 API Endpoints

### Marketplace
- `POST /api/v1/marketplace/listings` - Create listing
- `GET /api/v1/marketplace/listings/popular` - Popular items
- `POST /api/v1/marketplace/purchases` - Buy item

### Admin
- `GET /api/v1/admin/revenue/stats` - Revenue dashboard
- `GET /api/v1/admin/users` - List users
- `POST /api/v1/admin/users/{id}/credits` - Add credits

See http://localhost:8000/docs for full API documentation.

## 🚢 Production Deployment

See `DEPLOYMENT.md` for deployment to:
- Railway
- Render
- Vercel
- Any cloud provider

## 📖 Documentation

- `PRODUCTION_IMPLEMENTATION.md` - Full implementation details
- `DEPLOYMENT.md` - Production deployment guide
- `README.md` - General project documentation

## 🆘 Troubleshooting

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f backend

# Reset database (WARNING: deletes data)
docker-compose exec backend alembic downgrade base
docker-compose exec backend alembic upgrade head
```

## 🎉 You're Ready!

Your ProLight AI platform is now production-ready with:
- ✅ Full billing system
- ✅ Marketplace functionality
- ✅ Admin dashboards
- ✅ Scalable infrastructure
- ✅ Ready for 10K+ users

