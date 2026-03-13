-- ============================================================================
-- SUPPLEMENT SCHEMA — V1
-- Supplement Companion App
--
-- Covers: product catalog, user stacks, dose logging, promotions,
-- post-workout suggestions, and reorder notification scheduling.
--
-- Depends on: workout-schema-v1.sql (references categories for suggestion mapping)
-- Depends on: user-workout-schema-v1.sql (references workout_sessions for post-workout suggestions)
-- Depends on: Supabase auth (references auth.users)
--
-- All user-facing tables have RLS enabled.
-- ============================================================================


-- ============================================================================
-- ENUMS
-- ============================================================================

-- Lifecycle state of a product in a user's stack
-- See scope doc for full state machine:
--   arriving → active → running_low → reorder → archived
create type stack_item_status as enum ('arriving', 'active', 'running_low', 'reorder', 'archived');

-- User's primary fitness goal (selected during onboarding)
create type fitness_goal as enum ('build_muscle', 'lose_fat', 'stay_active', 'general_health');


-- ============================================================================
-- USER PROFILES (EXTENDED)
-- Extends the Supabase auth.users with app-specific fields.
-- Created during the welcome screen onboarding flow.
-- ============================================================================

create table user_profiles (
  id              uuid primary key references auth.users(id) on delete cascade,

  -- Onboarding
  fitness_goal    fitness_goal,                         -- selected during welcome screen
  has_completed_onboarding boolean not null default false,

  -- Preferences
  preferred_units text not null default 'lbs'           -- 'lbs' or 'kg'
    check (preferred_units in ('lbs', 'kg')),

  -- Tracks how many times the "log your weight to track progress" hint
  -- has been shown in the workout player. Stop showing after 3.
  weight_tracking_hints_shown int not null default 0,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  expo_push_token     text
);


-- ============================================================================
-- PRODUCTS
-- The brand's supplement catalog. Admin-managed, read-only for users.
-- Every product the brand sells should have a row here.
-- ============================================================================

create table products (
  id                uuid primary key default gen_random_uuid(),

  -- Display
  name              text not null,                      -- e.g., "Creatine Monohydrate"
  short_description text,                               -- one-liner for cards, e.g., "Build strength & power"
  description       text,                               -- full product description
  image_url         text,                               -- product image for catalog + stack
  thumbnail_url     text,                               -- smaller image for lists/cards

  -- Categorization
  -- Used for post-workout suggestion matching
  -- e.g., {'post_workout', 'strength'} or {'daily', 'recovery'}
  tags              text[] not null default '{}',

  -- Supply info
  -- Default supply duration in days — used as the starting value
  -- when a user adds this product to their stack
  default_days_supply int not null default 30,

  -- Commerce
  -- URL to the product on the Shopify store
  -- For v1: user sees this link + a discount code to copy manually
  -- POST-MVP: discount code auto-applied as URL parameter
  shopify_url       text,
  price_cents       int,                                -- display price in cents (e.g., 2999 = $29.99)

  -- Education
  -- Short-form content explaining the product / key ingredient
  -- Rendered on ProductDetailScreen and shown contextually
  education_markdown text,                              -- markdown formatted, rendered in-app

  -- Ordering
  display_order     int not null default 0,             -- sort order in catalog browse
  is_active         boolean not null default true,      -- hide discontinued products without deleting

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_products_active on products (is_active, display_order)
  where is_active = true;
create index idx_products_tags on products using gin (tags);


-- ============================================================================
-- USER STACK ITEMS
-- A product in a user's supplement stack. This is the core of the
-- supplement tracking system.
--
-- Lifecycle:
--   1. User selects product during onboarding
--      a) "Just ordered" → status = 'arriving', activated_at = null
--      b) "I already have this" + slider (e.g., 15 days left)
--         → status = 'active', activated_at = now() - (days_supply - days_remaining)
--         → estimated_depletion_date = now() + days_remaining
--   2. For arriving items: user taps "Arrived? Start tracking"
--      → status = 'active', activated_at = now()
--      → estimated_depletion_date = activated_at + days_supply
--   3. App detects ~5 days before depletion
--      → status = 'running_low'
--   4. Supply hits 0
--      → status = 'reorder'
--   5a. User reorders and resets → status = 'arriving' again (new cycle)
--   5b. 14 days with no action → status = 'archived' (hidden from home screen)
-- ============================================================================

