from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import random
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI()
api = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)

SLOTS = ["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"]
LOCATIONS = [{"id": "loc_murudeshwara", "name": "Murudeshwara Sky Adventure and Water Sports"}]
ACTIVITIES = [
    {"id": "act_bungee", "location_id": "loc_murudeshwara", "name": "Bungee Jump", "price": 3500, "capacity": 10},
    {"id": "act_skycycle", "location_id": "loc_murudeshwara", "name": "Sky Cycle", "price": 1200, "capacity": 6},
    {"id": "act_zipline", "location_id": "loc_murudeshwara", "name": "Zipline", "price": 800, "capacity": 12},
]
ACT = {a["id"]: a for a in ACTIVITIES}
CITIES = ["Bengaluru", "Mangaluru", "Udupi", "Bhatkal", "Hubballi", "Mysuru", "Goa", "Mumbai", "Pune", "Chennai", "Hyderabad", "Kochi"]
MODES = ["Cash", "UPI", "Card", "Bank Transfer"]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix):
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


# ---------- Auth ----------
async def current_user(request: Request) -> dict:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(401, "Invalid session")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(401, "Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    if not user.get("seeded"):
        await seed_vendor(user["user_id"])
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"seeded": True}})
        user["seeded"] = True
    return user


class SessionIn(BaseModel):
    session_id: str


@api.post("/auth/session")
async def auth_session(body: SessionIn, response: Response):
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                        headers={"X-Session-ID": body.session_id})
    if r.status_code != 200:
        raise HTTPException(401, "Invalid session id")
    data = r.json()
    existing = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": data["name"], "picture": data.get("picture")}})
    else:
        user_id = new_id("user")
        await db.users.insert_one({
            "user_id": user_id, "email": data["email"], "name": data["name"], "picture": data.get("picture"),
            "role": "vendor", "business_name": "Sky Loooop Adventures", "phone": "", "gst_number": "",
            "address": "", "seeded": False, "created_at": now_iso(),
        })
    token = data["session_token"]
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7), "created_at": now_iso(),
    })
    response.set_cookie("session_token", token, httponly=True, secure=True, samesite="none", path="/", max_age=7 * 86400)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user.get("seeded"):
        await seed_vendor(user_id)
        await db.users.update_one({"user_id": user_id}, {"$set": {"seeded": True}})
    return user


@api.get("/auth/me")
async def auth_me(user: dict = Depends(current_user)):
    return user


@api.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/", secure=True, samesite="none")
    return {"ok": True}


# ---------- Catalog / Profile ----------
@api.get("/catalog")
async def catalog():
    return {"locations": LOCATIONS, "activities": ACTIVITIES, "slots": SLOTS, "cities": CITIES, "modes": MODES}


class ProfileIn(BaseModel):
    business_name: str = ""
    phone: str = ""
    gst_number: str = ""
    address: str = ""


@api.put("/profile")
async def update_profile(body: ProfileIn, user: dict = Depends(current_user)):
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": body.model_dump()})
    return await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})


# ---------- Helpers ----------
async def slot_capacity(vid, date, activity_id, slot):
    o = await db.capacity_overrides.find_one({"vendor_id": vid, "date": date, "activity_id": activity_id, "slot": slot}, {"_id": 0})
    return o["capacity"] if o else ACT[activity_id]["capacity"]


async def booked_map(vid, query):
    q = {"vendor_id": vid, "status": "confirmed", **query}
    out = {}
    async for b in db.bookings.find(q, {"_id": 0, "date": 1, "slot": 1, "participants": 1}):
        k = (b["date"], b["slot"])
        out[k] = out.get(k, 0) + b["participants"]
    return out


async def add_txn(vid, type_, amount, mode, description, party="", booking_no=""):
    await db.transactions.insert_one({
        "id": new_id("txn"), "vendor_id": vid, "type": type_, "amount": round(amount, 2), "mode": mode,
        "description": description, "party": party, "booking_no": booking_no, "created_at": now_iso(),
    })


