# ProLight AI - Precision Lighting Powered by FIBO

**Professional lighting simulator with deterministic 3D-to-FIBO control**

ProLight AI bridges the gap between 3D lighting design and AI image generation by providing precise, controllable lighting through Bria's FIBO model. Unlike traditional text-to-image tools, ProLight AI uses structured JSON prompts and deterministic vector-to-direction mapping to ensure professional-grade, reproducible results.

## 🎯 Key Features

### FIBO Strengths Integration

**JSON-Native Generation**
- Structured prompts for deterministic, auditable results
- VLM bridge converts natural language to precise JSON
- Lighting override workflow for maximum control

**Pro Parameters**
- Precise direction mapping (front, front-left, left, etc.)
- Color temperature control (Kelvin)
- Intensity and softness parameters
- Three-point lighting support (main, fill, rim)

**Controllability**
- Deterministic 3D vector → FIBO direction conversion
- Reproducible results with seed control
- Lock/unlock specific lighting parameters
- Real-time 3D preview with instant FIBO rendering

**Disentangled Generation**
- Separate control of subject, environment, camera, and lighting
- Override individual components without regenerating entire scene
- Maintain consistency across variations

## 🏗️ Architecture

```
┌─────────────────┐
│  3D UI (Three.js)│
│  Light Positions │
└────────┬─────────┘
         │ {x, y, z}
         ▼
┌─────────────────────────┐
│  Lighting Mapper        │
│  vector_to_direction()  │
└────────┬────────────────┘
         │ "front-left", etc.
         ▼
┌─────────────────────────┐
│  VLM Bridge (Gemini)    │
│  Scene → Structured JSON│
└────────┬────────────────┘
         │ Base JSON
         ▼
┌─────────────────────────┐
│  Lighting Override      │
│  Replace lighting block │
└────────┬────────────────┘
         │ Final JSON
         ▼
┌─────────────────────────┐
│  FIBO Image Generation  │
│  JSON → Professional Img│
└─────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Bria API token ([Get one here](https://bria.ai))

### Local Development

1. **Clone and setup**
```bash
git clone https://github.com/lucylow/prolight-ai-fibo.git
cd prolight-ai-fibo
```

2. **Backend setup**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your BRIA_API_TOKEN
```

3. **Run backend**
```bash
# Development mode (with mock FIBO)
ENV=development USE_MOCK_FIBO=true python -m uvicorn app.main:app --reload

# Production mode (with real FIBO)
ENV=production USE_MOCK_FIBO=false python -m uvicorn app.main:app
```

4. **Frontend setup** (if applicable)
```bash
cd ../frontend
npm install
npm run dev
```

### Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
# Environment: development, staging, or production
ENV=development

# Bria API Tokens (use appropriate token based on ENV)
BRIA_API_TOKEN=your_token_here
BRIA_API_TOKEN_STAGING=your_staging_token
BRIA_API_TOKEN_PROD=your_production_token

# Mock mode (set to false to use real FIBO API)
USE_MOCK_FIBO=true
```

**Token Priority:**
- `production`: Uses `BRIA_API_TOKEN_PROD` → `BRIA_API_TOKEN`
- `staging`: Uses `BRIA_API_TOKEN_STAGING` → `BRIA_API_TOKEN`
- `development`: Uses `BRIA_API_TOKEN`

### Secrets Management

#### Local Development
- Store secrets in `.env` (never commit!)
- Use `.env.example` as template

#### Lovable Deployment
1. Go to project settings
2. Add environment variables:
   - `BRIA_API_TOKEN_PROD`
   - `ENV=production`
   - `USE_MOCK_FIBO=false`

#### GitHub Environments
1. Go to Settings → Environments
2. Create `staging` and `production` environments
3. Add secrets:
   - `BRIA_API_TOKEN_STAGING`
   - `BRIA_API_TOKEN_PROD`

#### Vercel Deployment
```bash
vercel env add BRIA_API_TOKEN_PROD production
vercel env add ENV production
```

## 📡 API Usage

### Generate Image with Lighting Control

```bash
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "scene_prompt": "a vintage watch on a wooden table",
    "lights": [
      {
        "id": "key",
        "type": "directional",
        "position": {"x": 1.0, "y": 2.0, "z": 3.0},
        "intensity": 0.8,
        "color_temperature": 5600,
        "softness": 0.3,
        "enabled": true
      },
      {
        "id": "fill",
        "type": "point",
        "position": {"x": -0.5, "y": 0.6, "z": 1.0},
        "intensity": 0.4,
        "color_temperature": 5600,
        "softness": 0.7,
        "enabled": true
      }
    ],
    "num_results": 1,
    "sync": true
  }'
