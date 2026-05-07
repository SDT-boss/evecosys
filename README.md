# EVEcosys Fleet Management System

A role-based EV fleet management platform built with Next.js 14, Supabase, and Tailwind CSS v3.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database & Auth:** Supabase (Postgres + Auth + RLS)
- **Styling:** Tailwind CSS v3
- **Deployment:** Vercel

---

## Roles

| Role | Access |
|---|---|
| Manager | Full access — create users, manage vehicles, charging stations, alerts |
| Board | Read-only access to all data |
| Driver | Own vehicle, own trips, own alerts only |

> No self-registration. All accounts are created by a Manager.

---

## Environment Variables

Create a `.env.local` file at the project root with the following:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

> ⚠️ Never expose `SUPABASE_SERVICE_ROLE_KEY` on the client. It must never be prefixed with `NEXT_PUBLIC_`.

---

## Local Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase project (cloud or local CLI)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Fill in your Supabase credentials in .env.local

# 4. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Vercel Deployment

### Step 1: Import Repository
1. Go to [vercel.com](https://vercel.com) and log in
2. Click **Add New → Project**
3. Select your GitHub repository
4. Click **Import**

### Step 2: Configure Environment Variables
In the Vercel project settings, add the following environment variables:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |

> Set all three for **Production**, **Preview**, and **Development** environments.

### Step 3: Deploy
Click **Deploy**. Vercel will build and deploy automatically.

Your app will be live at `https://your-project-name.vercel.app`.

### Step 4: Update Supabase Auth Redirect URLs
1. Go to your Supabase project → **Authentication → URL Configuration**
2. Set **Site URL** to: `https://your-project-name.vercel.app`
3. Add the following to **Redirect URLs**:
   - `https://your-project-name.vercel.app/**`
   - `http://localhost:3000/**` (for local dev)
4. Save changes

---

## Database Schema

7 tables with Row Level Security (RLS) enabled on all:

| Table | Description |
|---|---|
| `users` | User profiles and roles |
| `vehicles` | EV fleet vehicles |
| `drivers` | Driver profiles linked to vehicles |
| `trips` | Trip records per vehicle/driver |
| `alerts` | System and vehicle alerts |
| `charging_stations` | Charging station registry |
| `user_preferences` | Per-user settings (theme, etc.) |

**Helper functions:**
- `get_my_role()` — returns the authenticated user's role
- `get_my_vehicle_id()` — returns the authenticated driver's assigned vehicle ID

---

## Authentication

- **No self-registration** — all accounts created by a Manager
- **Forced password reset** — every 30 days, users are redirected to `/reset-password?forced=true`
- **Forgot password** — user-initiated flow via `/forgot-password`

---

## Smoke Test Checklist (Post-Deployment)

Run these tests on the production URL after every deployment:

### Manager
- [ ] Log in as Manager
- [ ] Create a new user (Driver role)
- [ ] Assign a vehicle to the driver
- [ ] View all trips
- [ ] View all alerts
- [ ] Log out

### Board
- [ ] Log in as Board
- [ ] View dashboard — data visible
- [ ] Attempt to edit any record — blocked
- [ ] Log out

### Driver
- [ ] Log in as Driver
- [ ] View own vehicle only
- [ ] Attempt to access another driver's trip URL directly — redirected
- [ ] Log out

### Forced Password Reset
- [ ] Create a new account as Manager
- [ ] Manually set `force_password_reset_at` to a past date in Supabase
- [ ] Log in as that user — should redirect to `/reset-password?forced=true`
- [ ] Complete reset — should redirect to role dashboard

---

## Security

- Security headers configured in `next.config.ts` (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- RLS enforced on all Supabase tables
- Middleware (`middleware.ts`) enforces role-based route protection on every request
- Service role key is server-side only

---

## Project Structure

````
/
├── app/                  # Next.js App Router pages
│   ├── login/
│   ├── forgot-password/
│   ├── reset-password/
│   ├── manager/
│   ├── board/
│   └── driver/
├── components/           # Shared UI components
├── lib/                  # Supabase clients, utilities
├── middleware.ts          # Auth + role-based route protection
├── next.config.ts         # Security headers
└── README.md
````
