#!/usr/bin/env node
// supabase/seed-users.mjs
// Creates local dev auth users via GoTrue admin API.
// Run automatically by: make db-reset (after supabase db reset completes)
// Requires: local Supabase running (make db-start) + .env.local with correct JWT keys

import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(process.cwd(), '.env.local')
let env = {}
try {
  env = Object.fromEntries(
    readFileSync(envPath, 'utf8')
      .split('\n')
      .filter(l => l && !l.startsWith('#') && l.includes('='))
      .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
  )
} catch {
  console.error('Could not read .env.local — run make db-start and fill in keys first')
  process.exit(1)
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY missing from .env.local')
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'apikey': SERVICE_ROLE_KEY,
}

async function lookupByEmail(email) {
  // Query the DB directly — the GoTrue admin list API does not reliably filter by email.
  const { execSync } = await import('child_process')
  const safe = email.replace(/'/g, "''")
  try {
    const out = execSync(
      `npx supabase db query "SELECT id FROM auth.users WHERE email = '${safe}'" --local`,
      { stdio: ['pipe', 'pipe', 'pipe'] }
    ).toString()
    const match = out.match(/"id":\s*\[([^\]]+)\]/)
    if (!match) return null
    // Reconstruct UUID from byte array
    const bytes = match[1].split(',').map(Number)
    const hex = bytes.map(b => b.toString(16).padStart(2, '0')).join('')
    const id = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
    return { id }
  } catch {
    return null
  }
}

async function deleteStaleRow(email) {
  // Removes a direct-SQL-inserted auth.users row that GoTrue doesn't recognise.
  // Uses `npx supabase db query --local` (one statement at a time — it rejects multi-statement queries).
  const { execSync } = await import('child_process')
  const safeEmail = email.replace(/'/g, "''")
  try {
    execSync(`npx supabase db query "DELETE FROM auth.users WHERE email = '${safeEmail}'" --local`, { stdio: 'pipe' })
    execSync(`npx supabase db query "DELETE FROM public.users WHERE email = '${safeEmail}'" --local`, { stdio: 'pipe' })
    console.log(`  [cleanup] removed stale auth.users row for ${email}`)
  } catch {
    console.log(`  [warn] could not remove stale row automatically`)
    console.log(`  Run manually then retry:`)
    console.log(`    make db-reset`)
  }
}

async function upsertUser({ id, email, password, user_metadata }) {
  // Check if GoTrue already knows about this user
  const existing = await lookupByEmail(email)
  if (existing) {
    const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ password, email_confirm: true }),
    })
    if (!updateRes.ok) {
      const d = await updateRes.json()
      throw new Error(`Failed to update ${email}: ${d.msg || d.message || JSON.stringify(d)}`)
    }
    console.log(`  [ok] updated password for ${email}`)
    return
  }

  // Not known to GoTrue — attempt creation
  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ id, email, password, email_confirm: true, user_metadata }),
  })
  const createData = await createRes.json()

  if (createRes.ok) {
    console.log(`  [ok] created ${email}`)
    return
  }

  const msg = createData.msg || createData.message || createData.error_description || JSON.stringify(createData)

  // Stale direct-SQL row blocking GoTrue — delete it and retry once
  if (msg.includes('duplicate key') || msg.includes('already exists')) {
    await deleteStaleRow(email)

    const retryRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id, email, password, email_confirm: true, user_metadata }),
    })
    const retryData = await retryRes.json()
    if (!retryRes.ok) {
      const retryMsg = retryData.msg || retryData.message || JSON.stringify(retryData)
      throw new Error(`Failed to create ${email} after cleanup: ${retryMsg}`)
    }
    console.log(`  [ok] created ${email}`)
    return
  }

  throw new Error(`Failed to create ${email}: ${msg}`)
}

async function upsertPublicUser({ email, full_name, role }) {
  // Ensures public.users row exists with correct role, resolving the real auth
  // user ID from auth.users by email (safe when the user was created with a
  // different UUID in a previous session).
  const { execSync } = await import('child_process')
  const safeEmail    = email.replace(/'/g, "''")
  const safeName     = full_name.replace(/'/g, "''")
  const q = [
    `INSERT INTO public.users (id, email, full_name, role)`,
    `SELECT id, '${safeEmail}', '${safeName}', '${role}' FROM auth.users WHERE email = '${safeEmail}'`,
    `ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, full_name = EXCLUDED.full_name`,
  ].join(' ')
  try {
    execSync(`npx supabase db query "${q}" --local`, { stdio: 'pipe' })
    console.log(`  [ok] public.users row ensured for ${email}`)
  } catch (e) {
    console.warn(`  [warn] could not upsert public.users for ${email}:`, e.message?.split('\n')[0])
  }
}

const SEED_USERS = [
  { id: 'a0000000-0000-0000-0000-000000000001', email: 'platform-admin@evecosys.local', full_name: 'Dev Platform Admin', role: 'platform_admin' },
  { id: 'a0000000-0000-0000-0000-000000000002', email: 'board@evecosys.local',          full_name: 'Dev Board Member',    role: 'board' },
  { id: 'a0000000-0000-0000-0000-000000000003', email: 'manager@evecosys.local',        full_name: 'Dev Fleet Manager',   role: 'manager' },
  { id: 'a0000000-0000-0000-0000-000000000004', email: 'driver@evecosys.local',         full_name: 'Dev Driver',          role: 'driver' },
]

console.log('Seeding auth users...')

for (const u of SEED_USERS) {
  await upsertUser({ ...u, password: 'DevPassword123!', user_metadata: { role: u.role, full_name: u.full_name } })
  await upsertPublicUser({ email: u.email, full_name: u.full_name, role: u.role })
}

console.log('\nDev credentials (all use password: DevPassword123!)')
for (const u of SEED_USERS) console.log(`  ${u.role.padEnd(14)} ${u.email}`)
