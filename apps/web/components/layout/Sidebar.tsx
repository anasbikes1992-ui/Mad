'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, Tags, ArrowLeftRight,
  PackagePlus, ClipboardList, BarChart2, Settings,
  MapPin, Users, TrendingDown, ChevronRight
} from 'lucide-react'
import { cn } from '@madeenas/ui'

const NAV = [
  {
    label: 'Overview',
    items: [
      { href: '/',           label: 'Dashboard',   icon: LayoutDashboard },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { href: '/categories', label: 'Categories',  icon: Tags },
      { href: '/products',   label: 'Products',    icon: Package },
    ],
  },
  {
    label: 'Stock Operations',
    items: [
      { href: '/stock-in',     label: 'Stock In',     icon: PackagePlus },
      { href: '/transfers',    label: 'Transfers',    icon: ArrowLeftRight },
      { href: '/adjustments',  label: 'Adjustments',  icon: ClipboardList },
    ],
  },
  {
    label: 'Reports',
    items: [
      { href: '/stock/snapshot',   label: 'Stock Snapshot', icon: BarChart2 },
      { href: '/stock/ledger',     label: 'Ledger',         icon: ClipboardList },
      { href: '/stock/valuation',  label: 'Valuation',      icon: TrendingDown },
      { href: '/stock/low-alerts', label: 'Low Alerts',     icon: TrendingDown },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/locations', label: 'Locations', icon: MapPin },
      { href: '/users',     label: 'Users',     icon: Users },
      { href: '/settings',  label: 'Settings',  icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-card border-r border-border shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M2 8h12M2 12h8" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="13" cy="12" r="2" fill="#C9A84C"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-foreground leading-none">Madeenas</p>
          <p className="text-xs text-muted-foreground mt-0.5">Stock</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {NAV.map((section) => (
          <div key={section.label} className="mb-5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-1">
              {section.label}
            </p>
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = href === '/'
                ? pathname === '/'
                : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors group',
                    active
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  )}
                >
                  <Icon size={15} className={cn(active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                  {label}
                  {active && <ChevronRight size={12} className="ml-auto text-primary" />}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom user area */}
      <div className="border-t border-border p-4">
        <p className="text-[10px] text-muted-foreground text-center">
          Madeenas Textiles · LKR
        </p>
      </div>
    </aside>
  )
}
