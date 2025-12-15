# ProLight AI Agentic Workflow

This module implements a production-ready agentic workflow system with Planner → Critic → Executor agents.

## Architecture

- **Planner**: Reasons without side effects; creates a Plan JSON
- **Critic**: Reviews the plan and can produce suggested changes
- **Executor**: Performs operations by calling tools via MCP

## Components

### Core Infrastructure

- `schemas.py`: Shared Pydantic models (Plan, Critique, ExecutionResult, Step)
- `base.py`: Agent base class and RunContext
- `determinism.py`: Determinism locking utilities for reproducible runs

### Agents

- `planner.py` / `planner_async.py`: Planning agent implementations
- `critic.py` / `critic_async.py`: Critique agent implementations
- `executor.py` / `executor_async.py`: Execution agent implementations
- `runner.py` / `runner_async.py`: Workflow coordinator

### MCP Integration

- `app/mcp/mcp_client.py`: Synchronous MCP client wrapper
- `app/mcp/bria_client_async.py`: Async MCP client using httpx
- `app/mcp/tools_async.py`: Async Bria tool wrappers
- `app/agents/tools.py`: Synchronous tool wrappers

### Event System

- `app/events/redis_events.py`: Redis pub/sub event publishing
- `app/api/sse.py`: FastAPI SSE endpoint for streaming events

## Usage

### Async Workflow (Recommended)

```python
from app.mcp.bria_client_async import BriaMCPClientAsync
from app.agents.runner_async import AgentRunnerAsync
from app.agents.base import RunContext
from app.events.redis_events import publish_event

async def event_hook(run_id: str, event: dict):
    await publish_event(run_id, event)

# Initialize
bria = BriaMCPClientAsync()
runner = AgentRunnerAsync(bria, event_hook)

# Create context
ctx = RunContext(
    run_id="run-123",
    asset_id="asset-456",
    metadata={"user": "user-789"}
)

# Run workflow
final_ctx = await runner.run_workflow(ctx, human_approved=True)
```

### Synchronous Workflow

```python
from app.mcp.mcp_client import MCPClient
from app.agents.runner import AgentRunner
from app.agents.base import RunContext

mcp = MCPClient()
runner = AgentRunner(mcp, event_hook=lambda run_id, payload: print(f"Event: {payload}"))

ctx = RunContext(run_id="run-123", asset_id="asset-456")
ctx = runner.run_workflow(ctx, human_approved=True)
```

## Environment Variables

- `ANTHROPIC_API_KEY`: Anthropic API key for MCP calls
- `BRIA_AUTH_TOKEN`: Bria MCP authentication token
- `BRIA_MCP_URL`: Bria MCP server URL (default: https://mcp.prod.bria-api.com/mcp/sse)
- `REDIS_URL`: Redis connection URL (default: redis://localhost:6379/0)

## SSE Endpoint

The SSE endpoint streams run events to clients:

```
GET /api/runs/{run_id}/stream
```

Frontend usage:

```javascript
const es = new EventSource(`/api/runs/${runId}/stream`);
es.addEventListener('status', (e) => {
  const payload = JSON.parse(e.data);
  console.log('status', payload);
});
es.addEventListener('result', (e) => {
  const payload = JSON.parse(e.data);
  console.log('result', payload);
});
```

## Testing

Run the demo script:

```bash
python backend/demo/demo_run_async.py
```

Or run the test suite:

```bash
python backend/app/agents/tests/test_agents.py
```

## Integration Notes

1. **Guardrails**: Wrap agent runs with guardrail middleware to enforce cost limits, banned operations, or HITL triggers
2. **Persistence**: Persist `RunContext.to_dict()` to DB/Redis for replayability
3. **Queue Workers**: Schedule `AgentRunner.run_workflow` inside worker processes (BullMQ / RQ / Celery)
4. **Error Handling**: Use queue retry/backoff policies. Mark final `ctx.state` to `FAILED` and emit error events
5. **Versioning**: Pin `model_version` in determinism locks. Bump versions when models/tools change

