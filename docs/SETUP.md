# ProLight AI - Complete Setup Guide

Professional lighting simulator powered by FIBO. Get started in 5 minutes!

## 🚀 Quick Start (5 minutes)

### Option 1: Using Docker (Recommended)

```bash
# Clone repository
git clone https://github.com/lucylow/prolight-ai-fibo.git
cd prolight-ai-fibo

# Start with Docker Compose
docker-compose up -d

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Option 2: Local Development

**Step 1: Frontend Setup**
```bash
npm install
npm run dev
# Frontend available at http://localhost:5173
```

**Step 2: Backend Setup (New Terminal)**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m app.main
# Backend available at http://localhost:8000
```

## 📋 Prerequisites

### For Docker
- Docker 20.10+
- Docker Compose 2.0+

### For Local Development
- Node.js 18+
- Python 3.11+
- npm or yarn
- Git

## 🔧 Configuration

### 1. Environment Variables

**Frontend (.env.local)**
```env
VITE_API_URL=http://localhost:8000
```

**Backend (.env)**
```env
# Copy from .env.example
cp backend/.env.example backend/.env

# Edit with your settings
FIBO_API_KEY=your_key_here
USE_MOCK_FIBO=True  # Use mock data for testing
```

### 2. API Keys

#### FIBO API Key
1. Visit [BRIA AI](https://www.bria.ai/)
2. Sign up for API access
3. Get your API key
4. Add to `backend/.env`: `FIBO_API_KEY=your_key`

#### Gemini API Key (Optional)
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Add to `backend/.env`: `GEMINI_API_KEY=your_key`

## 📁 Project Structure

```
prolight-ai-fibo/
├── src/                          # Frontend React code
│   ├── components/               # React components
│   ├── hooks/
│   │   ├── useProLightAPI.ts    # API integration hooks
│   │   ├── useLighting.ts       # Lighting state management
│   │   └── useGeneration.ts     # Generation management
│   ├── services/
│   │   └── apiClient.ts         # API client with mock fallback
│   ├── types/
│   │   └── fibo.ts              # TypeScript types
│   ├── pages/                    # Page components
│   └── App.tsx                  # Main app component
├── backend/                      # FastAPI backend
│   ├── app/
│   │   ├── api/                 # API endpoints
│   │   │   ├── generate.py      # Image generation
│   │   │   ├── presets.py       # Lighting presets
│   │   │   ├── history.py       # Generation history
│   │   │   ├── batch.py         # Batch operations
│   │   │   └── analyze.py       # Lighting analysis
│   │   ├── core/
│   │   │   └── config.py        # Configuration
│   │   ├── models/
│   │   │   └── schemas.py       # Pydantic schemas
│   │   ├── services/
│   │   │   └── fibo_adapter.py  # FIBO integration
│   │   ├── data/
│   │   │   └── mock_data.py     # Mock data
│   │   └── main.py              # FastAPI app
│   ├── requirements.txt         # Python dependencies
│   ├── .env.example             # Environment template
│   └── Dockerfile               # Docker configuration
├── package.json                 # Frontend dependencies
├── docker-compose.yml           # Docker Compose config
├── .lovable.json               # Lovable configuration
└── DEPLOYMENT.md               # Deployment guide
```

## 🎯 Key Features

### Frontend
- **3D Lighting Visualization**: Real-time Three.js preview
- **Lighting Controls**: Interactive sliders for all parameters
- **Preset Browser**: Browse and apply professional presets
- **Generation Gallery**: View and manage generated images
- **Analysis Dashboard**: Real-time lighting metrics

### Backend
- **FastAPI Server**: High-performance REST API
- **FIBO Integration**: Native FIBO JSON support
- **Mock Data**: Comprehensive test data included
- **Batch Processing**: Generate multiple images efficiently
- **Lighting Analysis**: Professional quality assessment

## 🔌 API Endpoints

### Generate
- `POST /api/generate` - Generate image from lighting setup
- `POST /api/generate/natural-language` - Generate from description
- `POST /api/generate/from-preset` - Generate using preset

### Presets
- `GET /api/presets` - List all presets
- `GET /api/presets/{id}` - Get specific preset
- `GET /api/presets/categories` - List categories
- `POST /api/presets/search` - Search presets

### History
- `GET /api/history` - Get generation history
- `GET /api/history/{id}` - Get specific generation
- `GET /api/history/stats` - Get statistics

### Batch
- `POST /api/batch/generate` - Start batch job
- `GET /api/batch/{id}` - Get batch status
- `POST /api/batch/product-variations` - Generate variations

### Analysis
- `POST /api/analyze/lighting` - Analyze lighting
- `POST /api/analyze/compare` - Compare setups
- `GET /api/analyze/recommendations/{style}` - Get recommendations

### Health
- `GET /api/health` - Health check

## 📚 API Documentation

Once backend is running:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🧪 Testing

### Frontend Tests
```bash
npm test
```

### Backend Tests
```bash
cd backend
pytest tests/ -v
```

### API Testing
```bash
# Using curl
curl http://localhost:8000/api/health

# Using Python
python backend/scripts/test_fibo_api.py
```

## 🚢 Deployment

### Docker Deployment
```bash
docker-compose up -d
```

### Production Deployment
See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Vercel (Frontend)
```bash
npm run build
vercel deploy --prod
```

### Railway (Backend)
```bash
railway up
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Change port in docker-compose.yml or use:
docker-compose up -d -p 8001:8000
```

### CORS Errors
1. Check `CORS_ORIGINS` in `backend/.env`
2. Ensure frontend URL is in the list
3. Restart backend

### Backend Won't Connect
1. Verify backend is running: `curl http://localhost:8000/api/health`
2. Check `VITE_API_URL` in frontend `.env.local`
3. Check browser console for errors

### Mock Data Not Loading
1. Verify `USE_MOCK_FIBO=True` in `backend/.env`
2. Check backend logs: `docker-compose logs backend`
3. Restart backend

## 📖 Documentation

- [Backend README](./backend/README.md) - Backend setup and API docs
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [Main README](./README.md) - Project overview

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

- Check [Troubleshooting](#-troubleshooting) section
- Review [Documentation](#-documentation)
- Check backend logs: `docker-compose logs backend`
- Check frontend console: Browser DevTools

## 🎓 Learning Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Three.js Documentation](https://threejs.org/docs/)
- [FIBO Documentation](https://www.bria.ai/docs)

---

**Ready to create professional lighting setups?** Start with Docker Compose above! 🚀
