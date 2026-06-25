-- ============================================================
-- MADEENAS STOCK — Migration 006: Reserved Qty + Item Code Fix
-- ============================================================
-- Fixes identified in CLAUDE.md review:
--   1. category_sequences table for race-condition-free item codes
--   2. Updated generate_item_code() using SELECT FOR UPDATE
--   3. update_reserved_qty() trigger for transfer stock reservation
--   4. Defensive stock check added to dispatch_transfer()
--   5. processed_idempotency_keys table for Flutter offline retry safety

-- ── 1. CATEGORY SEQUENCES TABLE ───────────────────────────────
-- Replaces the MAX()+1 approach in the original item code generator.
-- SELECT FOR UPDATE on this row prevents collisions under concurrent inserts.

CREATE TABLE IF NOT EXISTS public.category_sequences (
  category_id  UUID PRIMARY KEY REFERENCES public.categories(id) ON DELETE CASCADE,
  current_seq  INTEGER NOT NULL DEFAULT 0
);

-- Back-fill one row per existing category
INSERT INTO public.category_sequences (category_id, current_seq)
SELECT id, 0 FROM public.categories
ON CONFLICT (category_id) DO NOTHING;

-- ── 2. REPLACE generate_item_code() ───────────────────────────
-- Uses SELECT FOR UPDATE to lock the sequence row, eliminating the
-- MAX()+1 race condition present in migration 003.

CREATE OR REPLACE FUNCTION public.generate_item_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefix   TEXT;
  v_color    TEXT;
  v_width    TEXT;
  v_seq      INTEGER;
  v_cat_id   UUID;
BEGIN
  SELECT p.category_id, c.prefix
  INTO v_cat_id, v_prefix
  FROM public.products p
  JOIN public.categories c ON c.id = p.category_id
  WHERE p.id = NEW.product_id;

  IF v_prefix IS NULL THEN
    RAISE EXCEPTION 'Cannot generate item code: category prefix not found for product %', NEW.product_id;
  END IF;

  -- Ensure sequence row exists for this category
  INSERT INTO public.category_sequences (category_id, current_seq)
  VALUES (v_cat_id, 0)
  ON CONFLICT (category_id) DO NOTHING;

  -- Lock the row and increment — prevents concurrent-insert collision
  UPDATE public.category_sequences
  SET current_seq = current_seq + 1
  WHERE category_id = v_cat_id
  RETURNING current_seq INTO v_seq;

  v_color := UPPER(LEFT(
    COALESCE(REGEXP_REPLACE(NEW.color, '[^a-zA-Z]', '', 'g'), 'GEN'),
    3
  ));

  v_width := CASE
    WHEN NEW.width_inches IS NOT NULL
    THEN LPAD(NEW.width_inches::INT::TEXT, 2, '0')
    ELSE '00'
  END;

  NEW.item_code := v_prefix
    || '-' || v_color
    || '-' || v_width
    || '-' || LPAD(v_seq::TEXT, 3, '0');

  RETURN NEW;
END;
$$;

-- Trigger already created in migration 003; function replacement is enough.

-- ── 3. RESERVED QUANTITY TRIGGER ──────────────────────────────
-- Manages quantity_reserved in stock_balances as transfers move through
-- the approval → dispatch pipeline.
--
-- Transitions handled:
--   DRAFT → PENDING_APPROVAL  : increment reserved at from_location
--   DRAFT → APPROVED          : increment reserved at from_location (auto-approve)
--   PENDING_APPROVAL/APPROVED → IN_TRANSIT  : decrement reserved
--   PENDING_APPROVAL/APPROVED → CANCELLED   : decrement reserved
--   PENDING_APPROVAL/APPROVED → REJECTED    : decrement reserved

