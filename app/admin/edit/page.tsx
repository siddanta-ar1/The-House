'use client'
import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Camera, Save } from 'lucide-react';
import StatusModal from '@/components/StatusModal';

export default function EditItemPageWrapper() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-stone-50">
                <div className="text-stone-400 uppercase tracking-[0.3em] text-xs font-bold animate-pulse">Loading...</div>
            </div>
        }>
            <EditItemPage />
        </Suspense>
    );
}

function EditItemPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const itemId = searchParams.get('id');

    const [categories, setCategories] = useState<any[]>([]);
    const [form, setForm] = useState({
        name: '', price: '', desc: '', catId: '', type: 'permanent',
        is_vegan: false, is_gf: false, is_spicy: false, contains_nuts: false, is_featured: false
    });
    const [currentImageUrl, setCurrentImageUrl] = useState('');
    const [newImage, setNewImage] = useState<File | null>(null);
    const [modal, setModal] = useState({ open: false, msg: '', type: 'success' as 'success' | 'error' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                router.push('/admin');
            } else {
                loadData();
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router, itemId]);

    async function loadData() {
        if (!itemId) {
            setModal({ open: true, msg: 'No item ID provided.', type: 'error' });
            return;
        }

        const [{ data: cats }, { data: item }] = await Promise.all([
            supabase.from('categories').select('*'),
            supabase.from('menu_items').select('*').eq('id', itemId).single()
        ]);

        setCategories(cats || []);

        if (item) {
            setForm({
                name: item.name || '',
                price: String(item.price || ''),
                desc: item.description || '',
                catId: item.category_id || '',
                type: item.is_daily ? 'daily' : 'permanent',
                is_vegan: item.is_vegan || false,
                is_gf: item.is_gf || false,
                is_spicy: item.is_spicy || false,
                contains_nuts: item.contains_nuts || false,
                is_featured: item.is_featured || false,
            });
            setCurrentImageUrl(item.image_url || '');
        }
        setLoading(false);
    }

    async function handleSave() {
        if (!form.name || !form.price || !form.catId) {
            setModal({ open: true, msg: 'Name, price, and category are required.', type: 'error' });
            return;
        }

        try {
            let imageUrl = currentImageUrl;

            // Upload new image if one was selected
            if (newImage) {
                const fileName = `${Date.now()}-${newImage.name}`;
                const { error: upErr } = await supabase.storage.from('menu-images').upload(fileName, newImage);
                if (upErr) throw upErr;
                const { data: { publicUrl } } = supabase.storage.from('menu-images').getPublicUrl(fileName);
                imageUrl = publicUrl;
            }

            const { error: dbErr } = await supabase.from('menu_items').update({
                name: form.name,
                price: Number(form.price),
                description: form.desc,
                category_id: form.catId,
                image_url: imageUrl,
                is_permanent: form.type === 'permanent',
                is_daily: form.type === 'daily',
                is_vegan: form.is_vegan,
                is_gf: form.is_gf,
                is_spicy: form.is_spicy,
                contains_nuts: form.contains_nuts,
                is_featured: form.is_featured
            }).eq('id', itemId);

            if (dbErr) throw dbErr;

            setModal({ open: true, msg: 'Item updated successfully!', type: 'success' });
            setTimeout(() => router.push('/admin/dashboard'), 1500);
        } catch (e) {
            setModal({ open: true, msg: 'Failed to update. Try again.', type: 'error' });
        }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
            <div className="text-stone-400 uppercase tracking-[0.3em] text-xs font-bold animate-pulse">Loading Item...</div>
        </div>
    );

    const previewUrl = newImage ? URL.createObjectURL(newImage) : currentImageUrl;

    return (
        <div className="min-h-screen bg-stone-50 p-6 text-stone-900">
            <StatusModal isOpen={modal.open} message={modal.msg} type={modal.type} onClose={() => setModal({ ...modal, open: false })} />

            <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-stone-500 font-bold uppercase text-xs tracking-widest hover:text-stone-800">
                <ArrowLeft size={16} /> Cancel
            </button>

            <h1 className="text-2xl font-bold mb-8 text-stone-900 uppercase tracking-tight">Edit Item</h1>

            <div className="space-y-4">
                {/* Image Picker / Preview */}
                <div className="w-full h-40 bg-white border-2 border-dashed border-stone-300 rounded-3xl flex items-center justify-center overflow-hidden relative group hover:border-[#C6A87C] transition-colors">
                    {previewUrl ? (
                        <label className="relative w-full h-full cursor-pointer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={previewUrl} alt="Item preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                <span className="text-white text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                    Change Image
                                </span>
                            </div>
                            <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={e => setNewImage(e.target.files?.[0] || null)} />
                        </label>
                    ) : (
                        <label className="flex flex-col items-center cursor-pointer p-10 w-full h-full justify-center">
                            <Camera className="text-stone-300 mb-2 group-hover:text-[#C6A87C]" />
                            <span className="text-[10px] uppercase font-bold text-stone-400 group-hover:text-[#C6A87C]">Tap to upload</span>
                            <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={e => setNewImage(e.target.files?.[0] || null)} />
                        </label>
                    )}
                </div>

                <input placeholder="Item Name" className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

                <select className="input-field" value={form.catId} onChange={e => setForm({ ...form, catId: e.target.value })}>
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <div className="flex gap-4">
                    <input type="number" placeholder="Price" className="input-field flex-1" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                    <select className="input-field flex-1" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                        <option value="permanent">Permanent</option>
                        <option value="daily">Daily Special</option>
                    </select>
                </div>

                <textarea placeholder="Description" className="input-field h-24 pt-4 resize-none" value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} />

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

                <button onClick={handleSave} className="w-full bg-stone-900 text-white py-5 rounded-2xl font-bold uppercase tracking-widest mt-4 shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3">
                    <Save size={18} /> Update Item
                </button>
            </div>
        </div>
    );
}
