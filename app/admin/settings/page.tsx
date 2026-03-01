'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Palette, Store, Share2, Megaphone, Image as ImageIcon, Camera } from 'lucide-react';
import StatusModal from '@/components/StatusModal';

export default function SettingsPage() {
    const router = useRouter();
    const [modal, setModal] = useState({ open: false, msg: '', type: 'success' as 'success' | 'error' });
    const [saving, setSaving] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [pwaFile, setPwaFile] = useState<File | null>(null);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [settings, setSettings] = useState({
        // Brand & Theme
        primary_hex: '#C6A87C',
        background_theme: 'cream-paper',
        font_family: 'serif',
        menu_layout: 'list',
        menu_mode: 'list',
        pdf_url: '',
        is_gallery_enabled: false,
        // Business Profile
        cafe_name: 'The House Cafe',
        address: '',
        map_embed_url: '',
        logo_url: '',
        pwa_icon_url: '',
        promo_video_url: '',
        business_info: {
            about_text: '',
            amenities: { wifi: false, wheelchair: false, pet_friendly: false },
            hours: { monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: '' }
        },
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

    const handleNestedChange = (category: 'business_info', subCategory: string, field: string, value: any) => {
        setSettings({
            ...settings,
            [category]: {
                ...settings[category],
                [subCategory]: {
                    ...(settings[category] as any)[subCategory],
                    [field]: value
                }
            }
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const finalSettings = { ...settings };

            // Upload Logo if changed
            if (logoFile) {
                const fileName = `logo-${Date.now()}-${logoFile.name}`;
                const { error: upErr } = await supabase.storage.from('brand-assets').upload(fileName, logoFile);
                if (upErr) throw upErr;
                const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(fileName);
                finalSettings.logo_url = publicUrl;
            }

            // Upload PDF Menu if changed
            if (pdfFile) {
                const fileName = `menu-${Date.now()}-${pdfFile.name}`;
                const { error: upErr } = await supabase.storage.from('menu-pdfs').upload(fileName, pdfFile);
                if (upErr) throw upErr;
                const { data: { publicUrl } } = supabase.storage.from('menu-pdfs').getPublicUrl(fileName);
                finalSettings.pdf_url = publicUrl;
            }

            // Upload PWA if changed
            if (pwaFile) {
                const fileName = `pwa-${Date.now()}-${pwaFile.name}`;
                const { error: upErr } = await supabase.storage.from('brand-assets').upload(fileName, pwaFile);
                if (upErr) throw upErr;
                const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(fileName);
                finalSettings.pwa_icon_url = publicUrl;
            }

            const { error } = await supabase.from('settings').update(finalSettings).eq('id', true);
            if (error) throw error;

            setSettings(finalSettings);
            setModal({ open: true, msg: 'Settings updated successfully!', type: 'success' });
        } catch (error: any) {
            setModal({ open: true, msg: 'Failed to save settings: ' + error.message, type: 'error' });
        } finally {
            setSaving(false);
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
                                <input type="color" name="primary_hex" value={settings.primary_hex || '#C6A87C'} onChange={handleChange} className="h-12 w-12 rounded cursor-pointer border-0 p-0" />
                                <input type="text" name="primary_hex" value={settings.primary_hex || '#C6A87C'} onChange={handleChange} className="input-field flex-1" placeholder="#C6A87C" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Menu Mode (Frontend Display)</label>
                            <select name="menu_mode" value={settings.menu_mode || 'list'} onChange={handleChange} className="input-field w-full bg-white font-bold border-stone-800 text-stone-800">
                                <option value="list">Standard Native UI</option>
                                <option value="flipbook">Legacy PDF Flipbook</option>
                            </select>
                            <p className="text-[10px] text-stone-400 mt-2">If Flipbook is selected, the database menu items are bypassed and the PDF below is rendered.</p>
                        </div>

                        {settings.menu_mode === 'flipbook' && (
                            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                                <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Menu PDF File</label>
                                <div className="w-full relative">
                                    <input type="file" accept="application/pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} className="w-full text-xs" />
                                </div>
                                {(pdfFile || settings.pdf_url) && (
                                    <p className="text-[10px] text-green-600 font-bold mt-2">✓ PDF is loaded</p>
                                )}
                            </div>
                        )}

                        <div>
                            <label className="flex items-center gap-3 p-4 border border-stone-200 rounded-xl cursor-pointer hover:bg-stone-50 transition-colors">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        name="is_gallery_enabled"
                                        checked={settings.is_gallery_enabled}
                                        onChange={(e) => setSettings({ ...settings, is_gallery_enabled: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-stone-300 rounded-full peer peer-checked:bg-green-500 transition-colors"></div>
                                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                                </div>
                                <div>
                                    <span className="block text-sm font-bold text-stone-800">Enable Atmosphere Gallery</span>
                                    <span className="block text-[10px] text-stone-500">Displays the masonry photo grid on the customer menu.</span>
                                </div>
                            </label>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Standard Menu Layout</label>
                            <select name="menu_layout" value={settings.menu_layout || 'list'} onChange={handleChange} className="input-field w-full bg-white">
                                <option value="list">Classic List (Text Right)</option>
                                <option value="grid">Visual Grid (Large Images)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Typography Style</label>
                            <select name="font_family" value={settings.font_family || 'serif'} onChange={handleChange} className="input-field w-full bg-white">
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
                            <input type="text" name="cafe_name" value={settings.cafe_name || ''} onChange={handleChange} className="input-field" placeholder="The House Cafe" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Address</label>
                            <input type="text" name="address" value={settings.address || ''} onChange={handleChange} className="input-field" placeholder="123 Main St..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Google Maps Embed URL</label>
                            <textarea name="map_embed_url" value={settings.map_embed_url || ''} onChange={handleChange} className="input-field text-xs h-20" placeholder="<iframe src='...' ></iframe>" />
                            <p className="text-[10px] text-stone-400 mt-1">Paste the full iframe HTML from Google Maps.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Promo Video URL (YouTube/Vimeo)</label>
                            <input type="text" name="promo_video_url" value={settings.promo_video_url || ''} onChange={handleChange} className="input-field" placeholder="https://youtube.com/watch?v=..." />
                            <p className="text-[10px] text-stone-400 mt-1">Leave blank to hide the 'Watch Us in Action' section on your page.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">About The Cafe</label>
                            <textarea
                                value={settings.business_info?.about_text || ''}
                                onChange={(e) => setSettings({ ...settings, business_info: { ...settings.business_info, about_text: e.target.value } })}
                                className="input-field h-24"
                                placeholder="Tell your customers your story..."
                            />
                        </div>

                        {/* Amenities Toggle */}
                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Amenities</label>
                            <div className="flex flex-wrap gap-4 p-4 border border-stone-200 rounded-xl bg-stone-50">
                                {['wifi', 'wheelchair', 'pet_friendly'].map((amenity) => (
                                    <label key={amenity} className="flex items-center gap-2 cursor-pointer text-sm font-bold capitalize text-stone-700">
                                        <input
                                            type="checkbox"
                                            checked={(settings.business_info?.amenities as any)?.[amenity] || false}
                                            onChange={(e) => handleNestedChange('business_info', 'amenities', amenity, e.target.checked)}
                                            className="w-4 h-4 rounded border-stone-300 text-stone-800 focus:ring-stone-800"
                                        />
                                        {amenity.replace('_', ' ')}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Operating Hours */}
                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Operating Hours</label>
                            <div className="space-y-2 p-4 border border-stone-200 rounded-xl bg-stone-50">
                                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                                    <div key={day} className="flex items-center gap-4">
                                        <span className="w-24 text-xs font-bold uppercase tracking-wider text-stone-500">{day}</span>
                                        <input
                                            type="text"
                                            value={(settings.business_info?.hours as any)?.[day] || ''}
                                            onChange={(e) => handleNestedChange('business_info', 'hours', day, e.target.value)}
                                            className="input-field py-1 px-3 text-sm flex-1"
                                            placeholder="e.g. 7:00 AM - 5:00 PM or 'Closed'"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
                <section className="bg-white p-6 rounded-[24px] shadow-sm border border-[#E5E0D8]">
                    <div className="flex items-center gap-2 mb-6 text-[#1A1A1A]">
                        <ImageIcon size={20} />
                        <h2 className="font-bold text-lg uppercase tracking-wider">Brand Assets</h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Main Logo (Optional)</label>
                            <div className="w-full h-32 bg-stone-50 border-2 border-dashed border-stone-300 rounded-2xl flex items-center justify-center overflow-hidden relative group hover:border-[#1A1A1A] transition-colors">
                                {logoFile ? (
                                    <img src={URL.createObjectURL(logoFile)} className="h-full w-auto object-contain" />
                                ) : settings.logo_url ? (
                                    <img src={settings.logo_url} className="h-full w-auto object-contain" />
                                ) : (
                                    <div className="text-center">
                                        <Camera className="text-stone-300 mx-auto mb-2 group-hover:text-[#1A1A1A] transition-colors" />
                                        <span className="text-[10px] uppercase font-bold text-stone-400 group-hover:text-[#1A1A1A] transition-colors">Upload Logo</span>
                                    </div>
                                )}
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
                            </div>
                            <p className="text-[10px] text-stone-400 mt-2">Replaces the text title in the Customer Header if uploaded. Transparent PNG recommended.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">App Icon (PWA)</label>
                            <div className="w-24 h-24 bg-stone-50 border-2 border-dashed border-stone-300 rounded-2xl flex items-center justify-center overflow-hidden relative group hover:border-[#1A1A1A] transition-colors">
                                {pwaFile ? (
                                    <img src={URL.createObjectURL(pwaFile)} className="h-full w-full object-cover" />
                                ) : settings.pwa_icon_url ? (
                                    <img src={settings.pwa_icon_url} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="text-center">
                                        <Camera size={16} className="text-stone-300 mx-auto mb-1 group-hover:text-[#1A1A1A] transition-colors" />
                                        <span className="text-[8px] uppercase font-bold text-stone-400 group-hover:text-[#1A1A1A] transition-colors">Upload Icon</span>
                                    </div>
                                )}
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={e => setPwaFile(e.target.files?.[0] || null)} />
                            </div>
                            <p className="text-[10px] text-stone-400 mt-2">Used when customers "Add to Home Screen". Must be a square image (e.g. 512x512).</p>
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
                            <input type="text" name="instagram_url" value={settings.instagram_url || ''} onChange={handleChange} className="input-field" placeholder="https://instagram.com/..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Facebook URL</label>
                            <input type="text" name="facebook_url" value={settings.facebook_url || ''} onChange={handleChange} className="input-field" placeholder="https://facebook.com/..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Google Review Link</label>
                            <input type="text" name="review_url" value={settings.review_url || ''} onChange={handleChange} className="input-field" placeholder="https://g.page/r/..." />
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
                        <textarea name="promo_banner_text" value={settings.promo_banner_text || ''} onChange={handleChange} className="input-field h-20" placeholder="Ask about our weekend high-tea specials!" />
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
