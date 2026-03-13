-- ============================================================================
-- SUPPLEMENT SEED DATA
-- Products, supplement suggestions, and promotions for testing
-- Depends on: 003_supplement_schema.sql and seed.sql (for category IDs)
-- ============================================================================

-- Products
WITH inserted_products AS (
  INSERT INTO products (id, name, short_description, description, tags, default_days_supply, price_cents, display_order, education_markdown) VALUES
    (gen_random_uuid(), 'Creatine Monohydrate', 'Build strength & power', 'Micronized creatine monohydrate for improved strength, power output, and muscle recovery. Mix one scoop (5g) with water daily.', '{"strength", "daily", "post_workout"}', 30, 2999, 1,
     E'## What is Creatine?\n\nCreatine is one of the most researched supplements in sports nutrition. It helps your muscles produce energy during heavy lifting and high-intensity exercise.\n\n## How It Works\n\nCreatine increases your phosphocreatine stores, allowing your body to produce more ATP — the key energy source for heavy lifting and high-intensity exercise.\n\n## How to Take It\n\n- **Daily dose:** 5g (one scoop)\n- **Timing:** Any time of day — consistency matters more than timing\n- **Mix with:** Water, juice, or your post-workout shake\n\n## What to Expect\n\n- Week 1-2: Muscles may feel fuller due to increased water retention\n- Week 3-4: Noticeable strength improvements on compound lifts\n- Ongoing: Sustained performance benefits with daily use'),

    (gen_random_uuid(), 'Whey Protein Isolate', 'Fast-absorbing post-workout protein', 'Premium whey protein isolate with 25g protein per scoop. Low lactose, fast absorption. Ideal post-workout or as a meal supplement.', '{"post_workout", "recovery", "daily"}', 30, 4499, 2,
     E'## Why Protein Matters\n\nProtein is essential for muscle repair and growth. After training, your muscles need amino acids to recover and come back stronger.\n\n## Why Whey Isolate?\n\nWhey isolate is filtered to remove most fat and lactose, giving you a purer protein source that absorbs quickly — perfect for post-workout recovery.\n\n## How to Take It\n\n- **Post-workout:** 1 scoop within 30-60 minutes after training\n- **Daily use:** 1-2 scoops to meet your protein goals\n- **Mix with:** Water, milk, or blend into a smoothie\n\n## Nutrition Per Scoop\n\n- 25g protein\n- 2g carbs\n- 1g fat\n- 120 calories'),

    (gen_random_uuid(), 'Pre-Workout Formula', 'Energy & focus for intense sessions', 'Comprehensive pre-workout with caffeine, beta-alanine, and citrulline for energy, endurance, and pump. Take 20-30 minutes before training.', '{"pre_workout", "energy"}', 30, 3499, 3,
     E'## Pre-Workout Explained\n\nDesigned to boost energy, focus, and endurance so you can train harder and longer.\n\n## Key Ingredients\n\n- **Caffeine (200mg):** Mental alertness and energy\n- **Beta-Alanine (3.2g):** Buffers lactic acid for better endurance\n- **L-Citrulline (6g):** Increases blood flow for better pumps\n\n## How to Take It\n\n- **Timing:** 20-30 minutes before training\n- **Dose:** 1 scoop mixed with 8-12oz water\n- **Note:** Start with half a scoop to assess tolerance\n\n## Tips\n\n- Avoid taking within 6 hours of bedtime\n- The beta-alanine tingle is normal and harmless\n- Stay hydrated during your workout'),

    (gen_random_uuid(), 'BCAAs', 'Reduce soreness & support recovery', 'Branched-chain amino acids (leucine, isoleucine, valine) in a 2:1:1 ratio. Supports muscle recovery and reduces post-workout soreness.', '{"recovery", "post_workout", "cardio"}', 30, 2499, 4,
     E'## BCAAs & Recovery\n\nBranched-chain amino acids (BCAAs) are three essential amino acids — leucine, isoleucine, and valine — that play a key role in muscle protein synthesis and recovery.\n\n## How They Help\n\n- **Reduce muscle soreness** after intense training\n- **Support recovery** between sessions\n- **Preserve muscle** during calorie deficits\n\n## How to Take Them\n\n- **During workout:** Sip 1 scoop mixed with water\n- **Post-workout:** Take with your recovery shake\n- **Ratio:** 2:1:1 (leucine:isoleucine:valine)\n\n## Best For\n\n- Fasted training sessions\n- High-volume training days\n- Recovery between back-to-back sessions'),

    (gen_random_uuid(), 'Electrolyte Mix', 'Stay hydrated during intense training', 'Electrolyte blend with sodium, potassium, and magnesium. Zero sugar, zero calories. Essential for hydration during intense or prolonged training.', '{"hydration", "cardio", "daily"}', 30, 1999, 5,
     E'## Why Electrolytes?\n\nDuring intense exercise, you lose key minerals through sweat — sodium, potassium, and magnesium. Replacing them keeps you performing at your best.\n\n## What''s Inside\n\n- **Sodium (500mg):** The primary electrolyte lost in sweat\n- **Potassium (200mg):** Supports muscle contractions\n- **Magnesium (100mg):** Helps prevent cramping\n\n## How to Take It\n\n- **During workout:** Mix 1 scoop with 16-20oz water, sip throughout\n- **Hot days or long sessions:** Use 2 scoops\n- **Daily use:** 1 scoop with morning water\n\n## Signs You Need More Electrolytes\n\n- Muscle cramps during training\n- Headaches after workouts\n- Feeling dizzy or lightheaded\n- Dark-colored urine'),

    (gen_random_uuid(), 'Fish Oil', 'Joint support & overall health', 'High-potency omega-3 fish oil with EPA and DHA. Supports joint health, recovery, and overall wellness. Enteric-coated to prevent fishy aftertaste.', '{"daily", "recovery", "health"}', 60, 2299, 6,
     E'## Fish Oil Benefits\n\nOmega-3 fatty acids support joint health, reduce inflammation, and promote cardiovascular wellness — all important for active individuals.\n\n## Key Nutrients\n\n- **EPA (720mg):** Anti-inflammatory, supports recovery\n- **DHA (480mg):** Brain health, cognitive function\n\n## How to Take It\n\n- **Daily dose:** 2 softgels with a meal\n- **Timing:** Morning or evening with food (improves absorption)\n- **Supply:** 60-day supply per bottle\n\n## Why It Matters for Training\n\n- Reduces exercise-induced joint inflammation\n- Supports faster recovery between sessions\n- Promotes overall cardiovascular health'),

    (gen_random_uuid(), 'Multivitamin', 'Fill nutritional gaps', 'Complete daily multivitamin formulated for active individuals. Covers key micronutrients that are harder to get from diet alone during intense training.', '{"daily", "health"}', 30, 1999, 7,
     E'## Daily Multivitamin\n\nEven with a good diet, nutritional gaps happen — especially when you''re training hard and your body''s demands are elevated.\n\n## Key Nutrients\n\n- **Vitamin D (2000 IU):** Bone health, immune function\n- **B-Complex:** Energy metabolism\n- **Zinc (15mg):** Immune support, testosterone production\n- **Iron (18mg):** Oxygen transport\n\n## How to Take It\n\n- **Daily dose:** 1 tablet with breakfast\n- **With food:** Always take with a meal for better absorption\n\n## Who Needs It Most\n\n- Anyone training 3+ days per week\n- Those on calorie-restricted diets\n- People with limited dietary variety'),

    (gen_random_uuid(), 'ZMA', 'Sleep quality & recovery', 'Zinc, magnesium, and vitamin B6 formula. Supports deeper sleep, recovery, and natural hormone production. Take before bed on an empty stomach.', '{"recovery", "daily", "sleep"}', 30, 1999, 8,
     E'## ZMA for Recovery\n\nZinc, magnesium, and vitamin B6 work together to support sleep quality, muscle recovery, and natural hormone production.\n\n## What''s Inside\n\n- **Zinc (30mg):** Immune function, testosterone support\n- **Magnesium (450mg):** Muscle relaxation, sleep quality\n- **Vitamin B6 (10.5mg):** Enhances absorption of zinc and magnesium\n\n## How to Take It\n\n- **Timing:** 30-60 minutes before bed\n- **Important:** Take on an empty stomach\n- **Avoid:** Don''t take with calcium or dairy (blocks absorption)\n\n## What to Expect\n\n- More restful, deeper sleep\n- Reduced muscle cramping\n- Better recovery between training sessions')
  RETURNING id, name
),

