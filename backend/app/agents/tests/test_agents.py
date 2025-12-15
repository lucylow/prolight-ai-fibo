"""
Simple usage example / smoke test for agent workflow
"""
from app.mcp.mcp_client import MCPClient
from app.agents.runner import AgentRunner
from app.agents.base import RunContext


def stub_event_hook(run_id, payload):
    print("EVENT", run_id, payload)


def test_flow():
    # Use MCPClient with no anthropic key for local stub
    mcp = MCPClient(anthropic_key=None, bria_token=None)
    runner = AgentRunner(mcp, event_hook=stub_event_hook)
    ctx = RunContext(run_id="run-test-1", asset_id="asset-123", metadata={"uploader": "test"})
    ctx = runner.run_workflow(ctx, human_approved=True)  # force approval to skip HITL
    assert ctx.state in ("COMPLETED", "FAILED")
    print("Final state:", ctx.state)
    print("Exec result:", ctx.exec_result)


if __name__ == "__main__":
    test_flow()

