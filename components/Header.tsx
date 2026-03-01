import { Coffee, Lock } from 'lucide-react';
import Link from 'next/link';

export default function Header({ settings }: { settings?: any }) {
  return (
    <header className="relative bg-[#1A1A1A] text-[#F4F1EA] pt-10 pb-6 px-6 text-center z-10">

      {/* Admin Lock Icon (Top Right) */}
      <div className="absolute top-6 right-6">
        <Link href="/admin">
          <Lock className="w-4 h-4 text-stone-600 hover:text-white transition-colors" />
        </Link>
      </div>

      <div className="flex flex-col items-center">
        {settings?.logo_url ? (
          <div className="mb-2 h-20 w-auto">
            <img src={settings.logo_url} alt={settings?.cafe_name || "Logo"} className="h-full w-auto object-contain" />
          </div>
        ) : (
          <>
            {/* Brand Icon */}
            <div className="mb-4">
              <Coffee size={28} className="text-[#F4F1EA]" />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold tracking-[0.1em] uppercase text-white mb-2">
              {settings?.cafe_name || "The House"}
            </h1>
          </>
        )}

        {/* Subtitle */}
        <p className="text-[9px] text-primary tracking-[0.4em] uppercase font-bold">
          {settings?.tagline || 'Premium Coffee & Cozy Vibes'}
        </p>
      </div>
    </header>
  );
}