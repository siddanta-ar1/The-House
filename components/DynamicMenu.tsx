'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Utensils, Star, Search } from 'lucide-react';
import MenuList from './MenuList'; // The Visual Component

export default function DynamicMenu({ settings }: { settings?: any }) {
  const [activeTab, setActiveTab] = useState<'permanent' | 'daily'>('permanent');
  const [data, setData] = useState<{ items: any[], categories: any[] }>({ items: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function getMenu() {
      const { data: categories } = await supabase.from('categories').select('*').order('display_order');
      const { data: items } = await supabase.from('menu_items').select('*').order('name');

      // Determine visible categories based on current local time
      const now = new Date();
      const currentStr = now.toTimeString().split(' ')[0]; // "14:30:00"

      const visibleCategories = (categories || []).filter(c => {
        if (!c.start_time || !c.end_time) return true;
        // Both times exist. e.g. "08:00:00" to "11:30:00"
        return currentStr >= c.start_time && currentStr <= c.end_time;
      });

      setData({ categories: visibleCategories, items: items || [] });
      setLoading(false);
    }
    getMenu();

    // Analytics tracking (once per session)
    if (typeof window !== 'undefined' && !sessionStorage.getItem('menu_viewed')) {
      supabase.from('menu_views').insert({}).then((res) => {
        if (!res.error) {
          sessionStorage.setItem('menu_viewed', 'true');
        }
      });
    }
  }, []);

  const handleCategoryClick = (categoryId: string) => {
    supabase.from('category_clicks').insert({ category_id: categoryId }).then();
  };

  if (loading) return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-primary uppercase tracking-[0.3em] text-xs font-bold animate-pulse">Loading Menu...</div>
    </div>
  );

  // Logic: Filter items based on the Active Tab and Search Query
  const filteredItems = data.items.filter(i =>
    (activeTab === 'permanent' ? i.is_permanent : i.is_daily) &&
    (i.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="w-full relative z-20">

      {/* --- Floating Tab Switcher --- */}
      <div className="flex justify-center mb-8 sticky top-4 z-50">
        <div className="bg-[#1A1A1A]/90 backdrop-blur border border-stone-800 p-1.5 rounded-full flex shadow-2xl">
          <button
            onClick={() => setActiveTab('permanent')}
            className={`flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'permanent' ? 'bg-[#F4F1EA] text-[#1A1A1A] shadow-md' : 'text-stone-400 hover:text-white'
              }`}
          >
            <Utensils size={12} /> Permanent
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'daily' ? 'bg-[#F4F1EA] text-[#1A1A1A] shadow-md' : 'text-stone-400 hover:text-white'
              }`}
          >
            <Star size={12} /> Daily
          </button>
        </div>
      </div>

      {/* --- Search Bar --- */}
      <div className="px-6 mb-8 max-w-md mx-auto relative z-50">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-primary transition-colors" size={16} />
          <input
            type="text"
            placeholder="Search the menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/80 backdrop-blur border border-[#E5E0D8] rounded-full py-3.5 pl-12 pr-6 text-sm text-[#3D2B1F] placeholder-stone-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
          />
        </div>
      </div>

      {/* --- The Visual Menu Component --- */}
      <MenuList
        categories={data.categories}
        items={filteredItems}
        isDaily={activeTab === 'daily'}
        settings={settings}
        onCategoryClick={handleCategoryClick}
      />

    </div>
  );
}