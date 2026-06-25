# MADEENAS STOCK — CLAUDE.md
## Project Context for Claude Code

---

## Project Overview

Textile inventory and inter-location stock movement system for Madeenas Textiles.

- Monorepo: Turborepo
- Web: Next.js 15 (App Router + Server Actions + React 19)
- Database: Supabase (PostgreSQL 16 + RLS + Realtime)
- Auth: Supabase Auth (email/password + magic link)
- Mobile: Flutter 3.x (with Drift offline queue)
- Deployment: Vercel (web) + GitHub Actions CI
- Currency: LKR | VAT: 18% | Region: Sri Lanka

---

## Core Architecture Principle: Ledger-First

The `stock_ledger` table is **APPEND-ONLY** and is the authoritative
source of truth for ALL stock positions.

NEVER update `stock_balances` directly.
ALWAYS write to `stock_ledger`.

The `update_stock_balance` trigger automatically maintains
`stock_balances` after every ledger insert.

`quantity_available` = `quantity_on_hand` - `quantity_reserved`

- `quantity_on_hand`  → updated by `update_stock_balance` trigger on ledger insert
- `quantity_reserved` → updated by `update_reserved_qty` trigger on transfer
  status changes (see below)

---

## Database Triggers (Critical — All Must Exist)

### 1. Auth → Public User Sync

When a user signs up or is invited via Supabase Auth, they must get a
corresponding record in `public.users` or all FK references will fail.

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email,
    'VIEWER'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 2. Stock Balance Trigger (on stock_ledger INSERT)

Updates quantity_on_hand in stock_balances after every ledger entry.
Never modify this trigger to also handle quantity_reserved.
Keep them separate.

### 3. Reserved Quantity Trigger (on transfers UPDATE)

Manages the quantity_reserved field in stock_balances based on
transfer status transitions:

```
DRAFT → PENDING_APPROVAL or APPROVED  : INCREMENT reserved at FROM location
PENDING_APPROVAL/APPROVED → IN_TRANSIT: DECREMENT reserved (actual TRANSFER_OUT
                                         ledger entry handles on_hand)
PENDING_APPROVAL/APPROVED → CANCELLED : DECREMENT reserved
PENDING_APPROVAL/APPROVED → REJECTED  : DECREMENT reserved
```

```sql
CREATE OR REPLACE FUNCTION update_reserved_qty()
RETURNS TRIGGER AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- Reserve stock when submitted for approval or auto-approved
  IF OLD.status = 'DRAFT' AND NEW.status IN ('PENDING_APPROVAL','APPROVED') THEN
    FOR v_item IN
      SELECT variant_id, quantity_requested
      FROM transfer_items WHERE transfer_id = NEW.id
    LOOP
      INSERT INTO stock_balances (variant_id, location_id, quantity_on_hand, quantity_reserved)
      VALUES (v_item.variant_id, NEW.from_location_id, 0, 0)
      ON CONFLICT (variant_id, location_id) DO NOTHING;

      UPDATE stock_balances
      SET quantity_reserved = quantity_reserved + v_item.quantity_requested
      WHERE variant_id = v_item.variant_id
        AND location_id = NEW.from_location_id;
    END LOOP;

  -- Release reservation when dispatched, cancelled, or rejected
  ELSIF OLD.status IN ('PENDING_APPROVAL','APPROVED')
    AND NEW.status IN ('IN_TRANSIT','CANCELLED','REJECTED') THEN
    FOR v_item IN
      SELECT variant_id, quantity_requested
      FROM transfer_items WHERE transfer_id = NEW.id
    LOOP
      UPDATE stock_balances
      SET quantity_reserved = GREATEST(0,
            quantity_reserved - v_item.quantity_requested)
      WHERE variant_id = v_item.variant_id
        AND location_id = NEW.from_location_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_reserved_qty
  AFTER UPDATE OF status ON transfers
  FOR EACH ROW EXECUTE FUNCTION update_reserved_qty();
```

### 4. Item Code Generator (on product_variants INSERT)

