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
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, { headers })
  if (!res.ok) return null
  const data = await res.json()
  return data?.users?.[0] ?? null
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

console.log('Seeding auth users...')

await upsertUser({
  id: 'a0000000-0000-0000-0000-000000000001',
  email: 'platform-admin@evecosys.local',
  password: 'DevPassword123!',
  user_metadata: { role: 'platform_admin', full_name: 'Dev Platform Admin' },
})

console.log('Done. Login: platform-admin@evecosys.local / DevPassword123!')
