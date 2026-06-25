-- ============================================================
-- MADEENAS STOCK — Migration 003: Triggers & Functions
-- ============================================================

-- ── 1. ITEM CODE GENERATOR ────────────────────────────────────
-- Pattern: {CATEGORY_PREFIX}-{COLOR_3CHAR}-{WIDTH_2DIGIT}-{SEQ_3DIGIT}
-- Example: SHT-WHT-36-001

CREATE OR REPLACE FUNCTION public.generate_item_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix  TEXT;
  v_color   TEXT;
  v_width   TEXT;
  v_seq     INT;
BEGIN
  -- Get category prefix via product → category
  SELECT c.prefix INTO v_prefix
  FROM public.products p
  JOIN public.categories c ON c.id = p.category_id
  WHERE p.id = NEW.product_id;

  IF v_prefix IS NULL THEN
    RAISE EXCEPTION 'Cannot generate item code: category prefix not found for product %', NEW.product_id;
  END IF;

  -- Derive 3-char color code (letters only, uppercased)
  v_color := UPPER(LEFT(
    COALESCE(REGEXP_REPLACE(NEW.color, '[^a-zA-Z]', '', 'g'), 'GEN'),
    3
  ));

  -- Derive 2-digit width (zero-padded, 00 if null)
  v_width := CASE
    WHEN NEW.width_inches IS NOT NULL
    THEN LPAD(NEW.width_inches::INT::TEXT, 2, '0')
    ELSE '00'
  END;

  -- Get next sequence number within this category
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(pv.item_code, '-', 4) AS INTEGER)
  ), 0) + 1
  INTO v_seq
  FROM public.product_variants pv
  JOIN public.products p    ON p.id = pv.product_id
  JOIN public.categories c  ON c.id = p.category_id
  WHERE c.prefix = v_prefix
    AND pv.item_code IS NOT NULL
    AND pv.item_code ~ '^[A-Z]+-[A-Z]+-[0-9]+-[0-9]+$';

  NEW.item_code := v_prefix
    || '-' || v_color
    || '-' || v_width
    || '-' || LPAD(v_seq::TEXT, 3, '0');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_item_code
  BEFORE INSERT ON public.product_variants
  FOR EACH ROW
  WHEN (NEW.item_code IS NULL)
  EXECUTE FUNCTION public.generate_item_code();

-- ── 2. STOCK BALANCE UPDATER ──────────────────────────────────
-- Fires after every stock_ledger INSERT, keeps stock_balances in sync

CREATE OR REPLACE FUNCTION public.update_stock_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Upsert the balance row if it doesn't exist
  INSERT INTO public.stock_balances (variant_id, location_id, quantity_on_hand, last_movement_at)
  VALUES (NEW.variant_id, NEW.location_id, 0, NOW())
  ON CONFLICT (variant_id, location_id) DO NOTHING;

  -- Add or subtract based on movement direction
  UPDATE public.stock_balances
  SET
    quantity_on_hand = quantity_on_hand + CASE
      WHEN NEW.movement_type IN ('STOCK_IN','TRANSFER_IN','ADJUSTMENT_UP','RETURN_IN','OPENING')
        THEN NEW.quantity
      WHEN NEW.movement_type IN ('STOCK_OUT','TRANSFER_OUT','ADJUSTMENT_DOWN')
        THEN -NEW.quantity
      ELSE 0
    END,
    last_movement_at = NOW()
  WHERE variant_id = NEW.variant_id
    AND location_id = NEW.location_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_balance
  AFTER INSERT ON public.stock_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stock_balance();

-- ── 3. AUTO-UPDATE updated_at ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_stock_ins_updated_at
  BEFORE UPDATE ON public.stock_ins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_transfers_updated_at
  BEFORE UPDATE ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_adjustments_updated_at
  BEFORE UPDATE ON public.stock_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 4. AUDIT LOG TRIGGER ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_data, new_data, performed_by
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD)::jsonb END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW)::jsonb END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_transfers
  AFTER INSERT OR UPDATE OR DELETE ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_stock_ins
  AFTER INSERT OR UPDATE OR DELETE ON public.stock_ins
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_adjustments
  AFTER INSERT OR UPDATE OR DELETE ON public.stock_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_product_variants
  AFTER INSERT OR UPDATE OR DELETE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- ── 5. TRANSFER APPROVAL CHECK ────────────────────────────────
-- Returns TRUE if the transfer requires manager approval

