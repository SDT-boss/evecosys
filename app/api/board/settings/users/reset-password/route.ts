import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Stub: force password reset endpoint — full implementation deferred (BSET-02 scope)
// The auth_troubleshooting button in MemberTable wires to this route.
// Returns 200 { ok: true } without performing a real operation until implemented.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'board') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _body = await req.json()

  // TODO: implement actual password reset email via admin.auth.admin.generateLink('recovery', { email })
  return NextResponse.json({ ok: true })
}