-- Create a lookup so we can reference products by name
product_lookup AS (
  SELECT id, name FROM inserted_products
),

-- Look up existing categories by name
category_lookup AS (
  SELECT id, name FROM categories
)

-- Supplement Suggestions (map workout categories to products)
INSERT INTO workout_supplement_suggestions (category_id, product_id, message_if_tracking, message_if_not_tracking, priority)
SELECT c.id, p.id, v.message_if_tracking, v.message_if_not_tracking, v.priority
FROM (VALUES
  -- Strength categories (Push, Pull, Legs) → Creatine
  ('Push',      'Creatine Monohydrate', 'Don''t forget your creatine — tap to log today''s dose.', 'Creatine helps build strength after resistance training. Want to add it to your stack?', 10),
  ('Pull',      'Creatine Monohydrate', 'Don''t forget your creatine — tap to log today''s dose.', 'Creatine helps build strength after resistance training. Want to add it to your stack?', 10),
  ('Legs',      'Creatine Monohydrate', 'Don''t forget your creatine — tap to log today''s dose.', 'Creatine helps build strength after resistance training. Want to add it to your stack?', 10),
  -- Cardio/HIIT → Electrolytes
  ('Cardio',    'Electrolyte Mix',      'Rehydrate — tap to log your electrolytes.', 'Electrolytes help you recover from intense cardio. Want to add them to your stack?', 8),
  ('HIIT',      'Electrolyte Mix',      'Rehydrate — tap to log your electrolytes.', 'Electrolytes help you recover after HIIT. Want to add them to your stack?', 8),
  -- Full Body / Core → Protein
  ('Full Body', 'Whey Protein Isolate',  'Time for your protein — tap to log.', 'Protein after training supports muscle recovery. Want to add it to your stack?', 5),
  ('Core',      'Whey Protein Isolate',  'Time for your protein — tap to log.', 'Protein after training supports muscle recovery. Want to add it to your stack?', 5)
) AS v(category_name, product_name, message_if_tracking, message_if_not_tracking, priority)
JOIN category_lookup c ON c.name = v.category_name
JOIN product_lookup  p ON p.name = v.product_name;


-- Active Promotion
INSERT INTO promotions (title, description, discount_code, discount_label, starts_at, ends_at) VALUES
  ('Spring Stack Sale', 'Get 20% off any stack of 3+ products', 'STACK20', '20% off', now(), now() + interval '30 days');