CREATE OR REPLACE FUNCTION public.check_transfer_approval_required(p_transfer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_qty    NUMERIC;
  v_total_value  NUMERIC;
  v_qty_thresh   NUMERIC;
  v_val_thresh   NUMERIC;
BEGIN
  SELECT (value::numeric) INTO v_qty_thresh
  FROM public.settings WHERE key = 'transfer_qty_threshold';
  v_qty_thresh := COALESCE(v_qty_thresh, 500);

  SELECT (value::numeric) INTO v_val_thresh
  FROM public.settings WHERE key = 'transfer_value_threshold';
  v_val_thresh := COALESCE(v_val_thresh, 200000);

  SELECT
    SUM(ti.quantity_requested),
    SUM(ti.quantity_requested * pv.cost_price)
  INTO v_total_qty, v_total_value
  FROM public.transfer_items ti
  JOIN public.product_variants pv ON pv.id = ti.variant_id
  WHERE ti.transfer_id = p_transfer_id;

  RETURN (COALESCE(v_total_qty, 0) >= v_qty_thresh
       OR COALESCE(v_total_value, 0) >= v_val_thresh);
END;
$$;

-- ── 6. DISPATCH TRANSFER ──────────────────────────────────────
-- Writes TRANSFER_OUT ledger entries and flips status to IN_TRANSIT

CREATE OR REPLACE FUNCTION public.dispatch_transfer(
  p_transfer_id UUID,
  p_user_id     UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item    RECORD;
  v_from    UUID;
  v_status  TEXT;
BEGIN
  SELECT from_location_id, status
  INTO v_from, v_status
  FROM public.transfers WHERE id = p_transfer_id;

  IF v_status != 'APPROVED' THEN
    RAISE EXCEPTION 'Transfer % must be APPROVED before dispatch (current: %)', p_transfer_id, v_status;
  END IF;

  FOR v_item IN
    SELECT variant_id, quantity_dispatched, unit
    FROM public.transfer_items
    WHERE transfer_id = p_transfer_id
  LOOP
    IF v_item.quantity_dispatched IS NULL OR v_item.quantity_dispatched <= 0 THEN
      RAISE EXCEPTION 'quantity_dispatched must be set for all items before dispatch';
    END IF;

    INSERT INTO public.stock_ledger (
      variant_id, location_id, movement_type, quantity, unit,
      reference_type, reference_id, created_by
    ) VALUES (
      v_item.variant_id, v_from, 'TRANSFER_OUT', v_item.quantity_dispatched,
      v_item.unit, 'transfer', p_transfer_id, p_user_id
    );
  END LOOP;

  UPDATE public.transfers
  SET status = 'IN_TRANSIT',
      dispatched_by = p_user_id,
      dispatched_at = NOW()
  WHERE id = p_transfer_id;
END;
$$;

-- ── 7. RECEIVE TRANSFER ───────────────────────────────────────
-- Writes TRANSFER_IN ledger entries and flips status to RECEIVED

CREATE OR REPLACE FUNCTION public.receive_transfer(
  p_transfer_id UUID,
  p_user_id     UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item   RECORD;
  v_to     UUID;
  v_status TEXT;
BEGIN
  SELECT to_location_id, status
  INTO v_to, v_status
  FROM public.transfers WHERE id = p_transfer_id;

  IF v_status != 'IN_TRANSIT' THEN
    RAISE EXCEPTION 'Transfer % must be IN_TRANSIT to receive (current: %)', p_transfer_id, v_status;
  END IF;

  FOR v_item IN
    SELECT variant_id, quantity_received, unit
    FROM public.transfer_items
    WHERE transfer_id = p_transfer_id
  LOOP
    IF v_item.quantity_received IS NULL THEN
      RAISE EXCEPTION 'quantity_received must be set for all items before marking received';
    END IF;

    IF v_item.quantity_received > 0 THEN
      INSERT INTO public.stock_ledger (
        variant_id, location_id, movement_type, quantity, unit,
        reference_type, reference_id, created_by
      ) VALUES (
        v_item.variant_id, v_to, 'TRANSFER_IN', v_item.quantity_received,
        v_item.unit, 'transfer', p_transfer_id, p_user_id
      );
    END IF;
  END LOOP;

  UPDATE public.transfers
  SET status = 'RECEIVED',
      received_by = p_user_id,
      received_at = NOW()
  WHERE id = p_transfer_id;
END;
$$;

-- ── 8. CONFIRM STOCK IN ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.confirm_stock_in(
  p_stock_in_id UUID,
  p_user_id     UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item     RECORD;
  v_location UUID;
  v_status   TEXT;
BEGIN
  SELECT location_id, status INTO v_location, v_status
  FROM public.stock_ins WHERE id = p_stock_in_id;

  IF v_status != 'DRAFT' THEN
    RAISE EXCEPTION 'Stock In % is already confirmed', p_stock_in_id;
  END IF;

  FOR v_item IN
    SELECT variant_id, quantity, unit, cost_price
    FROM public.stock_in_items
    WHERE stock_in_id = p_stock_in_id
  LOOP
    INSERT INTO public.stock_ledger (
      variant_id, location_id, movement_type, quantity, unit,
      reference_type, reference_id, created_by
    ) VALUES (
      v_item.variant_id, v_location, 'STOCK_IN', v_item.quantity,
      v_item.unit, 'stock_in', p_stock_in_id, p_user_id
    );
  END LOOP;

  UPDATE public.stock_ins
  SET status = 'CONFIRMED',
      confirmed_by = p_user_id,
      confirmed_at = NOW()
  WHERE id = p_stock_in_id;
END;
$$;

-- ── 9. CONFIRM STOCK ADJUSTMENT ───────────────────────────────

CREATE OR REPLACE FUNCTION public.confirm_adjustment(
  p_adjustment_id UUID,
  p_user_id       UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item     RECORD;
  v_location UUID;
  v_status   TEXT;
BEGIN
  SELECT location_id, status INTO v_location, v_status
  FROM public.stock_adjustments WHERE id = p_adjustment_id;

  IF v_status != 'DRAFT' THEN
    RAISE EXCEPTION 'Adjustment % is already confirmed', p_adjustment_id;
  END IF;

  FOR v_item IN
    SELECT variant_id, unit, difference
    FROM public.stock_adjustment_items
    WHERE adjustment_id = p_adjustment_id
  LOOP
    IF v_item.difference != 0 THEN
      INSERT INTO public.stock_ledger (
        variant_id, location_id, movement_type, quantity, unit,
        reference_type, reference_id, created_by
      ) VALUES (
        v_item.variant_id, v_location,
        CASE WHEN v_item.difference > 0 THEN 'ADJUSTMENT_UP' ELSE 'ADJUSTMENT_DOWN' END,
        ABS(v_item.difference), v_item.unit,
        'adjustment', p_adjustment_id, p_user_id
      );
    END IF;
  END LOOP;

  UPDATE public.stock_adjustments
  SET status = 'CONFIRMED',
      confirmed_by = p_user_id,
      confirmed_at = NOW()
  WHERE id = p_adjustment_id;
END;
$$;

-- ── 10. GET RUNNING BALANCE ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_running_balance(
  p_variant_id  UUID,
  p_location_id UUID,
  p_as_of       TIMESTAMPTZ DEFAULT NOW()
)
RETURNS NUMERIC
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(SUM(
    CASE
      WHEN movement_type IN ('STOCK_IN','TRANSFER_IN','ADJUSTMENT_UP','RETURN_IN','OPENING')
        THEN quantity
      WHEN movement_type IN ('STOCK_OUT','TRANSFER_OUT','ADJUSTMENT_DOWN')
        THEN -quantity
      ELSE 0
    END
  ), 0)
  FROM public.stock_ledger
  WHERE variant_id = p_variant_id
    AND location_id = p_location_id
    AND created_at <= p_as_of
$$;

-- ── 11. STOCK SNAPSHOT (pivot helper) ────────────────────────

CREATE OR REPLACE FUNCTION public.get_stock_snapshot(
  p_location_ids  UUID[]  DEFAULT NULL,
  p_category_ids  UUID[]  DEFAULT NULL
)
RETURNS TABLE (
  variant_id    UUID,
  item_code     TEXT,
  variant_name  TEXT,
  product_name  TEXT,
  category_name TEXT,
  color         TEXT,
  color_hex     TEXT,
  unit          TEXT,
  location_id   UUID,
  location_name TEXT,
  quantity_on_hand      NUMERIC,
  quantity_reserved     NUMERIC,
  quantity_available    NUMERIC,
  min_stock_alert       NUMERIC,
  is_low_stock          BOOLEAN
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT
    pv.id,
    pv.item_code,
    pv.name,
    p.name,
    c.name,
    pv.color,
    pv.color_hex,
    pv.unit,
    l.id,
    l.name,
    COALESCE(sb.quantity_on_hand, 0),
    COALESCE(sb.quantity_reserved, 0),
    COALESCE(sb.quantity_on_hand - sb.quantity_reserved, 0),
    pv.min_stock_alert,
    COALESCE(sb.quantity_on_hand - sb.quantity_reserved, 0) <= pv.min_stock_alert
  FROM public.product_variants pv
  JOIN public.products p    ON p.id = pv.product_id
  JOIN public.categories c  ON c.id = p.category_id
  CROSS JOIN public.locations l
  LEFT JOIN public.stock_balances sb
    ON sb.variant_id = pv.id AND sb.location_id = l.id
  WHERE pv.is_active = TRUE
    AND p.is_active  = TRUE
    AND l.is_active  = TRUE
    AND (p_location_ids IS NULL OR l.id = ANY(p_location_ids))
    AND (p_category_ids IS NULL OR c.id = ANY(p_category_ids))
  ORDER BY c.name, p.name, pv.item_code, l.name
$$;

-- ── 12. NEW USER HANDLER ──────────────────────────────────────
-- Creates a public.users row when a new auth.user signs up

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'VIEWER')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
