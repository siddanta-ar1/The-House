-- Phase 4.3: Multi-language support
-- Run in Supabase SQL Editor

-- Ensure translations table has correct unique constraint for upsert
ALTER TABLE public.translations
    DROP CONSTRAINT IF EXISTS translations_restaurant_lang_type_entity_key;

ALTER TABLE public.translations
    ADD CONSTRAINT translations_restaurant_lang_type_entity_key
    UNIQUE (restaurant_id, language_code, entity_type, entity_id);

-- Ensure supported_languages table has unique constraint
ALTER TABLE public.supported_languages
    DROP CONSTRAINT IF EXISTS supported_languages_restaurant_lang_key;

ALTER TABLE public.supported_languages
    ADD CONSTRAINT supported_languages_restaurant_lang_key
    UNIQUE (restaurant_id, language_code);

-- Seed English as the default language for all existing restaurants
INSERT INTO public.supported_languages (restaurant_id, language_code, language_name, is_default, is_active, sort_order)
SELECT id, 'en', 'EN', true, true, 10
FROM public.restaurants
ON CONFLICT (restaurant_id, language_code) DO NOTHING;

-- To enable Nepali for a specific restaurant, run:
-- INSERT INTO public.supported_languages (restaurant_id, language_code, language_name, is_default, is_active, sort_order)
-- VALUES ('<restaurant_id>', 'ne', 'नेपाली', false, true, 20)
-- ON CONFLICT (restaurant_id, language_code) DO NOTHING;

-- Or use the admin menu UI: the "Enable Nepali" button in /admin/menu calls ensureNepaliLanguage()
-- which auto-inserts this row.

-- RLS: translations are publicly readable (for customer menu), writable by service_role
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read translations" ON public.translations
    FOR SELECT USING (true);

CREATE POLICY "Service role write translations" ON public.translations
    FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.supported_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read supported_languages" ON public.supported_languages
    FOR SELECT USING (true);

CREATE POLICY "Service role write supported_languages" ON public.supported_languages
    FOR ALL USING (auth.role() = 'service_role');
