import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    yield sess
    # cleanup: resume all + cancel TEST_ bookings
    sess.post(f"{API}/ops/resume-all")
    for b in sess.get(f"{API}/bookings", params={"q": "TEST_"}).json():
        if b["status"] != "cancelled":
            sess.patch(f"{API}/bookings/{b['id']}/status", json={"status": "cancelled"})


@pytest.fixture(scope="module")
def today(s):
    return s.get(f"{API}/meta").json()["today"]


# Health / meta
def test_root_and_meta(s):
    assert s.get(f"{API}/").json()["message"] == "AquaOps API"
    m = s.get(f"{API}/meta").json()
    assert m["slots"] == ["08:00", "09:30", "11:00", "12:30", "14:00", "15:30"]
    assert len(m["today"]) == 10


# Activities
def test_activities(s):
    acts = s.get(f"{API}/activities").json()
    assert len(acts) == 8
    assert all("_id" not in a and "paused" in a for a in acts)


# Dashboard
def test_dashboard_shape(s, today):
    d = s.get(f"{API}/dashboard").json()
    assert d["date"] == today
    for k in ["todays_bookings", "total_guests", "revenue", "checked_in", "capacity", "active_closures", "by_slot", "by_activity"]:
        assert k in d
    bks = s.get(f"{API}/bookings", params={"date": today}).json()
    active = [b for b in bks if b["status"] != "cancelled"]
    assert d["todays_bookings"] == len(active)
    assert d["revenue"] == sum(b["amount"] for b in active)
    assert d["total_guests"] == sum(b["adults"] + b["kids"] for b in active)


# Emergency pause / resume / toggle
def test_pause_resume_toggle(s, today):
    r = s.post(f"{API}/ops/pause-all")
    assert r.status_code == 200 and all(a["paused"] for a in r.json())
    assert s.get(f"{API}/dashboard").json()["active_closures"] == 8
    # booking blocked when paused
    r = s.post(f"{API}/bookings", json={"guest_name": "TEST_Paused", "phone": "9999999999", "activity_id": "kayak", "date": today, "slot": "08:00"})
    assert r.status_code == 400 and "paused" in r.json()["detail"]
    r = s.post(f"{API}/ops/resume-all")
    assert all(not a["paused"] for a in r.json())
    assert s.get(f"{API}/dashboard").json()["active_closures"] == 0
    t = s.post(f"{API}/activities/kayak/toggle").json()
    assert t["paused"] is True
    t = s.post(f"{API}/activities/kayak/toggle").json()
    assert t["paused"] is False
    assert s.post(f"{API}/activities/nope/toggle").status_code == 404


# Booking create -> get by code -> list -> manifest
def test_booking_lifecycle(s, today):
    payload = {"guest_name": "TEST_Walkin", "phone": "9876543210", "activity_id": "kayak", "date": today,
               "slot": "15:30", "adults": 2, "kids": 1, "payment_status": "advance"}
    r = s.post(f"{API}/bookings", json=payload)
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["code"].startswith("AR-") and b["amount"] == 199 * 3 and b["paid_amount"] == round(597 * 0.1)
    assert b["source"] == "walk-in" and b["status"] == "confirmed"
    g = s.get(f"{API}/bookings/code/{b['code'].lower()}").json()
    assert g["id"] == b["id"]
    lst = s.get(f"{API}/bookings", params={"q": "TEST_Walkin", "date": today}).json()
    assert any(x["id"] == b["id"] for x in lst)
    m = s.get(f"{API}/manifest", params={"date": today, "activity_id": "kayak", "slot": "15:30"}).json()
    assert any(x["code"] == b["code"] for x in m["bookings"])
    # patch waiver / payment
    p = s.patch(f"{API}/bookings/{b['id']}", json={"waiver_signed": True, "payment_status": "paid"}).json()
    assert p["waiver_signed"] is True and p["paid_amount"] == 597
    # status checkin
    c = s.patch(f"{API}/bookings/{b['id']}/status", json={"status": "checked_in"}).json()
    assert c["status"] == "checked_in" and c["checked_in_at"]
    assert s.get(f"{API}/bookings/code/{b['code']}").json()["status"] == "checked_in"
    # cancel and restore
    assert s.patch(f"{API}/bookings/{b['id']}/status", json={"status": "cancelled"}).json()["status"] == "cancelled"
    assert s.patch(f"{API}/bookings/{b['id']}/status", json={"status": "confirmed"}).json()["status"] == "confirmed"
    ev = s.get(f"{API}/events").json()
    assert any(b["code"] in e["message"] for e in ev)


# Capacity enforcement
def test_capacity_blocked(s, today):
    r = s.post(f"{API}/bookings", json={"guest_name": "TEST_Big", "phone": "9876543210", "activity_id": "parasailing",
                                         "date": today, "slot": "15:30", "adults": 7})
    assert r.status_code == 400 and "seats" in r.json()["detail"]
    av = s.get(f"{API}/availability", params={"activity_id": "parasailing", "date": today}).json()
    assert len(av) == 6 and av[0]["capacity"] == 6


# Validation
def test_validation(s, today):
    assert s.post(f"{API}/bookings", json={"guest_name": "", "phone": "1", "activity_id": "kayak", "date": today, "slot": "08:00"}).status_code == 422
    assert s.post(f"{API}/bookings", json={"guest_name": "TEST_x", "phone": "99999", "activity_id": "kayak", "date": today, "slot": "07:00"}).status_code == 400
    assert s.post(f"{API}/bookings", json={"guest_name": "TEST_x", "phone": "99999", "activity_id": "zzz", "date": today, "slot": "08:00"}).status_code == 404
    assert s.get(f"{API}/bookings/code/AR-NOPE00").status_code == 404
    assert s.patch(f"{API}/bookings/nope/status", json={"status": "checked_in"}).status_code == 404


# Filters
def test_filters(s, today):
    for st in ["confirmed", "checked_in", "cancelled"]:
        rows = s.get(f"{API}/bookings", params={"date": today, "status": st}).json()
        assert all(r["status"] == st for r in rows)
    rows = s.get(f"{API}/bookings", params={"date": today, "activity_id": "aqua-plus"}).json()
    assert all(r["activity_id"] == "aqua-plus" for r in rows)


# Edge: regex special chars in search
def test_search_special_chars(s):
    r = s.get(f"{API}/bookings", params={"q": "("})
    assert r.status_code == 200, f"search '(' returned {r.status_code}"


# Edge: past date booking / garbage date
def test_invalid_date_rejected(s):
    r = s.post(f"{API}/bookings", json={"guest_name": "TEST_BadDate", "phone": "99999", "activity_id": "kayak", "date": "not-a-date", "slot": "08:00"})
    assert r.status_code in (400, 422), f"invalid date accepted: {r.status_code}"
