import {
  Document, Page, Text, View, StyleSheet, Font
} from '@react-pdf/renderer'
import { format } from 'date-fns'
import type { Transfer, TransferItem, Location } from '@madeenas/db'

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2' },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiA.woff2', fontWeight: 700 },
  ],
})

const S = StyleSheet.create({
  page:        { padding: 36, fontFamily: 'Inter', fontSize: 9, color: '#1a1a2e' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  logo:        { fontSize: 16, fontWeight: 700, color: '#0E192D' },
  subtitle:    { fontSize: 9, color: '#64748b', marginTop: 2 },
  title:       { fontSize: 13, fontWeight: 700, color: '#0E192D', marginBottom: 2 },
  docId:       { fontSize: 8, color: '#94a3b8', fontFamily: 'Courier' },
  section:     { marginBottom: 14 },
  sectionHead: { fontSize: 8, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  row:         { flexDirection: 'row', gap: 8, marginBottom: 4 },
  label:       { fontSize: 8, color: '#64748b', width: 80 },
  value:       { fontSize: 8, color: '#0f172a', flex: 1 },
  table:       { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  thead:       { backgroundColor: '#0E192D', flexDirection: 'row', padding: '6 8' },
  th:          { color: '#C9A84C', fontWeight: 700, fontSize: 7.5, flex: 1 },
  tbody:       { },
  tr:          { flexDirection: 'row', padding: '5 8', borderBottomWidth: 1, borderColor: '#f1f5f9' },
  trAlt:       { backgroundColor: '#f8fafc' },
  td:          { fontSize: 8, flex: 1, color: '#0f172a' },
  tdCode:      { fontFamily: 'Courier', fontSize: 7.5 },
  status:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, fontSize: 8, fontWeight: 700, alignSelf: 'flex-start' },
  footer:      { marginTop: 24, paddingTop: 12, borderTopWidth: 1, borderColor: '#e2e8f0' },
  sigRow:      { flexDirection: 'row', gap: 40, marginTop: 16 },
  sigBox:      { flex: 1 },
  sigLine:     { height: 1, backgroundColor: '#cbd5e1', marginBottom: 4 },
  sigLabel:    { fontSize: 7.5, color: '#94a3b8' },
  statusBadge: { fontSize: 8, fontWeight: 700, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 3 },
})

const STATUS_COLORS: Record<string, string> = {
  DRAFT:            '#94a3b8',
  PENDING_APPROVAL: '#f59e0b',
  APPROVED:         '#22c55e',
  IN_TRANSIT:       '#3b82f6',
  RECEIVED:         '#10b981',
  REJECTED:         '#ef4444',
  CANCELLED:        '#64748b',
}

interface Props {
  transfer: Transfer & {
    from_location: Location
    to_location:   Location
    transfer_items: Array<TransferItem & {
      variant: { item_code: string; name: string; color: string | null; unit: string; cost_price: number }
    }>
    requested_by_user?: { full_name: string }
    approved_by_user?:  { full_name: string }
    dispatched_by_user?: { full_name: string }
    received_by_user?:  { full_name: string }
  }
}

export function TransferDocument({ transfer }: Props) {
  const statusColor = STATUS_COLORS[transfer.status] ?? '#94a3b8'

  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* Header */}
        <View style={S.header}>
          <View>
            <Text style={S.logo}>Madeenas Textiles</Text>
            <Text style={S.subtitle}>Stock Transfer Document</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={S.title}>TRANSFER</Text>
            <Text style={S.docId}>{transfer.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={{ ...S.statusBadge, color: statusColor, borderWidth: 1, borderColor: statusColor, marginTop: 4 }}>
              {transfer.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {/* Locations */}
        <View style={S.section}>
          <Text style={S.sectionHead}>Transfer Route</Text>
          <View style={S.row}>
            <View style={{ flex: 1, backgroundColor: '#f0f9ff', padding: 8, borderRadius: 4 }}>
              <Text style={{ fontSize: 7, color: '#64748b', marginBottom: 2 }}>FROM</Text>
              <Text style={{ fontSize: 9, fontWeight: 700 }}>{transfer.from_location.name}</Text>
              <Text style={{ fontSize: 8, color: '#64748b' }}>{transfer.from_location.type}</Text>
              {transfer.from_location.address && <Text style={{ fontSize: 7.5, color: '#94a3b8', marginTop: 2 }}>{transfer.from_location.address}</Text>}
            </View>
            <View style={{ alignSelf: 'center', paddingHorizontal: 8 }}>
              <Text style={{ fontSize: 14, color: '#C9A84C' }}>→</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#f0fdf4', padding: 8, borderRadius: 4 }}>
              <Text style={{ fontSize: 7, color: '#64748b', marginBottom: 2 }}>TO</Text>
              <Text style={{ fontSize: 9, fontWeight: 700 }}>{transfer.to_location.name}</Text>
              <Text style={{ fontSize: 8, color: '#64748b' }}>{transfer.to_location.type}</Text>
              {transfer.to_location.address && <Text style={{ fontSize: 7.5, color: '#94a3b8', marginTop: 2 }}>{transfer.to_location.address}</Text>}
            </View>
          </View>
        </View>

        {/* Details */}
        <View style={S.section}>
          <Text style={S.sectionHead}>Details</Text>
          {[
            ['Requested by', transfer.requested_by_user?.full_name ?? '—'],
            ['Requested at', format(new Date(transfer.requested_at), 'dd MMM yyyy, HH:mm')],
            transfer.approved_by_user ? ['Approved by', `${transfer.approved_by_user.full_name} · ${transfer.approved_at ? format(new Date(transfer.approved_at), 'dd MMM yyyy') : ''}`] : null,
            transfer.dispatched_at ? ['Dispatched at', format(new Date(transfer.dispatched_at), 'dd MMM yyyy, HH:mm')] : null,
            transfer.received_at   ? ['Received at',   format(new Date(transfer.received_at), 'dd MMM yyyy, HH:mm')] : null,
            transfer.notes ? ['Notes', transfer.notes] : null,
          ].filter(Boolean).map(([label, value]) => (
            <View key={label} style={S.row}>
              <Text style={S.label}>{label}</Text>
              <Text style={S.value}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Items table */}
        <View style={S.section}>
          <Text style={S.sectionHead}>Items</Text>
          <View style={S.table}>
            <View style={S.thead}>
              {['Item Code','Name','Color','Requested','Dispatched','Received'].map((h) => (
                <Text key={h} style={S.th}>{h}</Text>
              ))}
            </View>
            <View style={S.tbody}>
              {transfer.transfer_items.map((item, i) => (
                <View key={item.id} style={[S.tr, i % 2 === 1 ? S.trAlt : {}]}>
                  <Text style={[S.td, S.tdCode]}>{item.variant.item_code}</Text>
                  <Text style={S.td}>{item.variant.name}</Text>
                  <Text style={S.td}>{item.variant.color ?? '—'}</Text>
                  <Text style={S.td}>{item.quantity_requested} {item.unit}</Text>
                  <Text style={S.td}>{item.quantity_dispatched != null ? `${item.quantity_dispatched} ${item.unit}` : '—'}</Text>
                  <Text style={S.td}>{item.quantity_received  != null ? `${item.quantity_received}  ${item.unit}` : '—'}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Signatures */}
        <View style={S.footer}>
          <View style={S.sigRow}>
            <View style={S.sigBox}>
              <View style={S.sigLine} />
              <Text style={S.sigLabel}>Dispatched by (Store Keeper — Source)</Text>
            </View>
            <View style={S.sigBox}>
              <View style={S.sigLine} />
              <Text style={S.sigLabel}>Received by (Store Keeper — Destination)</Text>
            </View>
            <View style={S.sigBox}>
              <View style={S.sigLine} />
              <Text style={S.sigLabel}>Authorised by (Manager)</Text>
            </View>
          </View>
          <Text style={{ fontSize: 7, color: '#94a3b8', marginTop: 20, textAlign: 'center' }}>
            Generated by Madeenas Stock · {format(new Date(), 'dd MMM yyyy HH:mm')} · Madeenas Textiles, Sri Lanka
          </Text>
        </View>
      </Page>
    </Document>
  )
}
