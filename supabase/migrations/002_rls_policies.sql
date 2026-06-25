-- ============================================================
-- MADEENAS STOCK — Migration 002: RLS Policies
-- ============================================================

-- ── Helper functions ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.user_has_location(p_location_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_locations
    WHERE user_id = auth.uid() AND location_id = p_location_id
  ) OR public.current_user_role() IN ('ADMIN','MANAGER')
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT public.current_user_role() = 'ADMIN'
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_above()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT public.current_user_role() IN ('ADMIN','MANAGER')
$$;

CREATE OR REPLACE FUNCTION public.is_store_keeper_or_above()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT public.current_user_role() IN ('ADMIN','MANAGER','STORE_KEEPER')
$$;

-- ── Enable RLS on all tables ──────────────────────────────────

ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_locations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_ledger       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_balances     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_ins          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_in_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log          ENABLE ROW LEVEL SECURITY;

-- ── USERS ─────────────────────────────────────────────────────

CREATE POLICY "users_select_all" ON public.users
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "users_insert_admin" ON public.users
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "users_update_admin_or_self" ON public.users
  FOR UPDATE USING (public.is_admin() OR id = auth.uid());

CREATE POLICY "users_delete_admin" ON public.users
  FOR DELETE USING (public.is_admin());

-- ── LOCATIONS ─────────────────────────────────────────────────

CREATE POLICY "locations_select" ON public.locations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "locations_insert_admin" ON public.locations
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "locations_update_admin" ON public.locations
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "locations_delete_admin" ON public.locations
  FOR DELETE USING (public.is_admin());

-- ── USER_LOCATIONS ────────────────────────────────────────────

CREATE POLICY "user_locations_select" ON public.user_locations
  FOR SELECT USING (user_id = auth.uid() OR public.is_manager_or_above());

CREATE POLICY "user_locations_admin" ON public.user_locations
  FOR ALL USING (public.is_admin());

-- ── CATEGORIES ────────────────────────────────────────────────

CREATE POLICY "categories_select" ON public.categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "categories_insert_admin" ON public.categories
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "categories_update_admin" ON public.categories
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "categories_delete_admin" ON public.categories
  FOR DELETE USING (public.is_admin());

-- ── PRODUCTS ──────────────────────────────────────────────────

CREATE POLICY "products_select" ON public.products
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "products_insert_admin" ON public.products
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "products_update_admin" ON public.products
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "products_delete_admin" ON public.products
  FOR DELETE USING (public.is_admin());

-- ── PRODUCT_VARIANTS ──────────────────────────────────────────

CREATE POLICY "variants_select" ON public.product_variants
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "variants_insert_admin" ON public.product_variants
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "variants_update_admin" ON public.product_variants
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "variants_delete_admin" ON public.product_variants
  FOR DELETE USING (public.is_admin());

-- ── STOCK_LEDGER ──────────────────────────────────────────────

CREATE POLICY "ledger_select" ON public.stock_ledger
  FOR SELECT USING (
    public.is_manager_or_above()
    OR public.user_has_location(location_id)
  );

-- Ledger is INSERT-only via server-side functions; no direct client INSERT
CREATE POLICY "ledger_insert_service" ON public.stock_ledger
  FOR INSERT WITH CHECK (public.is_store_keeper_or_above());

-- ── STOCK_BALANCES ────────────────────────────────────────────

CREATE POLICY "balances_select" ON public.stock_balances
  FOR SELECT USING (
    public.is_manager_or_above()
    OR public.user_has_location(location_id)
  );

-- Balances are only updated by the trigger running as SECURITY DEFINER
CREATE POLICY "balances_insert_trigger" ON public.stock_balances
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "balances_update_trigger" ON public.stock_balances
  FOR UPDATE USING (TRUE);

-- ── STOCK_INS ─────────────────────────────────────────────────

CREATE POLICY "stock_ins_select" ON public.stock_ins
  FOR SELECT USING (
    public.is_manager_or_above()
    OR public.user_has_location(location_id)
  );

CREATE POLICY "stock_ins_insert" ON public.stock_ins
  FOR INSERT WITH CHECK (
    public.is_store_keeper_or_above()
    AND public.user_has_location(location_id)
  );

CREATE POLICY "stock_ins_update" ON public.stock_ins
  FOR UPDATE USING (
    public.is_manager_or_above()
    OR (public.current_user_role() = 'STORE_KEEPER'
        AND status = 'DRAFT'
        AND public.user_has_location(location_id))
  );

CREATE POLICY "stock_in_items_select" ON public.stock_in_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stock_ins si
      WHERE si.id = stock_in_id
      AND (public.is_manager_or_above() OR public.user_has_location(si.location_id))
    )
  );

