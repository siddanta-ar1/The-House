-- 1. Add PWA Icon support to settings
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS pwa_icon_url text;

-- 2. Create Category Clicks tracking table for "Top Clicked Categories" feature
CREATE TABLE IF NOT EXISTS public.category_clicks (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
    clicked_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT category_clicks_pkey PRIMARY KEY (id)
);

ALTER TABLE public.category_clicks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert category clicks" ON public.category_clicks;
CREATE POLICY "Anyone can insert category clicks" ON public.category_clicks FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can view category clicks" ON public.category_clicks;
CREATE POLICY "Admins can view category clicks" ON public.category_clicks FOR SELECT USING (auth.role() = 'authenticated');

-- 3. Create a dedicated storage bucket for Brand Assets (Logo, PWA Icon)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('brand-assets', 'brand-assets', true) 
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Asset Access" ON storage.objects;
CREATE POLICY "Public Asset Access" ON storage.objects FOR SELECT USING ( bucket_id = 'brand-assets');

DROP POLICY IF EXISTS "Admin Asset Insert" ON storage.objects;
CREATE POLICY "Admin Asset Insert" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'brand-assets' and auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin Asset Update" ON storage.objects;
CREATE POLICY "Admin Asset Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'brand-assets' and auth.role() = 'authenticated');