# ---------- Bookings ----------
class BookingIn(BaseModel):
    location_id: str
    activity_id: str
    date: str
    slot: str
    full_name: str = Field(min_length=1)
    phone: str = Field(min_length=6)
    city: Optional[str] = None
    admin_note: Optional[str] = None
    is_agent_booking: bool = False
    agent_id: Optional[str] = None
    price_per_person: float = Field(ge=0)
    participants: int = Field(ge=1, le=50)
    advance_amount: float = Field(ge=0, default=0)
    payment_mode: str = "Cash"


async def create_booking_doc(vid, b: BookingIn, created_at=None):
    if b.activity_id not in ACT or b.slot not in SLOTS:
        raise HTTPException(400, "Invalid activity or slot")
    agent = None
    if b.is_agent_booking:
        agent = await db.agents.find_one({"vendor_id": vid, "id": b.agent_id}, {"_id": 0})
        if not agent:
            raise HTTPException(400, "Select a valid agent")
    cap = await slot_capacity(vid, b.date, b.activity_id, b.slot)
    booked = (await booked_map(vid, {"date": b.date, "activity_id": b.activity_id, "slot": b.slot})).get((b.date, b.slot), 0)
    if booked + b.participants > cap:
        raise HTTPException(400, f"Only {max(cap - booked, 0)} spots left in this slot")
    total = round(b.price_per_person * b.participants, 2)
    if b.advance_amount > total:
        raise HTTPException(400, "Advance cannot exceed total amount")
    commission = round(total * agent["commission_pct"] / 100, 2) if agent else 0
    doc = {
        "id": new_id("bk"), "vendor_id": vid, "booking_no": "SL" + uuid.uuid4().hex[:6].upper(),
        **b.model_dump(exclude={"agent_id"}), "agent_id": agent["id"] if agent else None,
        "agent_name": agent["name"] if agent else None,
        "location_name": next(l["name"] for l in LOCATIONS if l["id"] == b.location_id) if any(l["id"] == b.location_id for l in LOCATIONS) else b.location_id,
        "activity_name": ACT[b.activity_id]["name"], "total_amount": total, "commission": commission,
        "balance_due": round(total - b.advance_amount, 2), "status": "confirmed", "created_at": created_at or now_iso(),
        "jumpers": [{"pid": uuid.uuid4().hex[:8], "name": b.full_name if i == 0 else f"{b.full_name} +{i}",
                     "status": "pending", "weight": None, "jumped_at": None} for i in range(b.participants)],
    }
    await db.bookings.insert_one(doc)
    if b.advance_amount > 0:
        await add_txn(vid, "credit", b.advance_amount, b.payment_mode, "Booking advance", b.full_name, doc["booking_no"])
    if agent:
        await db.agents.update_one({"id": agent["id"]}, {"$inc": {"balance": round(total - b.advance_amount - commission, 2)}})
    doc.pop("_id", None)
    return doc


@api.post("/bookings")
async def create_booking(body: BookingIn, user: dict = Depends(current_user)):
    return await create_booking_doc(user["user_id"], body)


@api.get("/bookings")
async def list_bookings(q: str = "", status: str = "", date: str = "", activity_id: str = "", user: dict = Depends(current_user)):
    query = {"vendor_id": user["user_id"]}
    if status:
        query["status"] = status
    if date:
        query["date"] = date
    if activity_id:
        query["activity_id"] = activity_id
    if q:
        query["$or"] = [{k: {"$regex": q, "$options": "i"}} for k in ("full_name", "phone", "booking_no")]
    return await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)


class PaymentIn(BaseModel):
    amount: float = Field(gt=0)
    mode: str = "Cash"


@api.post("/bookings/{bid}/payment")
async def collect_payment(bid: str, body: PaymentIn, user: dict = Depends(current_user)):
    b = await db.bookings.find_one({"vendor_id": user["user_id"], "id": bid}, {"_id": 0})
    if not b or b["status"] != "confirmed":
        raise HTTPException(404, "Booking not found")
    if body.amount > b["balance_due"]:
        raise HTTPException(400, "Amount exceeds balance due")
    await db.bookings.update_one({"id": bid}, {"$inc": {"advance_amount": body.amount, "balance_due": -body.amount}})
    await add_txn(user["user_id"], "credit", body.amount, body.mode, "Balance payment", b["full_name"], b["booking_no"])
    return await db.bookings.find_one({"id": bid}, {"_id": 0})


