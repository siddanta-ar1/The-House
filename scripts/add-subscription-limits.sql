-- Add subscription limit columns to restaurants table
-- This migration adds max_staff and max_menu_items columns based on subscription tier

ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS max_staff INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_menu_items INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

-- Update existing restaurants based on their subscription tier
UPDATE public.restaurants
SET 
  max_staff = CASE 
    WHEN subscription_tier = 'free' THEN 3
    WHEN subscription_tier = 'basic' THEN 10
    WHEN subscription_tier = 'pro' THEN 50
    WHEN subscription_tier = 'enterprise' THEN 999
    ELSE 10
  END,
  max_menu_items = CASE 
    WHEN subscription_tier = 'free' THEN 20
    WHEN subscription_tier = 'basic' THEN 100
    WHEN subscription_tier = 'pro' THEN 500
    WHEN subscription_tier = 'enterprise' THEN 9999
    ELSE 100
  END
WHERE max_staff IS NULL OR max_menu_items IS NULL;
