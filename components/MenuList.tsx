import { MapPin, Instagram, Facebook, Coffee, Flame, Sparkles } from 'lucide-react';

interface Props {
  categories: any[];
  items: any[];
  isDaily: boolean;
  image?: string | null;
  settings?: any;
  onCategoryClick?: (categoryId: string) => void;
}

export default function MenuList({ categories, items, isDaily, settings, onCategoryClick }: Props) {
  const reviewLink = settings?.review_url || "#";

  return (
    <div className="bg-[#F4F1EA] text-[#3D2B1F] rounded-t-[40px] px-6 py-10 min-h-[70vh] shadow-[0_-10px_60px_rgba(0,0,0,0.5)] relative overflow-hidden">

      {/* Paper Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/cream-paper.png")` }}></div>

      <div className="relative z-10">

        {/* Header Title on Paper */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 border border-[#3D2B1F] rounded-full mb-3 opacity-80">
            <Coffee size={18} />
          </div>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-[#3D2B1F] uppercase">
            {isDaily ? 'Today\'s Specials' : 'The Menu'}
          </h2>
        </div>

        {/* --- MOST POPULAR SECTION --- */}
        {!isDaily && items.filter(i => i.is_featured).length > 0 && (
          <div className="mb-14 bg-white/40 p-5 rounded-3xl border border-primary/40 shadow-sm relative backdrop-blur-sm">
            <div className="absolute -top-3.5 left-6 bg-primary text-white text-[9px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
              <Sparkles size={12} fill="currentColor" /> Signature Picks
            </div>

            <div className="space-y-6 mt-4">
              {items.filter(i => i.is_featured).slice(0, 3).map(item => (
                <div key={`featured-${item.id}`} className={`flex items-start gap-4 group ${item.is_out_of_stock ? 'opacity-40 grayscale' : ''}`}>

                  {/* --- IMAGE IMPLEMENTATION --- */}
                  {item.image_url && (
                    <div className="flex-shrink-0 w-16 h-16 rounded-full overflow-hidden border border-[#3D2B1F]/20 shadow-sm mt-1">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 flex justify-between items-start">
                    <div className="pr-4">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                        <h4 className="font-sans font-bold text-[#3D2B1F] text-[15px] uppercase tracking-wide leading-tight">
                          {item.name}
                        </h4>
                        {/* Badges */}
                        {item.is_vegan && <span className="text-[8px] bg-green-100 text-green-800 font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider border border-green-200">Vegan</span>}
                        {item.is_gf && <span className="text-[8px] bg-orange-100 text-orange-800 font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider border border-orange-200">GF</span>}
                        {item.is_spicy && <span className="text-[8px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider flex items-center gap-0.5 border border-red-200"><Flame size={8} /> Spicy</span>}
                        {item.contains_nuts && <span className="text-[8px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider border border-amber-200">Nuts</span>}
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-[#6C6C6C] font-serif italic mt-1 leading-snug">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div className="font-bold text-[#3D2B1F] text-[15px] font-sans whitespace-nowrap">
                      <span className="text-xs align-top mr-0.5">Rs.</span>{item.price}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- CATEGORY LOOP --- */}
        {categories.map(cat => {
          const catItems = items.filter(i => i.category_id === cat.id);
          if (catItems.length === 0) return null;

          return (
            <div key={cat.id} className="mb-14 last:mb-0">

              {/* Borcelle Header: Icon + Name + Lines */}
              <div
                className="flex items-center gap-4 mb-8 cursor-pointer group"
                onClick={() => onCategoryClick && onCategoryClick(cat.id)}
              >
                <div className="h-[1px] flex-1 bg-[#3D2B1F]/30 group-hover:bg-primary transition-colors" />
                <h3 className="text-xl font-serif font-bold uppercase tracking-[0.2em] text-[#3D2B1F] px-2 group-hover:text-primary transition-colors">
                  {cat.name}
                </h3>
                <div className="h-[1px] flex-1 bg-[#3D2B1F]/30 group-hover:bg-primary transition-colors" />
              </div>

              {/* Items List/Grid */}
              <div className={settings?.menu_layout === 'grid' ? "grid grid-cols-2 gap-x-4 gap-y-8" : "space-y-8"}>
                {catItems.map(item => (
                  <div key={item.id} className={`${settings?.menu_layout === 'grid' ? "flex flex-col" : "flex items-start gap-4"} group ${item.is_out_of_stock ? 'opacity-40 grayscale' : ''}`}>

                    {/* --- IMAGE IMPLEMENTATION --- */}
                    {item.image_url && (
                      <div className={`${settings?.menu_layout === 'grid' ? "w-full aspect-square rounded-2xl mb-3" : "flex-shrink-0 w-16 h-16 rounded-full mt-1"} overflow-hidden border border-[#3D2B1F]/20 shadow-sm`}>
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className={settings?.menu_layout === 'grid' ? "w-full" : "flex-1 flex justify-between items-start"}>
                      <div className={settings?.menu_layout === 'grid' ? "mb-1" : "pr-4"}>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                          <h4 className="font-sans font-bold text-[#3D2B1F] text-[15px] uppercase tracking-wide leading-tight">
                            {item.name}
                          </h4>
                          {/* Badges */}
                          {item.is_vegan && <span className="text-[8px] bg-green-100 text-green-800 font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider border border-green-200">Vegan</span>}
                          {item.is_gf && <span className="text-[8px] bg-orange-100 text-orange-800 font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider border border-orange-200">GF</span>}
                          {item.is_spicy && <span className="text-[8px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider flex items-center gap-0.5 border border-red-200"><Flame size={8} /> Spicy</span>}
                          {item.contains_nuts && <span className="text-[8px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider border border-amber-200">Nuts</span>}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-[#6C6C6C] font-serif italic mt-1 leading-snug">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className={`font-bold text-[#3D2B1F] text-[15px] font-sans whitespace-nowrap ${settings?.menu_layout === 'grid' ? 'mt-1' : ''}`}>
                        <span className="text-xs align-top mr-0.5">Rs.</span>{item.price}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="text-center py-24 opacity-40 font-serif italic text-lg">
            No items available here today.
          </div>
        )}

        {/* --- FOOTER (Integrated into Paper) --- */}
        <div className="mt-20 pt-10 border-t border-[#D6D0C4] text-center">
          <h3 className="text-[#3D2B1F] font-bold text-[10px] uppercase tracking-[0.3em] mb-6 flex items-center justify-center gap-2">
            <MapPin size={14} /> Location
          </h3>

          {/* Map Embed */}
          <div className="w-full h-40 bg-stone-200 grayscale hover:grayscale-0 transition-all duration-700 rounded-2xl overflow-hidden mb-8 border border-[#D6D0C4]">
            {settings?.map_embed_url ? (
              <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: settings.map_embed_url }} />
            ) : (
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3532.859664539999!2d84.441617!3d27.690708!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjfCsDQxJzI2LjUiTiA4NMKwMjYnMzAuMCJF!5e0!3m2!1sen!2snp!4v1634567890" // Replace with actual map embed
                width="100%" height="100%" style={{ border: 0 }} loading="lazy"
              ></iframe>
            )}
          </div>

          <div className="flex justify-center gap-8 text-[#3D2B1F] mb-10">
            {settings?.instagram_url && <a href={settings.instagram_url} target="_blank" className="hover:text-primary transition-colors"><Instagram /></a>}
            {settings?.facebook_url && <a href={settings.facebook_url} target="_blank" className="hover:text-primary transition-colors"><Facebook /></a>}
            {!settings?.instagram_url && !settings?.facebook_url && (
              <>
                <a href="#" className="hover:text-primary transition-colors"><Instagram /></a>
                <a href="#" className="hover:text-primary transition-colors"><Facebook /></a>
              </>
            )}
          </div>

          <a
            href={reviewLink}
            target="_blank"
            className="inline-block bg-[#3D2B1F] text-[#F4F1EA] px-8 py-4 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-transform hover:bg-black"
          >
            Leave a Review
          </a>

          <p className="text-[9px] text-[#8C8C8C] uppercase tracking-[0.3em] mt-10">
            © {new Date().getFullYear()} {settings?.cafe_name || 'The House Cafe'}
          </p>
        </div>

      </div>
    </div>
  );
}