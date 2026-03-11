-- ============================================================
-- SRMS COMPREHENSIVE SEED DATA
-- Run this after the core schema migration (001_core_schema.sql)
-- This provides complete demo data for testing all panels
-- ============================================================

-- ============================================================
-- 1. RBAC Roles
-- ============================================================
INSERT INTO roles (id, name, description) VALUES
  (1, 'super_admin', 'Full system access, billing, multi-restaurant'),
  (2, 'manager', 'Menu management, staff management, reports'),
  (3, 'kitchen', 'Order queue view and status mutation only'),
  (4, 'waiter', 'Session open/close, table management, delivery'),
  (5, 'customer', 'Menu browsing and order placement within session')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Demo Restaurant
-- ============================================================
INSERT INTO restaurants (id, name, slug)
VALUES ('11111111-1111-1111-1111-111111111111', 'The House Cafe', 'the-house')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 3. Settings (Theme + Features)
-- ============================================================
INSERT INTO settings (restaurant_id, theme, features)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '{
    "primaryColor": "#E85D04",
    "secondaryColor": "#1B263B",
    "fontFamily": "Inter",
    "borderRadius": "lg",
    "menuLayout": "grid"
  }'::jsonb,
  '{
    "tipsEnabled": true,
    "feedbackEnabled": true,
    "geofenceEnabled": false,
    "geofenceRadiusMeters": 100
  }'::jsonb
)
ON CONFLICT (restaurant_id) DO NOTHING;

-- ============================================================
-- 4. Tables (8 tables — realistic restaurant floor)
-- ============================================================
INSERT INTO tables (id, restaurant_id, label, qr_token, capacity) VALUES
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', 'T1', 'table-t1-token', 2),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', 'T2', 'table-t2-token', 2),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111111', 'T3', 'table-t3-token', 4),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'T4', 'table-t4-token', 4),
  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111111', 'T5', 'table-t5-token', 6),
  ('22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111111', 'T6', 'table-t6-token', 6),
  ('22222222-2222-2222-2222-222222222207', '11111111-1111-1111-1111-111111111111', 'T7', 'table-t7-token', 8),
  ('22222222-2222-2222-2222-222222222208', '11111111-1111-1111-1111-111111111111', 'T8', 'table-t8-token', 10)
ON CONFLICT (qr_token) DO NOTHING;

-- ============================================================
-- 5. Menu Categories
-- ============================================================
INSERT INTO menu_categories (id, restaurant_id, name, sort_order) VALUES
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111111', 'Appetizers', 1),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111111', 'Main Course', 2),
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111111', 'Specialty Coffee', 3),
  ('33333333-3333-3333-3333-333333333304', '11111111-1111-1111-1111-111111111111', 'Desserts', 4),
  ('33333333-3333-3333-3333-333333333305', '11111111-1111-1111-1111-111111111111', 'Cold Beverages', 5)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. Menu Items (25 items across all categories)
-- ============================================================

-- Appetizers
INSERT INTO menu_items (id, restaurant_id, category_id, name, description, price, preparation_min, is_available, allergens, tags) VALUES
  ('44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333301',
   'Bruschetta Trio', 'Classic tomato, mushroom truffle, and ricotta honey on ciabatta', 8.50, 8, true, ARRAY['gluten', 'dairy'], ARRAY['vegetarian', 'popular']),
  ('44444444-4444-4444-4444-444444444402', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333301',
   'Crispy Calamari', 'Lightly fried calamari with garlic aioli and lemon wedge', 10.00, 10, true, ARRAY['gluten', 'seafood'], ARRAY['popular']),
  ('44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333301',
   'House Salad', 'Mixed greens, cherry tomatoes, avocado, feta, balsamic vinaigrette', 7.50, 5, true, ARRAY['dairy'], ARRAY['vegetarian', 'healthy']),
  ('44444444-4444-4444-4444-444444444404', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333301',
   'Garlic Butter Shrimp', 'Pan-seared shrimp in herb garlic butter with toasted bread', 12.00, 12, true, ARRAY['shellfish', 'gluten', 'dairy'], ARRAY['chef-pick']),
  ('44444444-4444-4444-4444-444444444405', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333301',
   'Soup of the Day', 'Ask your server for today''s seasonal selection', 6.00, 5, true, ARRAY[]::TEXT[], ARRAY['daily-special'])
ON CONFLICT (id) DO NOTHING;

-- Main Course
INSERT INTO menu_items (id, restaurant_id, category_id, name, description, price, preparation_min, is_available, allergens, tags) VALUES
  ('44444444-4444-4444-4444-444444444406', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333302',
   'Grilled Ribeye Steak', '10oz USDA Choice ribeye with roasted garlic mashed potatoes and seasonal vegetables', 28.00, 20, true, ARRAY['dairy'], ARRAY['popular', 'chef-pick']),
  ('44444444-4444-4444-4444-444444444407', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333302',
   'Pan-Seared Salmon', 'Atlantic salmon with citrus glaze, wild rice, and asparagus', 24.00, 18, true, ARRAY['fish'], ARRAY['healthy', 'popular']),
  ('44444444-4444-4444-4444-444444444408', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333302',
   'Truffle Mushroom Risotto', 'Arborio rice with mixed wild mushrooms, parmesan, truffle oil', 18.00, 15, true, ARRAY['dairy', 'gluten'], ARRAY['vegetarian', 'popular']),
  ('44444444-4444-4444-4444-444444444409', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333302',
   'Classic Beef Burger', 'Angus patty, cheddar, lettuce, tomato, pickles, house sauce, brioche bun', 16.00, 12, true, ARRAY['gluten', 'dairy'], ARRAY['popular']),
  ('44444444-4444-4444-4444-444444444410', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333302',
   'Chicken Parmesan', 'Breaded chicken breast, marinara, mozzarella, spaghetti', 17.50, 15, true, ARRAY['gluten', 'dairy'], ARRAY[])
