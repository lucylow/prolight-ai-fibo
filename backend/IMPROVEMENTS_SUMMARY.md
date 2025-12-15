# AI Features Improvements Summary

This document summarizes the improvements made to harden AI features in the ProLight AI repository.

## Completed Improvements

### 1. Bria / MCP Integration ✅
- **File**: `backend/app/mcp/bria_client_async.py`
- **Changes**:
  - Enhanced `BriaMCPClientAsync` with full async httpx support
  - Added graceful stub mode when `BRIA_API_KEY` is missing
  - Implemented all required methods: `image_onboard`, `image_edit`, `image_generate`, `video_edit`, `product_shot_edit`, `ads_generate`, `poll_status`
  - Stub mode returns deterministic request_ids and simulates completion
  - Correct header usage: `api_token` for REST API (not `Authorization: Bearer`)

### 2. SSE & WebSocket Stability ✅
- **Files**: 
  - `backend/app/api/sse.py` - Improved Redis pub/sub with proper cleanup
  - `backend/app/events/redis_events.py` - Fixed async pub/sub with timeout handling
  - `backend/app/api/voice_assistant_ws.py` - New WebSocket endpoint for voice assistant
- **Changes**:
  - SSE uses `redis.asyncio` with proper connection cleanup
  - WebSocket voice assistant supports binary audio streaming
  - Added auth check (simple token or JWT) with dev fallback
  - Origin whitelist via `FRONTEND_ORIGIN` env var

### 3. Guardrails Module ✅
- **File**: `backend/app/services/guardrails.py`
- **Features**:
  - Validates plan JSON against whitelist of allowed operations
  - Enforces cost cap (`MAX_PLAN_COST_USD`, default $50)
  - Limits AOV exports (`MAX_AOV_EXPORTS`, default 10)
  - Limits plan steps (`MAX_PLAN_STEPS`, default 20)
  - Plan override validation for admin edits (allows 2x cost cap)

### 4. Agent Runner Integration ✅
- **File**: `backend/app/agents/runner_async.py`
- **Changes**:
  - Integrated guardrails validation into workflow
  - Plans that fail guardrails are rejected before execution
  - Proper error handling and event emission

### 5. Plan Override Support ✅
- **File**: `backend/app/api/runs.py`
- **Changes**:
  - Added `plan_override` field to `RunApproveRequest`
  - Plan overrides are validated against guardrails
  - Admin-only feature (TODO: add proper admin check)

### 6. Vector Store & RAG ✅
- **File**: `backend/app/services/vector_store.py`
- **Features**:
  - Redis Stack FT.SEARCH support with fallback to hash storage
  - JSON fallback when Redis unavailable
  - Cosine similarity search
  - Document storage with embeddings and metadata

### 7. Prompt Refinement ✅
- **File**: `backend/app/services/prompt_refinement.py`
- **Features**:
  - Combines RAG documents with base prompt
  - Extracts entities from text
  - Injects context and intent into prompts

### 8. Frontend AuthContext Dev Fallback ✅
- **File**: `src/contexts/AuthContext.tsx`
- **Changes**:
  - Returns admin user in dev mode when no auth configured
  - Prevents auth errors during local development

## Environment Variables

Create `.env` file with these variables (see `.env.example` for template):

```bash
# Database
DATABASE_URL=postgresql://prolight:prolight@localhost:5432/prolight
REDIS_URL=redis://localhost:6379/0

# Bria API
BRIA_API_KEY=your_bria_api_key_here
BRIA_AUTH_TOKEN=your_bria_mcp_auth_token_here
BRIA_MCP_URL=https://mcp.prod.bria-api.com/mcp/sse

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Speech
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# Frontend
FRONTEND_ORIGIN=http://localhost:5173

# Guardrails
MAX_PLAN_COST_USD=50.0
MAX_AOV_EXPORTS=10
MAX_PLAN_STEPS=20

# Voice WebSocket
VOICE_WS_TOKEN=your_voice_ws_token_here
```

## Testing

### Backend Start
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Create Run Test
```bash
curl -X POST "http://localhost:8000/api/runs/agent-123/run" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent-123",
    "input_data": {
      "intent": "product_shot_edit",
      "asset_url": "https://example.com/sample.jpg"
    }
  }'
```

### SSE Test
```bash
curl http://localhost:8000/api/runs/<run_id>/stream
```

### Bria Stub Mode
When `BRIA_API_KEY` is not set, `BriaMCPClientAsync` returns stubbed request_ids and simulates completion after a short delay.

## Stubbed Features (When Secrets Missing)

1. **Bria API**: Returns stub request_ids and simulated completion
2. **Redis**: Falls back to in-memory JSON storage
3. **Vector Store**: Uses JSON fallback when Redis unavailable
4. **Embeddings**: Uses deterministic hash-based stub
5. **Voice Assistant**: Basic WebSocket with stub STT/TTS responses

## TODO / Follow-ups

1. **Admin Check**: Add proper admin authentication to plan override endpoint
2. **STT/TTS Integration**: Connect voice assistant WebSocket to Deepgram/Whisper and TTS service
3. **Embeddings Backend**: Replace stub embeddings with OpenAI/Anthropic/Bria API
4. **Frontend Improvements**:
   - Add EventSource reconnection backoff hook
   - Improve PlanReviewModal with admin editing
   - Add VoiceAssistant component with indicators
5. **Unit Tests**: Add tests for guardrails, vector store, prompt refinement
6. **Monitoring**: Add metrics for guardrail rejections, plan costs, etc.

## Commit Strategy

Recommended commits:
1. `fix: add .env.example and README dev instructions`
2. `feat(mcp): convert Bria MCP client to async (httpx) and add fallback stubs`
3. `fix(api): implement redis.asyncio SSE pubsub for run streams`
4. `feat(guardrails): validate plan ops & cost, prevent unsafe execution`
5. `feat(ws): add voice assistant WebSocket with auth and binary audio handling`
6. `feat(rag): implement vector store with Redis FT fallback`
7. `feat(prompt): add prompt refinement with RAG injection`
8. `fix(frontend): AuthContext dev fallback for local development`

## Notes

- All changes are backward compatible
- Stub modes allow development without real API keys
- Guardrails are strict by default but can be overridden by admins
- Redis is optional - system degrades gracefully without it

