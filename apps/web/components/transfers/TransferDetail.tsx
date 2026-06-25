'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowRight, Download, CheckCircle, XCircle, Send, PackageCheck, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { TransferStatusBadge } from './TransferStatusBadge'

type Transfer = {
  id: string; status: string; approval_required: boolean
  requested_at: string; approved_at: string | null; dispatched_at: string | null; received_at: string | null
  notes: string | null; approval_notes: string | null
  from_location: { id: string; name: string; type: string; address: string | null } | null
  to_location:   { id: string; name: string; type: string; address: string | null } | null
  requested_by_user:  { full_name: string; email: string } | null
  approved_by_user:   { full_name: string } | null
  dispatched_by_user: { full_name: string } | null
  received_by_user:   { full_name: string } | null
  transfer_items: Array<{
    id: string; quantity_requested: number; quantity_dispatched: number | null
    quantity_received: number | null; unit: string; variance_notes: string | null
    variant: { id: string; item_code: string; name: string; color: string | null; color_hex: string | null; unit: string; cost_price: number } | null
  }>
}

interface Props {
  transfer:        Transfer
  userRole:        string
  userLocationIds: string[]
}

const TIMELINE = [
  { status: 'DRAFT',            label: 'Draft Created',  key: 'requested_at' },
  { status: 'PENDING_APPROVAL', label: 'Submitted',      key: 'requested_at' },
  { status: 'APPROVED',         label: 'Approved',       key: 'approved_at' },
  { status: 'IN_TRANSIT',       label: 'Dispatched',     key: 'dispatched_at' },
  { status: 'RECEIVED',         label: 'Received',       key: 'received_at' },
] as const

const STATUS_ORDER = ['DRAFT','PENDING_APPROVAL','APPROVED','IN_TRANSIT','RECEIVED']