create table user_stack_items (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  product_id                uuid not null references products(id) on delete cascade,

  -- Lifecycle
  status                    stack_item_status not null default 'arriving',
  activated_at              timestamptz,                -- null while 'arriving'
  days_supply               int not null,               -- copied from product.default_days_supply, user-editable
  estimated_depletion_date  date,                       -- calculated: activated_at + days_supply (or set from slider)

  -- Reorder tracking
  -- When a reorder notification is sent, record it so we don't spam
  last_reorder_notified_at  timestamptz,
  reorder_notification_count int not null default 0,

  -- Reorder cycle tracking
  -- Tracks how many times this product has been through a full cycle
  -- (arriving → active → reorder → restart). Used for tapering discount strategy:
  --   cycle 1: 10-15% off
  --   cycle 2: free shipping / 5% off
  --   cycle 3+: no automatic discount
  reorder_cycle_count       int not null default 0,

  -- Archival
  -- Timestamp when item entered 'reorder' status, used to calculate
  -- when to auto-archive (14 days past this date with no action)
  reorder_entered_at        timestamptz,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  -- A user shouldn't have duplicate active entries for the same product
  unique (user_id, product_id)
);

create index idx_stack_user on user_stack_items (user_id, status);

-- For the reorder notification cron: find all items approaching depletion
create index idx_stack_depletion on user_stack_items (estimated_depletion_date, status)
  where status = 'active';

-- For auto-archival: find items stuck in reorder status
create index idx_stack_reorder_age on user_stack_items (reorder_entered_at, status)
  where status = 'reorder';


-- ============================================================================
-- DOSE LOGS
-- Daily supplement check-in. One row per product per day.
-- "Did you take your creatine today?" → yes = a row exists.
--
-- Intentionally simple for v1. No dose amounts, no timing.
-- Just a binary "taken today: yes" per product.
-- If the row doesn't exist for today, it hasn't been taken.
--
-- Important: the reorder system does NOT depend on this data.
-- Supply tracking is based on the calendar countdown, not dose logs.
-- This means reorder notifications work correctly even if a user
-- never logs a single dose. The dose log is a bonus engagement
-- layer, not critical infrastructure.
-- ============================================================================

create table dose_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  stack_item_id   uuid not null references user_stack_items(id) on delete cascade,

  logged_date     date not null,                        -- the calendar date
  logged_at       timestamptz not null default now(),   -- exact timestamp of the tap

  -- Where the dose was logged from (for understanding engagement patterns)
  -- 'home'            → tapped on home screen check-in
  -- 'post_workout'    → tapped on session summary screen
  -- 'notification'    → opened from morning reminder notification
  source          text not null default 'home'
    check (source in ('home', 'post_workout', 'notification', 'stack_screen', 'calendar')),

  -- Prevent double-logging the same product on the same day
  unique (stack_item_id, logged_date)
);

-- "Show me today's check-in status for all my stack items"
create index idx_dose_logs_user_date on dose_logs (user_id, logged_date);

-- "Show me my adherence for this product over the last 30 days"
create index idx_dose_logs_item on dose_logs (stack_item_id, logged_date desc);


-- ============================================================================
-- PROMOTIONS
-- Time-limited deals and discount codes shown in-app.
-- Admin-managed. Users see active promotions on the home screen.
-- ============================================================================

create table promotions (
  id              uuid primary key default gen_random_uuid(),

  -- Display
  title           text not null,                        -- e.g., "Spring Sale — 20% Off Everything"
  description     text,                                 -- details shown on the promotion card
  image_url       text,                                 -- banner image

  -- Discount
  discount_code   text not null,                        -- e.g., "SPRING20"
  discount_label  text,                                 -- e.g., "20% off" (for display, not logic)

  -- Targeting (optional)
  -- Null = store-wide promotion
  -- Populated = only shown to users with these products in their stack
  product_ids     uuid[],                               -- null = applies to all products

  -- Scheduling
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,

  -- Linking
  -- URL to the store with discount applied (or null for code-only)
  shopify_url     text,

  is_active       boolean not null default true,

  created_at      timestamptz not null default now()
);

