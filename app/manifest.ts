import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
    const { data: settings } = await supabase.from('settings').select('cafe_name, primary_hex, pwa_icon_url').single();

    const cafeName = settings?.cafe_name || 'The House Cafe';
    const themeColor = settings?.primary_hex || '#C6A87C';
    const iconUrl = settings?.pwa_icon_url || '/favicon.ico';

    return {
        name: cafeName,
        short_name: cafeName,
        description: `${cafeName} — Digital Menu & Experience`,
        start_url: '/',
        display: 'standalone',
        background_color: '#1A1A1A',
        theme_color: themeColor,
        orientation: 'portrait',
        icons: [
            {
                src: iconUrl,
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: iconUrl,
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    };
}
