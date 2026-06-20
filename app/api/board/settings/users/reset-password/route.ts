import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Stub: force password reset endpoint — full implementation deferred (BSET-02 scope)
// The auth_troubleshooting button in MemberTable wires to this route.
// Returns 501 Not Implemented so the client shows an error state rather than false success.
export async function POST(req: NextRequest) {
  void req
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'board') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json({ error: 'Password reset not yet implemented' }, { status: 501 })
}
