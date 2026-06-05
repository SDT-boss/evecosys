'use client'

import { useState } from 'react'
import { Plus, X, Loader2, Eye, EyeOff } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { AppUser } from '@/types'

export function UsersClient({ initialUsers }: { initialUsers: AppUser[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'driver' as AppUser['role'] })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create user'); return }
      setUsers(prev => [data.user, ...prev])
      setForm({ full_name: '', email: '', password: '', role: 'driver' })
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const roleVariant = (r: string): 'teal' | 'green' | 'gray' => r === 'manager' ? 'teal' : r === 'board' ? 'green' : 'gray'
  const roleLabel = (r: string) => r === 'manager' ? 'Fleet Manager' : r === 'board' ? 'Board Member' : 'Driver'

  return (
    <div>
      {/* Header action */}
      <div className="flex justify-end mb-5">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
          style={{ background: showForm ? '#5a9e2f' : '#7cc242', border: 'none' }}
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl p-6 mb-5 fade-in" style={{ background: 'var(--surface)', border: '1px solid #7cc242' }}>
          <div className="flex items-center gap-2 mb-5">
            <div style={{ width: 3, height: 12, background: '#7cc242', borderRadius: 2 }} />
            <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#1a7080', letterSpacing: '0.6px' }}>New User</span>
          </div>
          {error && (
            <div className="rounded-lg px-4 py-3 mb-4 text-sm font-medium" style={{ background: '#fdeaea', color: '#8a1010', border: '1px solid #f5c0c0' }}>
              {error}
            </div>
          )}
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {[
                { label: 'Full Name', key: 'full_name', type: 'text', placeholder: 'John Doe' },
                { label: 'Email Address', key: 'email', type: 'email', placeholder: 'john@evecosys.com' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text3)', letterSpacing: '0.5px' }}>{f.label}</label>
                  <input
                    type={f.type}
                    required
                    placeholder={f.placeholder}
                    value={(form as Record<string, string>)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    onFocus={e => (e.target.style.borderColor = '#7cc242')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text3)', letterSpacing: '0.5px' }}>Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    className="w-full rounded-lg px-4 py-2.5 pr-10 text-sm outline-none"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    onFocus={e => (e.target.style.borderColor = '#7cc242')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} tabIndex={-1}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text3)', letterSpacing: '0.5px' }}>Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value as AppUser['role'] }))}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <option value="driver">Driver</option>
                  <option value="manager">Fleet Manager</option>
                  <option value="board">Board Member</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
                Cancel
              </button>
              <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#7cc242', opacity: loading ? 0.8 : 1 }}>
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      <div className="rounded-xl overflow-hidden theme-transition" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {users.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">👥</div>
            <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>No users found</p>
            <p className="text-sm" style={{ color: 'var(--text3)' }}>Click &quot;Add User&quot; to create the first account.</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--surface2)' }}>
                {['User', 'Email', 'Role', 'Joined'].map(h => (
                  <th key={h} className="text-left px-4 py-3 uppercase tracking-wide font-bold" style={{ color: 'var(--text3)', fontSize: 10, letterSpacing: '0.4px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: u.role === 'manager' ? '#1a7080' : u.role === 'board' ? '#7cc242' : '#5a9e2f' }}>
                        {u.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                      </div>
                      <span className="font-semibold" style={{ color: 'var(--text)' }}>{u.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text2)' }}>{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={roleVariant(u.role)}>{roleLabel(u.role)}</Badge>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text3)' }}>
                    {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
