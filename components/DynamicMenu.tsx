'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Utensils, Star } from 'lucide-react';
import MenuList from './MenuList'; // The Visual Component

export default function DynamicMenu() {
  const [activeTab, setActiveTab] = useState<'permanent' | 'daily'>('permanent');
  const [data, setData] = useState<{items: any[], categories: any[]}>({ items: [], categories: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getMenu() {
      const { data: categories } = await supabase.from('categories').select('*').order('display_order');
      const { data: items } = await supabase.from('menu_items').select('*').order('name');
      setData({ categories: categories || [], items: items || [] });
      setLoading(false);
    }
    getMenu();
  }, []);

  if (loading) return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-[#C6A87C] uppercase tracking-[0.3em] text-xs font-bold animate-pulse">Loading Menu...</div>
    </div>
  );

  // Logic: Filter items based on the Active Tab
  const filteredItems = data.items.filter(i => activeTab === 'permanent' ? i.is_permanent : i.is_daily);

  return (
    <div className="w-full relative z-20">
      
      {/* --- Floating Tab Switcher --- */}
      <div className="flex justify-center mb-8 sticky top-4 z-50">
        <div className="bg-[#1A1A1A]/90 backdrop-blur border border-stone-800 p-1.5 rounded-full flex shadow-2xl">
          <button
            onClick={() => setActiveTab('permanent')}
            className={`flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
              activeTab === 'permanent' ? 'bg-[#F4F1EA] text-[#1A1A1A] shadow-md' : 'text-stone-400 hover:text-white'
            }`}
          >
            <Utensils size={12} /> Permanent
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
              activeTab === 'daily' ? 'bg-[#F4F1EA] text-[#1A1A1A] shadow-md' : 'text-stone-400 hover:text-white'
            }`}
          >
            <Star size={12} /> Daily
          </button>
        </div>
      </div>

      {/* --- The Visual Menu Component --- */}
      <MenuList categories={data.categories} items={filteredItems} isDaily={activeTab === 'daily'} />
      
    </div>
  );
}