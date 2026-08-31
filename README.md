# OTech Fleet Management System

Pre-employment assessment (Part B) submission for the Junior Full-stack Developer role.
Implements the Fleet Management System process analyzed in Part A (`01_Business_Analysis.pdf`).

## Technology Used

| Layer    | Technology                                |
|----------|--------------------------------------------|
| Frontend | React 18 (Vite), React Router              |
| Backend  | NestJS 10 (Node.js / TypeScript)           |
| Database | MongoDB (via Mongoose)                     |
| Auth     | JWT (passport-jwt), bcrypt password hashing |

**Why this stack:** NestJS provides a modular backend (modules, services, controllers, guards, DTOs with `class-validator`) that maps cleanly onto the workflow and business rules. MongoDB's flexible documents suit an evolving request/approval schema. React keeps the role-based UI fast to build and maintain.

## Project Structure

```
fleet-management/
├── backend/              NestJS API (MongoDB, JWT auth)
│   ├── src/              Modules: auth, users, requests, vehicles, drivers, reports, notifications, settings
│   ├── test/             Unit tests (trip duration)
│   └── scripts/          API smoke test
├── frontend/             React (Vite) single-page app
├── docs/                 ER diagram, process flow, presentation notes
├── postman/              API collection for manual / integration testing
└── README.md
```

## Roles Implemented

Four roles cover the full workflow. **Administrator** is separate from Fleet Coordinator and has additional powers (user management, status override).

| Role | Capabilities |
|------|----------------|
| **Employee** | Create/edit/submit/cancel own requests, track status, change own password, receive notifications |
| **Manager** | Approve/reject submitted requests, view read-only fleet & drivers, reports, CSV export |
| **Fleet Coordinator** | Assign/reassign vehicle & driver, complete trips, manage vehicles/drivers, reports |
| **Administrator** | All coordinator/manager capabilities plus user CRUD, settings (branches, departments, destinations), status override |

Drivers are **records only** — they do not log into the system.

## Workflow Implemented

```
Draft → Submitted → Approved / Rejected → Vehicle Assigned → Completed
         ↘ Cancelled (from Draft, Submitted, Approved, or Vehicle Assigned — vehicle released if assigned)
```

- **Rejected** is terminal; the employee must create a new request.
- **Reassign** driver or vehicle is available while status is Vehicle Assigned (breakdown protocol marks original vehicle Under Maintenance).
- **Administrator override** can force a status change in exceptional cases (with confirmation and notification).

Status transitions are enforced server-side (`ALLOWED_TRANSITIONS` in `backend/src/common/status.enum.ts`).

## Features

- Role-based dashboards (Employee, Manager, Fleet Coordinator, Administrator)
- Modal-based create/view flows; confirmation dialogs before delete, cancel, reject, and override
- In-app **notifications** (bell + toast popups) on submit, approve, reject, assign, complete, cancel, override
- Self-service **change password** via profile menu
- Trip duration presets, branch/destination suggestions, department dropdown for user creation
- **CSV export** on Reports page and Manager full report export
- Responsive layout (mobile-friendly nav, modals, notification panel)
- Loading skeletons while async data loads (no false “empty” flashes)

## Validations (Server-Side)

- Unique vehicle ID, plate number, driver ID, license number, employee ID, and email
- Required fields enforced via `class-validator` DTOs
- Vehicle **Under Maintenance** or **Inactive** cannot be assigned
- Already-**Assigned** vehicle cannot be double-booked
- Driver with **expired license** or **inactive** flag cannot be assigned
- Vehicle **seating capacity** must meet passenger count
- Travel date cannot be in the past; passengers must be at least 1
- **Date overlap** blocked for the same employee on submit (and on manager approve)
- Only **Draft** requests are editable by the employee
- Trip cannot be **completed** before the scheduled travel date
- Submitted requests **> 48 hours** are flagged **Overdue** (computed at read time)
- Role-based access on every API route (`JwtAuthGuard` + `RolesGuard` + `@Roles()`)

## Reports

- **Vehicle Register** — full fleet list with status
- **Requests by Status** — requests grouped by workflow stage
- **Assignment History** — all assignments with request and requester detail

Each report supports **Download CSV**.

## API Overview

| Group | Endpoints |
|-------|-----------|
| `/auth` | Login, change password |
| `/users` | User management (admin) |
| `/requests` | Create, submit, approve, reject, assign, reassign, complete, cancel, override |
| `/vehicles`, `/drivers` | Master data CRUD |
| `/reports` | Three report endpoints |
| `/notifications` | List, unread count, mark read |
| `/branches`, `/departments`, `/destinations` | Settings lookups (admin) |

Postman collection: `postman/collections/Fleet-Management-API.postman_collection.json`

## Setup & Running Locally

### Prerequisites

- Node.js 18+
- MongoDB (local or MongoDB Atlas)

### 1. Backend

```bash
cd backend
cp .env.example .env      # edit MONGODB_URI / JWT_SECRET if needed
npm install
npm run seed              # demo users, vehicles, drivers, lookups
npm run start:dev         # http://localhost:3000/api
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:3000/api
npm install
npm run dev               # http://localhost:5173
```

### Demo accounts (password for all: `Password123`)

| Role              | Email               |
|-------------------|---------------------|
| Employee          | employee@otech.com  |
| Manager           | manager@otech.com   |
| Fleet Coordinator | fleet@otech.com     |
| Administrator     | admin@otech.com     |

The seed data includes one vehicle **Under Maintenance** and one driver with an **expired license** so assignment validations can be demonstrated immediately.

### Suggested demo walkthrough

1. **Employee** — create and submit a trip request
2. **Manager** — approve (notification toast appears)
3. **Fleet Coordinator** — assign vehicle and driver, then complete trip (on/after travel date)
4. **Administrator** — view users, settings tab, or status override if needed

## Testing

```bash
cd backend
npm test                  # unit tests (trip duration)
npm run test:api          # API smoke test (server must be running)
```

Frontend: manual UI testing via the demo walkthrough above. Postman collection covers the main API flows including a happy-path workflow folder.

## Documentation

| File | Description |
|------|-------------|
| `docs/6.3-er-diagram.md` | Entity-relationship model |
| `docs/er-diagram.svg` | ER diagram (visual) |
| `docs/process-flow-diagram.svg` | Process flow (visual) |
| `docs/presentation-short.md` | Short presentation deck (14 slides) |

## Known Simplifications / Future Scope

- **In-app notifications only** — email/SMS is out of scope for this pilot
- Drivers are managed records, not system users with login
- Request/assignment IDs use document-count sequencing (production would use an atomic counter)
- No Swagger/OpenAPI UI, frontend unit tests, or CI/CD pipeline in this submission

Future enhancements: email/SMS alerts, driver mobile app, automated maintenance scheduling, mileage logging on completion, manager hierarchy for approvals.
