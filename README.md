# OTech Fleet Management System

Pre-employment assessment (Part B) submission for the Junior Full-stack Developer role.
Implements the Fleet Management System process analyzed in Part A (`01_Business_Analysis.pdf`).

## Technology Used

| Layer      | Technology                                   |
|------------|-----------------------------------------------|
| Frontend   | React 18 (Vite), React Router                 |
| Backend    | NestJS 10 (Node.js/TypeScript)                 |
| Database   | MongoDB (via Mongoose)                         |
| Auth       | JWT (passport-jwt), bcrypt password hashing    |

**Why this stack:** NestJS gives a structured, modular backend (modules/services/
controllers, guards, DTOs with `class-validator`) that maps cleanly onto the
requirements and business rules from Part A, and MongoDB's flexible documents
suit a request/approval workflow with a small, evolving schema well. React on
the frontend keeps the UI simple and fast to build for a small role-based
dashboard. This is also the stack I'm most comfortable with day to day, which
let me spend more time on getting the workflow and validations right.

## Project Structure

```
fleet-management/
├── backend/     NestJS API (MongoDB via Mongoose, JWT auth)
├── frontend/    React (Vite) single-page app
└── README.md    (this file)
```

## Roles Implemented

Three roles cover the workflow end-to-end (the Part A analysis also describes
a separate Administrator actor; here that responsibility \u2014 managing vehicle
and driver master data \u2014 is folded into the Fleet Coordinator role to keep
the mini-project focused):

- **Employee** \u2014 creates, edits (while in Draft), submits, and cancels their own vehicle requests.
- **Manager** \u2014 reviews submitted requests and approves or rejects them; can view vehicles/drivers/reports.
- **Fleet Coordinator** \u2014 manages vehicle & driver master data, assigns vehicles/drivers to approved requests, and completes trips.

## Workflow Implemented

```
Draft → Submitted → Approved / Rejected → Vehicle Assigned → Completed
```

Status transitions are enforced server-side (`ALLOWED_TRANSITIONS` in
`backend/src/common/status.enum.ts`) so a request can never be pushed into an
invalid state, satisfying the "invalid status transitions must be prevented"
requirement.

## Validations Implemented (Common Technical Requirements)

- Unique Vehicle ID / plate number, unique Driver ID / license number, unique Employee ID / email.
- Required fields enforced via `class-validator` DTOs on every endpoint.
- A vehicle **Under Maintenance** or **Inactive** cannot be assigned (`VehiclesService.assertAssignable`).
- An already-**Assigned** vehicle cannot be assigned to a second request.
- A driver with an **expired license** or marked inactive cannot be assigned (`DriversService.assertAssignable`).
- Travel date cannot be in the past; number of passengers must be at least 1.
- Only requests in **Draft** can be edited; only **Draft**/**Submitted** requests can be cancelled.
- Invalid status transitions are rejected with a clear error message.
- Role-based access control on every route (`JwtAuthGuard` + `RolesGuard` + `@Roles()`).

## Reports

- **Vehicle Register** \u2014 full vehicle list with current status.
- **Requests by Status** \u2014 requests grouped by workflow stage.
- **Assignment History** \u2014 every vehicle/driver assignment made, with request and requester detail.

## Search & Filtering

- Vehicles: filter by status, search by plate/model/ID.
- Drivers: search by name/license/ID.
- Requests: filter by status (and, for managers/coordinators, by requester or date range via the API).

## Setup & Running Locally

### Prerequisites
- Node.js 18+
- A running MongoDB instance (local install, or a free MongoDB Atlas cluster)

### 1. Backend

```bash
cd backend
cp .env.example .env      # edit MONGODB_URI / JWT_SECRET if needed
npm install
npm run seed               # creates demo users, vehicles, and drivers
npm run start:dev          # runs on http://localhost:3000/api
```

Demo accounts created by the seed script (password for all: `Password123`):

| Role              | Email                  |
|-------------------|-------------------------|
| Employee          | employee@otech.com      |
| Manager           | manager@otech.com       |
| Fleet Coordinator | fleet@otech.com          |

The seed data intentionally includes one vehicle **Under Maintenance** and one
driver with an **expired license**, so the assignment validations can be
demonstrated immediately.

### 2. Frontend

```bash
cd frontend
cp .env.example .env       # points to the backend at http://localhost:3000/api
npm install
npm run dev                # runs on http://localhost:5173
```

Open http://localhost:5173, log in with one of the demo accounts above, and
walk through the workflow: create a request as Employee → approve as Manager
→ assign a vehicle/driver as Fleet Coordinator → mark it Completed.

## A Note on Testing in This Environment

This project was built and type-checked (`tsc --noEmit` for the backend,
`vite build` for the frontend) in a sandboxed environment without an
available MongoDB server, so it hasn't been smoke-tested against a live
database here. Both parts compile/build without errors; please let me know if
anything doesn't behave as expected once run against a real MongoDB instance
and I'll fix it promptly.

## Known Simplifications

- Drivers are records managed by the Fleet Coordinator, not system users who log in themselves (flagged as a clarification question in Part A).
- Request numbers/assignment IDs are generated sequentially from a document count rather than a dedicated counter collection \u2014 fine for a single-user demo, but a production system would use an atomic counter to avoid a race condition under concurrent writes.
- No email/notification system \u2014 status changes are only visible in-app.