export function TransferDetail({ transfer, userRole, userLocationIds }: Props) {
  const router = useRouter()
  const [approvalNotes, setApprovalNotes] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [dispatchQtys, setDispatchQtys]   = useState<Record<string, number>>(() =>
    Object.fromEntries(transfer.transfer_items.map((i) => [i.id, i.quantity_dispatched ?? i.quantity_requested]))
  )
  const [receiveQtys, setReceiveQtys]     = useState<Record<string, number>>(() =>
    Object.fromEntries(transfer.transfer_items.map((i) => [i.id, i.quantity_received ?? i.quantity_dispatched ?? 0]))
  )
  const [loading, setLoading] = useState(false)

  const isManagerAbove = ['ADMIN','MANAGER'].includes(userRole)
  const isAtSource      = transfer.from_location && userLocationIds.includes(transfer.from_location.id)
  const isAtDest        = transfer.to_location   && userLocationIds.includes(transfer.to_location.id)
  const currentIdx      = STATUS_ORDER.indexOf(transfer.status)

  async function callAction(path: string, body?: object) {
    setLoading(true)
    try {
      const res = await fetch(`/api/transfers/${transfer.id}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Action failed')
      toast.success('Done')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  const totalValue = transfer.transfer_items.reduce(
    (s, i) => s + i.quantity_requested * (i.variant?.cost_price ?? 0), 0
  )

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Main content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Route header */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 p-3 bg-secondary rounded-lg">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">From</p>
              <p className="text-sm font-semibold text-foreground">{transfer.from_location?.name}</p>
              <p className="text-xs text-muted-foreground">{transfer.from_location?.type}</p>
            </div>
            <ArrowRight className="text-primary shrink-0" size={20} />
            <div className="flex-1 p-3 bg-secondary rounded-lg">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">To</p>
              <p className="text-sm font-semibold text-foreground">{transfer.to_location?.name}</p>
              <p className="text-xs text-muted-foreground">{transfer.to_location?.type}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><span className="text-muted-foreground">Requested by: </span><span className="text-foreground">{transfer.requested_by_user?.full_name}</span></div>
            <div><span className="text-muted-foreground">Requested at: </span><span className="text-foreground">{format(new Date(transfer.requested_at), 'dd MMM yyyy, HH:mm')}</span></div>
            {transfer.approved_by_user && <div><span className="text-muted-foreground">Approved by: </span><span className="text-foreground">{transfer.approved_by_user.full_name}</span></div>}
            {transfer.approval_notes && <div className="col-span-2"><span className="text-muted-foreground">Approval notes: </span><span className="text-foreground">{transfer.approval_notes}</span></div>}
            {transfer.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes: </span><span className="text-foreground">{transfer.notes}</span></div>}
          </div>
        </div>

        {/* Items table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Items</h2>
            <span className="text-xs text-muted-foreground font-mono">LKR {totalValue.toLocaleString()}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  {['Item Code','Name','Color','Requested',
                    transfer.status === 'IN_TRANSIT' || transfer.status === 'RECEIVED' ? 'Dispatched' : '',
                    transfer.status === 'RECEIVED' ? 'Received' : '',
                    'Unit'
                  ].filter(Boolean).map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transfer.transfer_items.map((item, i) => (
                  <tr key={item.id} className={`border-b border-border/50 ${i % 2 === 1 ? 'bg-secondary/20' : ''}`}>
                    <td className="px-4 py-2.5 font-mono text-xs text-primary">{item.variant?.item_code ?? '—'}</td>
                    <td className="px-4 py-2.5 text-foreground">{item.variant?.name}</td>
                    <td className="px-4 py-2.5">
                      {item.variant?.color ? (
                        <span className="flex items-center gap-1.5">
                          {item.variant.color_hex && (
                            <span className="w-3 h-3 rounded-full border border-border inline-block" style={{ background: item.variant.color_hex }} />
                          )}
                          <span className="text-muted-foreground text-xs">{item.variant.color}</span>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-foreground">{item.quantity_requested}</td>
                    {(transfer.status === 'IN_TRANSIT' || transfer.status === 'RECEIVED') && (
                      <td className="px-4 py-2.5 font-mono text-foreground">{item.quantity_dispatched ?? '—'}</td>
                    )}
                    {transfer.status === 'RECEIVED' && (
                      <td className="px-4 py-2.5">
                        <span className={`font-mono ${
                          item.quantity_received !== item.quantity_dispatched ? 'text-amber-400' : 'text-foreground'
                        }`}>{item.quantity_received ?? '—'}</span>
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Timeline</h2>
          <div className="flex items-center gap-0">
            {TIMELINE.map(({ status, label }, idx) => {
              const done = STATUS_ORDER.indexOf(status) <= currentIdx
              const current = status === transfer.status
              return (
                <div key={status} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                      done ? 'bg-primary border-primary text-primary-foreground' :
                      current ? 'bg-primary/20 border-primary text-primary' :
                      'bg-secondary border-border text-muted-foreground'
                    }`}>
                      {idx + 1}
                    </div>
                    <p className={`text-[9px] mt-1 text-center max-w-[60px] ${done ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p>
                  </div>
                  {idx < TIMELINE.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${
                      STATUS_ORDER.indexOf(TIMELINE[idx + 1]!.status) <= currentIdx ? 'bg-primary' : 'bg-border'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Action panel */}
      <div className="space-y-4">
        {/* Download PDF */}
        <a
          href={`/api/transfers/${transfer.id}/document`}
          target="_blank"
          className="flex items-center gap-2 w-full px-4 py-2.5 bg-secondary border border-border rounded-xl
            text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          <FileText size={14} />
          Download Transfer Document
        </a>

        {/* PENDING_APPROVAL — manager actions */}
        {transfer.status === 'PENDING_APPROVAL' && isManagerAbove && (
          <div className="bg-card border border-amber-500/30 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-amber-400">Awaiting Your Approval</h3>
            <textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Approval / rejection notes…"
              rows={2}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground
                placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <div className="flex gap-2">
              <button
                onClick={() => callAction('approve', { notes: approvalNotes })}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500/15 border border-green-500/30
                  text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/20 disabled:opacity-40 transition-colors"
              >
                <CheckCircle size={14} /> Approve
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-500/15 border border-red-500/30
                  text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20 disabled:opacity-40 transition-colors"
              >
                <XCircle size={14} /> Reject
              </button>
            </div>
          </div>
        )}

        {/* APPROVED — dispatch (source store keeper) */}
        {transfer.status === 'APPROVED' && (isManagerAbove || isAtSource) && (
          <div className="bg-card border border-blue-500/30 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-blue-400">Dispatch Stock</h3>
            <p className="text-xs text-muted-foreground">Enter actual quantities dispatched:</p>
            {transfer.transfer_items.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <span className="font-mono text-xs text-primary flex-1">{item.variant?.item_code}</span>
                <input
                  type="number"
                  min={0}
                  max={item.quantity_requested}
                  value={dispatchQtys[item.id] ?? item.quantity_requested}
                  onChange={(e) => setDispatchQtys((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))}
                  className="w-20 px-2 py-1 bg-input border border-border rounded text-sm text-foreground font-mono text-right
                    focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <span className="text-xs text-muted-foreground">{item.unit}</span>
              </div>
            ))}
            <button
              onClick={() => callAction('dispatch', {
                items: transfer.transfer_items.map((i) => ({
                  transfer_item_id:    i.id,
                  quantity_dispatched: dispatchQtys[i.id] ?? i.quantity_requested,
                })),
              })}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-blue-500/15 border border-blue-500/30
                text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/20 disabled:opacity-40 transition-colors"
            >
              <Send size={14} /> Mark as Dispatched
            </button>
          </div>
        )}

        {/* IN_TRANSIT — receive (destination store keeper) */}
        {transfer.status === 'IN_TRANSIT' && (isManagerAbove || isAtDest) && (
          <div className="bg-card border border-emerald-500/30 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-emerald-400">Receive Stock</h3>
            <p className="text-xs text-muted-foreground">Enter actual quantities received:</p>
            {transfer.transfer_items.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <span className="font-mono text-xs text-primary flex-1">{item.variant?.item_code}</span>
                <input
                  type="number"
                  min={0}
                  value={receiveQtys[item.id] ?? item.quantity_dispatched ?? 0}
                  onChange={(e) => setReceiveQtys((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))}
                  className="w-20 px-2 py-1 bg-input border border-border rounded text-sm text-foreground font-mono text-right
                    focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <span className="text-xs text-muted-foreground">/ {item.quantity_dispatched} {item.unit}</span>
              </div>
            ))}
            <button
              onClick={() => callAction('receive', {
                items: transfer.transfer_items.map((i) => ({
                  transfer_item_id:  i.id,
                  quantity_received: receiveQtys[i.id] ?? i.quantity_dispatched ?? 0,
                })),
              })}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500/15 border border-emerald-500/30
                text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
            >
              <PackageCheck size={14} /> Mark as Received
            </button>
          </div>
        )}

        {/* Cancel button */}
        {['DRAFT','PENDING_APPROVAL','APPROVED'].includes(transfer.status) && (isManagerAbove || isAtSource) && (
          <button
            onClick={() => { if (confirm('Cancel this transfer?')) callAction('cancel') }}
            disabled={loading}
            className="w-full py-2 text-xs text-muted-foreground hover:text-red-400 transition-colors"
          >
            Cancel transfer
          </button>
        )}
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-semibold text-foreground">Reject Transfer</h3>
            <textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Reason for rejection (required)…"
              rows={3}
              className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground
                placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 py-2 bg-secondary rounded-lg text-sm text-muted-foreground">
                Cancel
              </button>
              <button
                onClick={() => { setShowRejectModal(false); callAction('reject', { notes: approvalNotes }) }}
                disabled={!approvalNotes.trim()}
                className="flex-1 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium
                  hover:bg-red-500/30 disabled:opacity-40"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
