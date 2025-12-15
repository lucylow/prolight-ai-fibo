# ProLight AI - Complete Package

**Professional Lighting Simulator Powered by FIBO**

This is a production-ready, full-stack application for creating professional lighting setups using AI-powered image generation.

## 📦 What's Included

### ✅ Complete Backend (FastAPI)
- **5 API Modules**: Generate, Presets, History, Batch, Analysis
- **FIBO Integration**: Full FIBO JSON support with mock fallback
- **Comprehensive Mock Data**: 6 professional presets + test fixtures
- **Pydantic Schemas**: Type-safe request/response models
- **Docker Support**: Dockerfile + docker-compose included
- **Production Ready**: Error handling, CORS, logging, health checks

### ✅ Complete Frontend (React + TypeScript)
- **TypeScript Types**: Full FIBO schema definitions
- **API Client**: With mock fallback for offline development
- **React Hooks**: useGenerateImage, usePresets, useHistory, useBatchGeneration, useLightingAnalysis
- **Existing Components**: Lighting controls, 3D visualization, gallery
- **Lovable Compatible**: .lovable.json configuration included

### ✅ Deployment Configuration
- **Docker Compose**: One-command deployment
- **Environment Templates**: .env.example for both frontend and backend
- **Deployment Guide**: Complete production deployment instructions
- **Setup Guide**: Quick start in 5 minutes

### ✅ Documentation
- **Backend README**: API setup and documentation
- **Setup Guide**: Local development and Docker setup
- **Deployment Guide**: Production deployment options
- **API Documentation**: Auto-generated Swagger UI

## 🚀 Quick Start (Choose One)

### Option 1: Docker (Recommended - 1 minute)
```bash
# Extract ZIP
unzip prolight-ai-complete.zip
cd prolight-ai-enhanced

# Start with Docker Compose
docker-compose up -d

# Access:
# Frontend: http://localhost:5173
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Option 2: Local Development (5 minutes)

**Terminal 1 - Frontend:**
```bash
cd prolight-ai-enhanced
npm install
npm run dev
# Frontend at http://localhost:5173
```

**Terminal 2 - Backend:**
```bash
cd prolight-ai-enhanced/backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m app.main
# Backend at http://localhost:8000
```

## 📋 System Requirements

### For Docker
- Docker 20.10+
- Docker Compose 2.0+

### For Local Development
- Node.js 18+
- Python 3.11+
- npm or yarn
- Git

## 🔧 Configuration

### 1. Backend Configuration
```bash
cd prolight-ai-enhanced/backend
cp .env.example .env
# Edit .env with your settings:
# - FIBO_API_KEY (get from https://www.bria.ai/)
# - USE_MOCK_FIBO=True (for testing)
# - GEMINI_API_KEY (optional, for natural language)
```

### 2. Frontend Configuration
```bash
cd prolight-ai-enhanced
cp .env.example .env.local
# Edit .env.local:
# - VITE_API_URL=http://localhost:8000
```

## 📚 Project Structure

```
prolight-ai-enhanced/
├── src/                              # React Frontend
│   ├── components/                   # React components
│   ├── hooks/
│   │   ├── useProLightAPI.ts        # ⭐ NEW: API integration hooks
│   │   ├── useLighting.ts           # Lighting state management
│   │   └── useGeneration.ts         # Generation management
│   ├── services/
│   │   └── apiClient.ts             # ⭐ NEW: API client with mock fallback
│   ├── types/
│   │   └── fibo.ts                  # ⭐ NEW: TypeScript FIBO types
│   ├── pages/                        # Page components
│   └── App.tsx
├── backend/                          # ⭐ NEW: FastAPI Backend
│   ├── app/
│   │   ├── api/
│   │   │   ├── generate.py          # Image generation endpoints
│   │   │   ├── presets.py           # Lighting presets
│   │   │   ├── history.py           # Generation history
│   │   │   ├── batch.py             # Batch operations
│   │   │   └── analyze.py           # Lighting analysis
│   │   ├── core/
│   │   │   └── config.py            # Configuration management
│   │   ├── models/
│   │   │   └── schemas.py           # Pydantic schemas
│   │   ├── services/
│   │   │   └── fibo_adapter.py      # FIBO API integration
│   │   ├── data/
│   │   │   └── mock_data.py         # ⭐ NEW: Comprehensive mock data
│   │   └── main.py                  # FastAPI application
│   ├── requirements.txt
│   ├── .env.example
│   ├── README.md
│   └── Dockerfile
├── docker-compose.yml                # ⭐ NEW: Docker configuration
├── Dockerfile.frontend               # ⭐ NEW: Frontend Docker
├── .lovable.json                     # ⭐ NEW: Lovable configuration
├── SETUP.md                          # ⭐ NEW: Setup guide
├── DEPLOYMENT.md                     # ⭐ NEW: Deployment guide
└── README.md                         # Project overview
```

## 🎯 Key Features

### Backend API Endpoints

**Generate**
- `POST /api/generate` - Generate image from lighting setup
- `POST /api/generate/natural-language` - Generate from description
- `POST /api/generate/from-preset` - Generate using preset

**Presets**
- `GET /api/presets` - List all presets
- `GET /api/presets/{id}` - Get specific preset
- `GET /api/presets/categories` - List categories
- `POST /api/presets/search` - Search presets

**History**
- `GET /api/history` - Get generation history
- `GET /api/history/{id}` - Get specific generation
- `GET /api/history/stats` - Get statistics

**Batch**
- `POST /api/batch/generate` - Start batch job
- `GET /api/batch/{id}` - Get batch status
- `POST /api/batch/product-variations` - Generate variations

**Analysis**
- `POST /api/analyze/lighting` - Analyze lighting
- `POST /api/analyze/compare` - Compare setups
- `GET /api/analyze/recommendations/{style}` - Get recommendations

**Health**
- `GET /api/health` - Health check

### Mock Data Included

- **6 Professional Presets**: Butterfly, Rembrandt, Loop, Split, Product, Golden Hour
- **FIBO Templates**: Portrait and product photography
- **Generation History**: Mock records with realistic data
- **User Profiles**: Mock user data and preferences
- **Batch Export Data**: Complete batch job examples
- **Analysis Data**: Mock lighting analysis results

## 🧪 Testing

### API Testing
```bash
# Health check
curl http://localhost:8000/api/health

