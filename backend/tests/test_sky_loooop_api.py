# Sky Loooop vendor panel API regression tests (auth, bookings, jumps, agents, transactions, calendar, profile)
import os
import time
import uuid
from datetime import datetime, timezone, timedelta, date

import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
TODAY = str(date.today())
FUTURE = str(date.today() + timedelta(days=20))


@pytest.fixture(scope="module")
def token():
    # fresh isolated vendor so mutations don't pollute test-user-1
    mc = MongoClient(os.environ["MONGO_URL"])
    db = mc[os.environ["DB_NAME"]]
    uid = f"TEST_user_{uuid.uuid4().hex[:8]}"
    tok = f"TEST_session_{uuid.uuid4().hex}"
    db.users.insert_one({"user_id": uid, "email": f"{uid}@example.com", "name": "TEST Vendor", "picture": "",
                         "role": "vendor", "business_name": "Sky Loooop Adventures", "phone": "", "gst_number": "",
                         "address": "", "seeded": False, "created_at": datetime.now(timezone.utc).isoformat()})
    db.user_sessions.insert_one({"user_id": uid, "session_token": tok,
                                 "expires_at": datetime.now(timezone.utc) + timedelta(days=1)})
    yield tok
    for c in ("bookings", "agents", "transactions", "capacity_overrides"):
        db[c].delete_many({"vendor_id": uid})
    db.users.delete_one({"user_id": uid})
    db.user_sessions.delete_many({"user_id": uid})


@pytest.fixture(scope="module")
def s(token):
    se = requests.Session()
    se.headers.update({"Authorization": f"Bearer {token}"})
    r = se.get(f"{API}/auth/me")  # triggers seed
    assert r.status_code == 200
    return se


# Auth
def test_unauth_me():
    assert requests.get(f"{API}/auth/me").status_code == 401


def test_preset_session_works():
    r = requests.get(f"{API}/auth/me", cookies={"session_token": "test_session_sky1"})
    assert r.status_code == 200 and r.json()["user_id"] == "test-user-1"


def test_me_and_seed(s):
    me = s.get(f"{API}/auth/me").json()
    assert me["seeded"] is True and "_id" not in me
    assert len(s.get(f"{API}/bookings").json()) == 14
    assert len(s.get(f"{API}/agents").json()["agents"]) == 6


def test_catalog():
    d = requests.get(f"{API}/catalog").json()
    assert {a["id"] for a in d["activities"]} == {"act_bungee", "act_skycycle", "act_zipline"}
    assert "09:00 AM" in d["slots"]


# Bookings
def test_booking_create_filters_payment_cancel(s):
    body = {"location_id": "loc_murudeshwara", "activity_id": "act_skycycle", "date": FUTURE, "slot": "09:00 AM",
            "full_name": "TEST_Walkin", "phone": "9876543210", "price_per_person": 1200, "participants": 2,
            "advance_amount": 1000, "payment_mode": "UPI"}
    r = s.post(f"{API}/bookings", json=body)
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["total_amount"] == 2400 and b["balance_due"] == 1400 and len(b["jumpers"]) == 2
    lst = s.get(f"{API}/bookings", params={"q": "TEST_Walkin"}).json()
    assert len(lst) == 1 and lst[0]["id"] == b["id"]
    assert all(x["date"] == FUTURE for x in s.get(f"{API}/bookings", params={"date": FUTURE}).json())
    # capacity overflow (skycycle cap 6, 2 booked)
    r = s.post(f"{API}/bookings", json={**body, "participants": 5})
    assert r.status_code == 400 and "4 spots" in r.json()["detail"]
    # advance > total
    r = s.post(f"{API}/bookings", json={**body, "participants": 1, "advance_amount": 5000})
    assert r.status_code == 400
    # payment
    assert s.post(f"{API}/bookings/{b['id']}/payment", json={"amount": 9999}).status_code == 400
    r = s.post(f"{API}/bookings/{b['id']}/payment", json={"amount": 400, "mode": "Cash"})
    assert r.status_code == 200 and r.json()["balance_due"] == 1000
    tx = s.get(f"{API}/transactions", params={"q": b["booking_no"]}).json()["items"]
    assert len(tx) == 2 and sum(t["amount"] for t in tx) == 1400
    # cancel
    assert s.post(f"{API}/bookings/{b['id']}/cancel").json()["ok"] is True
    assert s.get(f"{API}/bookings", params={"q": "TEST_Walkin", "status": "cancelled"}).json()[0]["status"] == "cancelled"
    assert s.post(f"{API}/bookings/{b['id']}/cancel").status_code == 404


