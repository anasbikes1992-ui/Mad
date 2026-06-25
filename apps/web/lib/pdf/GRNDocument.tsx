import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer'
import { format } from 'date-fns'

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.woff2', fontWeight: 700 },
  ],
})

const NAVY  = '#0E192D'
const GOLD  = '#C9A84C'
const LIGHT = '#F5F6FA'
const MUTED = '#8A94A6'

const s = StyleSheet.create({
  page:      { fontFamily: 'Inter', fontSize: 9, color: NAVY, padding: 36 },
  header:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  logo:      { fontSize: 18, fontWeight: 700, color: NAVY },
  logoGold:  { color: GOLD },
  metaRight: { textAlign: 'right' },
  metaLabel: { color: MUTED, fontSize: 8, marginBottom: 2 },
  metaValue: { fontWeight: 700, fontSize: 10 },
  badge:     { backgroundColor: NAVY, color: '#fff', fontSize: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-end', marginTop: 4 },
  divider:   { borderBottomWidth: 1, borderColor: GOLD, marginBottom: 16 },
  section:   { marginBottom: 16 },
  sectionTitle: { fontSize: 8, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  infoGrid:  { flexDirection: 'row', gap: 24 },
  infoBlock: { flex: 1 },
  infoLabel: { fontSize: 8, color: MUTED, marginBottom: 2 },
  infoValue: { fontSize: 9, fontWeight: 700 },
  table:     { marginBottom: 16 },
  tableHead: { flexDirection: 'row', backgroundColor: NAVY, paddingVertical: 5, paddingHorizontal: 6 },
  tableHeadTxt: { color: '#fff', fontSize: 8, fontWeight: 700 },
  tableRow:  { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 0.5, borderColor: '#E2E8F0' },
  tableRowAlt: { backgroundColor: LIGHT },
  cellCode:  { width: 80 },
  cellName:  { flex: 1 },
  cellColor: { width: 60 },
  cellQty:   { width: 60, textAlign: 'right' },
  cellUnit:  { width: 40 },
  cellPrice: { width: 70, textAlign: 'right' },
  cellTotal: { width: 80, textAlign: 'right' },
  totalRow:  { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, paddingHorizontal: 6 },
  totalLabel:{ fontSize: 9, fontWeight: 700, color: MUTED, marginRight: 16 },
  totalValue:{ fontSize: 10, fontWeight: 700, color: GOLD, width: 80, textAlign: 'right' },
  sigGrid:   { flexDirection: 'row', gap: 32, marginTop: 40 },
  sigBlock:  { flex: 1 },
  sigLine:   { borderBottomWidth: 1, borderColor: NAVY, marginBottom: 4 },
  sigLabel:  { fontSize: 8, color: MUTED },
  footer:    { position: 'absolute', bottom: 20, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between' },
  footerTxt: { fontSize: 7, color: MUTED },
})

interface GRNItem {
  variant_id: string
  item_code: string
  variant_name: string
  color: string | null
  quantity: number
  unit: string
  cost_price: number
}

interface GRNDocumentProps {
  id:            string
  reference_no:  string | null
  supplier_name: string
  received_date: string
  location_name: string
  notes:         string | null
  items:         GRNItem[]
  created_by:    string
  confirmed_by:  string | null
}

export function GRNDocument(props: GRNDocumentProps) {
  const totalValue = props.items.reduce((s, i) => s + i.quantity * i.cost_price, 0)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.logo}>
              Madeenas<Text style={s.logoGold}>.</Text>
            </Text>
            <Text style={{ fontSize: 8, color: MUTED, marginTop: 2 }}>Madeenas Textiles Pvt Ltd</Text>
            <Text style={{ fontSize: 8, color: MUTED }}>Pettah, Colombo 11, Sri Lanka</Text>
          </View>
          <View style={s.metaRight}>
            <Text style={s.metaLabel}>GOODS RECEIVED NOTE</Text>
            <Text style={s.metaValue}>{props.reference_no ?? `GRN-${props.id.slice(0, 8).toUpperCase()}`}</Text>
            <Text style={s.badge}>
              {props.confirmed_by ? 'CONFIRMED' : 'DRAFT'}
            </Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Info grid */}
        <View style={[s.section, s.infoGrid]}>
          <View style={s.infoBlock}>
            <Text style={s.sectionTitle}>Supplier</Text>
            <Text style={s.infoValue}>{props.supplier_name}</Text>
          </View>
          <View style={s.infoBlock}>
            <Text style={s.sectionTitle}>Receiving Location</Text>
            <Text style={s.infoValue}>{props.location_name}</Text>
          </View>
          <View style={s.infoBlock}>
            <Text style={s.sectionTitle}>Received Date</Text>
            <Text style={s.infoValue}>{format(new Date(props.received_date), 'dd MMMM yyyy')}</Text>
          </View>
          <View style={s.infoBlock}>
            <Text style={s.sectionTitle}>Created By</Text>
            <Text style={s.infoValue}>{props.created_by}</Text>
            {props.confirmed_by && (
              <>
                <Text style={[s.infoLabel, { marginTop: 6 }]}>Confirmed By</Text>
                <Text style={s.infoValue}>{props.confirmed_by}</Text>
              </>
            )}
          </View>
        </View>

        {/* Notes */}
        {props.notes && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Notes</Text>
            <Text style={{ fontSize: 9, color: MUTED }}>{props.notes}</Text>
          </View>
        )}

        {/* Items table */}
        <View style={s.table}>
          <Text style={s.sectionTitle}>Items</Text>
          <View style={s.tableHead}>
            <Text style={[s.tableHeadTxt, s.cellCode]}>Item Code</Text>
            <Text style={[s.tableHeadTxt, s.cellName]}>Description</Text>
            <Text style={[s.tableHeadTxt, s.cellColor]}>Color</Text>
            <Text style={[s.tableHeadTxt, s.cellQty]}>Qty</Text>
            <Text style={[s.tableHeadTxt, s.cellUnit]}>Unit</Text>
            <Text style={[s.tableHeadTxt, s.cellPrice]}>Unit Cost</Text>
            <Text style={[s.tableHeadTxt, s.cellTotal]}>Total (LKR)</Text>
          </View>
          {props.items.map((item, i) => (
            <View key={item.variant_id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={[{ fontWeight: 700, color: GOLD }, s.cellCode]}>{item.item_code}</Text>
              <Text style={s.cellName}>{item.variant_name}</Text>
              <Text style={s.cellColor}>{item.color ?? '—'}</Text>
              <Text style={s.cellQty}>{item.quantity}</Text>
              <Text style={s.cellUnit}>{item.unit}</Text>
              <Text style={s.cellPrice}>{item.cost_price.toLocaleString()}</Text>
              <Text style={s.cellTotal}>{(item.quantity * item.cost_price).toLocaleString()}</Text>
            </View>
          ))}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TOTAL VALUE</Text>
            <Text style={s.totalValue}>LKR {totalValue.toLocaleString()}</Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={s.sigGrid}>
          {['Prepared By','Checked By','Authorised By'].map((label) => (
            <View key={label} style={s.sigBlock}>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>Madeenas Textiles Pvt Ltd · Confidential</Text>
          <Text style={s.footerTxt}>Generated {format(new Date(), 'dd MMM yyyy HH:mm')}</Text>
        </View>
      </Page>
    </Document>
  )
}
