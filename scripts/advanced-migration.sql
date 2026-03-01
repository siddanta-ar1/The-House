-- IMPORTANT: Run this SQL snippet in your Supabase project's SQL Editor

-- 1. Create the Settings Table
-- We only ever want one row here, so we'll use a boolean 'is_singleton' constraint.
CREATE TABLE public.settings (
    id boolean PRIMARY KEY DEFAULT true,
    CONSTRAINT settings_singleton CHECK (id),
    
    -- Brand & Theme
    primary_hex text DEFAULT '#C6A87C',
    background_theme text DEFAULT 'cream-paper',
    font_family text DEFAULT 'serif',
    menu_layout text DEFAULT 'list',
    
    -- Business Profile
    cafe_name text DEFAULT 'The House Cafe',
    address text DEFAULT 'Bharatpur, Chitwan',
    map_embed_url text,
    logo_url text,
    
    -- Social Links
    instagram_url text,
    facebook_url text,
    review_url text,
    
    -- Marketing
    promo_banner_text text,
    
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Insert the default singleton row so we can always just UPDATE it later.
INSERT INTO public.settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- 2. Update Categories Table for Time-Based Visibility
ALTER TABLE public.categories 
ADD COLUMN start_time time without time zone,
ADD COLUMN end_time time without time zone;

-- 3. Create Analytics/Views Table
CREATE TABLE public.menu_views (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    viewed_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT menu_views_pkey PRIMARY KEY (id)
);

-- 4. Supabase Auth & RLS (Row Level Security) Policies
-- Enable RLS on all tables so they are secure by default.
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_views ENABLE ROW LEVEL SECURITY;

-- 5. Policies for Public Read Access
-- Anyone can read the settings, categories, and menu items.
CREATE POLICY "Public profiles are viewable by everyone." 
ON public.settings FOR SELECT USING (true);

CREATE POLICY "Categories are viewable by everyone." 
ON public.categories FOR SELECT USING (true);

CREATE POLICY "Menu items are viewable by everyone." 
ON public.menu_items FOR SELECT USING (true);

-- Allow anyone to insert a view (for analytics tracking)
CREATE POLICY "Anyone can insert a view." 
ON public.menu_views FOR INSERT WITH CHECK (true);


-- 6. Policies for Authenticated Admin Access
-- Only authenticated users (Admins/Staff) can UPDATE, INSERT, or DELETE.
CREATE POLICY "Admins can update settings." 
ON public.settings FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert categories." 
ON public.categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins can update categories." 
ON public.categories FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can delete categories." 
ON public.categories FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert menu items." 
ON public.menu_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins can update menu items." 
ON public.menu_items FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can delete menu items." 
ON public.menu_items FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can view analytics."
ON public.menu_views FOR SELECT USING (auth.role() = 'authenticated');

-- Note: We assume anyone logging in via Supabase Auth is an admin for now.
-- In Phase 2, we will add the Supabase Auth logic to the frontend apps.
