-- Check the existing bucket and update its allowed_mime_types to include .ico formats
UPDATE storage.buckets
SET allowed_mime_types = array_append(
    array_append(
        COALESCE(allowed_mime_types, ARRAY['image/webp', 'image/jpeg', 'image/png']::text[]),
        'image/x-icon'
    ),
    'image/vnd.microsoft.icon'
)
WHERE id = 'menu-images' AND 
      NOT ('image/x-icon' = ANY(COALESCE(allowed_mime_types, ARRAY[]::text[])));

UPDATE storage.buckets
SET allowed_mime_types = array_append(
    array_append(
        COALESCE(allowed_mime_types, ARRAY['image/webp', 'image/jpeg', 'image/png']::text[]),
        'image/x-icon'
    ),
    'image/vnd.microsoft.icon'
)
WHERE id = 'brand-assets' AND 
      NOT ('image/x-icon' = ANY(COALESCE(allowed_mime_types, ARRAY[]::text[])));
