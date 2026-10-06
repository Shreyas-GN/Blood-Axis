from typing import Optional
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
import asyncio
from app.services.matching import get_nearby_donors
from app.services.notifier import send_sms, send_telegram_broadcast, send_push_notification

router = APIRouter()

class MatchRequest(BaseModel):
    blood_group: str
    latitude: float
    longitude: float
    hospital_name: str = "Unknown Hospital"
    units_required: int = 1
    request_id: Optional[str] = None

async def run_escalation_logic(data: MatchRequest):
    rid = data.request_id

    # PHASE 1: Immediate (5km)
    print(f"Starting Phase 1 for {data.blood_group} at {data.hospital_name}")
    donors_p1 = get_nearby_donors(data.latitude, data.longitude, 5, data.blood_group)
    for donor in donors_p1:
        await send_push_notification(
            donor['id'],
            "Urgent: Blood Needed Nearby 🩸",
            f"{data.units_required} units of {data.blood_group} needed at {data.hospital_name}",
            request_id=rid,
        )

    # PHASE 2: Expanded (15km) — 5-minute wait in production; short delay here for testing
    await asyncio.sleep(10)
    print(f"Starting Phase 2 for {data.blood_group}")
    donors_p2 = get_nearby_donors(data.latitude, data.longitude, 15, data.blood_group)
    for donor in donors_p2:
        await send_push_notification(
            donor['id'],
            "Urgent: Expanded Search 🩸",
            f"Potential match found — {data.blood_group} still needed at {data.hospital_name}",
            request_id=rid,
        )

    # PHASE 3: SMS + Telegram broadcast (25km)
    await asyncio.sleep(10)
    print(f"Starting Phase 3 for {data.blood_group}")
    donors_p3 = get_nearby_donors(data.latitude, data.longitude, 25, data.blood_group)
    for donor in donors_p3:
        if donor.get('phone'):
            await send_sms(
                donor['phone'],
                f"URGENT: {data.blood_group} blood required at {data.hospital_name}. Please check BloodRelay app.",
                donor_id=donor['id'],
                request_id=rid,
            )

    await send_telegram_broadcast(
        f"🚨 URGENT EMERGENCY: {data.blood_group} required at {data.hospital_name}. Units: {data.units_required}",
        request_id=rid,
    )

@router.post("/match-donors")
async def match_donors(data: MatchRequest, background_tasks: BackgroundTasks):
    print(f"Received match request for {data.blood_group}")
    background_tasks.add_task(run_escalation_logic, data)
    return {
        "success": True,
        "message": "Matching and notification sequence initiated in background",
        "initial_phase": 1,
        "target_group": data.blood_group,
    }
