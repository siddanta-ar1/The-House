import Header from '@/components/Header';
import DynamicMenu from '@/components/DynamicMenu';
import { supabase } from '@/lib/supabase';

export const revalidate = 0; // Ensure settings are fresh on load

export default async function Home() {
  const { data: settings } = await supabase.from('settings').select('*').single();

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
      <DynamicMenu settings={settings} />
    </main>
  );
}