'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Palette, Store, Share2, Megaphone } from 'lucide-react';
import StatusModal from '@/components/StatusModal';

export default function SettingsPage() {
    const router = useRouter();
    const [modal, setModal] = useState({ open: false, msg: '', type: 'success' as any });
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        // Brand & Theme
        primary_hex: '#C6A87C',
        background_theme: 'cream-paper',
        font_family: 'serif',
        menu_layout: 'list',
        // Business Profile
        cafe_name: 'The House Cafe',
        address: '',
        map_embed_url: '',
        logo_url: '',
        // Social Links
        instagram_url: '',
        facebook_url: '',
        review_url: '',
        // Marketing
        promo_banner_text: ''
    });

    useEffect(() => {
        // Security check
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) router.push('/admin');
            else fetchSettings();
        });
    }, [router]);

    async function fetchSettings() {
        const { data, error } = await supabase.from('settings').select('*').single();
        if (data && !error) {
            setSettings(data);
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setSaving(true);
        const { error } = await supabase.from('settings').update(settings).eq('id', true);
        setSaving(false);

        if (error) {
            setModal({ open: true, msg: 'Failed to save settings: ' + error.message, type: 'error' });
        } else {
            setModal({ open: true, msg: 'Settings updated successfully!', type: 'success' });
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
                <h1 className="font-bold text-lg uppercase tracking-widest text-[#E5E0D8]">Settings</h1>
                <div className="w-8"></div> {/* Spacer for centering */}
            </div>

            <div className="p-6 max-w-2xl mx-auto space-y-8 mt-4">

                {/* Theming Section */}
                <section className="bg-white p-6 rounded-[24px] shadow-sm border border-[#E5E0D8]">
                    <div className="flex items-center gap-2 mb-6 text-[#1A1A1A]">
                        <Palette size={20} />
                        <h2 className="font-bold text-lg uppercase tracking-wider">Brand & Layout</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Primary Color Hex</label>
                            <div className="flex gap-2">
                                <input type="color" name="primary_hex" value={settings.primary_hex} onChange={handleChange} className="h-12 w-12 rounded cursor-pointer border-0 p-0" />
                                <input type="text" name="primary_hex" value={settings.primary_hex} onChange={handleChange} className="input-field flex-1" placeholder="#C6A87C" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Menu Layout</label>
                            <select name="menu_layout" value={settings.menu_layout} onChange={handleChange} className="input-field w-full bg-white">
                                <option value="list">Classic List (Text Right)</option>
                                <option value="grid">Visual Grid (Large Images)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Typography Style</label>
                            <select name="font_family" value={settings.font_family} onChange={handleChange} className="input-field w-full bg-white">
                                <option value="serif">Elegant Serif (Playfair)</option>
                                <option value="sans">Modern Sans (Inter)</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Business Profile Section */}
                <section className="bg-white p-6 rounded-[24px] shadow-sm border border-[#E5E0D8]">
                    <div className="flex items-center gap-2 mb-6 text-[#1A1A1A]">
                        <Store size={20} />
                        <h2 className="font-bold text-lg uppercase tracking-wider">Business Profile</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Cafe Name</label>
                            <input type="text" name="cafe_name" value={settings.cafe_name} onChange={handleChange} className="input-field" placeholder="The House Cafe" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Address</label>
                            <input type="text" name="address" value={settings.address} onChange={handleChange} className="input-field" placeholder="123 Main St..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Google Maps Embed URL</label>
                            <textarea name="map_embed_url" value={settings.map_embed_url} onChange={handleChange} className="input-field text-xs h-20" placeholder="<iframe src='...' ></iframe>" />
                            <p className="text-[10px] text-stone-400 mt-1">Paste the full iframe HTML from Google Maps.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Logo URL (Optional)</label>
                            <input type="text" name="logo_url" value={settings.logo_url} onChange={handleChange} className="input-field" placeholder="https://..." />
                        </div>
                    </div>
                </section>

                {/* Social Links Section */}
                <section className="bg-white p-6 rounded-[24px] shadow-sm border border-[#E5E0D8]">
                    <div className="flex items-center gap-2 mb-6 text-[#1A1A1A]">
                        <Share2 size={20} />
                        <h2 className="font-bold text-lg uppercase tracking-wider">Socials & Reviews</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Instagram URL</label>
                            <input type="text" name="instagram_url" value={settings.instagram_url} onChange={handleChange} className="input-field" placeholder="https://instagram.com/..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Facebook URL</label>
                            <input type="text" name="facebook_url" value={settings.facebook_url} onChange={handleChange} className="input-field" placeholder="https://facebook.com/..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Google Review Link</label>
                            <input type="text" name="review_url" value={settings.review_url} onChange={handleChange} className="input-field" placeholder="https://g.page/r/..." />
                        </div>
                    </div>
                </section>

                {/* Marketing Banner */}
                <section className="bg-white p-6 rounded-[24px] shadow-sm border border-[#E5E0D8]">
                    <div className="flex items-center gap-2 mb-6 text-[#1A1A1A]">
                        <Megaphone size={20} />
                        <h2 className="font-bold text-lg uppercase tracking-wider">Promo Banner</h2>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Top Banner Text</label>
                        <textarea name="promo_banner_text" value={settings.promo_banner_text} onChange={handleChange} className="input-field h-20" placeholder="Ask about our weekend high-tea specials!" />
                        <p className="text-[10px] text-stone-400 mt-1">Leave blank to hide the banner.</p>
                    </div>
                </section>

            </div>

            {/* Sticky Save Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-stone-200 z-40 pb-safe">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full max-w-md mx-auto flex items-center justify-center gap-2 bg-[#1A1A1A] text-white py-4 rounded-2xl font-bold uppercase tracking-widest shadow-xl disabled:opacity-50"
                >
                    {saving ? 'Saving...' : <><Save size={20} /> Save Settings</>}
                </button>
            </div>

        </div>
    );
}
