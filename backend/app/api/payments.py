# app/api/payments.py
from fastapi import APIRouter
from pydantic import BaseModel
import time

router = APIRouter(prefix="/api")

class StubChargeRequest(BaseModel):
    token: str
    amount: float

class StubChargeResponse(BaseModel):
    id: str
    amount: float
    status: str = "succeeded"

@router.post("/payments/stub-charge", response_model=StubChargeResponse)
def stub_charge(body: StubChargeRequest):
    """Stub payment endpoint for testing - simulates a payment charge."""
    # body: { token, amount }
    charge_id = f"stub_charge_{int(1000 * time.time())}"
    return {
        "id": charge_id,
        "amount": body.amount,
        "status": "succeeded"
    }