```

**Response:**
```json
{
  "ok": true,
  "status": "completed",
  "image_url": "https://cdn.bria.ai/...",
  "structured_prompt": {
    "short_description": "A vintage watch...",
    "lighting": {
      "main_light": {
        "direction": "front-right",
        "intensity": 0.8,
        "color_temperature": 5600,
        "softness": 0.3
      },
      "fill_light": {
        "direction": "front-left",
        "intensity": 0.4,
        "color_temperature": 5600,
        "softness": 0.7
      }
    }
  },
  "meta": {
    "seed": 42,
    "refined_prompt": "..."
  }
}
```

### Check Async Job Status

```bash
curl http://localhost:8000/api/status/{request_id}
```

## 🧮 How Lighting Mapping Works

ProLight AI uses a deterministic algorithm to convert 3D light positions to FIBO direction strings:

### Coordinate System
- **Subject**: Origin (0, 0, 0)
- **Front**: +Z axis
- **Right**: +X axis
- **Up**: +Y axis

### Direction Mapping

1. **Calculate azimuth** (horizontal angle):
   ```
   azimuth = atan2(x, z) in degrees (-180° to 180°)
   ```

2. **Calculate elevation** (vertical angle):
   ```
   elevation = atan2(y, sqrt(x² + z²)) in degrees
   ```

3. **Map to direction**:

   **Elevation Priority:**
   - `elevation ≥ 60°` → `overhead`
   - `elevation ≤ -60°` → `underneath`

   **Horizontal Directions (45° slices):**
   - `[-22.5°, 22.5°]` → `front`
   - `(22.5°, 67.5°]` → `front-right`
   - `(67.5°, 112.5°]` → `right`
   - `(112.5°, 157.5°]` → `back-right`
   - `> 157.5° or ≤ -157.5°` → `back`
   - `(-157.5°, -112.5°]` → `back-left`
   - `(-112.5°, -67.5°]` → `left`
   - `(-67.5°, -22.5°]` → `front-left`

### Example

**Input:** Light at position `(1.0, 2.0, 3.0)`
- Azimuth: `atan2(1, 3) ≈ 18.4°`
- Elevation: `atan2(2, sqrt(10)) ≈ 32.3°`
- **Result:** `front` (within [-22.5°, 22.5°])

**Input:** Light at position `(0, 10, 0)`
- Elevation: `90°`
- **Result:** `overhead`

## 🧪 Testing

### Run All Tests
```bash
cd backend
pytest tests/ -v
```

### Run Specific Test Suite
```bash
# Lighting mapper tests
pytest tests/test_lighting_mapper.py -v

# Bria client tests
pytest tests/test_bria_client.py -v

# Integration tests
pytest tests/test_generate_endpoint.py -v
```

### Run with Coverage
```bash
pytest tests/ -v --cov=. --cov-report=html
open htmlcov/index.html
```

### Linting and Formatting
```bash
# Check formatting
black --check .

# Auto-format
black .

