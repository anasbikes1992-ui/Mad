import type { Database } from './generated-types'
export type { Database, Tables, TablesInsert, TablesUpdate } from './generated-types'

// Direct table row types
type Row<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type InsertDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type UpdateDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type User             = Row<'users'>
export type Location         = Row<'locations'>
export type Category         = Row<'categories'>
export type Product          = Row<'products'>
export type ProductVariant   = Row<'product_variants'>
export type StockLedger      = Row<'stock_ledger'>
export type StockBalance     = Row<'stock_balances'>
export type StockIn          = Row<'stock_ins'>
export type StockInItem      = Row<'stock_in_items'>
export type Transfer         = Row<'transfers'>
export type TransferItem     = Row<'transfer_items'>
export type StockAdjustment  = Row<'stock_adjustments'>
export type StockAdjustmentItem = Row<'stock_adjustment_items'>
export type AuditLog         = Row<'audit_log'>

export type UserRole       = User['role']
export type TransferStatus = Transfer['status']
export type MovementType   = StockLedger['movement_type']
export type StockUnit      = ProductVariant['unit']
export type LocationType   = Location['type']

export type { Json } from './generated-types'
