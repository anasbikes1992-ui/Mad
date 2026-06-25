import { cn } from '@madeenas/ui'

const STATUS_CONFIG = {
  DRAFT:            { label: 'Draft',           className: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  PENDING_APPROVAL: { label: 'Pending Approval', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  APPROVED:         { label: 'Approved',         className: 'bg-green-500/15 text-green-400 border-green-500/30' },
  IN_TRANSIT:       { label: 'In Transit',       className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  RECEIVED:         { label: 'Received',         className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  REJECTED:         { label: 'Rejected',         className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  CANCELLED:        { label: 'Cancelled',        className: 'bg-slate-600/15 text-slate-500 border-slate-600/30' },
} as const

type Status = keyof typeof STATUS_CONFIG

interface Props {
  status:    string
  className?: string
}

export function TransferStatusBadge({ status, className }: Props) {
  const config = STATUS_CONFIG[status as Status] ?? { label: status, className: 'bg-muted text-muted-foreground border-border' }
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border',
      config.className,
      className
    )}>
      {config.label}
    </span>
  )
}