Uses a dedicated sequence table to avoid race conditions.
DO NOT use MAX()+1 approach — concurrent inserts will collide.

```sql
-- Sequence tracker table
CREATE TABLE category_sequences (
  category_id  UUID PRIMARY KEY REFERENCES categories(id),
  current_seq  INTEGER NOT NULL DEFAULT 0
);

-- Trigger uses SELECT FOR UPDATE to lock the row during generation
CREATE OR REPLACE FUNCTION generate_item_code()
RETURNS TRIGGER AS $$
DECLARE
  v_prefix  TEXT;
  v_color   TEXT;
  v_width   TEXT;
  v_seq     INTEGER;
  v_cat_id  UUID;
BEGIN
  SELECT p.category_id, c.prefix
  INTO v_cat_id, v_prefix
  FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE p.id = NEW.product_id;

  -- Lock this category's sequence row to prevent race conditions
  INSERT INTO category_sequences (category_id, current_seq)
  VALUES (v_cat_id, 0)
  ON CONFLICT (category_id) DO NOTHING;

  UPDATE category_sequences
  SET current_seq = current_seq + 1
  WHERE category_id = v_cat_id
  RETURNING current_seq INTO v_seq;

  v_color := UPPER(LEFT(
    REGEXP_REPLACE(COALESCE(NEW.color, 'GEN'), '[^a-zA-Z]', '', 'g'),
  3));

  v_width := CASE
    WHEN NEW.width_inches IS NOT NULL
    THEN LPAD(NEW.width_inches::INT::TEXT, 2, '0')
    ELSE '00'
  END;

  NEW.item_code := v_prefix || '-' || v_color || '-' ||
                   v_width  || '-' || LPAD(v_seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5. Audit Log Trigger (on critical tables)

Fires on INSERT/UPDATE/DELETE for:
transfers, stock_ins, stock_adjustments, product_variants

---

## Database Functions

### dispatch_transfer(p_transfer_id, p_user_id)

Writes TRANSFER_OUT ledger entries and moves status to IN_TRANSIT.
Includes defensive stock check BEFORE writing to ledger:

```sql
-- Inside the per-item loop, BEFORE inserting ledger entry:
DECLARE v_available NUMERIC;
BEGIN
  SELECT quantity_available INTO v_available
  FROM stock_balances
  WHERE variant_id = v_item.variant_id
    AND location_id = v_from;

  IF COALESCE(v_available, 0) < v_item.quantity_dispatched THEN
    RAISE EXCEPTION
      'Insufficient stock for variant %. Available: %, Requested: %',
      v_item.variant_id, v_available, v_item.quantity_dispatched;
  END IF;
  -- Then insert ledger entry
END;
```

### receive_transfer(p_transfer_id, p_user_id)

Writes TRANSFER_IN ledger entries using quantity_received (NOT
quantity_dispatched — they may differ).
Moves status to RECEIVED.

### check_transfer_approval(p_transfer_id)

Returns BOOLEAN. Checks total qty and total value against settings table
thresholds (transfer_qty_threshold, transfer_value_threshold).

---

## Environment Variables

All env vars use these exact names. Do not deviate.

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# WhatsApp Cloud API (Meta Graph API v21.0)
WHATSAPP_ACCESS_TOKEN=          ← NOT "WHATSAPP_API_TOKEN"
WHATSAPP_PHONE_ID=              ← NOT "WHATSAPP_PHONE_NUMBER_ID"
WHATSAPP_BUSINESS_ACCOUNT_ID=

# Email
RESEND_API_KEY=
EMAIL_FROM=

# Storage
SUPABASE_STORAGE_BUCKET=madeenas-assets
```

---

## Transfer Lifecycle (State Machine)

```
DRAFT
  └─► PENDING_APPROVAL  (if approval required)  → reserved++
  └─► APPROVED          (if auto-approved)       → reserved++
        └─► APPROVED
              └─► IN_TRANSIT  (dispatch)          → reserved--, TRANSFER_OUT ledger
                    └─► RECEIVED  (receive)        → TRANSFER_IN ledger
        └─► REJECTED                               → reserved--
  └─► CANCELLED (from DRAFT, PENDING, APPROVED)   → reserved-- if was reserved
```

