from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI()
api = APIRouter(prefix="/api")
IST = ZoneInfo("Asia/Kolkata")

SLOTS = ["08:00", "09:30", "11:00", "12:30", "14:00", "15:30"]

# Activities & prices taken from netraniscubadive.org (Aqua Ride Watersports)
ACTIVITIES = [
    {"id": "snorkeling", "name": "Snorkeling Experience", "price": 1499, "duration": "45 min", "capacity": 20},
    {"id": "aqua-plus", "name": "Aqua Plus (Scuba Diving)", "price": 3499, "duration": "20–25 min underwater", "capacity": 12},
    {"id": "aqua-max", "name": "Aqua Max (Scuba Diving)", "price": 4499, "duration": "30–35 min underwater", "capacity": 8},
    {"id": "jet-ski", "name": "Jet Ski Ride", "price": 499, "duration": "5 min", "capacity": 10},
    {"id": "banana-boat", "name": "Banana Boat Ride", "price": 399, "duration": "10 min", "capacity": 12},
    {"id": "kayak", "name": "Single Kayak", "price": 199, "duration": "15 min", "capacity": 10},
    {"id": "island-tour", "name": "Island Boat Tour", "price": 999, "duration": "30 min", "capacity": 25},
    {"id": "parasailing", "name": "Parasailing Experience", "price": 1499, "duration": "30 min", "capacity": 6},
]


def today() -> str:
    return datetime.now(IST).strftime("%Y-%m-%d")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_code() -> str:
    return "AR-" + uuid.uuid4().hex[:6].upper()


class Booking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str = Field(default_factory=new_code)
    guest_name: str
    phone: str
    email: Optional[str] = ""
    activity_id: str
    activity_name: str
    date: str
    slot: str
    adults: int = 1
    kids: int = 0
    channel: Literal["retail", "b2b"] = "retail"
    agent_name: Optional[str] = ""
    amount: int
    paid_amount: int = 0
    payment_status: Literal["paid", "advance", "pending"] = "pending"
    payment_mode: Optional[str] = ""
    status: Literal["confirmed", "checked_in", "completed", "cancelled"] = "confirmed"
    source: Literal["online", "walk-in"] = "online"
    waiver_signed: bool = False
    notes: Optional[str] = ""
    created_at: str = Field(default_factory=now_iso)
    checked_in_at: Optional[str] = None


class BookingCreate(BaseModel):
    guest_name: str = Field(min_length=1)
    phone: str = Field(min_length=5)
    email: Optional[str] = ""
    activity_id: str
    date: str
    slot: str
    adults: int = Field(ge=1, default=1)
    kids: int = Field(ge=0, default=0)
    channel: Literal["retail", "b2b"] = "retail"
    agent_name: Optional[str] = ""
    payment_status: Literal["paid", "advance", "pending"] = "paid"
    payment_mode: Optional[str] = "UPI"
    waiver_signed: bool = False
    notes: Optional[str] = ""


class StatusUpdate(BaseModel):
    status: Literal["confirmed", "checked_in", "completed", "cancelled"]


class BookingPatch(BaseModel):
    waiver_signed: Optional[bool] = None
    payment_status: Optional[Literal["paid", "advance", "pending"]] = None
    notes: Optional[str] = None


async def log_event(kind: str, message: str):
    await db.ops_events.insert_one({"id": str(uuid.uuid4()), "kind": kind, "message": message, "created_at": now_iso()})


async def get_activity(aid: str) -> dict:
    act = await db.activities.find_one({"id": aid}, {"_id": 0})
    if not act:
        raise HTTPException(404, "Activity not found")
    return act


async def booked_guests(aid: str, date: str, slot: str) -> int:
    pipeline = [
        {"$match": {"activity_id": aid, "date": date, "slot": slot, "status": {"$ne": "cancelled"}}},
        {"$group": {"_id": None, "n": {"$sum": {"$add": ["$adults", "$kids"]}}}},
    ]
    res = await db.bookings.aggregate(pipeline).to_list(1)
    return res[0]["n"] if res else 0


def paid_for(amount: int, status: str) -> int:
    return amount if status == "paid" else (round(amount * 0.1) if status == "advance" else 0)