-- "Show me currently active promotions"
create index idx_promotions_active on promotions (starts_at, ends_at)
  where is_active = true;


-- ============================================================================
-- WORKOUT SUPPLEMENT SUGGESTIONS
-- Maps workout categories/tags to suggested products.
-- Used on the session summary screen for contextual post-workout nudges.
--
-- Simple rule table: "If the completed workout is in category X,
-- suggest product Y with this message."
--
-- Admin-managed. The app reads this after a session completes,
-- picks the top suggestion the user hasn't dismissed too many times,
-- and shows it.
-- ============================================================================

create table workout_supplement_suggestions (
  id              uuid primary key default gen_random_uuid(),

  -- Which workouts trigger this suggestion
  -- Matches against workout categories
  -- e.g., category for 'Push' or 'Legs' or 'HIIT'
  category_id     uuid references categories(id) on delete cascade,

  -- What product to suggest
  product_id      uuid not null references products(id) on delete cascade,

  -- Messaging
  -- Two variants: one for users already tracking this product,
  -- one for users who aren't
  message_if_tracking     text,                         -- e.g., "Don't forget your creatine — tap to log"
  message_if_not_tracking text,                         -- e.g., "Creatine helps with recovery after strength training"

  -- Priority (if multiple suggestions match, show highest priority)
  -- Only ONE suggestion is shown per session — the highest priority match
  priority        int not null default 0,

  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create index idx_suggestions_category on workout_supplement_suggestions (category_id)
  where is_active = true;


-- ============================================================================
-- USER SUGGESTION DISMISSALS
-- Tracks when a user dismisses a post-workout suggestion so we
-- don't keep showing the same one. After 3 dismissals for a
-- specific product, stop suggesting it entirely.
-- ============================================================================

create table user_suggestion_dismissals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  product_id      uuid not null references products(id) on delete cascade,
  dismissal_count int not null default 1,
  last_dismissed_at timestamptz not null default now(),

  unique (user_id, product_id)
);

create index idx_dismissals_user on user_suggestion_dismissals (user_id);


-- ============================================================================
-- WELCOME DISCOUNT TRACKING
-- Records that a user has received their welcome discount code
-- so it's only shown once and can be re-displayed if they
-- haven't used it yet.
-- ============================================================================

create table user_welcome_discounts (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  discount_code   text not null,                        -- e.g., "WELCOME15"
  shown_at        timestamptz not null default now(),
  dismissed_at    timestamptz,                          -- when they dismissed the banner (null = still showing)
  created_at      timestamptz not null default now()
);


-- ============================================================================
-- RLS POLICIES
-- ============================================================================

alter table user_profiles enable row level security;
alter table user_stack_items enable row level security;
alter table dose_logs enable row level security;
alter table user_suggestion_dismissals enable row level security;
alter table user_welcome_discounts enable row level security;

-- Products, promotions, and suggestion rules are read-only for all authenticated users
-- (admin writes happen through Supabase dashboard or admin API)
alter table products enable row level security;
alter table promotions enable row level security;
alter table workout_supplement_suggestions enable row level security;

-- User profiles
create policy "Users can manage their own profile"
  on user_profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Stack items
create policy "Users can manage their own stack"
  on user_stack_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Dose logs
create policy "Users can manage their own dose logs"
  on dose_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Suggestion dismissals
create policy "Users can manage their own dismissals"
  on user_suggestion_dismissals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Welcome discounts
create policy "Users can view their own welcome discount"
  on user_welcome_discounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Products: all authenticated users can read
create policy "Authenticated users can view active products"
  on products for select
  using (auth.role() = 'authenticated' and is_active = true);

-- Promotions: all authenticated users can read active ones
create policy "Authenticated users can view active promotions"
  on promotions for select
  using (auth.role() = 'authenticated' and is_active = true);

-- Suggestion rules: all authenticated users can read
create policy "Authenticated users can view suggestion rules"
  on workout_supplement_suggestions for select
  using (auth.role() = 'authenticated' and is_active = true);


-- ============================================================================
-- HELPFUL VIEWS
-- ============================================================================

