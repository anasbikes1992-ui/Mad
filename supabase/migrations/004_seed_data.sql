-- ============================================================
-- MADEENAS STOCK — Migration 004: Seed Data
-- ============================================================

-- ── App Settings ──────────────────────────────────────────────
INSERT INTO public.settings (key, value, description) VALUES
  ('transfer_qty_threshold',    '500',     'Minimum total quantity to require transfer approval'),
  ('transfer_value_threshold',  '200000',  'Minimum total LKR value to require transfer approval'),
  ('vat_rate',                  '0.18',    'VAT rate (18% Sri Lanka IRD)'),
  ('low_stock_alerts_enabled',  'true',    'Enable low-stock WhatsApp/email notifications'),
  ('whatsapp_notifications',    '{"transfer_approval":true,"transfer_dispatched":true,"low_stock":true}',
                                           'WhatsApp notification toggles per event type'),
  ('barcode_label_format',      '{"width_mm":50,"height_mm":25}',
                                           'Barcode label dimensions in mm')
ON CONFLICT (key) DO NOTHING;

-- ── Default Locations ─────────────────────────────────────────
INSERT INTO public.locations (id, name, type, address, phone) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Pettah Main Warehouse', 'WAREHOUSE',
   'No. 42, Main Street, Pettah, Colombo 11', '+94112345678'),
  ('00000000-0000-0000-0000-000000000002', 'Pettah Retail Shop',    'SHOP',
   'No. 44, Main Street, Pettah, Colombo 11', '+94112345679'),
  ('00000000-0000-0000-0000-000000000003', 'Kandy Warehouse',       'WAREHOUSE',
   'No. 15, Peradeniya Road, Kandy', '+94812345678'),
  ('00000000-0000-0000-0000-000000000004', 'Kandy Retail Shop',     'SHOP',
   'No. 17, Peradeniya Road, Kandy', '+94812345679')
ON CONFLICT (id) DO NOTHING;

-- ── Default Categories ────────────────────────────────────────
INSERT INTO public.categories (id, name, slug, prefix, description) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Shirting',    'shirting',    'SHT', 'Woven shirt fabrics'),
  ('10000000-0000-0000-0000-000000000002', 'Suiting',     'suiting',     'SUT', 'Formal suiting fabrics'),
  ('10000000-0000-0000-0000-000000000003', 'Saree',       'saree',       'SAR', 'Saree fabrics and blends'),
  ('10000000-0000-0000-0000-000000000004', 'Lining',      'lining',      'LIN', 'Lining and interlining fabrics'),
  ('10000000-0000-0000-0000-000000000005', 'Curtaining',  'curtaining',  'CUR', 'Curtain and drapery fabrics'),
  ('10000000-0000-0000-0000-000000000006', 'Accessories', 'accessories', 'ACC', 'Zips, buttons, threads')
ON CONFLICT (id) DO NOTHING;