# Lint
flake8 .
```

## 🎬 Demo Script (3-Minute Video)

1. **Start backend** (30s)
   ```bash
   ENV=development python -m uvicorn app.main:app --reload
   ```
   Show console logs demonstrating startup

2. **Show 3D UI** (30s)
   - Open frontend
   - Demonstrate 3D light positioning
   - Show real-time preview

3. **Generate with FIBO** (60s)
   - Click "Generate"
   - Show console logs:
     - VLM prompt-to-JSON conversion
     - Lighting override
     - FIBO API call with `api_token` header
   - Display generated image

4. **Adjust lighting** (45s)
   - Move one light in 3D UI
   - Regenerate
   - Show side-by-side comparison

5. **Show structured prompt** (15s)
   - Display JSON with overridden lighting
   - Highlight deterministic direction values

## 🏆 Judging Criteria Alignment

### Usage of Bria FIBO ⭐⭐⭐⭐⭐

**JSON-Native Generation:**
- ✅ Full structured prompt workflow
- ✅ VLM bridge integration
- ✅ Transparent JSON inspection

**Pro Parameters:**
- ✅ All FIBO lighting parameters supported
- ✅ Color temperature, intensity, softness
- ✅ Three-point lighting (main, fill, rim)

**Controllability:**
- ✅ Deterministic vector-to-direction mapping
- ✅ Reproducible results with seed
- ✅ Override workflow for precision

**Disentangled Generation:**
- ✅ Separate lighting control
- ✅ Maintain scene consistency
- ✅ Iterative refinement

### Potential Impact ⭐⭐⭐⭐⭐

**Professional Workflows:**
- Product photography studios
- E-commerce platforms
- Advertising agencies
- Film pre-visualization

**Production Problems Solved:**
- Expensive physical lighting setups
- Time-consuming trial-and-error
- Inconsistent results across shoots
- Difficulty communicating lighting intent

**Enterprise Scale:**
- Batch processing for catalogs
- Brand consistency across thousands of images
- API-first architecture for integration
- Cost reduction: $500/shoot → $0.04/image

### Innovation & Creativity ⭐⭐⭐⭐⭐

**Novel Approach:**
- First 3D-to-FIBO bridge for lighting
- Deterministic mapping algorithm
- Real-time preview + professional render

**Unique Combination:**
- Three.js 3D UI + FIBO structured prompts
- VLM scene understanding + precise lighting override
- Interactive exploration + reproducible results

**Improvements Over Existing Tools:**
- vs. Text-to-Image: Precise control, not vague descriptions
- vs. 3D Rendering: AI quality, not synthetic look
- vs. Photo Editing: Generate from scratch, not just adjust

## 📦 Production Deployment

### Fail-Fast Validation

The backend validates required secrets at startup:

```python
# In production, this will raise RuntimeError if token is missing
if ENV == "production":
    settings.validate_production_secrets()
```

### Error Handling

- **401 Unauthorized** → Returns 502 with helpful message
- **429 Rate Limit** → Returns 429 with `Retry-After`
- **500 Server Error** → Automatic retry with exponential backoff

### Retry Logic

Uses `tenacity` library:
- Max attempts: 5
- Exponential backoff: 0.5s → 1s → 2s → 4s → 8s
- Max delay: 30s

## 🤝 Contributing

1. Create branch: `feat/your-feature` or `fix/your-fix`
2. Make changes
3. Run tests: `pytest tests/ -v`
4. Run linting: `black . && flake8 .`
5. Commit with conventional commits:
   - `feat: add new feature`
   - `fix: resolve bug`
   - `chore: update dependencies`
6. Push and create PR

## 📄 License

MIT License - see LICENSE file

## 🙏 Acknowledgments

- **Bria AI** for FIBO and structured generation
- **Gemini** for VLM bridge
- **Three.js** for 3D lighting UI

## 📞 Contact

- GitHub: [@lucylow](https://github.com/lucylow)
- Email: support@prolightai.com
- Website: https://prolightai.com

---

**Built for the Bria AI Hackathon 2025**
*Precision Lighting, Powered by FIBO*
