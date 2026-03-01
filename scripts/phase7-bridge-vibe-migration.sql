-- 1. Add new columns to the Settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS menu_mode text DEFAULT 'list',
ADD COLUMN IF NOT EXISTS pdf_url text,
ADD COLUMN IF NOT EXISTS promo_video_url text,
ADD COLUMN IF NOT EXISTS is_video_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS business_info jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_business_info_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_gallery_enabled boolean DEFAULT false;

-- 2. Create the Gallery Images table
CREATE TABLE IF NOT EXISTS public.gallery_images (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    image_url text NOT NULL,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT gallery_images_pkey PRIMARY KEY (id)
);

-- 3. Enable RLS on Gallery Images
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

-- 4. Policies for Gallery Images
CREATE POLICY "Gallery images are viewable by everyone." 
ON public.gallery_images FOR SELECT USING (true);

CREATE POLICY "Admins can insert gallery images." 
ON public.gallery_images FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can update gallery images." 
ON public.gallery_images FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete gallery images." 
ON public.gallery_images FOR DELETE USING (auth.role() = 'authenticated');

-- 5. Set up Storage Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('menu-pdfs', 'menu-pdfs', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('gallery-assets', 'gallery-assets', true) 
ON CONFLICT (id) DO NOTHING;

-- 6. Storage Bucket Policies (If not already handled by Supabase Dashboard)
-- Allows public to view files
CREATE POLICY "Public Read Access menu-pdfs" ON storage.objects FOR SELECT USING (bucket_id = 'menu-pdfs');
CREATE POLICY "Public Read Access gallery-assets" ON storage.objects FOR SELECT USING (bucket_id = 'gallery-assets');

-- Allows authenticated users to upload/modify/delete
CREATE POLICY "Admin Insert menu-pdfs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'menu-pdfs' AND auth.role() = 'authenticated');
CREATE POLICY "Admin Update menu-pdfs" ON storage.objects FOR UPDATE USING (bucket_id = 'menu-pdfs' AND auth.role() = 'authenticated');
CREATE POLICY "Admin Delete menu-pdfs" ON storage.objects FOR DELETE USING (bucket_id = 'menu-pdfs' AND auth.role() = 'authenticated');

CREATE POLICY "Admin Insert gallery-assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gallery-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Admin Update gallery-assets" ON storage.objects FOR UPDATE USING (bucket_id = 'gallery-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Admin Delete gallery-assets" ON storage.objects FOR DELETE USING (bucket_id = 'gallery-assets' AND auth.role() = 'authenticated');
