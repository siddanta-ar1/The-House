'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Eye, EyeOff, Star, LogOut, HomeIcon, Award, Settings } from 'lucide-react';
import StatusModal from '@/components/StatusModal';

export default function AdminDashboard() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [totalViews, setTotalViews] = useState(0);

  // Modal State now includes a callback function holder
  const [modal, setModal] = useState({
    open: false,
    msg: '',
    type: 'success' as any,
    onConfirm: undefined as undefined | (() => void)
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/admin');
      } else {
        fetchItems();
        fetchAnalytics();
      }
    });

    // Also listen for auth state changes (e.g., logout in another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/admin');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function fetchItems() {
    const { data } = await supabase.from('menu_items').select('*').order('created_at', { ascending: false });
    setItems(data || []);
  }

  async function fetchAnalytics() {
    // Get count of views
    const { count } = await supabase.from('menu_views').select('*', { count: 'exact', head: true });
    setTotalViews(count || 0);
  }

  const toggleStatus = async (id: string, field: string, currentVal: boolean) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: !currentVal } : i));
    await supabase.from('menu_items').update({ [field]: !currentVal }).eq('id', id);
  };

  const handleDeleteRequest = (id: string) => {
    setModal({
      open: true,
      msg: 'This will permanently remove the item from your database.',
      type: 'confirm',
      onConfirm: () => performDelete(id)
    });
  };

  const performDelete = async (id: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) setModal({ open: true, msg: 'Error deleting item', type: 'error', onConfirm: undefined });
    else fetchItems();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin');
  };

  return (
    <div className="min-h-screen bg-[#F4F1EA] pb-24 text-[#3D2B1F]">
      <StatusModal
        isOpen={modal.open}
        message={modal.msg}
        type={modal.type}
        onClose={() => setModal({ ...modal, open: false })}
        onConfirm={modal.onConfirm}
      />

      {/* Header */}
      <div className="bg-[#1A1A1A] text-white pt-8 pb-6 px-6 rounded-b-[32px] sticky top-0 z-50 shadow-xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-bold text-lg uppercase tracking-widest">Menu Manager</h1>
            <p className="text-[10px] text-stone-400 uppercase tracking-widest">{items.length} Items • {totalViews} Total Views</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push('/')} className="bg-stone-800 p-3 rounded-full hover:bg-stone-700" title="View Site"><HomeIcon size={18} /></button>
            <button onClick={() => router.push('/admin/add')} className="bg-white text-black p-3 rounded-full hover:scale-105 transition-transform" title="Add Menu Item"><Plus size={18} /></button>
            <button onClick={() => router.push('/admin/settings')} className="bg-white text-black p-3 rounded-full hover:scale-105 transition-transform" title="Settings"><Settings size={18} /></button>
            <button onClick={handleLogout} className="bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white p-3 rounded-full transition-colors ml-2" title="Logout"><LogOut size={18} /></button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="p-4 space-y-3 mt-2">
        {items.map(item => (
          <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-[#E5E0D8] flex items-center gap-3">
            <img src={item.image_url || '/placeholder.png'} className="w-14 h-14 rounded-full object-cover border border-stone-100 bg-stone-100" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm truncate uppercase">{item.name}</h3>
              <p className="text-xs text-stone-500 font-bold">Rs.{item.price}</p>
            </div>

            <div className="flex gap-1">
              {/* Permanent Toggle */}
              <button
                onClick={() => toggleStatus(item.id, 'is_permanent', item.is_permanent)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-[10px] transition-colors ${item.is_permanent ? 'bg-[#3D2B1F] text-white' : 'bg-stone-100 text-stone-300'}`}
              >P</button>

              {/* Daily Toggle */}
              <button
                onClick={() => toggleStatus(item.id, 'is_daily', item.is_daily)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${item.is_daily ? 'bg-[#C6A87C] text-white' : 'bg-stone-100 text-stone-300'}`}
                title="Daily Special"
              >
                <Star size={14} fill={item.is_daily ? "currentColor" : "none"} />
              </button>

              {/* Featured Toggle */}
              <button
                onClick={() => toggleStatus(item.id, 'is_featured', item.is_featured)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${item.is_featured ? 'bg-rose-500 text-white' : 'bg-stone-100 text-stone-300'}`}
                title="Featured (Most Popular)"
              >
                <Award size={14} fill={item.is_featured ? "currentColor" : "none"} />
              </button>

              <button
                onClick={() => handleDeleteRequest(item.id)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-stone-100 text-stone-400 hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}