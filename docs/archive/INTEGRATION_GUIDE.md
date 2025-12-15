# Lens Distortion & Batch Render Integration Guide

This document describes the complete integration of lens distortion simulation, photographer pose persistence, and batch rendering capabilities.

## Overview

The integration includes:

1. **Frontend**: React Three Fiber scene with barrel/pincushion distortion shader
2. **Camera Store**: Zustand store for camera state and lens simulation parameters
3. **Lens Profiles**: JSON format for MTF and distortion data
4. **Backend**: FastAPI endpoints for pose CRUD operations
5. **Worker**: BullMQ-based batch render queue

## Frontend Components

### Camera Store (`src/stores/useCameraStore.ts`)

- Manages camera state (FOV, position, lookAt, etc.)
- Manages lens simulation parameters (distortion, vignette, chromatic aberration)
- Provides pose save/load/delete functionality
- Persists to localStorage via Zustand persist middleware

### Distortion Component (`src/components/CameraSceneWithDistortion.tsx`)

- R3F scene with custom distortion shader pass
- Real-time uniform updates from store
- UI controls for adjusting lens parameters
- Uses `@react-three/postprocessing` EffectComposer

### Lens Profile Utilities

- `src/utils/lensProfile.ts`: Maps lens profile JSON → shader parameters
- `src/utils/mtf_to_shader.ts`: Converts MTF arrays to shader strength values

### Sample Lens Profile

- `lens_profiles/sample_profile.json`: Example profile with distortion and MTF data

## Backend Components

### Database Model (`backend/app/models/poses.py`)

- SQLAlchemy model for `PhotographerPose` table
- Stores camera state as JSON
- Includes timestamps and optional owner_id

### API Schemas (`backend/app/models/schemas.py`)

- `CameraSchema`: Camera state validation
- `PoseCreate`: Request schema for creating poses
- `PoseOut`: Response schema for poses
- `RenderStartRequest/Response`: Render job initiation
- `RenderCallbackRequest`: Worker callback schema

### CRUD Operations (`backend/app/crud/poses.py`)

- `create_pose()`: Create new pose
- `get_pose()`: Get pose by ID
- `list_poses()`: List poses with optional owner filter
- `delete_pose()`: Delete pose by ID

### API Router (`backend/app/api/poses.py`)

Endpoints:

- `POST /api/poses/`: Create pose
- `GET /api/poses/`: List poses (supports `owner_id` query param)
- `GET /api/poses/{pose_id}`: Get pose by ID
- `DELETE /api/poses/{pose_id}`: Delete pose
- `POST /api/render/from-camera`: Start render job from camera state
- `POST /api/render/callback`: Worker callback endpoint

## Worker Components

### Producer (`worker/producer.js`)

- Fetches all poses from backend
- Enqueues render jobs to BullMQ queue
- Supports retry with exponential backoff

### Worker (`worker/worker.js`)

- Processes render jobs from queue
- Calls backend `/render/from-camera` endpoint
- Polls status URL until completion
- Sends results back via callback endpoint

## Setup Instructions

### Frontend Dependencies

Already installed:

- `@react-three/postprocessing@^2.15.0` (compatible with R3F v8)
- `three`, `@react-three/fiber`, `@react-three/drei`
- `zustand`

### Backend Dependencies

Already in `requirements.txt`:

- `sqlalchemy==2.0.23`
- `fastapi`, `pydantic`

### Worker Dependencies

Install in `worker/` directory:

```bash
cd worker
npm install
```

### Database Setup

1. The poses table is automatically created when the backend starts (via `app/db.py`)
2. For manual migration, see `backend/alembic/versions/0001_create_poses_table.sql`

### Environment Variables

**Backend:**

- `DATABASE_URL`: Database connection string (default: `sqlite:///./data.db`)

**Worker:**

- `REDIS_URL`: Redis connection (default: `redis://127.0.0.1:6379`)
- `BACKEND_URL`: Backend API URL (default: `http://localhost:8000`)
- `BRIA_API_TOKEN`: Bria API token (if calling Bria directly)

## Usage Examples

### Frontend: Using the Camera Store

