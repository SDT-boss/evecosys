import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/Card'
import { UsersClient } from '@/components/manager/UsersClient'
import type { AppUser } from '@/types'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: users } = await supabase.from('users').select('*').order('created_at', { ascending: false })
  const uList = (users ?? []) as AppUser[]

  return (
    <div className="fade-in">
      <PageHeader
        title="User Management"
        subtitle={`${uList.length} registered users · Managers, board members, and drivers`}
      />
      <UsersClient initialUsers={uList} />
    </div>
  )
}
