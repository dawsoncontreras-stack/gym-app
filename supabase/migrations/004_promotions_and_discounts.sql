-- ============================================================================
-- 004 — Promotion dismissals + reorder discount codes
-- ============================================================================

-- Track which promotions each user has dismissed so they don't reappear
create table user_promotion_dismissals (
  user_id       uuid not null references auth.users on delete cascade,
  promotion_id  uuid not null references promotions on delete cascade,
  dismissed_at  timestamptz not null default now(),
  primary key (user_id, promotion_id)
);

alter table user_promotion_dismissals enable row level security;

create policy "Users can manage their own promotion dismissals"
  on user_promotion_dismissals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Reorder discount codes ──────────────────────────────────────────────────
-- Pre-defined discount codes applied automatically based on reorder_cycle_count.
-- The app reads from this table to show the right code on the reorder card.
create table reorder_discount_codes (
  id              uuid primary key default gen_random_uuid(),
  cycle_number    int not null unique,      -- 0 = first reorder, 1 = second, etc.
  discount_code   text not null,            -- e.g., "REORDER15"
  discount_label  text not null,            -- e.g., "15% off"
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

alter table reorder_discount_codes enable row level security;

create policy "Authenticated users can view active reorder discounts"
  on reorder_discount_codes for select
  using (auth.role() = 'authenticated' and is_active = true);

-- Seed the tapering discount codes
insert into reorder_discount_codes (cycle_number, discount_code, discount_label) values
  (0, 'REORDER15', '15% off your reorder'),
  (1, 'REORDER5',  '5% off + free shipping');
-- cycle 2+: no row → no discount
