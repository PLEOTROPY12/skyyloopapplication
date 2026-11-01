# Sky Loooop — Vendor Console (PRD)

## Original problem
"Build me the same backend Web and application in the name of sky loooop" — a clone of the OkGhumo vendor panel shown in the screenshots: a drawer menu (Bookings, Agents, Jump details, Transaction, Calendar, Profile, Logout), a Create offline booking form, Jump details with pending/completed tabs, and Agents with payable/receivable totals, filters, Excel download and Add agent.

## User choices
- Emergent-managed Google sign-in
- Defaults were used for everything else: all sections included, no online payments (payments are recorded by hand), and sample data for Murudeshwara Sky Adventure (Bungee Jump, Sky Cycle, Zipline)

## Architecture
- Backend: FastAPI in /app/backend/server.py, using MongoDB. Every record has its own id and is scoped to the vendor's user_id.
- Frontend: React with Tailwind and the shadcn Dialog/Switch components. Pages are in src/pages and the layout is in src/components/Layout.jsx.
- Each new vendor gets demo data on first login: 6 agents, 14 bookings and some transactions.

## Implemented (2026-06)
- Google login, sessions, logout
- Bookings: stats, search and filters, collect payment, cancel (records a refund for any advance paid), and the offline booking form (spots left per slot, capacity check, agent booking, price × participants, advance, balance due)
- Jump details: pending/completed tabs, filters, mark a jump done with weight, undo
- Agents: payable and receivable totals, balance/GST/sort filters, CSV ("Excel") export, add agent, settle (logs a transaction)
- Transactions: money in/out log, filters, manual entries
- Calendar: month grid per activity, slot capacity changes for each day
- Profile: business details

## Backlog
- P1: Video uploads per booking, an Analysis page with charts, managing locations and activities from the UI
- P2: Agent logins, online payments, WhatsApp/SMS confirmations, a real .xlsx export
