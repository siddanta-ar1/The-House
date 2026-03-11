-- ============================================================
-- SRMS — Production Indexes
-- Optimized for all critical query paths
-- ============================================================

-- Hot-path: Kitchen fetching active orders
-- Query: WHERE restaurant_id = $1 AND status IN ('pending', 'preparing')
CREATE INDEX CONCURRENTLY idx_orders_active
  ON orders (restaurant_id, placed_at DESC)
  WHERE status IN ('pending', 'confirmed', 'preparing');

-- Hot-path: Session validation on every customer request
-- Query: WHERE session_token = $1 AND status = 'active'
CREATE UNIQUE INDEX idx_sessions_token_active
  ON sessions (session_token)
  WHERE status = 'active';

-- Menu items full-text search
CREATE INDEX idx_menu_items_fts
  ON menu_items
  USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Covering index for menu page render (avoids heap fetch)
CREATE INDEX idx_menu_items_covering
  ON menu_items (restaurant_id, category_id, sort_order)
  INCLUDE (name, price, image_url, is_available, tags);

-- Analytics: order aggregation by date
CREATE INDEX idx_orders_analytics
  ON orders (restaurant_id, DATE_TRUNC('day', placed_at), status)
  INCLUDE (total_amount);

-- Prevent duplicate active sessions per table
CREATE UNIQUE INDEX idx_sessions_one_active_per_table
  ON sessions (table_id)
  WHERE status = 'active';
