# ProLight AI Backend

Professional lighting simulator backend API powered by FIBO.

## Quick Start

### Prerequisites
- Python 3.11+
- pip or poetry

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment configuration
cp .env.example .env
```

### Running the Server

```bash
# Development mode
python -m app.main

# Or using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## Project Structure

```
backend/
├── app/
│   ├── api/                 # API endpoints
│   │   ├── generate.py      # Image generation endpoints
│   │   ├── presets.py       # Lighting presets endpoints
│   │   ├── history.py       # Generation history endpoints
│   │   ├── batch.py         # Batch operations endpoints
│   │   └── analyze.py       # Lighting analysis endpoints
│   ├── core/
│   │   └── config.py        # Configuration management
│   ├── models/
│   │   └── schemas.py       # Pydantic models and schemas
│   ├── services/
│   │   └── fibo_adapter.py  # FIBO API integration
│   ├── data/
│   │   └── mock_data.py     # Mock data for development
│   └── main.py              # FastAPI application
├── tests/                   # Test suite
├── requirements.txt         # Python dependencies
├── .env.example            # Environment variables template
└── README.md               # This file
```

## API Endpoints

### Generate
- `POST /api/generate` - Generate image from lighting setup
- `POST /api/generate/natural-language` - Generate from natural language
- `POST /api/generate/from-preset` - Generate using preset

### Presets
- `GET /api/presets` - List all presets
- `GET /api/presets/{preset_id}` - Get specific preset
- `GET /api/presets/categories` - List preset categories
- `POST /api/presets/search` - Search presets

### History
- `GET /api/history` - Get generation history
- `GET /api/history/{generation_id}` - Get specific generation
- `DELETE /api/history/{generation_id}` - Delete generation
- `POST /api/history/clear` - Clear all history
- `GET /api/history/stats` - Get history statistics

### Batch
- `POST /api/batch/generate` - Start batch generation
- `GET /api/batch/{batch_id}` - Get batch status
- `POST /api/batch/product-variations` - Generate product variations
- `GET /api/batch/{batch_id}/export` - Export batch results

### Analysis
- `POST /api/analyze/lighting` - Analyze lighting setup
- `POST /api/analyze/compare` - Compare two setups
- `GET /api/analyze/recommendations/{style}` - Get style recommendations

### Health
- `GET /api/health` - Health check

## Configuration

Edit `.env` file to configure:

```env
# FIBO API
FIBO_API_KEY=your_key_here
USE_MOCK_FIBO=True  # Set to False to use real FIBO API

# Database
DATABASE_URL=sqlite:///./prolight.db

# CORS
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=False
```

## Development

### Running Tests

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=app
```

### Code Quality

```bash
# Format code
black app/ tests/

# Sort imports
isort app/ tests/

# Lint
flake8 app/ tests/

# Type checking
mypy app/
```

## Mock Data

The backend includes comprehensive mock data for development:

- **Lighting Presets**: 6 professional presets (Butterfly, Rembrandt, Loop, Split, Product, Golden Hour)
- **FIBO Templates**: Portrait and product photography templates
- **Generation History**: Mock generation records
- **User Profiles**: Mock user data and preferences

Access mock data via `app.data.mock_data.MockDataManager`

## Deployment

### Docker

```bash
# Build image
docker build -t prolight-ai-backend .

# Run container
docker run -p 8000:8000 -e FIBO_API_KEY=your_key prolight-ai-backend
```

### Environment Variables

Set these in your deployment environment:

- `FIBO_API_KEY` - Your FIBO API key
- `GEMINI_API_KEY` - Your Gemini API key (optional)
- `DATABASE_URL` - Database connection string
- `CORS_ORIGINS` - Allowed CORS origins
- `DEBUG` - Debug mode (True/False)

## Troubleshooting

### Port Already in Use
```bash
# Use different port
uvicorn app.main:app --port 8001
```

### Import Errors
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### FIBO API Errors
- Check `FIBO_API_KEY` is set correctly
- Verify API endpoint is accessible
- Set `USE_MOCK_FIBO=True` for testing

## Support

For issues and questions, please refer to the main project README.

## License

MIT License - See LICENSE file for details
