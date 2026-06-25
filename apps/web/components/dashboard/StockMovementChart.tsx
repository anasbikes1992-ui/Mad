'use client'

import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { format, subDays, eachDayOfInterval } from 'date-fns'

interface DayData {
  date: string
  'Stock In': number
  'Transfer In': number
  'Transfer Out': number
}

export function StockMovementChart() {
  const [data, setData] = useState<DayData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const from = subDays(new Date(), 30).toISOString()

      const { data: ledger } = await supabase
        .from('stock_ledger')
        .select('movement_type, quantity, created_at')
        .gte('created_at', from)

      const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() })

      const chartData: DayData[] = days.map((day) => {
        const dayStr = format(day, 'yyyy-MM-dd')
        const dayEntries = (ledger ?? []).filter((e) => e.created_at.startsWith(dayStr))
        return {
          date: format(day, 'dd MMM'),
          'Stock In':     dayEntries.filter((e) => e.movement_type === 'STOCK_IN').reduce((s, e) => s + e.quantity, 0),
          'Transfer In':  dayEntries.filter((e) => e.movement_type === 'TRANSFER_IN').reduce((s, e) => s + e.quantity, 0),
          'Transfer Out': dayEntries.filter((e) => e.movement_type === 'TRANSFER_OUT').reduce((s, e) => s + e.quantity, 0),
        }
      })

      setData(chartData)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="h-48 skeleton" />
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
        <defs>
          <linearGradient id="stockIn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#C9A84C" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="transIn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#60A5FA" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="transOut" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F87171" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#F87171" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,51,90,0.8)" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} interval={4} />
        <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: 'rgb(18 32 58)', border: '1px solid rgb(30 51 90)', borderRadius: '8px', fontSize: '12px' }}
          labelStyle={{ color: '#f8fafc', fontWeight: 600 }}
          itemStyle={{ color: '#94A3B8' }}
        />
        <Legend wrapperStyle={{ fontSize: '11px', color: '#94A3B8' }} />
        <Area type="monotone" dataKey="Stock In"    stroke="#C9A84C" fill="url(#stockIn)" strokeWidth={2} />
        <Area type="monotone" dataKey="Transfer In" stroke="#60A5FA" fill="url(#transIn)" strokeWidth={2} />
        <Area type="monotone" dataKey="Transfer Out" stroke="#F87171" fill="url(#transOut)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
