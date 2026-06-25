-- ============================================================
-- 005_additional_rpcs.sql
-- Additional helper RPCs for reports and alerts
-- ============================================================

-- Stock valuation by category
CREATE OR REPLACE FUNCTION get_stock_valuation()
RETURNS TABLE (
  category_name    TEXT,
  variant_count    BIGINT,
  total_quantity   NUMERIC,
  total_cost_value NUMERIC,
  total_sell_value NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    c.name                                         AS category_name,
    COUNT(DISTINCT pv.id)                          AS variant_count,
    COALESCE(SUM(sb.quantity_on_hand), 0)          AS total_quantity,
    COALESCE(SUM(sb.quantity_on_hand * pv.cost_price), 0) AS total_cost_value,
    COALESCE(SUM(sb.quantity_on_hand * COALESCE(pv.sell_price, pv.cost_price)), 0) AS total_sell_value
  FROM categories c
  JOIN products p    ON p.category_id = c.id
  JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active = true
  LEFT JOIN stock_balances sb ON sb.variant_id = pv.id
  WHERE c.is_active = true
  GROUP BY c.id, c.name
  ORDER BY c.name;
$$;

GRANT EXECUTE ON FUNCTION get_stock_valuation() TO authenticated;

-- Low stock alerts
CREATE OR REPLACE FUNCTION get_low_stock_alerts()
RETURNS TABLE (
  variant_id         UUID,
  item_code          TEXT,
  variant_name       TEXT,
  unit               TEXT,
  location_id        UUID,
  location_name      TEXT,
  quantity_available NUMERIC,
  min_stock_alert    NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    pv.id             AS variant_id,
    pv.item_code      AS item_code,
    pv.name           AS variant_name,
    pv.unit           AS unit,
    sb.location_id    AS location_id,
    l.name            AS location_name,
    sb.quantity_available,
    sb.min_stock_alert
  FROM stock_balances sb
  JOIN product_variants pv ON pv.id = sb.variant_id
  JOIN locations l          ON l.id  = sb.location_id
  WHERE sb.quantity_available <= sb.min_stock_alert
    AND sb.min_stock_alert > 0
    AND pv.is_active = true
    AND l.is_active  = true
  ORDER BY sb.quantity_available ASC, pv.name ASC;
$$;

GRANT EXECUTE ON FUNCTION get_low_stock_alerts() TO authenticated;

-- Transfers receive via function (called from mobile)
CREATE OR REPLACE FUNCTION transfers_receive(
  p_transfer_id  UUID,
  p_items        JSONB
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  item JSONB;
BEGIN
  -- Update each item's received quantity
  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    UPDATE transfer_items
    SET quantity_received = (item->>'quantity_received')::NUMERIC
    WHERE id = (item->>'transfer_item_id')::UUID
      AND transfer_id = p_transfer_id;
  END LOOP;

  -- Call the main receive function
  PERFORM receive_transfer(p_transfer_id);
END;
$$;

GRANT EXECUTE ON FUNCTION transfers_receive(UUID, JSONB) TO authenticated;
