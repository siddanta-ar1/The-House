// components/Footer.tsx
import { Instagram, Facebook, MapPin, Star, ArrowUpRight } from 'lucide-react';

interface FooterProps {
  settings?: any;
}

export default function Footer({ settings }: FooterProps) {
  const cafeName = settings?.cafe_name || 'The House Cafe';
  const reviewUrl = settings?.review_url || '#';
  const instagramUrl = settings?.instagram_url || '#';
  const facebookUrl = settings?.facebook_url || '#';
  const mapEmbedUrl = settings?.map_embed_url || '';
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-stone-900 text-white rounded-t-[3rem] px-8 pt-16 pb-12">
      <div className="max-w-md mx-auto space-y-12">

        {/* Review CTA */}
        {reviewUrl && reviewUrl !== '#' && (
          <div className="text-center space-y-4">
            <div className="flex justify-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
            </div>
            <h2 className="text-xl font-serif italic">Best coffee and vibes in the city!</h2>
            <a
              href={reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-stone-900 px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-transform"
            >
              Leave a Review <ArrowUpRight size={14} />
            </a>
          </div>
        )}

        {/* Map Section */}
        {mapEmbedUrl && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-stone-400 text-[10px] font-bold uppercase tracking-widest">
              <MapPin size={14} /> Find Us
            </div>
            <div className="h-48 rounded-3xl overflow-hidden grayscale contrast-125 border border-stone-800">
              <iframe
                src={mapEmbedUrl}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Location Map"
              ></iframe>
            </div>
          </div>
        )}

        {/* Bottom Bar */}
        <div className="pt-10 border-t border-stone-800 flex flex-col items-center gap-6">
          <div className="flex gap-8">
            {instagramUrl && instagramUrl !== '#' && (
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-stone-800 rounded-full hover:bg-stone-700 transition-colors">
                <Instagram size={20} />
              </a>
            )}
            {facebookUrl && facebookUrl !== '#' && (
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-stone-800 rounded-full hover:bg-stone-700 transition-colors">
                <Facebook size={20} />
              </a>
            )}
          </div>
          <p className="text-[10px] text-stone-500 uppercase tracking-[0.3em]">
            © {currentYear} {cafeName.toUpperCase()}
          </p>
        </div>
      </div>
    </footer>
  );
}