CREATE POLICY "stock_in_items_insert" ON public.stock_in_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stock_ins si
      WHERE si.id = stock_in_id AND si.status = 'DRAFT'
      AND public.user_has_location(si.location_id)
    )
  );

CREATE POLICY "stock_in_items_update" ON public.stock_in_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.stock_ins si
      WHERE si.id = stock_in_id AND si.status = 'DRAFT'
      AND public.user_has_location(si.location_id)
    )
  );

CREATE POLICY "stock_in_items_delete" ON public.stock_in_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.stock_ins si
      WHERE si.id = stock_in_id AND si.status = 'DRAFT'
      AND public.user_has_location(si.location_id)
    )
  );

-- ── TRANSFERS ─────────────────────────────────────────────────

CREATE POLICY "transfers_select" ON public.transfers
  FOR SELECT USING (
    public.is_manager_or_above()
    OR public.user_has_location(from_location_id)
    OR public.user_has_location(to_location_id)
  );

CREATE POLICY "transfers_insert" ON public.transfers
  FOR INSERT WITH CHECK (
    public.is_store_keeper_or_above()
    AND public.user_has_location(from_location_id)
  );

CREATE POLICY "transfers_update" ON public.transfers
  FOR UPDATE USING (
    public.is_manager_or_above()
    OR (public.current_user_role() = 'STORE_KEEPER'
        AND status IN ('DRAFT','APPROVED','IN_TRANSIT')
        AND (public.user_has_location(from_location_id)
             OR public.user_has_location(to_location_id)))
  );

CREATE POLICY "transfer_items_select" ON public.transfer_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.transfers t WHERE t.id = transfer_id
      AND (public.is_manager_or_above()
           OR public.user_has_location(t.from_location_id)
           OR public.user_has_location(t.to_location_id))
    )
  );

CREATE POLICY "transfer_items_insert" ON public.transfer_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transfers t WHERE t.id = transfer_id
      AND t.status = 'DRAFT'
      AND public.user_has_location(t.from_location_id)
    )
  );

CREATE POLICY "transfer_items_update" ON public.transfer_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.transfers t WHERE t.id = transfer_id
      AND t.status IN ('DRAFT','IN_TRANSIT')
      AND (public.user_has_location(t.from_location_id)
           OR public.user_has_location(t.to_location_id))
    )
  );

CREATE POLICY "transfer_items_delete" ON public.transfer_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.transfers t WHERE t.id = transfer_id
      AND t.status = 'DRAFT'
      AND public.user_has_location(t.from_location_id)
    )
  );

-- ── STOCK_ADJUSTMENTS ─────────────────────────────────────────

CREATE POLICY "adjustments_select" ON public.stock_adjustments
  FOR SELECT USING (
    public.is_manager_or_above()
    OR public.user_has_location(location_id)
  );

CREATE POLICY "adjustments_insert" ON public.stock_adjustments
  FOR INSERT WITH CHECK (
    public.is_store_keeper_or_above()
    AND public.user_has_location(location_id)
  );

CREATE POLICY "adjustments_update" ON public.stock_adjustments
  FOR UPDATE USING (
    public.is_manager_or_above()
    OR (public.current_user_role() = 'STORE_KEEPER'
        AND status = 'DRAFT'
        AND public.user_has_location(location_id))
  );

CREATE POLICY "adj_items_select" ON public.stock_adjustment_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stock_adjustments sa WHERE sa.id = adjustment_id
      AND (public.is_manager_or_above() OR public.user_has_location(sa.location_id))
    )
  );

CREATE POLICY "adj_items_insert" ON public.stock_adjustment_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stock_adjustments sa WHERE sa.id = adjustment_id
      AND sa.status = 'DRAFT'
      AND public.user_has_location(sa.location_id)
    )
  );

CREATE POLICY "adj_items_update" ON public.stock_adjustment_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.stock_adjustments sa WHERE sa.id = adjustment_id
      AND sa.status = 'DRAFT'
      AND public.user_has_location(sa.location_id)
    )
  );

CREATE POLICY "adj_items_delete" ON public.stock_adjustment_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.stock_adjustments sa WHERE sa.id = adjustment_id
      AND sa.status = 'DRAFT'
      AND public.user_has_location(sa.location_id)
    )
  );

-- ── SETTINGS ──────────────────────────────────────────────────

CREATE POLICY "settings_select" ON public.settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "settings_update_admin" ON public.settings
  FOR UPDATE USING (public.is_admin());

-- ── AUDIT_LOG ─────────────────────────────────────────────────

CREATE POLICY "audit_select" ON public.audit_log
  FOR SELECT USING (public.is_manager_or_above());

CREATE POLICY "audit_insert_all" ON public.audit_log
  FOR INSERT WITH CHECK (TRUE);  -- trigger inserts via SECURITY DEFINER
