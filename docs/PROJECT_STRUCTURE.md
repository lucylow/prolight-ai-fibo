# Project Structure

This document describes the organized structure of the ProLight AI project, which is compatible with Lovable deployment.

## 📁 Directory Structure

```
prolight-ai-fibo/
├── backend/                 # FastAPI backend (Lovable auto-detects)
│   ├── app/                 # FastAPI application code
│   ├── clients/             # External API clients (Bria)
│   ├── routes/              # API route handlers
│   ├── utils/               # Utility functions
│   ├── tests/               # Backend test suite
│   ├── requirements.txt     # Python dependencies
│   └── settings.py           # Configuration
│
├── src/                     # React frontend (Lovable auto-detects)
│   ├── components/          # React components
│   ├── pages/               # Page components
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API services
│   ├── stores/              # State management
│   └── types/               # TypeScript types
│
├── docs/                    # All documentation
│   ├── DEPLOYMENT.md        # Deployment guide
│   ├── LOVABLE_DEPLOYMENT.md # Lovable-specific guide
│   ├── SETUP.md             # Setup instructions
│   ├── archive/             # Archived implementation docs
│   └── ...                  # Other documentation
│
├── public/                  # Static assets
├── integration_examples/     # Integration examples
├── supabase/                # Supabase functions
│
├── package.json             # Frontend dependencies (Lovable requirement)
├── vite.config.ts           # Vite configuration (Lovable requirement)
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── index.html               # HTML entry point
├── install.sh               # Installation script (Linux/Mac)
├── install.bat              # Installation script (Windows)
└── README.md                # Main documentation
```

## ✅ Lovable Compatibility

The project structure is fully compatible with Lovable:

- **Backend Detection**: Lovable auto-detects the `backend/` folder containing FastAPI code
- **Frontend Detection**: Lovable auto-detects React frontend from root-level `package.json` and `vite.config.ts`
- **Configuration Files**: All required config files (package.json, vite.config.ts, tsconfig.json) are in root
- **Import Paths**: Backend uses relative imports (no `backend.` prefix) as required by Lovable

## 📚 Documentation

All documentation has been organized into the `docs/` folder:

- Main README remains in root for GitHub visibility
- Detailed guides are in `docs/` for better organization
- Deployment guides updated to reflect current structure

## 🔧 Key Files

### Root Level (Lovable Requirements)
- `package.json` - Frontend dependencies
- `vite.config.ts` - Vite configuration with Lovable tagger
- `tsconfig.json` - TypeScript configuration
- `index.html` - HTML entry point

### Backend
- `backend/requirements.txt` - Python dependencies
- `backend/app/main.py` - FastAPI application entry point
- `backend/settings.py` - Environment configuration

### Frontend
- `src/main.tsx` - React application entry point
- `src/App.tsx` - Main app component