**Stock deducted from source:** only on IN_TRANSIT (dispatch step)
**Stock added to destination:** only on RECEIVED (receive step)
**Stock reserved at source:** from PENDING_APPROVAL or APPROVED until
IN_TRANSIT, CANCELLED, or REJECTED

---

## Item Code Format

```
Pattern: {CATEGORY_PREFIX}-{COLOR_3CHAR}-{WIDTH_2DIGIT}-{SEQ_3DIGIT}

Examples:
  SHT-WHT-36-001   → Shirting, White, 36 inches, sequence 1
  SAR-RED-44-002   → Saree, Red, 44 inches, sequence 2
  LIN-BLK-00-003   → Lining, Black, no width, sequence 3
```

Generated by trigger on INSERT. Never set manually.
Sequence is per-category and collision-safe via SELECT FOR UPDATE.

---

## Mobile (Flutter) Idempotency Rule

The `/api/transfers/[id]/receive` endpoint MUST be idempotent.
Flutter's offline sync queue (Drift) may retry a failed submission.

Implementation: each receive submission includes an
`idempotency_key` (UUID generated on the device before the first attempt).
The API checks if this key has already been processed in a
`processed_idempotency_keys` table before writing to the ledger.
If already processed, return the original response. Do not write again.

```sql
CREATE TABLE processed_idempotency_keys (
  key         TEXT PRIMARY KEY,
  endpoint    TEXT NOT NULL,
  response    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Auto-purge keys older than 7 days via a scheduled function
```

---

## Common Commands

```bash
# Web dev server
cd apps/web && npm run dev

# Generate Supabase types after schema changes
npx supabase gen types typescript --local > packages/db/src/types.ts

# Run all migrations locally
npx supabase db push

# Reset local DB and re-seed
npx supabase db reset

# Flutter
cd apps/mobile && flutter run
cd apps/mobile && flutter build apk --release

# Run full CI locally
turbo run lint typecheck test
```

---

## Test Seed Users

| Email                   | Password     | Role          | Locations        |
|-------------------------|--------------|---------------|------------------|
| admin@madeenas.lk       | Admin1234!   | ADMIN         | All              |
| manager@madeenas.lk     | Manager123!  | MANAGER       | All              |
| keeper1@madeenas.lk     | Keeper123!   | STORE_KEEPER  | Pettah Warehouse |
| keeper2@madeenas.lk     | Keeper123!   | STORE_KEEPER  | Kandy Shop       |
| viewer@madeenas.lk      | Viewer123!   | VIEWER        | All              |

---

## File Conventions

- Server Actions:  `apps/web/lib/actions/*.ts`
- API Routes:      `apps/web/app/api/**`
- Components:      PascalCase, co-located with page where possible
- DB Types:        import from `@madeenas/db`
- Migrations:      `supabase/migrations/00N_description.sql`
- Item codes:      always render in monospace font (`font-mono`)

---

## RLS Rule

All DB access goes through the Supabase client with the user's JWT.
RLS is enabled on all tables.
NEVER use the service_role key in client-side or edge function code.
service_role is for server-side admin operations and migration scripts only.

---

## Known Constraints

- Sri Lanka network: assume 3G/4G on mobile. Offline queue is mandatory.
- All monetary values in LKR as NUMERIC(12,2).
- All quantities as NUMERIC(12,3) to support fractional yards/meters.
- VAT rate stored in settings table, not hardcoded. Default 0.18.
- `quantity_reserved` must NEVER go below 0 (enforced by `GREATEST(0, …)` in trigger).
- Approval thresholds: qty ≥ 500 OR value ≥ LKR 200,000 (configurable in `settings` table).
- WhatsApp phone normalisation: strip non-digits, replace leading `0` with `94` (Sri Lanka code).