def test_booking_validation(s):
    r = s.post(f"{API}/bookings", json={"location_id": "loc_murudeshwara", "activity_id": "act_bad", "date": FUTURE,
                                         "slot": "09:00 AM", "full_name": "X", "phone": "9876543210",
                                         "price_per_person": 1, "participants": 1})
    assert r.status_code == 400
    r = s.post(f"{API}/bookings", json={"location_id": "loc_murudeshwara", "activity_id": "act_bungee", "date": FUTURE,
                                         "slot": "09:00 AM", "full_name": "", "phone": "12", "price_per_person": 1,
                                         "participants": 1})
    assert r.status_code == 422


def test_agent_booking_updates_balance(s):
    ag = s.post(f"{API}/agents", json={"name": "TEST_Agent", "phone": "9000000001", "commission_pct": 10}).json()
    assert ag["balance"] == 0
    body = {"location_id": "loc_murudeshwara", "activity_id": "act_zipline", "date": FUTURE, "slot": "10:00 AM",
            "full_name": "TEST_AgentCust", "phone": "9876500000", "is_agent_booking": True, "agent_id": ag["id"],
            "price_per_person": 800, "participants": 2, "advance_amount": 0}
    b = s.post(f"{API}/bookings", json=body).json()
    assert b["agent_name"] == "TEST_Agent" and b["commission"] == 160
    a2 = [a for a in s.get(f"{API}/agents").json()["agents"] if a["id"] == ag["id"]][0]
    assert a2["balance"] == 1440
    # invalid agent
    assert s.post(f"{API}/bookings", json={**body, "agent_id": "nope"}).status_code == 400
    # settle
    r = s.post(f"{API}/agents/{ag['id']}/settle", json={"amount": 440, "direction": "received", "mode": "Cash"})
    assert r.status_code == 200 and r.json()["balance"] == 1000
    tx = s.get(f"{API}/transactions", params={"q": "TEST_Agent", "type": "credit"}).json()["items"]
    assert any(t["description"] == "Agent settlement received" and t["amount"] == 440 for t in tx)
    # cancel reverts balance
    s.post(f"{API}/bookings/{b['id']}/cancel")
    a3 = [a for a in s.get(f"{API}/agents").json()["agents"] if a["id"] == ag["id"]][0]
    assert a3["balance"] == -440


# Agents filters
def test_agents_filters(s):
    d = s.get(f"{API}/agents").json()
    assert d["total_payable"] >= 0 and d["total_receivable"] >= 0
    assert all(a["balance"] > 0 for a in s.get(f"{API}/agents", params={"balance": "positive"}).json()["agents"])
    assert all(a["balance"] < 0 for a in s.get(f"{API}/agents", params={"balance": "negative"}).json()["agents"])
    assert all(a["gst_number"] for a in s.get(f"{API}/agents", params={"gst": "with"}).json()["agents"])
    names = [a["name"] for a in s.get(f"{API}/agents", params={"sort": "name"}).json()["agents"]]
    assert names == sorted(names, key=str.lower)
    assert s.get(f"{API}/agents", params={"q": "ravi"}).json()["agents"][0]["name"] == "Ravi Tours & Travels"
    assert s.post(f"{API}/agents", json={"name": "", "phone": "1"}).status_code == 422


# Jumps
def test_jumps_mark_undo(s):
    s.post(f"{API}/bookings", json={"location_id": "loc_murudeshwara", "activity_id": "act_bungee", "date": FUTURE,
                                     "slot": "11:00 AM", "full_name": "TEST_Jumper", "phone": "9876511111",
                                     "price_per_person": 3500, "participants": 1})
    d = s.get(f"{API}/jumps", params={"date": FUTURE, "q": "TEST_Jumper"}).json()
    assert len(d["pending"]) == 1 and len(d["completed"]) == 0
    j = d["pending"][0]
    r = s.patch(f"{API}/jumps/{j['booking_id']}/{j['pid']}", json={"status": "completed", "weight": 72.5})
    assert r.status_code == 200
    d = s.get(f"{API}/jumps", params={"date": FUTURE, "q": "TEST_Jumper"}).json()
    assert len(d["completed"]) == 1 and d["completed"][0]["weight"] == 72.5
    s.patch(f"{API}/jumps/{j['booking_id']}/{j['pid']}", json={"status": "pending"})
    assert len(s.get(f"{API}/jumps", params={"date": FUTURE, "q": "TEST_Jumper"}).json()["pending"]) == 1
    assert s.patch(f"{API}/jumps/{j['booking_id']}/bad", json={"status": "pending"}).status_code == 404
    assert len(s.get(f"{API}/jumps", params={"activity_id": "act_zipline"}).json()["pending"]) >= 0