-- Home screen stack status: everything needed to render the daily check-in
-- and supply countdown for each product in the user's stack.
-- Excludes archived items so the home screen stays clean.
create or replace view user_stack_status_view as
select
  usi.id as stack_item_id,
  usi.user_id,
  usi.status,
  usi.activated_at,
  usi.days_supply,
  usi.estimated_depletion_date,
  usi.reorder_cycle_count,
  -- Days remaining (null if not yet activated)
  case
    when usi.status = 'arriving' then null
    else greatest(0, usi.estimated_depletion_date - current_date)
  end as days_remaining,
  -- Days since activation (for "Day X of Y" display)
  case
    when usi.activated_at is not null
    then (current_date - usi.activated_at::date)
    else null
  end as days_elapsed,
  -- Was it logged today?
  case
    when dl.id is not null then true
    else false
  end as taken_today,
  -- Product info
  p.id as product_id,
  p.name as product_name,
  p.image_url as product_image_url,
  p.thumbnail_url as product_thumbnail_url,
  p.shopify_url as product_shopify_url
from user_stack_items usi
join products p on p.id = usi.product_id
left join dose_logs dl
  on dl.stack_item_id = usi.id
  and dl.logged_date = current_date
where p.is_active = true
  and usi.status != 'archived';       -- hide archived from default view

-- Adherence stats: per-product adherence percentage over the last 30 days
create or replace view user_adherence_view as
select
  usi.id as stack_item_id,
  usi.user_id,
  p.name as product_name,
  -- Total days the product has been active (up to 30)
  least(30, greatest(1, current_date - usi.activated_at::date)) as trackable_days,
  -- Days actually logged in the last 30
  count(dl.id) as logged_days,
  -- Adherence percentage
  round(
    count(dl.id)::numeric /
    least(30, greatest(1, current_date - usi.activated_at::date))::numeric * 100
  ) as adherence_pct
from user_stack_items usi
join products p on p.id = usi.product_id
left join dose_logs dl
  on dl.stack_item_id = usi.id
  and dl.logged_date >= current_date - interval '30 days'
where usi.status in ('active', 'running_low')
  and usi.activated_at is not null
group by usi.id, usi.user_id, p.name, usi.activated_at;

-- Archived items: for the Stack screen "Want to restart?" section
create or replace view user_archived_stack_view as
select
  usi.id as stack_item_id,
  usi.user_id,
  usi.reorder_entered_at,
  usi.reorder_cycle_count,
  p.id as product_id,
  p.name as product_name,
  p.image_url as product_image_url,
  p.thumbnail_url as product_thumbnail_url
from user_stack_items usi
join products p on p.id = usi.product_id
where usi.status = 'archived'
  and p.is_active = true;


-- ============================================================================
-- NOTES
--
-- Reorder notification scheduling:
-- The status transitions (active → running_low → reorder → archived)
-- can be handled by either:
--   a) A Supabase Edge Function on a cron schedule (recommended)
--      Runs daily:
--      1. active items where estimated_depletion_date <= current_date + 5
--         → set status = 'running_low', trigger push notification
--      2. running_low items where estimated_depletion_date <= current_date
--         → set status = 'reorder', set reorder_entered_at = now()
--      3. reorder items where reorder_entered_at <= current_date - 14
--         → set status = 'archived'
--   b) Client-side on app open (simpler but less reliable)
--      Check stack status on each app open, update if needed
--
-- For v1, client-side is fine. Move to edge function when you want
-- notifications to work even if the user hasn't opened the app.
--
-- Discount code tapering:
-- The reorder_cycle_count on user_stack_items tracks how many times
-- a product has been through a full cycle. The app/notification logic
-- uses this to determine what discount (if any) to include:
--   cycle 0 (first reorder): 10-15% off code
--   cycle 1 (second reorder): free shipping or 5% off
--   cycle 2+ (subsequent): no automatic discount
-- This prevents training users to wait for discounts before buying.
--
-- Shopify deep link integration (POST-MVP):
-- When ready, build a proper deep link that opens the Shopify product
-- page with the discount code auto-applied as a URL parameter.
-- For v1, just display the code in-app for the user to copy manually.
--
-- Shopify purchase auto-sync (POST-MVP):
-- When ready, add a user_shopify_links table and an edge function
-- that syncs order data to auto-create stack items and set
-- activated_at based on delivery date. This replaces the manual
-- "Arrived? Start tracking" flow for users who opt in.
-- ============================================================================