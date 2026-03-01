'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Image as ImageIcon, Upload, Trash2, GripVertical, AlertCircle } from 'lucide-react';
import StatusModal from '@/components/StatusModal';

interface GalleryImage {
    id: string;
    image_url: string;
    display_order: number;
}

export default function GalleryManager() {
    const router = useRouter();
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [uploading, setUploading] = useState(false);
    const [modal, setModal] = useState({ open: false, msg: '', type: 'success' as 'success' | 'error' });

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) router.push('/admin');
            else fetchImages();
        });
    }, [router]);

    async function fetchImages() {
        const { data, error } = await supabase
            .from('gallery_images')
            .select('*')
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (data && !error) {
            setImages(data);
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        let successCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;

            try {
                const { error: upErr } = await supabase.storage.from('gallery-assets').upload(fileName, file);
                if (upErr) throw upErr;

                const { data: { publicUrl } } = supabase.storage.from('gallery-assets').getPublicUrl(fileName);

                // Add to database
                const { error: dbErr } = await supabase.from('gallery_images').insert({
                    image_url: publicUrl,
                    display_order: images.length + i // append to end
                });

                if (!dbErr) successCount++;
            } catch (error) {
                console.error("Upload failed for", file.name, error);
            }
        }

        setUploading(false);

        if (successCount > 0) {
            setModal({ open: true, msg: `Successfully added ${successCount} image(s).`, type: 'success' });
            fetchImages();
        } else {
            setModal({ open: true, msg: 'Failed to upload images.', type: 'error' });
        }
    };

    const handleDelete = async (id: string, imageUrl: string) => {
        if (!confirm('Are you sure you want to delete this image?')) return;

        // Remove from DB
        await supabase.from('gallery_images').delete().eq('id', id);

        // Optimistic UI update
        setImages(images.filter(img => img.id !== id));

        // Optional: Clean up storage bucket using substring matching
        try {
            const urlObj = new URL(imageUrl);
            const pathParts = urlObj.pathname.split('/');
            const fileName = pathParts[pathParts.length - 1];
            if (fileName) {
                await supabase.storage.from('gallery-assets').remove([fileName]);
            }
        } catch (e) { /* ignore cleanup errors */ }
    };

    // Simple array swap for reordering
    const moveImage = async (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === images.length - 1)
        ) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        const newImages = [...images];

        // Swap
        const temp = newImages[index];
        newImages[index] = newImages[newIndex];
        newImages[newIndex] = temp;

        // Update display_order property
        const updatedImages = newImages.map((img, i) => ({ ...img, display_order: i }));
        setImages(updatedImages); // Optimistic UI

        // Batch update DB
        for (const img of updatedImages) {
            await supabase.from('gallery_images').update({ display_order: img.display_order }).eq('id', img.id);
        }
    };

    return (
        <div className="min-h-screen bg-[#F4F1EA] pb-24 text-[#3D2B1F] font-sans">
            <StatusModal
                isOpen={modal.open}
                message={modal.msg}
                type={modal.type}
                onClose={() => setModal({ ...modal, open: false })}
            />

            {/* Header */}
            <div className="bg-[#1A1A1A] text-white pt-8 pb-6 px-6 rounded-b-[32px] sticky top-0 z-50 shadow-xl flex items-center justify-between">
                <button onClick={() => router.push('/admin/dashboard')} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div className="text-center">
                    <h1 className="font-bold text-lg uppercase tracking-widest text-[#E5E0D8]">Gallery</h1>
                    <p className="text-[10px] text-stone-400 uppercase tracking-widest">{images.length} Images</p>
                </div>
                <div className="w-8"></div> {/* Spacer */}
            </div>

            <div className="p-6 max-w-3xl mx-auto mt-4 space-y-6">

                {/* Uploader Box */}
                <section className="bg-white p-8 rounded-[24px] shadow-sm border border-[#E5E0D8] text-center">
                    <div className="w-16 h-16 bg-[#F4F1EA] text-[#C6A87C] rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
                        <ImageIcon size={32} />
                    </div>
                    <h2 className="font-bold text-xl uppercase tracking-widest text-[#3D2B1F] mb-2">Upload Atmosphere</h2>
                    <p className="text-xs text-stone-500 mb-6 max-w-sm mx-auto">
                        Add photos of your restaurant's interior, exterior, or signature dishes to build your customer-facing masonry gallery.
                    </p>

                    <div className="relative inline-block">
                        <button
                            disabled={uploading}
                            className="flex items-center gap-2 bg-[#1A1A1A] text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest shadow-xl disabled:opacity-50 hover:bg-black transition-colors"
                        >
                            {uploading ? 'Processing...' : <><Upload size={18} /> Select Multiple Images</>}
                        </button>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-wait"
                        />
                    </div>
                </section>

                {/* Gallery Grid Manager */}
                <section className="bg-white p-6 rounded-[24px] shadow-sm border border-[#E5E0D8]">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-[#3D2B1F]">Manage Order</h3>
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-1 rounded font-bold uppercase flex items-center gap-1">
                            <AlertCircle size={10} /> Live on app
                        </span>
                    </div>

                    {images.length === 0 ? (
                        <div className="py-12 text-center text-stone-400 font-serif italic">
                            Your gallery is empty. Upload some photos above!
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {images.map((img, index) => (
                                <div key={img.id} className="flex items-center gap-4 bg-stone-50 p-3 rounded-2xl border border-stone-200 group">
                                    <div className="flex flex-col gap-1 text-stone-300">
                                        <button
                                            onClick={() => moveImage(index, 'up')}
                                            disabled={index === 0}
                                            className="p-1 hover:text-[#1A1A1A] hover:bg-stone-200 rounded disabled:opacity-30"
                                        >
                                            ▲
                                        </button>
                                        <button
                                            onClick={() => moveImage(index, 'down')}
                                            disabled={index === images.length - 1}
                                            className="p-1 hover:text-[#1A1A1A] hover:bg-stone-200 rounded disabled:opacity-30"
                                        >
                                            ▼
                                        </button>
                                    </div>

                                    <img src={img.image_url} className="w-20 h-20 object-cover rounded-xl shadow-sm border border-stone-200" />

                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-stone-400 font-mono truncate">{img.image_url.split('/').pop()}</p>
                                        <p className="text-[10px] font-bold text-stone-600 uppercase mt-1">Order: {index + 1}</p>
                                    </div>

                                    <button
                                        onClick={() => handleDelete(img.id, img.image_url)}
                                        className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                        title="Delete Image"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

            </div>
        </div>
    );
}