ON CONFLICT (id) DO NOTHING;

-- Specialty Coffee
INSERT INTO menu_items (id, restaurant_id, category_id, name, description, price, preparation_min, is_available, allergens, tags) VALUES
  ('44444444-4444-4444-4444-444444444411', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333303',
   'Espresso', 'Double shot of our signature house blend', 3.50, 3, true, ARRAY[]::TEXT[], ARRAY['hot']),
  ('44444444-4444-4444-4444-444444444412', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333303',
   'Cappuccino', 'Espresso with steamed milk and thick foam', 4.50, 4, true, ARRAY['dairy'], ARRAY['hot', 'popular']),
  ('44444444-4444-4444-4444-444444444413', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333303',
   'Cafe Latte', 'Espresso with silky steamed milk', 4.50, 4, true, ARRAY['dairy'], ARRAY['hot']),
  ('44444444-4444-4444-4444-444444444414', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333303',
   'Flat White', 'Double ristretto with velvety micro-foam milk', 5.00, 4, true, ARRAY['dairy'], ARRAY['hot', 'popular']),
  ('44444444-4444-4444-4444-444444444415', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333303',
   'Pour Over', 'Single origin hand-brewed pour over — ask for today''s roast', 5.50, 6, true, ARRAY[]::TEXT[], ARRAY['hot', 'chef-pick'])
ON CONFLICT (id) DO NOTHING;

-- Desserts
INSERT INTO menu_items (id, restaurant_id, category_id, name, description, price, preparation_min, is_available, allergens, tags) VALUES
  ('44444444-4444-4444-4444-444444444416', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333304',
   'Tiramisu', 'Classic Italian ladyfinger cake with espresso and mascarpone', 9.00, 5, true, ARRAY['dairy', 'gluten', 'eggs'], ARRAY['popular']),
  ('44444444-4444-4444-4444-444444444417', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333304',
   'Molten Chocolate Cake', 'Warm dark chocolate lava cake with vanilla bean ice cream', 10.00, 12, true, ARRAY['dairy', 'gluten', 'eggs'], ARRAY['chef-pick']),
  ('44444444-4444-4444-4444-444444444418', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333304',
   'Crème Brûlée', 'Classic vanilla custard with caramelized sugar crust', 8.50, 5, true, ARRAY['dairy', 'eggs'], ARRAY['popular']),
  ('44444444-4444-4444-4444-444444444419', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333304',
   'Seasonal Fruit Tart', 'Buttery pastry shell with pastry cream and fresh seasonal fruits', 8.00, 5, true, ARRAY['dairy', 'gluten', 'eggs'], ARRAY['vegetarian']),
  ('44444444-4444-4444-4444-444444444420', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333304',
   'Affogato', 'Vanilla gelato drowned in a shot of hot espresso', 6.50, 3, true, ARRAY['dairy'], ARRAY['popular'])
ON CONFLICT (id) DO NOTHING;

-- Cold Beverages
INSERT INTO menu_items (id, restaurant_id, category_id, name, description, price, preparation_min, is_available, allergens, tags) VALUES
  ('44444444-4444-4444-4444-444444444421', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333305',
   'Iced Americano', 'Double espresso over ice with cold water', 4.00, 3, true, ARRAY[]::TEXT[], ARRAY['cold', 'popular']),
  ('44444444-4444-4444-4444-444444444422', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333305',
   'Cold Brew', 'Slow-steeped 18-hour cold brew, smooth and bold', 5.00, 2, true, ARRAY[]::TEXT[], ARRAY['cold', 'popular']),
  ('44444444-4444-4444-4444-444444444423', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333305',
   'Fresh Lemonade', 'Hand-squeezed lemonade with mint and honey', 4.50, 3, true, ARRAY[]::TEXT[], ARRAY['cold', 'vegetarian']),
  ('44444444-4444-4444-4444-444444444424', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333305',
   'Mango Smoothie', 'Fresh mango, yogurt, honey, and ice', 6.00, 4, true, ARRAY['dairy'], ARRAY['cold', 'healthy']),
  ('44444444-4444-4444-4444-444444444425', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333305',
   'Sparkling Water', 'San Pellegrino 500ml', 3.00, 1, true, ARRAY[]::TEXT[], ARRAY['cold'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DONE! You now have:
--   • 1 restaurant
--   • 1 settings record (theme config)
--   • 8 tables (T1-T8, capacities 2-10)
--   • 5 menu categories
--   • 25 menu items with descriptions, allergens, and tags
--
-- Next steps:
--   1. Create a Supabase Auth user via the dashboard or signup flow
--   2. INSERT INTO users (id, restaurant_id, full_name, role_id)
--      VALUES ('<auth-user-uuid>', '11111111-...', 'Your Name', 1);
--   3. Log in at /admin with your credentials
-- ============================================================
