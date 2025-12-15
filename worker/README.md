# ProLight Batch Render Worker

This worker uses BullMQ to process batch render jobs for photographer poses.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
```bash
export REDIS_URL="redis://127.0.0.1:6379"
export BACKEND_URL="http://localhost:8000"
export BRIA_API_TOKEN="your_bria_token_here"
```

3. Start Redis (if not already running):
```bash
redis-server
```

4. Start the worker:
```bash
npm run worker
```

5. Enqueue jobs (in another terminal):
```bash
npm run producer
```

## Configuration

- `REDIS_URL`: Redis connection URL
- `BACKEND_URL`: Backend API URL
- `BRIA_API_TOKEN`: Bria API token (if calling Bria directly)

## Notes

- The worker polls the status URL until completion or timeout (5 minutes)
- Jobs are retried up to 3 times with exponential backoff
- Results are sent back to the backend via the callback endpoint