# Get presets
curl http://localhost:8000/api/presets

# API documentation
# Visit: http://localhost:8000/docs
```

### Frontend Testing
```bash
cd prolight-ai-enhanced
npm test
```

### Backend Testing
```bash
cd prolight-ai-enhanced/backend
pytest tests/ -v
```

## 🚢 Deployment

### Docker Deployment
```bash
docker-compose up -d
```

### Production Deployment
See `DEPLOYMENT.md` for detailed instructions for:
- Vercel (Frontend)
- Railway (Backend)
- Heroku
- Self-hosted
- Kubernetes

## 📖 Documentation

1. **SETUP.md** - Quick start and local development
2. **DEPLOYMENT.md** - Production deployment guide
3. **backend/README.md** - Backend API documentation
4. **README.md** - Project overview

## 🔑 API Keys Required

### FIBO API Key (Required for real generation)
1. Visit https://www.bria.ai/
2. Sign up for API access
3. Get your API key
4. Add to `backend/.env`: `FIBO_API_KEY=your_key_here`

### Gemini API Key (Optional, for natural language)
1. Visit https://makersuite.google.com/app/apikey
2. Create API key
3. Add to `backend/.env`: `GEMINI_API_KEY=your_key_here`

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Verify environment variables
docker-compose config

# Rebuild image
docker-compose build --no-cache backend
```

### CORS errors
1. Check `CORS_ORIGINS` in `backend/.env`
2. Ensure frontend URL is in the list
3. Restart backend

### Port already in use
```bash
# Use different port
docker-compose up -d -p 8001:8000
```

### Mock data not loading
1. Verify `USE_MOCK_FIBO=True` in `backend/.env`
2. Check backend logs
3. Restart backend

## 📊 What's New in This Package

### ✨ New Backend
- Complete FastAPI application with 5 API modules
- FIBO adapter with mock and real API support
- Comprehensive mock data system
- Production-ready error handling and logging

### ✨ New Frontend Integration
- TypeScript FIBO types
- API client service with mock fallback
- React hooks for all API operations
- Lovable-compatible configuration

### ✨ New Deployment
- Docker and docker-compose configuration
- Environment templates
- Comprehensive deployment guide
- Setup guide for quick start

## 🎓 Learning Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Three.js Documentation](https://threejs.org/docs/)
- [FIBO Documentation](https://www.bria.ai/docs)
- [Docker Documentation](https://docs.docker.com/)

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

1. Check **SETUP.md** for quick start
2. Check **DEPLOYMENT.md** for deployment issues
3. Check **backend/README.md** for API documentation
4. Review backend logs: `docker-compose logs backend`
5. Review frontend console: Browser DevTools

## 🎯 Next Steps

1. **Extract the ZIP file**
2. **Choose deployment method** (Docker or local)
3. **Configure environment variables** (.env files)
4. **Start the application**
5. **Access frontend** at http://localhost:5173
6. **View API docs** at http://localhost:8000/docs

---

**Ready to create professional lighting setups?** Start with Docker Compose! 🚀

```bash
docker-compose up -d
```

Then visit:
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs
