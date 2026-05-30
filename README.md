# EVEcosys — EV Fleet Management Platform

EVEcosys is a web application that helps organisations manage electric vehicle (EV) fleets. Managers can add users, track vehicles, monitor charging stations, and review trip data. Drivers see only their own vehicle and trips. Board members get a read-only view of fleet-wide data and analytics.

---

## Table of Contents

1. [Who can use it and what they can do](#roles)
2. [How the codebase is organised](#codebase-structure)
3. [Tech stack](#tech-stack)
4. [Setting up for development](#local-development)
5. [Running tests](#running-tests)
6. [Deploying to production](#deployment)
7. [Database tables](#database-schema)
8. [Security](#security)
9. [Smoke test checklist](#smoke-test-checklist)

---

## Roles

There are five roles. Accounts are **created by an authorised administrator** — there is no self-signup (except for the planned General Public tier).

| Role | What they can do |
|---|---|
| **Super Admin** | Internal team only. Unrestricted access to the entire platform — can manage any organisation, correct data, and perform system-level operations not available to any client role |
| **Admin** | Client-side leaders (e.g. company executives or fleet directors). Read-only access to fleet-wide KPIs, operational summaries, and cross-fleet analytics across their organisation |
| **Manager** | Manages one or more assigned fleets. Sees granular driver behaviour, individual vehicle performance, KPI tracking over time, and handles alerts and charging stations. Primarily a desktop experience |
| **Driver** | Field operators responsible for a single assigned vehicle. Can see their own vehicle, trips, behaviour score, and alerts. Primarily a **mobile** experience |
| **General Public** | *(Future)* A planned B2C mobile tier for individual EV owners outside of managed fleets — an extension of the Driver experience adapted for personal use |

Every 30 days, users are prompted to reset their password before they can continue.

---

## Codebase Structure

This is a **monorepo** — a single repository containing multiple related projects. Think of it like one folder on your computer that holds several sub-projects which share code with each other.

```
evecosys/
│
├── app/                    ← The web application (pages and API)
│   ├── (auth)/             ← Login, forgot password, reset password
│   ├── (dashboard)/        ← Role dashboards (board, driver, manager)
│   └── api/                ← Server-side API endpoints
│
├── components/             ← Reusable UI building blocks (buttons, forms, tables, etc.)
│   ├── ui/                 ← Base visual primitives
│   ├── auth/               ← Auth-specific components
│   ├── board/              ← Board-role components
│   ├── driver/             ← Driver-role components
│   ├── manager/            ← Manager-role components
│   └── layout/             ← Page shells and navigation
│
├── design-system/          ← Future shared component library (in progress)
│   ├── components/         ← Will hold shadcn/ui primitives
│   ├── tokens/             ← Will hold colour, spacing, and typography definitions
│   └── stories/            ← Will hold Storybook visual documentation
│
├── lib/                    ← Shared logic and utilities
│   ├── fleetHealth.ts      ← Calculates fleet-wide health metrics
│   ├── behaviorScore.ts    ← Computes driver behaviour scores
│   └── supabase/           ← Database client setup (browser and server)
│
├── types/                  ← TypeScript type definitions for every data entity
│
├── test/                   ← Unit and integration tests (run in under a second each)
│   ├── unit/               ← Tests for individual functions and components
│   ├── integration/        ← Tests for multi-step flows (e.g. password reset)
│   └── utils/              ← Test helpers and database stubs
│
├── e2e/                    ← End-to-end tests (drive a real browser like a user would)
│   ├── tests/              ← Test specs grouped by feature and role
│   ├── page-objects/       ← Helper classes that represent pages in the browser
│   ├── fixtures/           ← Shared test setup and teardown
│   ├── helpers/            ← Auth helpers and database utilities
│   └── test-data/          ← Random data generators (email addresses, plate numbers, etc.)
│
├── docs/                   ← Design decisions and architecture notes
├── public/                 ← Brand logos and static assets
├── scripts/                ← One-off utility scripts
└── vscode-extension/       ← VS Code extension for Linear integration
```

### The three workstreams

| Workstream | Folder | Purpose |
|---|---|---|
| **App** | `app/` + `components/` | The running web application users interact with |
| **Design System** | `design-system/` | Shared visual components and tokens (being built out) |
| **Docs** | `docs/` | Design decisions, architecture records, `DESIGN.md` |

---

## Tech Stack

You do not need to understand all of these to contribute, but here is what the project is built on:

| What | Technology | Why |
|---|---|---|
| Web framework | Next.js 16 (App Router) | Handles both the UI and the server-side API in one project |
| Database & auth | Supabase (Postgres) | Manages all data, login sessions, and row-level security |
| Styling | Tailwind CSS | Utility-first CSS — style by adding class names |
| UI components | shadcn/ui | Pre-built accessible components (moving to `design-system/`) |
| Unit testing | Vitest + Testing Library | Fast tests that run in memory (no browser needed) |
| E2E testing | Playwright | Automated browser tests that simulate real user flows |
| Deployment | Vercel | Hosts the app; auto-deploys on every push to `main` |
| Issue tracking | Linear | Linked via VS Code extension and GitHub Actions |

---

## Local Development

### What you need installed first

- [Node.js 18 or newer](https://nodejs.org)
- npm (comes with Node)
- A Supabase project (cloud or local CLI)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/evecosys.git
cd evecosys

# 2. Install dependencies
#    --legacy-peer-deps avoids a known conflict with testing libraries
npm install --legacy-peer-deps

# 3. Create your environment file
cp .env.example .env.local
# Then open .env.local and fill in your Supabase credentials (see below)

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment variables

Create a file called `.env.local` in the project root. It must contain:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

> **Important:** `SUPABASE_SERVICE_ROLE_KEY` is a secret admin key. It must **never** start with `NEXT_PUBLIC_` — that prefix would expose it to the browser and to the public.

You can find all three values in your Supabase project under **Settings → API**.

---

## Running Tests

There are two layers of tests. Both must pass before merging to `main`.

### Unit and integration tests (Vitest)

These run entirely in memory — no browser, no real database. They are fast (usually under 10 seconds total) and check that individual functions and components behave correctly.

```bash
npm run test
```

What is tested:

| Test file location | What it covers |
|---|---|
| `test/unit/auth/` | Login, signup, forgot-password, and reset-password forms |
| `test/unit/api/` | All six API endpoints (charging, alerts, users, vehicles) |
| `test/unit/lib/` | Fleet health and behaviour score calculations |
| `test/unit/components/` | The SignupForm component |
| `test/integration/` | Multi-step flows with an in-memory database stub |

The test utilities in `test/utils/` provide a lightweight fake database so tests never touch a real Supabase project.

### End-to-end tests (Playwright)

These open a real browser and click through the app like a real user would. They require a running dev server and a live Supabase test project.

```bash
npx playwright test
```

The tests are split into **7 test projects** that run in order:

| Project | What it does |
|---|---|
| `setup` | Creates three test users (manager, driver, board) and saves login sessions |
| `auth` | Tests login, logout, and password reset flows |
| `manager` | Tests every Manager feature (users, drivers, vehicles, alerts, charging) |
| `driver` | Tests the Driver dashboard and alert actions |
| `auth-guards` | **P0 security test** — confirms each role can only access their own routes |
| `mobile-smoke` | Runs critical paths on a mobile viewport (Pixel 5) |
| `teardown` | Cleans up all test data created during the run |

Test reports are saved to `e2e/reports/` after each run. On CI, Playwright captures screenshots and traces for any test that fails.

#### Writing new tests

- Add page specs to `e2e/tests/<feature>/`
- Use the existing page-object classes in `e2e/page-objects/` rather than writing raw selectors
- Use the fixtures in `e2e/fixtures/` so cleanup is handled automatically
- Generate unique test data with the helpers in `e2e/test-data/` to avoid collisions between runs

---

## Deployment

The app deploys automatically to Vercel when you push to `main`.

### First-time setup on Vercel

1. Go to [vercel.com](https://vercel.com) and log in
2. Click **Add New → Project** and import the GitHub repository
3. Under **Environment Variables**, add all three variables from `.env.local` for **Production**, **Preview**, and **Development** environments
4. Click **Deploy**

Your app will be live at `https://your-project-name.vercel.app`.

### After deploying: update Supabase redirect URLs

Supabase needs to know your production URL so password-reset and auth emails link to the right place.

1. Go to your Supabase project → **Authentication → URL Configuration**
2. Set **Site URL** to your Vercel URL (e.g. `https://evecosys.vercel.app`)
3. Add to **Redirect URLs:**
   - `https://evecosys.vercel.app/**`
   - `http://localhost:3000/**` (for local dev)
4. Save

---

## Database Schema

Seven tables, all with Row Level Security (RLS) enabled. RLS means the database itself enforces access rules — a Driver cannot query another Driver's data even if they tried.

| Table | What it stores |
|---|---|
| `users` | User profiles and roles (`manager`, `board`, `driver`) |
| `vehicles` | EV fleet vehicles — battery state, location, status |
| `drivers` | Driver profiles linked to a user and an assigned vehicle |
| `trips` | Trip records (origin, destination, distance, energy used) |
| `alerts` | System alerts (low battery, maintenance due, geofence breach, etc.) |
| `charging_stations` | Charging station registry with location and connector data |
| `user_preferences` | Per-user settings (theme: light or dark) |

**Useful helper functions built into the database:**

- `get_my_role()` — returns the logged-in user's role
- `get_my_vehicle_id()` — returns the Driver's assigned vehicle ID

The full schema is in `supabase-schema.sql`.

---

## Security

- **Row Level Security** on every Supabase table — access is enforced at the database level
- **Middleware** (`middleware.ts`) checks the user's role on every page request and blocks unauthorised access
- **Security headers** set in `next.config.ts`: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Service role key** is server-side only and never exposed to the browser
- **No self-registration** — only a Manager can create accounts

---

## Smoke Test Checklist

Run this manually after every production deployment.

### Manager
- [ ] Log in as Manager
- [ ] Create a new user with Driver role
- [ ] Assign a vehicle to the driver
- [ ] View all trips and alerts
- [ ] Log out

### Board
- [ ] Log in as Board
- [ ] Verify data is visible on the dashboard
- [ ] Attempt to edit any record — should be blocked
- [ ] Log out

### Driver
- [ ] Log in as Driver
- [ ] Verify only their own vehicle is visible
- [ ] Try accessing another driver's URL directly — should redirect
- [ ] Log out

### Forced password reset
- [ ] Create a test account as Manager
- [ ] In Supabase, set `force_password_reset_at` to a past date
- [ ] Log in as that user — should redirect to `/reset-password?forced=true`
- [ ] Complete the reset — should redirect to the role dashboard
