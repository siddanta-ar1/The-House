'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Plus, X } from 'lucide-react';
import StatusModal from '@/components/StatusModal';

export default function AddItemPage() {
  const router = useRouter();

  // Security Check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/admin');
      } else {
        fetchCats();
      }
    });
  }, [router]);

  // ... keep existing state definitions ...
  const [categories, setCategories] = useState<any[]>([]);
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatStart, setNewCatStart] = useState('');
  const [newCatEnd, setNewCatEnd] = useState('');
  const [form, setForm] = useState({
    name: '', price: '', desc: '', catId: '', type: 'permanent',
    is_vegan: false, is_gf: false, is_spicy: false, contains_nuts: false, is_featured: false
  });
  const [image, setImage] = useState<File | null>(null);
  const [modal, setModal] = useState({ open: false, msg: '', type: 'success' as 'success' | 'error' });

  async function fetchCats() {
    const { data } = await supabase.from('categories').select('*');
    setCategories(data || []);
  }

  // ... keep addCategory and handleSubmit functions exactly as before ...
  async function addCategory() {
    if (!newCatName) return;
    const catData: any = { name: newCatName };
    if (newCatStart) catData.start_time = newCatStart;
    if (newCatEnd) catData.end_time = newCatEnd;

    const { error } = await supabase.from('categories').insert(catData);
    if (!error) {
      fetchCats();
      setShowCatModal(false);
      setNewCatName('');
      setNewCatStart('');
      setNewCatEnd('');
    }
  }

  async function handleSubmit() {
    if (!image || !form.name || !form.price || !form.catId) {
      setModal({ open: true, msg: 'Please fill all fields and upload an image.', type: 'error' });
      return;
    }

    try {
      const fileName = `${Date.now()}-${image.name}`;
      const { error: upErr } = await supabase.storage.from('menu-images').upload(fileName, image);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('menu-images').getPublicUrl(fileName);

      const { error: dbErr } = await supabase.from('menu_items').insert({
        name: form.name,
        price: Number(form.price),
        description: form.desc,
        category_id: form.catId,
        image_url: publicUrl,
        is_permanent: form.type === 'permanent',
        is_daily: form.type === 'daily',
        is_vegan: form.is_vegan,
        is_gf: form.is_gf,
        is_spicy: form.is_spicy,
        contains_nuts: form.contains_nuts,
        is_featured: form.is_featured
      });

      if (dbErr) throw dbErr;

      setModal({ open: true, msg: 'Item added successfully!', type: 'success' });
      setTimeout(() => router.push('/admin/dashboard'), 1500);
    } catch (e) {
      setModal({ open: true, msg: 'Upload failed. Try again.', type: 'error' });
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6 text-stone-900">
      <StatusModal isOpen={modal.open} message={modal.msg} type={modal.type} onClose={() => setModal({ ...modal, open: false })} />

      <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-stone-500 font-bold uppercase text-xs tracking-widest hover:text-stone-800">
        <ArrowLeft size={16} /> Cancel
      </button>

      <h1 className="text-2xl font-bold mb-8 text-stone-900 uppercase tracking-tight">Add New Item</h1>

      <div className="space-y-4">
        {/* Image Picker */}
        <div className="w-full h-40 bg-white border-2 border-dashed border-stone-300 rounded-3xl flex items-center justify-center overflow-hidden relative group hover:border-[#C6A87C] transition-colors">
          {image ? (
            <img src={URL.createObjectURL(image)} className="w-full h-full object-cover" />
          ) : (
            <label className="flex flex-col items-center cursor-pointer p-10 w-full h-full justify-center">
              <Camera className="text-stone-300 mb-2 group-hover:text-[#C6A87C]" />
              <span className="text-[10px] uppercase font-bold text-stone-400 group-hover:text-[#C6A87C]">Tap to upload</span>
              <input type="file" className="hidden" onChange={e => setImage(e.target.files?.[0] || null)} />
            </label>
          )}
        </div>

        {/* Inputs use the .input-field class from globals.css which forces text color */}
        <input placeholder="Item Name" className="input-field" onChange={e => setForm({ ...form, name: e.target.value })} />

        <div className="flex gap-2">
          <select className="input-field flex-1" onChange={e => setForm({ ...form, catId: e.target.value })}>
            <option value="">Select Category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={() => setShowCatModal(true)} className="bg-stone-900 text-white rounded-2xl w-14 flex items-center justify-center active:scale-95 transition-transform">
            <Plus />
          </button>
        </div>

        <div className="flex gap-4">
          <input type="number" placeholder="Price" className="input-field flex-1" onChange={e => setForm({ ...form, price: e.target.value })} />
          <select className="input-field flex-1" onChange={e => setForm({ ...form, type: e.target.value })}>
            <option value="permanent">Permanent</option>
            <option value="daily">Daily Special</option>
          </select>
        </div>

        <textarea placeholder="Description" className="input-field h-24 pt-4 resize-none" onChange={e => setForm({ ...form, desc: e.target.value })} />

        <div className="pt-2">
          <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-3">Badges & Options</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setForm({ ...form, is_vegan: !form.is_vegan })} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border ${form.is_vegan ? 'bg-green-600 border-green-600 text-white' : 'bg-transparent border-stone-200 text-stone-500 hover:border-stone-400'}`}>Vegan</button>
            <button type="button" onClick={() => setForm({ ...form, is_gf: !form.is_gf })} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border ${form.is_gf ? 'bg-orange-500 border-orange-500 text-white' : 'bg-transparent border-stone-200 text-stone-500 hover:border-stone-400'}`}>GF</button>
            <button type="button" onClick={() => setForm({ ...form, is_spicy: !form.is_spicy })} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border ${form.is_spicy ? 'bg-red-500 border-red-500 text-white' : 'bg-transparent border-stone-200 text-stone-500 hover:border-stone-400'}`}>Spicy 🌶️</button>
            <button type="button" onClick={() => setForm({ ...form, contains_nuts: !form.contains_nuts })} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border ${form.contains_nuts ? 'bg-amber-800 border-amber-800 text-white' : 'bg-transparent border-stone-200 text-stone-500 hover:border-stone-400'}`}>Has Nuts</button>
            <button type="button" onClick={() => setForm({ ...form, is_featured: !form.is_featured })} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border ${form.is_featured ? 'bg-[#C6A87C] border-[#C6A87C] text-white' : 'bg-transparent border-stone-200 text-stone-500 hover:border-stone-400'}`}>Featured ⭐️</button>
          </div>
        </div>

        <button onClick={handleSubmit} className="w-full bg-stone-900 text-white py-5 rounded-2xl font-bold uppercase tracking-widest mt-4 shadow-xl active:scale-95 transition-transform">
          Save Item
        </button>
      </div>

      {/* New Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end">
          <div className="bg-white w-full rounded-t-[32px] p-8 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between mb-6">
              <h3 className="font-bold text-lg text-stone-900">New Category</h3>
              <button onClick={() => setShowCatModal(false)}><X size={20} className="text-stone-500" /></button>
            </div>
            <input
              placeholder="e.g. Smoothies"
              className="input-field mb-4 bg-stone-50"
              autoFocus
              onChange={e => setNewCatName(e.target.value)}
            />
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-2">Start Time</label>
                <input type="time" className="input-field bg-stone-50 py-3" onChange={e => setNewCatStart(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest ml-2">End Time</label>
                <input type="time" className="input-field bg-stone-50 py-3" onChange={e => setNewCatEnd(e.target.value)} />
              </div>
            </div>
            <button onClick={addCategory} className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold uppercase tracking-widest">Create Category</button>
          </div>
        </div>
      )}
    </div>
  );
}