@api.post("/bookings/{bid}/cancel")
async def cancel_booking(bid: str, user: dict = Depends(current_user)):
    b = await db.bookings.find_one({"vendor_id": user["user_id"], "id": bid}, {"_id": 0})
    if not b or b["status"] != "confirmed":
        raise HTTPException(404, "Booking not found")
    await db.bookings.update_one({"id": bid}, {"$set": {"status": "cancelled"}})
    if b.get("agent_id"):
        delta = b["total_amount"] - b["advance_amount"] - b["commission"]
        await db.agents.update_one({"id": b["agent_id"]}, {"$inc": {"balance": -round(delta, 2)}})
    return {"ok": True}


# ---------- Jumps ----------
@api.get("/jumps")
async def list_jumps(q: str = "", date: str = "", activity_id: str = "", user: dict = Depends(current_user)):
    query = {"vendor_id": user["user_id"], "status": "confirmed"}
    if date:
        query["date"] = date
    if activity_id:
        query["activity_id"] = activity_id
    if q:
        query["$or"] = [{k: {"$regex": q, "$options": "i"}} for k in ("full_name", "phone", "booking_no")]
    pending, completed = [], []
    async for b in db.bookings.find(query, {"_id": 0}).sort([("date", 1), ("slot", 1)]):
        for j in b["jumpers"]:
            row = {**j, "booking_id": b["id"], "booking_no": b["booking_no"], "phone": b["phone"],
                   "activity_name": b["activity_name"], "date": b["date"], "slot": b["slot"], "balance_due": b["balance_due"]}
            (completed if j["status"] == "completed" else pending).append(row)
    return {"pending": pending, "completed": completed}


class JumpIn(BaseModel):
    status: Literal["pending", "completed"]
    weight: Optional[float] = None


@api.patch("/jumps/{bid}/{pid}")
async def update_jump(bid: str, pid: str, body: JumpIn, user: dict = Depends(current_user)):
    res = await db.bookings.update_one(
        {"vendor_id": user["user_id"], "id": bid, "jumpers.pid": pid},
        {"$set": {"jumpers.$.status": body.status, "jumpers.$.weight": body.weight,
                  "jumpers.$.jumped_at": now_iso() if body.status == "completed" else None}})
    if res.matched_count == 0:
        raise HTTPException(404, "Participant not found")
    return {"ok": True}


# ---------- Agents ----------
class AgentIn(BaseModel):
    name: str = Field(min_length=1)
    phone: str = Field(min_length=6)
    email: str = ""
    gst_number: str = ""
    commission_pct: float = Field(ge=0, le=100, default=10)


