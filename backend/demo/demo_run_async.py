"""
Demo script: end-to-end async workflow run
Runs a single workflow and prints events received via Redis subscription
"""
import asyncio
import json
import os
from app.mcp.bria_client_async import BriaMCPClientAsync
from app.events.redis_events import publish_event, get_redis
from app.agents.runner_async import AgentRunnerAsync
from app.agents.base import RunContext


async def subscriber_task(run_id: str):
    r = get_redis()
    pubsub = r.pubsub()
    await pubsub.subscribe(f"run:{run_id}")
    print("Subscribed to channel", f"run:{run_id}")
    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=10.0)
            if message:
                data = message.get("data")
                if isinstance(data, str):
                    parsed = json.loads(data)
                else:
                    parsed = data
                print("EVENT:", parsed)
            await asyncio.sleep(0.01)
    except asyncio.CancelledError:
        pass
    finally:
        await pubsub.unsubscribe(f"run:{run_id}")
        await pubsub.close()


async def event_hook(run_id: str, event: dict):
    # publish via redis and also print (for demo)
    print("EMIT:", run_id, event)
    await publish_event(run_id, event)


async def run_demo():
    run_id = "demo_run_001"
    # set env keys or leave empty to use stubs
    bria = BriaMCPClientAsync()
    runner = AgentRunnerAsync(bria, event_hook)

    # build context: point to a public image url (or a stub)
    ctx = RunContext(run_id=run_id, asset_id="https://example.com/sample.jpg", metadata={"user": "demo"})
    # launch subscriber
    sub_task = asyncio.create_task(subscriber_task(run_id))

    try:
        # run full workflow (force human_approved True to bypass HITL in demo)
        final_ctx = await runner.run_workflow(ctx, human_approved=True)
        print("FINAL STATE:", final_ctx.state)
        print("EXEC RESULT:", final_ctx.exec_result.json() if final_ctx.exec_result else None)
    finally:
        # allow subscriber to drain a bit
        await asyncio.sleep(0.5)
        sub_task.cancel()
        try:
            await sub_task
        except asyncio.CancelledError:
            pass


if __name__ == "__main__":
    asyncio.run(run_demo())

