# AquaOps – Owner Control Center (Aqua Ride Watersports)

## Original problem statement
"So this is my friend's, uh, friend's own website, and, uh, I want, uh, like it's his-- like the owner's profile. So as we have created the customer profile before, how our website will look for the customer, how they will do the booking and everything. Now I want you to build a owner's, uh, owner's thing, owner's, uh, profile look. So how he will get to see all the bookings details and everything. So copy it from the particular website what my friend is using and create an, uh, create a website that can be used by the owner's owner. Go do the deep research and create an particular thing."
(Screenshots: AquaOps Control Center on netraniscubadive.org; login page.) User choice: no login for now.

## Architecture
- FastAPI + MongoDB (collections: activities, bookings, ops_events). Demo bookings seeded for today's IST date on startup.
- React (dark navy/teal), mobile bottom nav + desktop sidebar. Pages: Dashboard, Front Desk, Bookings, Check-in, Manifest; notifications sheet.
- Activities/prices taken from netraniscubadive.org. Batch slots (08:00–15:30) and per-batch capacities are placeholders.

## Personas
Owner / front-desk staff of a water-sports operator.

## Implemented (2026-10-19)
- Control Center stats, emergency pause/resume all, per-activity pause, guests-by-batch chart, revenue by activity
- Walk-in booking with slot availability + voucher; bookings list with filters + detail actions (check-in, paid, waiver, cancel/restore)
- Check-in by code; manifest per activity/batch, printable; ops event feed
- Fixes after testing: regex escape, date validation, status-transition rules, restore capacity check, stale manifest responses, unread badge

## Backlog
- P0: Connect to the real customer booking site database
- P1: Owner login (allow-listed), real batch timings/capacities
- P2: Revenue reports by date range, CSV export