async def seed():
    if await db.activities.count_documents({}) == 0:
        await db.activities.insert_many([{**a, "paused": False} for a in ACTIVITIES])
    d = today()
    if await db.bookings.count_documents({"date": d}) > 0:
        return
    names = ["Rahul Sharma", "Priya Nair", "Arjun Mehta", "Sneha Kulkarni", "Vikram Rao", "Ananya Iyer",
             "Karthik Shetty", "Meera Joshi", "Rohan Desai", "Divya Menon", "Aditya Hegde", "Pooja Bhat",
             "Siddharth Kamath", "Neha Pai"]
    agents = ["SeaTours Goa", "Coastal Holidays", "Gokarna Trips"]
    rnd = random.Random(d)
    docs = []
    for i, name in enumerate(names):
        act = ACTIVITIES[rnd.choice([0, 1, 1, 2, 3, 4, 6, 7])]
        adults, kids = rnd.randint(1, 4), rnd.choice([0, 0, 1])
        channel = "b2b" if i % 4 == 3 else "retail"
        pay = rnd.choice(["paid", "paid", "advance"])
        amount = act["price"] * (adults + kids)
        status = "cancelled" if i == 13 else ("checked_in" if i < 7 else "confirmed")
        b = Booking(
            guest_name=name, phone=f"+91 98{rnd.randint(10000000, 99999999)}", activity_id=act["id"],
            activity_name=act["name"], date=d, slot=SLOTS[i % 3], adults=adults, kids=kids, channel=channel,
            agent_name=rnd.choice(agents) if channel == "b2b" else "", amount=amount,
            paid_amount=paid_for(amount, pay), payment_status=pay, payment_mode=rnd.choice(["UPI", "Card", "Cash"]),
            status=status, source="online" if i % 3 else "walk-in", waiver_signed=i < 9,
            checked_in_at=now_iso() if status == "checked_in" else None,
        )
        docs.append(b.model_dump())
    await db.bookings.insert_many(docs)
    await log_event("info", f"{len(docs)} bookings loaded for {d}")


@app.on_event("startup")
async def startup():
    await seed()


@api.get("/")
async def root():
    return {"message": "AquaOps API"}


@api.get("/meta")
async def meta():
    return {"slots": SLOTS, "today": today()}


@api.get("/activities")
async def list_activities():
    return await db.activities.find({}, {"_id": 0}).to_list(100)


@api.post("/activities/{aid}/toggle")
async def toggle_activity(aid: str):
    act = await get_activity(aid)
    paused = not act["paused"]
    await db.activities.update_one({"id": aid}, {"$set": {"paused": paused}})
    await log_event("alert" if paused else "success", f"{act['name']} {'paused' if paused else 'resumed'}")
    return {**act, "paused": paused}


@api.post("/ops/pause-all")
async def pause_all():
    await db.activities.update_many({}, {"$set": {"paused": True}})
    await log_event("alert", "EMERGENCY PAUSE — all activities halted")
    return await list_activities()


@api.post("/ops/resume-all")
async def resume_all():
    await db.activities.update_many({}, {"$set": {"paused": False}})
    await log_event("success", "All activities resumed")
    return await list_activities()


@api.get("/availability")
async def availability(activity_id: str, date: str):
    act = await get_activity(activity_id)
    out = []
    for s in SLOTS:
        used = await booked_guests(activity_id, date, s)
        out.append({"slot": s, "capacity": act["capacity"], "booked": used, "left": max(act["capacity"] - used, 0)})
    return out


@api.get("/dashboard")
async def dashboard(date: Optional[str] = None):
    d = date or today()
    all_b = await db.bookings.find({"date": d}, {"_id": 0}).to_list(2000)
    active = [b for b in all_b if b["status"] != "cancelled"]
    acts = {a["id"]: a for a in await list_activities()}
    batches = {(b["activity_id"], b["slot"]) for b in active}
    capacity = sum(acts[a]["capacity"] for a, _ in batches if a in acts)
    guests = sum(b["adults"] + b["kids"] for b in active)
    checked = [b for b in active if b["status"] in ("checked_in", "completed")]
    by_slot = []
    for s in SLOTS:
        sb = [b for b in active if b["slot"] == s]
        by_slot.append({"slot": s, "guests": sum(b["adults"] + b["kids"] for b in sb), "bookings": len(sb)})
    by_activity = {}
    for b in active:
        by_activity[b["activity_name"]] = by_activity.get(b["activity_name"], 0) + b["amount"]
    return {
        "date": d,
        "todays_bookings": len(active),
        "total_bookings": len(all_b),
        "cancelled": len(all_b) - len(active),
        "total_guests": guests,
        "retail_bookings": sum(1 for b in active if b["channel"] == "retail"),
        "b2b_bookings": sum(1 for b in active if b["channel"] == "b2b"),
        "revenue": sum(b["amount"] for b in active),
        "collected": sum(b["paid_amount"] for b in active),
        "retail_revenue": sum(b["amount"] for b in active if b["channel"] == "retail"),
        "b2b_revenue": sum(b["amount"] for b in active if b["channel"] == "b2b"),
        "checked_in": len(checked),
        "checkin_pct": round(100 * len(checked) / len(active)) if active else 0,
        "capacity": capacity,
        "batches": len(batches),
        "confirmed_guests": guests,
        "active_closures": sum(1 for a in acts.values() if a["paused"]),
        "by_slot": by_slot,
        "by_activity": [{"name": k, "revenue": v} for k, v in sorted(by_activity.items(), key=lambda x: -x[1])],
    }


