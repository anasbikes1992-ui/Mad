'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Mail, UserCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLES = ['ADMIN','MANAGER','STORE_KEEPER','VIEWER']

interface UserLocation { location_id: string; location: { name: string } | null }
interface User {
  id: string; full_name: string; email: string; role: string
  phone: string | null; is_active: boolean
  user_locations?: UserLocation[]
}
interface Location { id: string; name: string }
interface Props { users: User[]; locations: Location[] }

export function UsersManager({ users, locations }: Props) {
  const router = useRouter()
  const [showInvite,  setShowInvite]  = useState(false)
  const [showEdit,    setShowEdit]    = useState<User | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole,  setInviteRole]  = useState('STORE_KEEPER')
  const [inviteLocs,  setInviteLocs]  = useState<string[]>([])
  const [editRole,    setEditRole]    = useState('')
  const [editActive,  setEditActive]  = useState(true)
  const [editLocs,    setEditLocs]    = useState<string[]>([])
  const [saving,      setSaving]      = useState(false)

  function openEdit(u: User) {
    setShowEdit(u)
    setEditRole(u.role)
    setEditActive(u.is_active)
    setEditLocs(u.user_locations?.map((ul) => ul.location_id) ?? [])
  }

  async function handleInvite() {
    if (!inviteEmail) { toast.error('Enter email address'); return }
    setSaving(true)
    try {
      const res  = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole, location_ids: inviteLocs }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      toast.success(`Invitation sent to ${inviteEmail}`)
      setShowInvite(false)
      setInviteEmail('')
      setInviteLocs([])
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit() {
    if (!showEdit) return
    setSaving(true)
    try {
      const res  = await fetch(`/api/users/${showEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole, is_active: editActive, location_ids: editLocs }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      toast.success('User updated')
      setShowEdit(null)
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  function toggleLoc(id: string, arr: string[], setArr: (v: string[]) => void) {
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id])
  }

  const ROLE_COLORS: Record<string, string> = {
    ADMIN: 'bg-red-500/10 text-red-400 border-red-500/30',
    MANAGER: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    STORE_KEEPER: 'bg-green-500/10 text-green-400 border-green-500/30',
    VIEWER: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground
            rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} /> Invite User
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary border-b border-border">
            <tr>
              {['User','Role','Locations','Status',''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} className={`border-b border-border/50 ${i % 2 === 1 ? 'bg-secondary/20' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <UserCircle size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.full_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail size={10} />{u.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ROLE_COLORS[u.role] ?? ''}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {u.user_locations?.length
                    ? u.user_locations.slice(0, 3).map((ul) => ul.location?.name).join(', ')
                    : 'All locations'}
                  {(u.user_locations?.length ?? 0) > 3 && ` +${(u.user_locations?.length ?? 0) - 3}`}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${u.is_active ? 'text-green-400' : 'text-muted-foreground'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => openEdit(u)} className="text-muted-foreground hover:text-primary transition-colors">
                    <Edit2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-semibold text-foreground">Invite User</h3>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Email Address *</label>
              <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Role</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-2">Assign Locations</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {locations.map((l) => (
                  <label key={l.id} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input type="checkbox" checked={inviteLocs.includes(l.id)}
                      onChange={() => toggleLoc(l.id, inviteLocs, setInviteLocs)} className="rounded accent-primary" />
                    {l.name}
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Leave empty to allow all locations</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowInvite(false)} className="flex-1 py-2 bg-secondary rounded-lg text-sm text-muted-foreground">Cancel</button>
              <button onClick={handleInvite} disabled={saving} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-40">
                {saving ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-semibold text-foreground">Edit {showEdit.full_name}</h3>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Role</label>
              <select value={editRole} onChange={(e) => setEditRole(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-2">Locations</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {locations.map((l) => (
                  <label key={l.id} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input type="checkbox" checked={editLocs.includes(l.id)}
                      onChange={() => toggleLoc(l.id, editLocs, setEditLocs)} className="rounded accent-primary" />
                    {l.name}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} className="rounded accent-primary" />
              Active
            </label>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowEdit(null)} className="flex-1 py-2 bg-secondary rounded-lg text-sm text-muted-foreground">Cancel</button>
              <button onClick={handleEdit} disabled={saving} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-40">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
