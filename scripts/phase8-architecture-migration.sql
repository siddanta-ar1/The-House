-- ============================================================
-- Architecture Improvement Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Phase 1: Dual Menu Mode (no schema change needed, 'both' is just a new menu_mode value)

-- Phase 2: Multi-Video Support
CREATE TABLE IF NOT EXISTS public.promo_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_url TEXT NOT NULL,
  title TEXT DEFAULT '',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.promo_videos ENABLE ROW LEVEL SECURITY;

-- Public can read promo videos
CREATE POLICY "Public read promo_videos" ON public.promo_videos
  FOR SELECT USING (true);

-- Only authenticated users can manage promo videos
CREATE POLICY "Auth insert promo_videos" ON public.promo_videos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth update promo_videos" ON public.promo_videos
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth delete promo_videos" ON public.promo_videos
  FOR DELETE USING (auth.role() = 'authenticated');

-- Phase 5: Dynamic tagline
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT 'Premium Coffee & Cozy Vibes';