```typescript
import useCameraStore from "@/stores/useCameraStore";

function MyComponent() {
  const camera = useCameraStore((s) => s.camera);
  const setCamera = useCameraStore((s) => s.setCamera);
  const lensSim = useCameraStore((s) => s.lensSim);
  const setLensSim = useCameraStore((s) => s.setLensSim);

  // Update camera
  setCamera({ fov: 60 });

  // Update lens simulation
  setLensSim({ distortionK1: -0.1 });

  // Save pose
  useCameraStore.getState().savePose("My Pose");
}
```

### Frontend: Loading a Lens Profile

```typescript
import { mapLensProfileToSim } from "@/utils/lensProfile";
import profile from "@/lens_profiles/sample_profile.json";

const sim = mapLensProfileToSim(profile);
useCameraStore.getState().setLensSim(sim);
```

### Backend: Creating a Pose

```bash
curl -X POST http://localhost:8000/api/poses/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Portrait Shot",
    "camera": {
      "fov": 50,
      "focalLengthMM": 50,
      "sensorHeightMM": 24,
      "aspectRatio": 16/9,
      "aperture": 2.8,
      "focusDistanceM": 1.2,
      "position": [0, 1.2, 2.0],
      "lookAt": [0, 0.8, 0]
    }
  }'
```

### Worker: Starting Batch Render

```bash
cd worker
npm run producer  # Enqueues all poses
npm run worker    # Processes jobs
```

## Integration Notes

### ShaderPass Import

The component uses `three/examples/jsm/postprocessing/ShaderPass`. If your bundler blocks this:

1. Install `three-stdlib`: `npm install three-stdlib`
2. Update import: `import { ShaderPass } from 'three-stdlib'`

### Database Compatibility

- SQLite: Works out of the box (default)
- PostgreSQL: Update `DATABASE_URL` and uncomment PostgreSQL migration SQL

### Render Endpoint Implementation

The `/api/render/from-camera` endpoint currently returns mock data. To implement:

1. Convert camera state to FIBO format
2. Call your FIBO/Bria generation API
3. Return `request_id` and `status_url` for polling

### Security Considerations

- Add JWT authentication to pose endpoints in production
- Protect render endpoints with usage quotas
- Never expose `BRIA_API_TOKEN` to frontend
- Use backend wrapper for all external API calls

## File Structure

```
prolight-ai-fibo/
├── src/
│   ├── components/
│   │   └── CameraSceneWithDistortion.tsx
│   ├── stores/
│   │   └── useCameraStore.ts
│   └── utils/
│       ├── lensProfile.ts
│       └── mtf_to_shader.ts
├── lens_profiles/
│   └── sample_profile.json
├── backend/
│   ├── app/
│   │   ├── models/
│   │   │   ├── poses.py
│   │   │   └── schemas.py (updated)
│   │   ├── crud/
│   │   │   └── poses.py
│   │   ├── api/
│   │   │   └── poses.py
│   │   └── db.py (updated)
│   └── alembic/
│       └── versions/
│           └── 0001_create_poses_table.sql
└── worker/
    ├── producer.js
    ├── worker.js
    ├── package.json
    └── README.md
```

## Next Steps

1. **Implement Render Endpoint**: Complete the `/api/render/from-camera` implementation to call your actual generation API
2. **Add Authentication**: Protect endpoints with JWT/auth middleware
3. **Create Render Results Table**: Store render metadata (image URLs, seeds, etc.)
4. **Add Lens Profile Upload**: Allow users to upload custom lens profiles
5. **Enhance Shader**: Add chromatic aberration and vignette shader passes
6. **Add MTF Visualization**: Display MTF curves in the UI

## Troubleshooting

### ShaderPass Import Error

- Ensure `three` is installed: `npm install three`
- Try using `three-stdlib` if examples import fails

### Database Table Not Created

- Check `DATABASE_URL` environment variable
- Verify `app/db.py` imports poses model
- Run migration SQL manually if needed

### Worker Connection Issues

- Verify Redis is running: `redis-cli ping`
- Check `REDIS_URL` environment variable
- Ensure backend is accessible at `BACKEND_URL`

### CORS Errors

- Update `CORS_ORIGINS` in backend settings
- Ensure frontend URL is whitelisted
