export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          id: string
          new_data: Json | null
          old_data: Json | null
          performed_at: string
          performed_by: string | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_at?: string
          performed_by?: string | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_at?: string
          performed_by?: string | null
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          parent_id: string | null
          prefix: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          parent_id?: string | null
          prefix: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          parent_id?: string | null
          prefix?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_sequences: {
        Row: {
          category_id: string
          current_seq: number
        }
        Insert: {
          category_id: string
          current_seq?: number
        }
        Update: {
          category_id?: string
          current_seq?: number
        }
        Relationships: [
          {
            foreignKeyName: "category_sequences_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          manager_id: string | null
          name: string
          phone: string | null
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name: string
          phone?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name?: string
          phone?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_idempotency_keys: {
        Row: {
          created_at: string
          endpoint: string
          key: string
          response: Json | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          key: string
          response?: Json | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          key?: string
          response?: Json | null
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          attributes: Json
          barcode: string | null
          color: string | null
          color_hex: string | null
          cost_price: number
          created_at: string
          created_by: string | null
          gsm: number | null
          id: string
          is_active: boolean
          item_code: string | null
          material: string | null
          min_stock_alert: number
          name: string
          pieces_per_bale: number | null
          product_id: string
          selling_price: number
          unit: string
          updated_at: string
          weave: string | null
          width_inches: number | null
        }
        Insert: {
          attributes?: Json
          barcode?: string | null
          color?: string | null
          color_hex?: string | null
          cost_price?: number
          created_at?: string
          created_by?: string | null
          gsm?: number | null
          id?: string
          is_active?: boolean
          item_code?: string | null
          material?: string | null
          min_stock_alert?: number
          name: string
          pieces_per_bale?: number | null
          product_id: string
          selling_price?: number
          unit: string
          updated_at?: string
          weave?: string | null
          width_inches?: number | null
        }
        Update: {
          attributes?: Json
          barcode?: string | null
          color?: string | null
          color_hex?: string | null
          cost_price?: number
          created_at?: string
          created_by?: string | null
          gsm?: number | null
          id?: string
          is_active?: boolean
          item_code?: string | null
          material?: string | null
          min_stock_alert?: number
          name?: string
          pieces_per_bale?: number | null
          product_id?: string
          selling_price?: number
          unit?: string
          updated_at?: string
          weave?: string | null
          width_inches?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_urls: string[]
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_urls?: string[]
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_urls?: string[]
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustment_items: {
        Row: {
          adjustment_id: string
          difference: number | null
          id: string
          notes: string | null
          physical_qty: number
          system_qty: number
          unit: string
          variant_id: string
        }
        Insert: {
          adjustment_id: string
          difference?: number | null
          id?: string
          notes?: string | null
          physical_qty: number
          system_qty: number
          unit: string
          variant_id: string
        }
        Update: {
          adjustment_id?: string
          difference?: number | null
          id?: string
          notes?: string | null
          physical_qty?: number
          system_qty?: number
          unit?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustment_items_adjustment_id_fkey"
            columns: ["adjustment_id"]
            isOneToOne: false
            referencedRelation: "stock_adjustments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustment_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          id: string
          location_id: string
          notes: string | null
          reason: string
          status: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_id: string
          notes?: string | null
          reason: string
          status?: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          reason?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_balances: {
        Row: {
          last_movement_at: string | null
          location_id: string
          quantity_available: number | null
          quantity_on_hand: number
          quantity_reserved: number
          variant_id: string
        }
        Insert: {
          last_movement_at?: string | null
          location_id: string
          quantity_available?: number | null
          quantity_on_hand?: number
          quantity_reserved?: number
          variant_id: string
        }
        Update: {
          last_movement_at?: string | null
          location_id?: string
          quantity_available?: number | null
          quantity_on_hand?: number
          quantity_reserved?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_balances_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_in_items: {
        Row: {
          cost_price: number
          id: string
          notes: string | null
          quantity: number
          stock_in_id: string
          unit: string
          variant_id: string
        }
        Insert: {
          cost_price?: number
          id?: string
          notes?: string | null
          quantity: number
          stock_in_id: string
          unit: string
          variant_id: string
        }
        Update: {
          cost_price?: number
          id?: string
          notes?: string | null
          quantity?: number
          stock_in_id?: string
          unit?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_in_items_stock_in_id_fkey"
            columns: ["stock_in_id"]
            isOneToOne: false
            referencedRelation: "stock_ins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_in_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_ins: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          id: string
          location_id: string
          notes: string | null
          received_date: string
          reference_no: string | null
          status: string
          supplier_name: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_id: string
          notes?: string | null
          received_date: string
          reference_no?: string | null
          status?: string
          supplier_name: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          received_date?: string
          reference_no?: string | null
          status?: string
          supplier_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_ins_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ins_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ins_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_ledger: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          location_id: string
          movement_type: string
          notes: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          unit: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          location_id: string
          movement_type: string
          notes?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          unit: string
          variant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string
          movement_type?: string
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          unit?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_items: {
        Row: {
          id: string
          quantity_dispatched: number | null
          quantity_received: number | null
          quantity_requested: number
          transfer_id: string
          unit: string
          variance_notes: string | null
          variant_id: string
        }
        Insert: {
          id?: string
          quantity_dispatched?: number | null
          quantity_received?: number | null
          quantity_requested: number
          transfer_id: string
          unit: string
          variance_notes?: string | null
          variant_id: string
        }
        Update: {
          id?: string
          quantity_dispatched?: number | null
          quantity_received?: number | null
          quantity_requested?: number
          transfer_id?: string
          unit?: string
          variance_notes?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          approval_notes: string | null
          approval_required: boolean
          approved_at: string | null
          approved_by: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          dispatched_at: string | null
          dispatched_by: string | null
          doc_url: string | null
          from_location_id: string
          id: string
          notes: string | null
          received_at: string | null
          received_by: string | null
          rejected_at: string | null
          rejected_by: string | null
          requested_at: string
          requested_by: string | null
          status: string
          to_location_id: string
          updated_at: string
        }
        Insert: {
          approval_notes?: string | null
          approval_required?: boolean
          approved_at?: string | null
          approved_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          dispatched_at?: string | null
          dispatched_by?: string | null
          doc_url?: string | null
          from_location_id: string
          id?: string
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: string
          to_location_id: string
          updated_at?: string
        }
        Update: {
          approval_notes?: string | null
          approval_required?: boolean
          approved_at?: string | null
          approved_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          dispatched_at?: string | null
          dispatched_by?: string | null
          doc_url?: string | null
          from_location_id?: string
          id?: string
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: string
          to_location_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_dispatched_by_fkey"
            columns: ["dispatched_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_locations: {
        Row: {
          location_id: string
          user_id: string
        }
        Insert: {
          location_id: string
          user_id: string
        }
        Update: {
          location_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_transfer_approval_required: {
        Args: { p_transfer_id: string }
        Returns: boolean
      }
      confirm_adjustment: {
        Args: { p_adjustment_id: string; p_user_id: string }
        Returns: undefined
      }
      confirm_stock_in: {
        Args: { p_stock_in_id: string; p_user_id: string }
        Returns: undefined
      }
      current_user_role: { Args: never; Returns: string }
      dispatch_transfer: {
        Args: { p_transfer_id: string; p_user_id: string }
        Returns: undefined
      }
      get_low_stock_alerts: {
        Args: never
        Returns: {
          item_code: string
          location_id: string
          location_name: string
          min_stock_alert: number
          quantity_available: number
          unit: string
          variant_id: string
          variant_name: string
        }[]
      }
      get_running_balance: {
        Args: { p_as_of?: string; p_location_id: string; p_variant_id: string }
        Returns: number
      }
      get_stock_snapshot: {
        Args: { p_category_ids?: string[]; p_location_ids?: string[] }
        Returns: {
          category_name: string
          color: string
          color_hex: string
          is_low_stock: boolean
          item_code: string
          location_id: string
          location_name: string
          min_stock_alert: number
          product_name: string
          quantity_available: number
          quantity_on_hand: number
          quantity_reserved: number
          unit: string
          variant_id: string
          variant_name: string
        }[]
      }
      get_stock_valuation: {
        Args: never
        Returns: {
          category_name: string
          total_cost_value: number
          total_quantity: number
          total_sell_value: number
          variant_count: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_manager_or_above: { Args: never; Returns: boolean }
      is_store_keeper_or_above: { Args: never; Returns: boolean }
      receive_transfer: {
        Args: { p_transfer_id: string; p_user_id: string }
        Returns: undefined
      }
      transfers_receive: {
        Args: { p_items: Json; p_transfer_id: string }
        Returns: undefined
      }
      user_has_location: { Args: { p_location_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