@api.get("/bookings", response_model=List[Booking])
async def list_bookings(date: Optional[str] = None, status: Optional[str] = None,
                        activity_id: Optional[str] = None, channel: Optional[str] = None, q: Optional[str] = None):
    query = {}
    if date:
        query["date"] = date
    if status and status != "all":
        query["status"] = status
    if activity_id and activity_id != "all":
        query["activity_id"] = activity_id
    if channel and channel != "all":
        query["channel"] = channel
    if q:
        rx = {"$regex": q.strip(), "$options": "i"}
        query["$or"] = [{"guest_name": rx}, {"code": rx}, {"phone": rx}]
    return await db.bookings.find(query, {"_id": 0}).sort([("slot", 1), ("created_at", 1)]).to_list(2000)


@api.get("/bookings/code/{code}", response_model=Booking)
async def booking_by_code(code: str):
    b = await db.bookings.find_one({"code": code.strip().upper()}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Booking not found")
    return b


@api.post("/bookings", response_model=Booking)
async def create_booking(body: BookingCreate):
    act = await get_activity(body.activity_id)
    if act["paused"]:
        raise HTTPException(400, f"{act['name']} is currently paused")
    if body.slot not in SLOTS:
        raise HTTPException(400, "Invalid slot")
    pax = body.adults + body.kids
    if await booked_guests(act["id"], body.date, body.slot) + pax > act["capacity"]:
        raise HTTPException(400, "Not enough seats left in this batch")
    amount = act["price"] * pax
    b = Booking(**body.model_dump(), activity_name=act["name"], amount=amount,
                paid_amount=paid_for(amount, body.payment_status), source="walk-in")
    await db.bookings.insert_one(b.model_dump())
    await log_event("booking", f"Walk-in {b.code}: {b.guest_name} · {act['name']} {b.slot} ({pax} pax)")
    return b


@api.patch("/bookings/{bid}/status", response_model=Booking)
async def update_status(bid: str, body: StatusUpdate):
    b = await db.bookings.find_one({"id": bid}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Booking not found")
    upd = {"status": body.status}
    if body.status == "checked_in":
        upd["checked_in_at"] = now_iso()
    await db.bookings.update_one({"id": bid}, {"$set": upd})
    label = {"checked_in": "checked in", "cancelled": "cancelled", "completed": "completed", "confirmed": "re-confirmed"}
    await log_event("checkin" if body.status == "checked_in" else "info", f"{b['code']} {b['guest_name']} {label[body.status]}")
    return {**b, **upd}


@api.patch("/bookings/{bid}", response_model=Booking)
async def patch_booking(bid: str, body: BookingPatch):
    b = await db.bookings.find_one({"id": bid}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Booking not found")
    upd = body.model_dump(exclude_none=True)
    if "payment_status" in upd:
        upd["paid_amount"] = paid_for(b["amount"], upd["payment_status"])
    if upd:
        await db.bookings.update_one({"id": bid}, {"$set": upd})
    return {**b, **upd}


@api.get("/manifest")
async def manifest(date: str, activity_id: str, slot: str):
    act = await get_activity(activity_id)
    rows = await db.bookings.find(
        {"date": date, "activity_id": activity_id, "slot": slot, "status": {"$ne": "cancelled"}}, {"_id": 0}
    ).sort("guest_name", 1).to_list(500)
    return {"activity": act, "date": date, "slot": slot, "bookings": rows,
            "guests": sum(r["adults"] + r["kids"] for r in rows)}


@api.get("/events")
async def events(limit: int = 20):
    return await db.ops_events.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