@api.get("/agents")
async def list_agents(q: str = "", balance: str = "all", gst: str = "all", sort: str = "default", user: dict = Depends(current_user)):
    agents = await db.agents.find({"vendor_id": user["user_id"]}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    payable = round(sum(a["balance"] for a in agents if a["balance"] < 0), 2)
    receivable = round(sum(a["balance"] for a in agents if a["balance"] > 0), 2)
    if q:
        ql = q.lower()
        agents = [a for a in agents if ql in a["name"].lower() or ql in a["phone"] or ql in a["email"].lower()]
    if balance == "positive":
        agents = [a for a in agents if a["balance"] > 0]
    elif balance == "negative":
        agents = [a for a in agents if a["balance"] < 0]
    elif balance == "zero":
        agents = [a for a in agents if a["balance"] == 0]
    if gst == "with":
        agents = [a for a in agents if a["gst_number"]]
    elif gst == "without":
        agents = [a for a in agents if not a["gst_number"]]
    if sort == "name":
        agents.sort(key=lambda a: a["name"].lower())
    elif sort == "balance_desc":
        agents.sort(key=lambda a: -a["balance"])
    elif sort == "balance_asc":
        agents.sort(key=lambda a: a["balance"])
    return {"agents": agents, "total_payable": abs(payable), "total_receivable": receivable}


@api.post("/agents")
async def create_agent(body: AgentIn, user: dict = Depends(current_user)):
    doc = {"id": new_id("ag"), "vendor_id": user["user_id"], **body.model_dump(), "balance": 0.0, "created_at": now_iso()}
    await db.agents.insert_one(doc)
    doc.pop("_id", None)
    return doc


class SettleIn(BaseModel):
    amount: float = Field(gt=0)
    direction: Literal["received", "paid"]
    mode: str = "Cash"


@api.post("/agents/{aid}/settle")
async def settle_agent(aid: str, body: SettleIn, user: dict = Depends(current_user)):
    a = await db.agents.find_one({"vendor_id": user["user_id"], "id": aid}, {"_id": 0})
    if not a:
        raise HTTPException(404, "Agent not found")
    delta = -body.amount if body.direction == "received" else body.amount
    await db.agents.update_one({"id": aid}, {"$inc": {"balance": delta}})
    await add_txn(user["user_id"], "credit" if body.direction == "received" else "debit", body.amount, body.mode,
                  "Agent settlement received" if body.direction == "received" else "Agent payout", a["name"])
    return await db.agents.find_one({"id": aid}, {"_id": 0})


# ---------- Transactions ----------
class TxnIn(BaseModel):
    type: Literal["credit", "debit"]
    amount: float = Field(gt=0)
    mode: str = "Cash"
    description: str = Field(min_length=1)
    party: str = ""


@api.get("/transactions")
async def list_txns(q: str = "", type: str = "", mode: str = "", user: dict = Depends(current_user)):
    query = {"vendor_id": user["user_id"]}
    if type:
        query["type"] = type
    if mode:
        query["mode"] = mode
    if q:
        query["$or"] = [{k: {"$regex": q, "$options": "i"}} for k in ("party", "description", "booking_no")]
    items = await db.transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    credit = round(sum(t["amount"] for t in items if t["type"] == "credit"), 2)
    debit = round(sum(t["amount"] for t in items if t["type"] == "debit"), 2)
    return {"items": items, "total_credit": credit, "total_debit": debit, "net": round(credit - debit, 2)}


@api.post("/transactions")
async def create_txn(body: TxnIn, user: dict = Depends(current_user)):
    await add_txn(user["user_id"], body.type, body.amount, body.mode, body.description, body.party)
    return {"ok": True}


# ---------- Calendar ----------
@api.get("/calendar")
async def calendar_month(month: str, activity_id: str = "act_bungee", user: dict = Depends(current_user)):
    vid = user["user_id"]
    y, m = map(int, month.split("-"))
    days_in = ((datetime(y + (m // 12), m % 12 + 1, 1)) - datetime(y, m, 1)).days
    booked = await booked_map(vid, {"activity_id": activity_id, "date": {"$regex": f"^{month}"}})
    overrides = {}
    async for o in db.capacity_overrides.find({"vendor_id": vid, "activity_id": activity_id, "date": {"$regex": f"^{month}"}}, {"_id": 0}):
        overrides[(o["date"], o["slot"])] = o["capacity"]
    default = ACT[activity_id]["capacity"]
    days = []
    for d in range(1, days_in + 1):
        ds = f"{month}-{d:02d}"
        days.append({"date": ds, "booked": sum(booked.get((ds, s), 0) for s in SLOTS),
                     "capacity": sum(overrides.get((ds, s), default) for s in SLOTS)})
    return {"days": days}


@api.get("/calendar/day")
async def calendar_day(date: str, activity_id: str, user: dict = Depends(current_user)):
    vid = user["user_id"]
    booked = await booked_map(vid, {"activity_id": activity_id, "date": date})
    return {"slots": [{"slot": s, "booked": booked.get((date, s), 0), "capacity": await slot_capacity(vid, date, activity_id, s)} for s in SLOTS]}


class CapacityIn(BaseModel):
    date: str
    activity_id: str
    slot: str
    capacity: int = Field(ge=0, le=500)


@api.put("/calendar/capacity")
async def set_capacity(body: CapacityIn, user: dict = Depends(current_user)):
    await db.capacity_overrides.update_one(
        {"vendor_id": user["user_id"], "date": body.date, "activity_id": body.activity_id, "slot": body.slot},
        {"$set": {"capacity": body.capacity}}, upsert=True)
    return {"ok": True}


# ---------- Stats ----------
@api.get("/stats")
async def stats(date: str, user: dict = Depends(current_user)):
    vid = user["user_id"]
    todays = await db.bookings.find({"vendor_id": vid, "date": date, "status": "confirmed"}, {"_id": 0}).to_list(1000)
    pending = sum(1 for b in todays for j in b["jumpers"] if j["status"] == "pending")
    return {"bookings": len(todays), "participants": sum(b["participants"] for b in todays), "pending_jumps": pending,
            "revenue": round(sum(b["total_amount"] for b in todays), 2), "due": round(sum(b["balance_due"] for b in todays), 2)}


# ---------- Seed ----------
async def seed_vendor(vid):
    if await db.agents.count_documents({"vendor_id": vid}) > 0:
        return
    agents_seed = [("Ravi Tours & Travels", "9845012345", "ravi@ravitours.in", "29ABCDE1234F1Z5", 10),
                   ("Coastal Holidays", "9900112233", "hello@coastalholidays.in", "", 12),
                   ("Karavali Trips", "9741234560", "karavali.trips@gmail.com", "29KRVLI5678G1Z2", 8),
                   ("Goa Getaway Agency", "9822334455", "book@goagetaway.com", "", 10),
                   ("Udupi Travel Desk", "9632587410", "desk@udupitravel.in", "29UDPTD4321H1Z9", 15),
                   ("Sahyadri Explorers", "9008765432", "team@sahyadri.co", "", 10)]
    agent_ids = []
    for n, p, e, g, c in agents_seed:
        aid = new_id("ag")
        agent_ids.append(aid)
        await db.agents.insert_one({"id": aid, "vendor_id": vid, "name": n, "phone": p, "email": e, "gst_number": g,
                                    "commission_pct": c, "balance": 0.0, "created_at": now_iso()})
    names = ["Arjun Shetty", "Priya Nair", "Rahul Kamath", "Sneha Rao", "Vikram Hegde", "Ananya Pai", "Kiran Bhat",
             "Meera Iyer", "Rohit Naik", "Divya Kulkarni", "Aditya Gowda", "Pooja Menon", "Sameer Khan", "Nisha D'Souza"]
    today = datetime.now(timezone.utc).date()
    rnd = random.Random(vid)
    for i, n in enumerate(names):
        act = ACTIVITIES[i % 3]
        is_agent = i % 3 == 1
        parts = rnd.randint(1, 3)
        total = act["price"] * parts
        b = BookingIn(location_id="loc_murudeshwara", activity_id=act["id"], date=str(today + timedelta(days=(i % 5) - 1)),
                      slot=SLOTS[i % len(SLOTS)], full_name=n, phone=f"98{rnd.randint(10000000, 99999999)}",
                      city=rnd.choice(CITIES), admin_note="", is_agent_booking=is_agent,
                      agent_id=agent_ids[i % len(agent_ids)] if is_agent else None, price_per_person=act["price"],
                      participants=parts, advance_amount=rnd.choice([0, total // 2, total]), payment_mode=rnd.choice(MODES))
        doc = await create_booking_doc(vid, b)
        if b.date < str(today):
            await db.bookings.update_one({"id": doc["id"]}, {"$set": {"jumpers.$[].status": "completed", "jumpers.$[].jumped_at": now_iso()}})
    await db.agents.update_one({"id": agent_ids[3]}, {"$inc": {"balance": -2400}})
    await add_txn(vid, "debit", 2400, "UPI", "Agent payout advance", agents_seed[3][0])
    await add_txn(vid, "debit", 5500, "Bank Transfer", "Harness & rope maintenance", "SafeGear Supplies")


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
