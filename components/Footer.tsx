// components/Footer.tsx
import { Instagram, Facebook, MapPin, Star, ArrowUpRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-stone-900 text-white mt-20 rounded-t-[3rem] px-8 pt-16 pb-12">
      <div className="max-w-md mx-auto space-y-12">
        
        {/* Review CTA */}
        <div className="text-center space-y-4">
          <div className="flex justify-center gap-1 text-amber-400">
            {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
          </div>
          <h2 className="text-xl font-serif italic">Best coffee and vibes in the city!</h2>
          <a 
            href="https://www.google.com/search?q=the+house+caffee&oq=the+&gs_lcrp=EgZjaHJvbWUqBggAEEUYOzIGCAAQRRg7MgYIARBFGDkyBggCEEUYOzIGCAMQRRg7MgYIBBBFGD0yBggFEEUYPTIGCAYQRRg9MgYIBxBFGEHSAQgyMDU1ajBqN6gCCLACAfEFzE7QGDoaehPxBcxO0Bg6GnoT&sourceid=chrome&ie=UTF-8&lqi=Cg50aGUgaG91c2UgY2FmZSIDiAEBSP7ag_TeuoCACFoaEAAQARACGAAYASIOdGhlIGhvdXNlIGNhZmWSARFicnVuY2hfcmVzdGF1cmFudJoBJENoZERTVWhOTUc5blMwVkpRMEZuU1VSaWJIQXpkWFIzUlJBQvoBBAgAEC0#lkt=LocalPoiReviews&rlimm=14749441452503669747&lrd=0x3994fb000b760fc9:0xccb08adaebe71bf3,3,,,," // Dynamic link here
            target="_blank"
            className="inline-flex items-center gap-2 bg-white text-stone-900 px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-transform"
          >
            Leave a Review <ArrowUpRight size={14} />
          </a>
        </div>

        {/* Map Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-stone-400 text-[10px] font-bold uppercase tracking-widest">
            <MapPin size={14} /> Find the House
          </div>
          <div className="h-48 rounded-3xl overflow-hidden grayscale contrast-125 border border-stone-800">
             <iframe 
              src="https://www.google.com/maps/place/The+house/@27.6832102,84.4682385,13.41z/data=!4m6!3m5!1s0x3994fb000b760fc9:0xccb08adaebe71bf3!8m2!3d27.6987839!4d84.4230369!16s%2Fg%2F11vrr81wcz?hl=en-IN&entry=ttu&g_ep=EgoyMDI1MTIwOS4wIKXMDSoKLDEwMDc5MjA3M0gBUAM%3D"
            ></iframe>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-10 border-t border-stone-800 flex flex-col items-center gap-6">
          <div className="flex gap-8">
            <a href="#" className="p-3 bg-stone-800 rounded-full hover:bg-stone-700 transition-colors"><Instagram size={20} /></a>
            <a href="#" className="p-3 bg-stone-800 rounded-full hover:bg-stone-700 transition-colors"><Facebook size={20} /></a>
          </div>
          <p className="text-[10px] text-stone-500 uppercase tracking-[0.3em]">
            © 2025 THE HOUSE CAFE
          </p>
        </div>
      </div>
    </footer>
  );
}