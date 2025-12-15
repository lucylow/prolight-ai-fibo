# ProLight AI - Professional Lighting Simulator

<div align="center">

![ProLight AI](https://img.shields.io/badge/ProLight-AI-blue?style=for-the-badge&logo=ai&logoColor=white)
![FIBO Hackathon](https://img.shields.io/badge/FIBO-Hackathon-orange?style=for-the-badge&logo=hackathon&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge&logo=opensourceinitiative&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-blue?logo=react&logoColor=white)
![Deno](https://img.shields.io/badge/Deno-1.40-black?logo=deno&logoColor=white)

**Precision Lighting, Powered by FIBO**

[Quick Start](#-quick-start) • [Features](#-key-features) • [Deployment](#-deployment) • [API](#-api-documentation) • [Architecture](#️-system-architecture) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Quick Start](#-quick-start)
  - [Lovable Deployment](#lovable-deployment-recommended)
  - [Local Development](#local-development)
- [Key Features](#-key-features)
- [Installation](#️-installation)
- [Deployment](#-deployment)
  - [Lovable Cloud](#lovable-cloud-recommended)
  - [Vercel + Supabase](#vercel--supabase)
  - [Docker](#docker)
- [API Documentation](#-api-documentation)
- [System Architecture](#️-system-architecture)
- [Development](#-development)
- [FIBO Integration](#-fibo-integration-details)
- [Use Cases](#-use-cases)
- [FAQ](#-frequently-asked-questions)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

ProLight AI is a production-grade studio lighting simulator that bridges the gap between photographic expertise and AI image generation. By leveraging **BRIA FIBO's JSON-native architecture**, we replace unpredictable text prompts with precise, professional lighting parameters—enabling perfect studio setups in seconds without expensive equipment.

> **Innovation**: Unlike traditional AI image generators that rely on ambiguous text prompts, ProLight AI provides deterministic control through structured JSON parameters, giving photographers and creators reproducible, professional-grade results with seed-based reproducibility.

### Technical Highlights

- **Edge Computing**: Supabase Edge Functions (Deno runtime) for sub-100ms API responses
- **Type-Safe Architecture**: Full TypeScript implementation with strict type checking
- **Real-Time 3D Visualization**: Three.js + React Three Fiber for 60 FPS lighting previews
- **Deterministic Generation**: FIBO JSON schema ensures reproducible results with seed values
- **Natural Language Processing**: Google Gemini AI for converting descriptions to structured parameters
- **Production-Ready**: Error handling, validation, rate limiting, and comprehensive logging

---

## 🚀 Quick Start

### Lovable Deployment (Recommended)

**Fastest way to get ProLight AI running:**

1. **Import to Lovable**
   - Go to [Lovable.dev](https://lovable.dev)
   - Click "New Project" → "Import from Repository"
   - Connect your GitHub repository

2. **Configure Environment Variables**
   
   In Lovable project settings → Environment Variables, add:
   ```bash
   # Required - Supabase Configuration
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   
   # Required - BRIA API
   BRIA_API_KEY=your_bria_api_key_here
   
   # Optional - Google Gemini (for natural language)
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Deploy**
   - Click **"Deploy"** in Lovable dashboard
   - Wait for build (~2-3 minutes)
   - Your app will be live!

**📖 Detailed Lovable Guide**: See [LOVABLE_DEPLOYMENT.md](./docs/LOVABLE_DEPLOYMENT.md) for complete setup instructions.

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-username/prolight-ai-fibo.git
cd prolight-ai-fibo

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm run dev
```

The application will be available at `http://localhost:8080`.

**📖 Full Setup Guide**: See [Installation](#️-installation) section below.

---

## 🎬 Demo

### Live Demo
- **Production URL**: [Coming Soon]
- **Staging Environment**: [Coming Soon]

### Demo Features
- **Interactive 3D Studio**: Real-time lighting visualization with Three.js
- **Natural Language Input**: Describe your lighting setup in plain English
- **Professional Presets**: One-click application of classic lighting patterns
- **Image Generation**: Generate high-quality images with deterministic results
- **Analysis Dashboard**: Real-time lighting metrics and professional ratings

### Quick Demo Script
1. **Start with a Preset**: Select "Rembrandt" from the presets menu
2. **Adjust Parameters**: Modify intensity, color temperature, and softness
3. **View 3D Preview**: See real-time updates in the 3D visualization
4. **Generate Image**: Click "Generate" and wait 2-4 seconds
5. **Analyze Results**: Review the professional rating and recommendations

---

## 🚀 Key Features

### 🎨 **Professional Lighting Control**

- **Multi-Point Lighting System**: Key, fill, rim, and ambient light controls with independent parameterization
- **Real-time 3D Visualization**: Interactive Three.js preview with directional light helpers and shadow visualization
- **Precise Parameter Control**: 
  - Intensity: 0.0-1.0 normalized scale
  - Color Temperature: 2500K-10000K (Kelvin)
  - Softness: 0.0-1.0 (hard to soft light)
  - Distance: 0.5-5.0 meters (inverse square falloff)
  - Direction: Spherical coordinates (azimuth, elevation) or photographic descriptions
- **Professional Presets**: Butterfly, Rembrandt, dramatic fashion, soft portrait, split lighting, and clamshell setups
- **Lighting Ratio Analysis**: Real-time key-to-fill ratio calculation with professional style classification

### 🤖 **FIBO JSON-Native Integration**

- **Structured JSON Generation**: Convert natural language to precise FIBO JSON schemas via Gemini AI
- **Deterministic Results**: Same parameters + seed = identical output every time
- **Parameter Disentanglement**: Modify individual lighting elements without affecting others
- **Three Operation Modes**: 
  - **Generate**: Direct lighting parameter control
  - **Refine**: Iterative parameter adjustment
  - **Inspire**: Natural language to structured conversion
- **FIBO Schema Compliance**: Full adherence to BRIA FIBO specification with validation

### 📊 **Advanced Analysis**

- **Lighting Ratio Calculator**: Real-time key-to-fill ratio analysis (1:1 to 8:1+)
- **Professional Rating System**: AI-powered quality assessment (1-10 scale) based on:
  - Lighting balance and contrast
  - Color temperature harmony
  - Shadow detail preservation
  - Professional style adherence
- **Color Harmony Analysis**: Temperature consistency and mood assessment
- **Technical Recommendations**: Expert suggestions for improvement based on photographic principles

### 🎮 **Premium User Experience**

- **Glass Morphism UI**: Modern, professional interface with backdrop blur effects
- **Real-time Previews**: Instant 3D visualization of lighting changes (60 FPS target)
- **Drag & Drop Controls**: Intuitive parameter adjustment with visual feedback
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Dark Mode Support**: System-aware theme switching with smooth transitions

### 🎥 **Video Editing & Post-Processing**
- **Background Removal**: Remove backgrounds from generated images
- **Upscaling**: Enhance image resolution with AI-powered upscaling
- **Foreground Masking**: Advanced masking for precise edits
- **Real-time Status Updates**: Server-Sent Events (SSE) for job progress
- **Batch Processing**: Process multiple images simultaneously

---

## 🛠️ Installation

### Prerequisites

- **Node.js** 18+ and **npm** 9+ (or **bun** 1.0+)
- **Deno** 1.40+ (for local edge function development)
- **Supabase CLI** (for edge function deployment)
- **Git** for version control

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/prolight-ai-fibo.git
cd prolight-ai-fibo

# Install dependencies
npm install
# or
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm run dev
# or
bun run dev
```

The application will be available at `http://localhost:8080` (configurable in `vite.config.ts`).

### Backend Setup

The backend is a FastAPI application that provides additional API endpoints and features:

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment configuration
cp .env.example .env
# Edit .env with your API keys

# Run the server
python -m app.main
# Or using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at `http://localhost:8000` with interactive documentation at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Docker Setup (Recommended)

For a complete setup with both frontend and backend:

```bash
# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

This will start:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Database: PostgreSQL (if configured)

### Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# BRIA API Configuration
BRIA_API_KEY=your_bria_api_key_here
BRIA_API_URL=https://api.bria.ai/v2

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Application Configuration
VITE_APP_NAME=ProLight AI
VITE_API_URL=http://localhost:54321/functions/v1
```

**Backend Environment Variables** (`.env` in `backend/` directory):

```env
# FIBO API Configuration
FIBO_API_KEY=your_bria_api_key_here
USE_MOCK_FIBO=True  # Set to False to use real FIBO API

# Google Gemini API (Optional)
GEMINI_API_KEY=your_gemini_api_key_here

# Database Configuration
DATABASE_URL=sqlite:///./prolight.db
# Or PostgreSQL: postgresql://user:password@localhost:5432/prolight

# CORS Configuration
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000","http://localhost:8080"]

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=False
```

### Supabase Edge Functions Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy edge functions
supabase functions deploy generate-lighting
supabase functions deploy natural-language-lighting
supabase functions deploy analyze-lighting
supabase functions deploy video-editing

# Set secrets for edge functions
supabase secrets set BRIA_API_KEY=your_key
supabase secrets set GEMINI_API_KEY=your_key
```

### Local Edge Function Development

```bash
# Start Supabase locally
supabase start

# Serve edge functions locally
supabase functions serve generate-lighting --env-file .env.local

# Test edge function
curl -X POST http://localhost:54321/functions/v1/generate-lighting \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"subjectDescription": "test", "environment": "studio", ...}'
```

---

## 🚀 Deployment

### Lovable Cloud (Recommended)

**Fastest deployment option with automatic builds and hosting:**

1. **Import Project**
   - Go to [Lovable.dev](https://lovable.dev)
   - Click "New Project" → "Import from Repository"
   - Connect your GitHub repository

2. **Configure Environment Variables**
   
   In Lovable project settings → Environment Variables:
   ```bash
   # Required
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   BRIA_API_KEY=your_bria_api_key_here
   
   # Optional
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Deploy**
   - Click **"Deploy"** button
   - Wait for build (~2-3 minutes)
   - Your app is live!

**📖 Complete Guide**: See [LOVABLE_DEPLOYMENT.md](./LOVABLE_DEPLOYMENT.md)

### Vercel + Supabase

**Frontend Deployment (Vercel):**

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

**Vercel Environment Variables:**
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `VITE_API_URL` - Backend API URL (if using separate backend)

**Edge Functions Deployment:**

```bash
# Deploy all functions
supabase functions deploy generate-lighting
supabase functions deploy natural-language-lighting
supabase functions deploy analyze-lighting
supabase functions deploy video-editing

# Set environment secrets
supabase secrets set BRIA_API_KEY=your_key
supabase secrets set GEMINI_API_KEY=your_key
```

### Docker

```bash
# Build Docker image
cd backend
docker build -t prolight-ai-backend .

# Run container
docker run -d \
  -p 8000:8000 \
  -e FIBO_API_KEY=your_key \
  -e DATABASE_URL=your_database_url \
  prolight-ai-backend
```

### Other Deployment Options

- **Railway**: See [Deployment Guide](./docs/DEPLOYMENT.md)
- **Heroku**: See [Deployment Guide](./docs/DEPLOYMENT.md)
- **AWS/GCP/Azure**: See [Deployment Guide](./docs/DEPLOYMENT.md)

---

## 📚 API Documentation

### Supabase Edge Functions

All edge functions are deployed to Supabase and accessible via:
```
https://{project-ref}.supabase.co/functions/v1/{function-name}
```

#### Generate Image from Lighting Setup

**Endpoint:** `POST /functions/v1/generate-lighting`

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer {supabase_anon_key}
```

**Request Body:**
```typescript
interface SceneRequest {
  subjectDescription: string;        // Required: Subject description
  environment: string;                // Required: Environment/scene description
  lightingSetup: {
    key?: LightSettings;
    fill?: LightSettings;
    rim?: LightSettings;
    ambient?: LightSettings;
  };
  cameraSettings: {
    shotType: string;                 // e.g., "close-up", "medium shot"
    cameraAngle: string;              // e.g., "eye-level", "high angle"
    fov: number;                      // Field of view (10-180 degrees)
    lensType: string;                  // e.g., "portrait", "wide-angle"
    aperture: string;                 // e.g., "f/2.8", "f/11"
  };
  stylePreset?: string;               // Optional: Preset name
  enhanceHDR?: boolean;              // Optional: Enable HDR enhancement
  negativePrompt?: string;            // Optional: Negative prompt
}

interface LightSettings {
  direction: string;                  // Photographic direction description
  intensity: number;                  // 0.0-1.0
  colorTemperature: number;          // 2500-10000 Kelvin
  softness: number;                   // 0.0-1.0
  distance: number;                   // 0.5-5.0 meters
  enabled: boolean;                   // Light on/off
}
```

**Example Request:**
```json
{
  "subjectDescription": "professional model in studio",
  "environment": "minimalist photography studio with gray backdrop",
  "lightingSetup": {
    "key": {
      "direction": "45 degrees camera-right, elevated 30 degrees",
      "intensity": 0.8,
      "colorTemperature": 5600,
      "softness": 0.6,
      "distance": 1.5,
      "enabled": true
    },
    "fill": {
      "direction": "30 degrees camera-left",
      "intensity": 0.4,
      "colorTemperature": 5600,
      "softness": 0.7,
      "distance": 2.0,
      "enabled": true
    }
  },
  "cameraSettings": {
    "shotType": "medium shot",
    "cameraAngle": "eye-level",
    "fov": 85,
    "lensType": "portrait",
    "aperture": "f/2.8"
  },
  "stylePreset": "rembrandt",
  "enhanceHDR": true
}
```

**Response:**
```typescript
interface GenerationResponse {
  success: boolean;
  imageUrl: string;                   // URL to generated image
  seed: number;                        // Seed for reproducibility
  fiboJson: FIBOPrompt;                // Complete FIBO JSON used
  analysis: {
    keyFillRatio: number;              // Calculated ratio
    lightingStyle: string;             // Classified style
    professionalRating: number;        // 1-10 rating
    recommendations: string[];        // Improvement suggestions
  };
  metadata: {
    generationTime: number;            // Milliseconds
    model: string;                     // FIBO model version
    resolution: [number, number];      // Image dimensions
  };
}
```

#### Natural Language Generation

**Endpoint:** `POST /functions/v1/natural-language-lighting`

**Request Body:**
```typescript
interface NaturalLanguageRequest {
  sceneDescription: string;           // Required: Overall scene description
  lightingDescription: string;        // Required: Lighting description in natural language
  subject: string;                     // Required: Subject description
  styleIntent?: string;                // Optional: Style intent
  environment?: string;                // Optional: Environment override
}
```

#### Lighting Analysis

**Endpoint:** `POST /functions/v1/analyze-lighting`

**Request Body:**
```typescript
interface AnalysisRequest {
  lightingSetup: {
    key?: LightSettings;
    fill?: LightSettings;
    rim?: LightSettings;
    ambient?: LightSettings;
  };
}
```

**Response:**
```typescript
interface AnalysisResponse {
  keyFillRatio: number;                // Calculated key-to-fill ratio
  lightingStyle: string;               // Classified style name
  professionalRating: number;          // 1-10 rating
  colorHarmony: {
    temperatureConsistency: number;    // 0-1 score
    mood: string;                       // Warm/cool/neutral
  };
  recommendations: string[];            // Improvement suggestions
  technicalNotes: string[];            // Technical observations
}
```

### Complete FIBO JSON Example

See [FIBO Integration Details](#-fibo-integration-details) section for complete FIBO JSON schema and examples.

### TypeScript Client Example

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

async function generateImage(lightingSetup: SceneRequest) {
  const { data, error } = await supabase.functions.invoke('generate-lighting', {
    body: lightingSetup,
  });

  if (error) {
    console.error('Generation error:', error);
    throw error;
  }

  return data;
}
```

### Backend API Endpoints

The FastAPI backend provides additional endpoints:

- **Generate**: `POST /api/generate`, `POST /api/generate/natural-language`, `POST /api/generate/from-preset`
- **Presets**: `GET /api/presets`, `GET /api/presets/{preset_id}`, `GET /api/presets/categories`
- **History**: `GET /api/history`, `GET /api/history/{generation_id}`, `DELETE /api/history/{generation_id}`
- **Batch**: `POST /api/batch/generate`, `GET /api/batch/{batch_id}`, `POST /api/batch/product-variations`
- **Analysis**: `POST /api/analyze/lighting`, `POST /api/analyze/compare`, `GET /api/analyze/recommendations/{style}`
- **Video Editing**: `POST /api/video-editing/jobs`, `GET /api/video-editing/jobs/{job_id}`, `GET /api/video-editing/subscribe/{job_id}`
- **Tailored Generation**: `POST /api/tailored/projects`, `GET /api/tailored/projects`, `POST /api/tailored/models`

**📖 Complete API Documentation**: See [Backend README](./backend/README.md)

---

## 🏗️ System Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser<br/>React 18 + TypeScript]
        CDN[Vercel CDN<br/>Static Assets]
    end
    
    subgraph "Edge Computing Layer"
        EdgeFn[Supabase Edge Functions<br/>Deno 1.40 Runtime]
        EdgeFn1[generate-lighting<br/>POST /generate-lighting]
        EdgeFn2[natural-language-lighting<br/>POST /natural-language-lighting]
        EdgeFn3[analyze-lighting<br/>POST /analyze-lighting]
        EdgeFn4[video-editing<br/>POST /video-editing]
    end
    
    subgraph "External APIs"
        BRIA[BRIA FIBO API<br/>Image Generation]
        Gemini[Google Gemini API<br/>Natural Language Processing]
    end
    
    subgraph "Storage & Database"
        SupabaseStorage[Supabase Storage<br/>Generated Images]
        SupabaseDB[(Supabase PostgreSQL<br/>User Sessions & Metadata)]
    end
    
    Browser --> CDN
    Browser --> EdgeFn
    
    EdgeFn --> EdgeFn1
    EdgeFn --> EdgeFn2
    EdgeFn --> EdgeFn3
    EdgeFn --> EdgeFn4
    
    EdgeFn1 --> BRIA
    EdgeFn2 --> Gemini
    EdgeFn2 --> BRIA
    EdgeFn3 --> SupabaseDB
    
    BRIA --> SupabaseStorage
    EdgeFn1 --> SupabaseStorage
    EdgeFn2 --> SupabaseStorage
    
    style Browser fill:#e1f5ff
    style EdgeFn fill:#fff4e1
    style BRIA fill:#ffe1f5
    style SupabaseStorage fill:#e1ffe1
```

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend Framework** | React | 18.3.1 | Modern UI framework with concurrent features |
| **Type System** | TypeScript | 5.8.3 | Type safety and developer experience |
| **3D Graphics** | Three.js | 0.160.1 | WebGL-based 3D rendering |
| **3D React Integration** | React Three Fiber | 8.18.0 | React renderer for Three.js |
| **State Management** | Zustand | 4.5.7 | Lightweight state management |
| **Data Fetching** | TanStack Query | 5.83.0 | Server state management and caching |
| **UI Components** | Radix UI | Latest | Accessible component primitives |
| **Styling** | Tailwind CSS | 3.4.17 | Utility-first CSS framework |
| **Build Tool** | Vite | 5.4.19 | Next-generation frontend tooling |
| **Edge Runtime** | Deno | 1.40 | TypeScript-native runtime for edge functions |
| **Edge Functions** | Supabase Edge Functions | Latest | Serverless functions on Deno |
| **AI/ML** | BRIA FIBO API | v2 | Structured image generation |
| **NLP** | Google Gemini | Latest | Natural language processing |
| **Database** | Supabase PostgreSQL | Latest | Relational database with real-time |
| **Storage** | Supabase Storage | Latest | Object storage for images |
| **Deployment** | Vercel / Lovable | Latest | Frontend deployment platform |

---

## 🔧 Development

### Project Structure

```
prolight-ai-fibo/
├── src/                          # Frontend source code
│   ├── components/               # React components
│   │   ├── ui/                   # Reusable UI components (Radix UI)
│   │   ├── lighting/             # Lighting control components
│   │   ├── studio/               # Studio view components
│   │   ├── generation/           # Image generation components
│   │   └── composition/          # Composition tools
│   ├── pages/                    # Page components
│   ├── hooks/                    # Custom React hooks
│   ├── stores/                   # Zustand state stores
│   ├── utils/                    # Utility functions
│   ├── types/                    # TypeScript type definitions
│   ├── api/                      # API client functions
│   └── App.tsx                   # Root component
├── supabase/
│   ├── functions/                # Edge functions
│   │   ├── generate-lighting/     # Main generation function
│   │   ├── natural-language-lighting/ # NL to FIBO conversion
│   │   ├── analyze-lighting/      # Lighting analysis
│   │   └── video-editing/         # Video editing function
│   └── migrations/               # Database migrations
├── backend/                       # FastAPI backend
│   ├── app/                      # Application code
│   ├── requirements.txt          # Python dependencies
│   └── README.md                 # Backend documentation
├── docs/                         # Documentation
├── public/                        # Static assets
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript configuration
└── package.json                   # Dependencies
```

### Running Tests

```bash
# Frontend tests (when implemented)
npm run test

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development Workflow

1. **Feature Development:**
   ```bash
   git checkout -b feature/your-feature-name
   # Make changes
   npm run dev  # Start dev server
   # Test locally
   git commit -m "feat: add feature"
   git push origin feature/your-feature-name
   ```

2. **Edge Function Development:**
   ```bash
   # Test edge function locally
   supabase functions serve generate-lighting --env-file .env.local
   
   # Deploy to staging
   supabase functions deploy generate-lighting --project-ref staging-ref
   ```

---

## 🎯 FIBO Integration Details

### Why FIBO?

- **JSON-Native Architecture**: Structured prompts instead of ambiguous text
- **Deterministic Control**: Reproducible results with same parameters + seed
- **Professional Parameters**: Camera, lighting, and composition controls
- **Commercial Licensing**: Fully licensed training data for commercial use
- **Type Safety**: Strongly typed schema with validation

### FIBO JSON Schema

The complete FIBO JSON schema structure:

```typescript
interface FIBOPrompt {
  subject: {
    main_entity: string;                // Primary subject
    attributes: string[];               // Subject attributes
    action?: string;                    // Subject action
    emotion?: string;                   // Emotional state
    mood?: string;                       // Overall mood
  };
  environment: {
    setting: string;                    // Environment description
    time_of_day?: string;               // Time of day
    lighting_conditions?: string;       // Lighting conditions
    atmosphere?: string;                 // Atmospheric description
  };
  camera: {
    shot_type: string;                  // Shot type
    camera_angle: string;               // Camera angle
    fov: number;                        // Field of view (10-180)
    lens_type: string;                  // Lens type
    aperture: string;                   // Aperture setting
    seed?: number;                      // Random seed
  };
  lighting: {
    main_light?: {
      direction: string;                // Photographic direction
      intensity: number;                // 0.0-1.0
      color_temperature: number;        // Kelvin (2500-10000)
      softness: number;                 // 0.0-1.0
      distance: number;                 // Meters
    };
    fill_light?: { /* same structure */ };
    rim_light?: { /* same structure */ };
    ambient_light?: {
      intensity: number;
      color_temperature: number;
    };
  };
  // ... additional fields
}
```

### Natural Language to FIBO Conversion

The natural language processing uses Google Gemini AI with a specialized system prompt to convert descriptions to structured FIBO JSON parameters.

**📖 Complete FIBO Documentation**: See [docs/FIBO_INTEGRATION.md](./docs/FIBO_INTEGRATION.md)

---

## 💡 Use Cases

### Professional Photography
- **Portrait Photography**: Create perfect studio lighting for portraits
- **Product Photography**: Generate consistent product shots with professional lighting
- **Fashion Photography**: Experiment with dramatic lighting setups
- **Commercial Photography**: Create high-quality commercial images

### Content Creation
- **Social Media**: Generate eye-catching images for social media posts
- **Marketing Materials**: Create professional marketing images
- **Blog Posts**: Generate featured images with custom lighting
- **E-commerce**: Create product images with consistent lighting

### Education & Training
- **Photography Education**: Learn lighting principles through experimentation
- **Workshop Demonstrations**: Show different lighting setups in real-time
- **Portfolio Building**: Create diverse portfolio pieces with various lighting styles

---

## ❓ Frequently Asked Questions

### General Questions

**Q: What is FIBO?**  
A: FIBO (Fine-grained Image Boosting Optimization) is BRIA AI's JSON-native architecture for structured image generation. It replaces ambiguous text prompts with precise, reproducible parameters.

**Q: How is this different from other AI image generators?**  
A: ProLight AI provides deterministic control through structured JSON parameters. Same parameters + seed = identical output every time, unlike text-based generators that produce variable results.

**Q: Do I need expensive equipment?**  
A: No! ProLight AI simulates professional studio lighting setups digitally, allowing you to create perfect lighting without physical equipment.

**Q: Can I use this commercially?**  
A: Yes, BRIA FIBO is fully licensed for commercial use. Check BRIA AI's licensing terms for specific details.

### Technical Questions

**Q: What programming languages are used?**  
A: The frontend uses TypeScript/React, backend uses Python/FastAPI, and edge functions use TypeScript/Deno.

**Q: How long does image generation take?**  
A: Typically 2-4 seconds per image, depending on BRIA API response time and image complexity.

**Q: Can I run this locally?**  
A: Yes! See the [Installation](#️-installation) section for local development setup instructions.

**Q: How do I get API keys?**  
A: 
- **BRIA API**: Sign up at [bria.ai](https://www.bria.ai/) and get your API key
- **Gemini API**: Get your key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Supabase**: Create a project at [supabase.com](https://supabase.com)

### Troubleshooting

**Q: Images aren't generating. What's wrong?**  
A: 
1. Check that your BRIA API key is correctly set
2. Verify your internet connection
3. Check browser console for error messages
4. Ensure edge functions are deployed and accessible

**Q: 3D visualization isn't working.**  
A: 
1. Ensure your browser supports WebGL
2. Check browser console for WebGL errors
3. Try a different browser
4. Update your graphics drivers

**📖 More Troubleshooting**: See [Troubleshooting](#-troubleshooting) section below.

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with proper TypeScript types
4. Write/update tests if applicable
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Follow project ESLint configuration
- **Code Style**: Use Prettier for formatting (if configured)
- **Commits**: Use conventional commit messages
- **Documentation**: Update README and code comments for new features

---

## 🐛 Troubleshooting

### Common Issues and Solutions

#### Frontend Issues

**Problem: Application won't start**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version (requires 18+)
node --version

# Clear Vite cache
rm -rf node_modules/.vite
```

**Problem: 3D visualization not rendering**
- Check browser WebGL support: Visit [get.webgl.org](https://get.webgl.org/)
- Update graphics drivers
- Try a different browser (Chrome, Firefox, Safari)
- Check browser console for WebGL errors

**Problem: API calls failing**
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Check network tab in browser DevTools
- Verify CORS configuration on backend
- Check Supabase project is active

#### Backend Issues

**Problem: Backend won't start**
```bash
# Check Python version (requires 3.11+)
python --version

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Check port availability
lsof -i :8000  # macOS/Linux
```

**Problem: FIBO API errors**
- Verify `FIBO_API_KEY` is set correctly
- Check API key is valid and not expired
- Set `USE_MOCK_FIBO=True` for testing without API
- Check BRIA API status page

#### Edge Function Issues

**Problem: Edge functions return 500 errors**
```bash
# Check function logs
supabase functions logs generate-lighting

# Verify secrets are set
supabase secrets list

# Test function locally
supabase functions serve generate-lighting --env-file .env.local
```

### Getting Help

If you encounter issues not covered here:

1. **Check the logs**: Frontend (browser console), Backend (terminal), Edge Functions (Supabase dashboard)
2. **Review documentation**: See [Additional Documentation](#-additional-documentation)
3. **Search issues**: Check GitHub issues for similar problems
4. **Create an issue**: Provide error messages, logs, and steps to reproduce

---

## 📚 Additional Documentation

### Core Documentation
- **[FIBO Parameter Reference](./docs/FIBO_PARAMETER_REFERENCE.md)** - Complete FIBO schema documentation
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Detailed deployment instructions
- **[Setup Guide](./docs/SETUP.md)** - Development environment setup
- **[Project Structure](./docs/PROJECT_STRUCTURE.md)** - Detailed project organization

### Integration Guides
- **[BRIA Integration Guide](./docs/BRIA_INTEGRATION_GUIDE.md)** - Complete BRIA API integration
- **[BRIA Image Generation V2](./docs/BRIA_IMAGE_GENERATION_V2_INTEGRATION.md)** - Image generation API
- **[ControlNet Integration](./docs/CONTROLNET_INTEGRATION_GUIDE.md)** - ControlNet guidance
- **[Video Editing Integration](./VIDEO_EDITING_QUICKSTART.md)** - Video editing features

### Deployment Guides
- **[Lovable Deployment Guide](./LOVABLE_DEPLOYMENT.md)** - Complete Lovable setup
- **[Lovable Edge Functions Setup](./docs/LOVABLE_EDGE_FUNCTIONS_SETUP.md)** - Edge function configuration

### Backend Documentation
- **[Backend README](./backend/README.md)** - Backend setup and API documentation
- **[Backend Environment Setup](./backend/ENV_SETUP.md)** - Environment configuration

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Third-Party Licenses

- **BRIA FIBO**: Commercial license from BRIA AI
- **React**: MIT License
- **Three.js**: MIT License
- **FastAPI**: MIT License
- **Supabase**: Apache 2.0 License

Please review individual package licenses in `package.json` and `requirements.txt`.

---

## 🙏 Acknowledgments

### Core Technologies
- **BRIA AI** for the FIBO model and API access - enabling structured, deterministic image generation
- **Google Gemini** for natural language processing capabilities - converting descriptions to structured parameters
- **Three.js** community for 3D graphics components - real-time lighting visualization
- **Supabase** for edge functions and infrastructure - serverless backend capabilities
- **React** and **TypeScript** communities for excellent tooling and developer experience

### Libraries & Frameworks
- **FastAPI** - High-performance Python web framework
- **Vite** - Next-generation frontend build tool
- **Zustand** - Lightweight state management
- **TanStack Query** - Powerful data synchronization
- **Radix UI** - Accessible component primitives
- **Tailwind CSS** - Utility-first CSS framework
- **React Three Fiber** - React renderer for Three.js

---

## 🏆 Hackathon Submission

This project was created for the **FIBO Hackathon 2025** and demonstrates:

- ✅ **Innovative Use of FIBO**: JSON-native parameter control for deterministic results
- ✅ **Professional Application**: Solves real photography workflow problems
- ✅ **Technical Excellence**: Full-stack TypeScript implementation with edge computing
- ✅ **User Experience**: Intuitive interface with real-time 3D feedback
- ✅ **Production Ready**: Error handling, validation, and comprehensive documentation

---

<div align="center">

**ProLight AI** - *Precision Lighting, Powered by FIBO*

[Report Bug](https://github.com/your-username/prolight-ai-fibo/issues) • [Request Feature](https://github.com/your-username/prolight-ai-fibo/issues) • [Documentation](./docs/)

Made with ❤️ for the FIBO Hackathon 2025

</div>