# Transactions
def test_transactions(s):
    r = s.post(f"{API}/transactions", json={"type": "debit", "amount": 321, "mode": "UPI", "description": "TEST_fuel"})
    assert r.status_code == 200
    d = s.get(f"{API}/transactions", params={"q": "TEST_fuel"}).json()
    assert d["items"][0]["amount"] == 321 and d["total_debit"] == 321 and d["net"] == -321
    assert all(t["mode"] == "UPI" for t in s.get(f"{API}/transactions", params={"mode": "UPI"}).json()["items"])
    assert s.post(f"{API}/transactions", json={"type": "debit", "amount": 0, "description": "x"}).status_code == 422


# Calendar
def test_calendar(s):
    m = s.get(f"{API}/calendar", params={"month": TODAY[:7], "activity_id": "act_bungee"}).json()
    assert len(m["days"]) >= 28 and m["days"][0]["capacity"] == 80
    r = s.put(f"{API}/calendar/capacity", json={"date": FUTURE, "activity_id": "act_bungee", "slot": "02:00 PM", "capacity": 3})
    assert r.status_code == 200
    day = s.get(f"{API}/calendar/day", params={"date": FUTURE, "activity_id": "act_bungee"}).json()["slots"]
    assert [x for x in day if x["slot"] == "02:00 PM"][0]["capacity"] == 3
    r = s.post(f"{API}/bookings", json={"location_id": "loc_murudeshwara", "activity_id": "act_bungee", "date": FUTURE,
                                         "slot": "02:00 PM", "full_name": "TEST_Cap", "phone": "9876522222",
                                         "price_per_person": 3500, "participants": 4})
    assert r.status_code == 400


def test_calendar_invalid_inputs(s):
    # should be 400/422, not 500
    r1 = s.get(f"{API}/calendar", params={"month": TODAY[:7], "activity_id": "bad"})
    r2 = s.get(f"{API}/calendar", params={"month": "bad"})
    r3 = s.get(f"{API}/calendar/day", params={"date": TODAY, "activity_id": "bad"})
    assert r1.status_code < 500 and r2.status_code < 500 and r3.status_code < 500, (r1.status_code, r2.status_code, r3.status_code)


def test_search_regex_special_chars(s):
    r = s.get(f"{API}/bookings", params={"q": "("})
    assert r.status_code == 200, r.status_code


# Stats & profile
def test_stats(s):
    d = s.get(f"{API}/stats", params={"date": TODAY}).json()
    assert d["bookings"] >= 1 and set(d) >= {"participants", "pending_jumps", "revenue", "due"}


def test_profile(s):
    r = s.put(f"{API}/profile", json={"business_name": "TEST Biz", "phone": "9999", "gst_number": "G1", "address": "A"})
    assert r.status_code == 200 and r.json()["business_name"] == "TEST Biz"
    assert s.get(f"{API}/auth/me").json()["gst_number"] == "G1"


def test_logout_cookie():
    mc = MongoClient(os.environ["MONGO_URL"])
    db = mc[os.environ["DB_NAME"]]
    tok = f"TEST_logout_{uuid.uuid4().hex}"
    db.user_sessions.insert_one({"user_id": "test-user-1", "session_token": tok,
                                 "expires_at": datetime.now(timezone.utc) + timedelta(days=1)})
    assert requests.get(f"{API}/auth/me", cookies={"session_token": tok}).status_code == 200
    requests.post(f"{API}/auth/logout", cookies={"session_token": tok})
    assert requests.get(f"{API}/auth/me", cookies={"session_token": tok}).status_code == 401
