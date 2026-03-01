import Header from '@/components/Header';
import DynamicMenu from '@/components/DynamicMenu';
import FlipbookMenuWrapper from '@/components/FlipbookMenuWrapper';
import AtmosphereGallery from '@/components/AtmosphereGallery';
import PromoVideo from '@/components/PromoVideo';
import BusinessDetails from '@/components/BusinessDetails';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';

import { Metadata } from 'next';

export const revalidate = 0; // Ensure settings are fresh on load

export async function generateMetadata(): Promise<Metadata> {
  const { data: settings } = await supabase.from('settings').select('*').single();

  if (settings?.pwa_icon_url) {
    return {
      title: settings?.cafe_name || "The House Cafe",
      icons: {
        icon: settings.pwa_icon_url,
        apple: settings.pwa_icon_url,
      },
      appleWebApp: {
        capable: true,
        title: settings?.cafe_name || "The House Cafe",
        statusBarStyle: 'black-translucent',
      },
    };
  }

  return { title: settings?.cafe_name || "The House Cafe" };
}

export default async function Home() {
  const [
    { data: settings },
    { data: images }
  ] = await Promise.all([
    supabase.from('settings').select('*').single(),
    supabase.from('gallery_images').select('*').order('display_order', { ascending: true })
  ]);

  // Compute theme variables
  const primaryHex = settings?.primary_hex || '#C6A87C';
  const bgColor = settings?.background_theme === 'midnight-dark' ? '#1A1A1A' : '#F4F1EA';
  const textColor = settings?.background_theme === 'midnight-dark' ? '#F4F1EA' : '#3D2B1F';
  const fontFam = settings?.font_family === 'sans' ? 'var(--font-sans)' : 'var(--font-serif)';

  return (
    <main
      className="min-h-screen flex flex-col font-sans transition-colors duration-500"
      style={{
        '--app-primary': primaryHex,
        '--app-bg': bgColor,
        '--app-text': textColor,
        fontFamily: fontFam
      } as React.CSSProperties}
    >
      {/* Promo Banner */}
      {settings?.promo_banner_text && (
        <div
          className="text-white text-xs font-bold text-center py-2 px-4 uppercase tracking-widest"
          style={{ backgroundColor: primaryHex }}
        >
          {settings.promo_banner_text}
        </div>
      )}

      <Header settings={settings} />

      {settings?.menu_mode === 'flipbook' && settings?.pdf_url ? (
        <FlipbookMenuWrapper pdfUrl={settings.pdf_url} />
      ) : (
        <DynamicMenu settings={settings} />
      )}

      {/* Atmosphere Gallery */}
      {settings?.is_gallery_enabled && images && images.length > 0 && (
        <AtmosphereGallery images={images} />
      )}

      {/* Promo Video */}
      {settings?.promo_video_url && (
        <PromoVideo videoUrl={settings.promo_video_url} />
      )}

      {/* Business Details (About, Amenities, Hours) */}
      {settings?.business_info && (
        <BusinessDetails
          businessInfo={settings.business_info}
          address={settings?.address}
        />
      )}

      <Footer settings={settings} />
    </main>
  );
}