CREATE OR REPLACE FUNCTION public.update_reserved_qty()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- Reserve when submitted for approval or auto-approved
  IF OLD.status = 'DRAFT' AND NEW.status IN ('PENDING_APPROVAL', 'APPROVED') THEN
    FOR v_item IN
      SELECT variant_id, quantity_requested
      FROM public.transfer_items
      WHERE transfer_id = NEW.id
    LOOP
      -- Ensure row exists before updating
      INSERT INTO public.stock_balances (variant_id, location_id, quantity_on_hand, quantity_reserved)
      VALUES (v_item.variant_id, NEW.from_location_id, 0, 0)
      ON CONFLICT (variant_id, location_id) DO NOTHING;

      UPDATE public.stock_balances
      SET quantity_reserved = quantity_reserved + v_item.quantity_requested
      WHERE variant_id = v_item.variant_id
        AND location_id = NEW.from_location_id;
    END LOOP;

  -- Release reservation on dispatch, cancellation, or rejection
  ELSIF OLD.status IN ('PENDING_APPROVAL', 'APPROVED')
    AND NEW.status IN ('IN_TRANSIT', 'CANCELLED', 'REJECTED') THEN
    FOR v_item IN
      SELECT variant_id, quantity_requested
      FROM public.transfer_items
      WHERE transfer_id = NEW.id
    LOOP
      UPDATE public.stock_balances
      SET quantity_reserved = GREATEST(0, quantity_reserved - v_item.quantity_requested)
      WHERE variant_id = v_item.variant_id
        AND location_id = NEW.from_location_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_reserved_qty ON public.transfers;

CREATE TRIGGER trg_update_reserved_qty
  AFTER UPDATE OF status ON public.transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reserved_qty();

-- ── 4. DEFENSIVE STOCK CHECK IN dispatch_transfer() ───────────
-- Replaces the version from migration 003 with an available-stock
-- check before writing TRANSFER_OUT ledger entries.

CREATE OR REPLACE FUNCTION public.dispatch_transfer(
  p_transfer_id UUID,
  p_user_id     UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item       RECORD;
  v_from       UUID;
  v_status     TEXT;
  v_available  NUMERIC;
BEGIN
  SELECT from_location_id, status
  INTO v_from, v_status
  FROM public.transfers WHERE id = p_transfer_id;

  IF v_status != 'APPROVED' THEN
    RAISE EXCEPTION 'Transfer % must be APPROVED before dispatch (current: %)',
      p_transfer_id, v_status;
  END IF;

  FOR v_item IN
    SELECT variant_id, quantity_dispatched, unit
    FROM public.transfer_items
    WHERE transfer_id = p_transfer_id
  LOOP
    IF v_item.quantity_dispatched IS NULL OR v_item.quantity_dispatched <= 0 THEN
      RAISE EXCEPTION 'quantity_dispatched must be set for all items before dispatch';
    END IF;

    -- Defensive stock check: available = on_hand - reserved
    -- After reservation the quantity_reserved already includes this transfer,
    -- so quantity_available reflects the true uncommitted stock.
    SELECT COALESCE(quantity_on_hand - quantity_reserved, 0)
    INTO v_available
    FROM public.stock_balances
    WHERE variant_id = v_item.variant_id
      AND location_id = v_from;

    IF COALESCE(v_available, 0) + v_item.quantity_dispatched
       < v_item.quantity_dispatched THEN
      -- This catches negative available (over-reserved scenarios)
      RAISE EXCEPTION
        'Insufficient available stock for variant %. Available: %, Requested: %',
        v_item.variant_id, COALESCE(v_available, 0), v_item.quantity_dispatched;
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
  SET status        = 'IN_TRANSIT',
      dispatched_by = p_user_id,
      dispatched_at = NOW()
  WHERE id = p_transfer_id;
END;
$$;

-- ── 5. IDEMPOTENCY KEYS TABLE ─────────────────────────────────
-- Prevents Flutter offline queue from double-submitting a receive.
-- API route checks this table before writing to stock_ledger.

CREATE TABLE IF NOT EXISTS public.processed_idempotency_keys (
  key         TEXT        PRIMARY KEY,
  endpoint    TEXT        NOT NULL,
  response    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-purge keys older than 7 days (requires pg_cron or a scheduled function)
-- Manually purge with:
--   DELETE FROM processed_idempotency_keys WHERE created_at < NOW() - INTERVAL '7 days';

-- RLS: service role only — app server reads/writes, never the client
ALTER TABLE public.processed_idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only"
  ON public.processed_idempotency_keys
  USING (false)
  WITH CHECK (false);
