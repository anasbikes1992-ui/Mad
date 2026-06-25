// Auto-generated from Supabase schema — regenerate with: npm run db:types
// Run: npx supabase gen types typescript --local > packages/db/src/types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string | null
          role: 'ADMIN' | 'MANAGER' | 'STORE_KEEPER' | 'VIEWER'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          phone?: string | null
          role?: 'ADMIN' | 'MANAGER' | 'STORE_KEEPER' | 'VIEWER'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string
          phone?: string | null
          role?: 'ADMIN' | 'MANAGER' | 'STORE_KEEPER' | 'VIEWER'
          is_active?: boolean
          updated_at?: string
        }
      }
      locations: {
        Row: {
          id: string
          name: string
          type: 'WAREHOUSE' | 'SHOP'
          address: string | null
          phone: string | null
          manager_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'WAREHOUSE' | 'SHOP'
          address?: string | null
          phone?: string | null
          manager_id?: string | null
          is_active?: boolean
        }
        Update: {
          name?: string
          type?: 'WAREHOUSE' | 'SHOP'
          address?: string | null
          phone?: string | null
          manager_id?: string | null
          is_active?: boolean
        }
      }
      user_locations: {
        Row: { user_id: string; location_id: string }
        Insert: { user_id: string; location_id: string }
        Update: never
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          prefix: string
          description: string | null
          image_url: string | null
          parent_id: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          prefix: string
          description?: string | null
          image_url?: string | null
          parent_id?: string | null
          sort_order?: number
          is_active?: boolean
        }
        Update: {
          name?: string
          slug?: string
          prefix?: string
          description?: string | null
          image_url?: string | null
          parent_id?: string | null
          sort_order?: number
          is_active?: boolean
        }
      }
      products: {
        Row: {
          id: string
          category_id: string
          name: string
          slug: string
          description: string | null
          image_urls: string[]
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          slug: string
          description?: string | null
          image_urls?: string[]
          is_active?: boolean
          created_by?: string | null
        }
        Update: {
          category_id?: string
          name?: string
          slug?: string
          description?: string | null
          image_urls?: string[]
          is_active?: boolean
        }
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          item_code: string | null
          name: string
          color: string | null
          color_hex: string | null
          width_inches: number | null
          gsm: number | null
          material: string | null
          weave: string | null
          attributes: Json
          unit: 'yards' | 'meters' | 'bales' | 'pieces' | 'rolls' | 'kg'
          pieces_per_bale: number | null
          cost_price: number
          selling_price: number
          barcode: string | null
          min_stock_alert: number
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          item_code?: string | null
          name: string
          color?: string | null
          color_hex?: string | null
          width_inches?: number | null
          gsm?: number | null
          material?: string | null
          weave?: string | null
          attributes?: Json
          unit: 'yards' | 'meters' | 'bales' | 'pieces' | 'rolls' | 'kg'
          pieces_per_bale?: number | null
          cost_price?: number
          selling_price?: number
          barcode?: string | null
          min_stock_alert?: number
          is_active?: boolean
          created_by?: string | null
        }
        Update: {
          name?: string
          color?: string | null
          color_hex?: string | null
          width_inches?: number | null
          gsm?: number | null
          material?: string | null
          weave?: string | null
          attributes?: Json
          unit?: 'yards' | 'meters' | 'bales' | 'pieces' | 'rolls' | 'kg'
          pieces_per_bale?: number | null
          cost_price?: number
          selling_price?: number
          barcode?: string | null
          min_stock_alert?: number
          is_active?: boolean
        }
      }
      stock_ledger: {
        Row: {
          id: string
          variant_id: string
          location_id: string
          movement_type: 'STOCK_IN' | 'STOCK_OUT' | 'TRANSFER_OUT' | 'TRANSFER_IN'
            | 'ADJUSTMENT_UP' | 'ADJUSTMENT_DOWN' | 'RETURN_IN' | 'OPENING'
          quantity: number
          unit: string
          reference_type: string | null
          reference_id: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          variant_id: string
          location_id: string
          movement_type: 'STOCK_IN' | 'STOCK_OUT' | 'TRANSFER_OUT' | 'TRANSFER_IN'
            | 'ADJUSTMENT_UP' | 'ADJUSTMENT_DOWN' | 'RETURN_IN' | 'OPENING'
          quantity: number
          unit: string
          reference_type?: string | null
          reference_id?: string | null
          notes?: string | null
          created_by?: string | null
        }
        Update: never // ledger is immutable
      }
      stock_balances: {
        Row: {
          variant_id: string
          location_id: string
          quantity_on_hand: number
          quantity_reserved: number
          quantity_available: number // generated column
          last_movement_at: string | null
        }
        Insert: never
        Update: never
      }
      stock_ins: {
        Row: {
          id: string
          location_id: string
          supplier_name: string
          reference_no: string | null
          received_date: string
          status: 'DRAFT' | 'CONFIRMED'
          notes: string | null
          confirmed_by: string | null
          confirmed_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          location_id: string
          supplier_name: string
          reference_no?: string | null
          received_date: string
          status?: 'DRAFT' | 'CONFIRMED'
          notes?: string | null
          created_by?: string | null
        }
        Update: {
          supplier_name?: string
          reference_no?: string | null
          received_date?: string
          notes?: string | null
        }
      }
      stock_in_items: {
        Row: {
          id: string
          stock_in_id: string
          variant_id: string
          quantity: number
          unit: string
          cost_price: number
          notes: string | null
        }
        Insert: {
          id?: string
          stock_in_id: string
          variant_id: string
          quantity: number
          unit: string
          cost_price?: number
          notes?: string | null
        }
        Update: {
          quantity?: number
          unit?: string
          cost_price?: number
          notes?: string | null
        }
      }
      transfers: {
        Row: {
          id: string
          from_location_id: string
          to_location_id: string
          status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED' | 'CANCELLED'
          approval_required: boolean
          requested_by: string | null
          requested_at: string
          approved_by: string | null
          approved_at: string | null
          approval_notes: string | null
          rejected_by: string | null
          rejected_at: string | null
          dispatched_by: string | null
          dispatched_at: string | null
          received_by: string | null
          received_at: string | null
          cancelled_by: string | null
          cancelled_at: string | null
          notes: string | null
          doc_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          from_location_id: string
          to_location_id: string
          status?: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED' | 'CANCELLED'
          approval_required?: boolean
          requested_by?: string | null
          notes?: string | null
        }
        Update: {
          status?: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED' | 'CANCELLED'
          approval_required?: boolean
          approved_by?: string | null
          approved_at?: string | null
          approval_notes?: string | null
          rejected_by?: string | null
          rejected_at?: string | null
          dispatched_by?: string | null
          dispatched_at?: string | null
          received_by?: string | null
          received_at?: string | null
          cancelled_by?: string | null
          cancelled_at?: string | null
          notes?: string | null
          doc_url?: string | null
        }
      }
      transfer_items: {
        Row: {
          id: string
          transfer_id: string
          variant_id: string
          quantity_requested: number
          quantity_dispatched: number | null
          quantity_received: number | null
          unit: string
          variance_notes: string | null
        }
        Insert: {
          id?: string
          transfer_id: string
          variant_id: string
          quantity_requested: number
          quantity_dispatched?: number | null
          quantity_received?: number | null
          unit: string
          variance_notes?: string | null
        }
        Update: {
          quantity_requested?: number
          quantity_dispatched?: number | null
          quantity_received?: number | null
          variance_notes?: string | null
        }
      }
      stock_adjustments: {
        Row: {
          id: string
          location_id: string
          reason: 'DAMAGE' | 'LOSS' | 'FOUND' | 'RECOUNT' | 'OTHER'
          status: 'DRAFT' | 'CONFIRMED'
          notes: string | null
          confirmed_by: string | null
          confirmed_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          location_id: string
          reason: 'DAMAGE' | 'LOSS' | 'FOUND' | 'RECOUNT' | 'OTHER'
          status?: 'DRAFT' | 'CONFIRMED'
          notes?: string | null
          created_by?: string | null
        }
        Update: {
          reason?: 'DAMAGE' | 'LOSS' | 'FOUND' | 'RECOUNT' | 'OTHER'
          notes?: string | null
        }
      }
      stock_adjustment_items: {
        Row: {
          id: string
          adjustment_id: string
          variant_id: string
          unit: string
          system_qty: number
          physical_qty: number
          difference: number // generated
          notes: string | null
        }
        Insert: {
          id?: string
          adjustment_id: string
          variant_id: string
          unit: string
          system_qty: number
          physical_qty: number
          notes?: string | null
        }
        Update: {
          physical_qty?: number
          notes?: string | null
        }
      }
      settings: {
        Row: {
          key: string
          value: Json
          description: string | null
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          key: string
          value: Json
          description?: string | null
          updated_by?: string | null
        }
        Update: {
          value?: Json
          updated_by?: string | null
          updated_at?: string
        }
      }
      audit_log: {
        Row: {
          id: string
          table_name: string
          record_id: string
          action: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data: Json | null
          new_data: Json | null
          performed_by: string | null
          performed_at: string
        }
        Insert: never
        Update: never
      }
    }
    Functions: {
      current_user_role: { Args: Record<string, never>; Returns: string }
      user_has_location: { Args: { p_location_id: string }; Returns: boolean }
      is_admin: { Args: Record<string, never>; Returns: boolean }
      is_manager_or_above: { Args: Record<string, never>; Returns: boolean }
      is_store_keeper_or_above: { Args: Record<string, never>; Returns: boolean }
      check_transfer_approval_required: { Args: { p_transfer_id: string }; Returns: boolean }
      dispatch_transfer: { Args: { p_transfer_id: string; p_user_id: string }; Returns: undefined }
      receive_transfer: { Args: { p_transfer_id: string; p_user_id: string }; Returns: undefined }
      confirm_stock_in: { Args: { p_stock_in_id: string; p_user_id: string }; Returns: undefined }
      confirm_adjustment: { Args: { p_adjustment_id: string; p_user_id: string }; Returns: undefined }
      get_running_balance: { Args: { p_variant_id: string; p_location_id: string; p_as_of?: string }; Returns: number }
      get_stock_snapshot: { Args: { p_location_ids?: string[]; p_category_ids?: string[] }; Returns: Array<{
        variant_id: string; item_code: string; variant_name: string; product_name: string
        category_name: string; color: string | null; color_hex: string | null; unit: string
        location_id: string; location_name: string; quantity_on_hand: number
        quantity_reserved: number; quantity_available: number; min_stock_alert: number; is_low_stock: boolean
      }>}
    }
    Enums: {
      user_role: 'ADMIN' | 'MANAGER' | 'STORE_KEEPER' | 'VIEWER'
      location_type: 'WAREHOUSE' | 'SHOP'
      movement_type: 'STOCK_IN' | 'STOCK_OUT' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'ADJUSTMENT_UP' | 'ADJUSTMENT_DOWN' | 'RETURN_IN' | 'OPENING'
      transfer_status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED' | 'CANCELLED'
      adjustment_reason: 'DAMAGE' | 'LOSS' | 'FOUND' | 'RECOUNT' | 'OTHER'
      stock_unit: 'yards' | 'meters' | 'bales' | 'pieces' | 'rolls' | 'kg'
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type InsertDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type UpdateDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// Convenience type aliases
export type User = Tables<'users'>
export type Location = Tables<'locations'>
export type Category = Tables<'categories'>
export type Product = Tables<'products'>
export type ProductVariant = Tables<'product_variants'>
export type StockLedger = Tables<'stock_ledger'>
export type StockBalance = Tables<'stock_balances'>
export type StockIn = Tables<'stock_ins'>
export type StockInItem = Tables<'stock_in_items'>
export type Transfer = Tables<'transfers'>
export type TransferItem = Tables<'transfer_items'>
export type StockAdjustment = Tables<'stock_adjustments'>
export type StockAdjustmentItem = Tables<'stock_adjustment_items'>
export type AuditLog = Tables<'audit_log'>

export type TransferStatus = Transfer['status']
export type UserRole = User['role']
export type MovementType = StockLedger['movement_type']
export type StockUnit = ProductVariant['unit']
export type LocationType = Location['type']
