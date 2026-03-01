import React from 'react';
import { Clock, MapPin, Wifi, Check, Dog } from 'lucide-react';

interface BusinessInfo {
    about_text?: string;
    amenities?: {
        wifi?: boolean;
        wheelchair?: boolean;
        pet_friendly?: boolean;
    };
    hours?: {
        monday?: string;
        tuesday?: string;
        wednesday?: string;
        thursday?: string;
        friday?: string;
        saturday?: string;
        sunday?: string;
    };
}

interface Props {
    businessInfo: BusinessInfo;
    address?: string;
}

export default function BusinessDetails({ businessInfo, address }: Props) {
    if (!businessInfo || Object.keys(businessInfo).length === 0) return null;

    const { about_text, amenities, hours } = businessInfo;

    // Helper to safely check if hours exist
    const hasHours = hours && Object.values(hours).some(h => h && h.trim() !== '');

    return (
        <section className="bg-[#EAE5D9] text-[#3D2B1F] py-20 border-t border-[#D6D0C4]">
            <div className="max-w-6xl mx-auto px-6">

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">

                    {/* Left Column: About & Amenities */}
                    <div>
                        {about_text && (
                            <div className="mb-12">
                                <h3 className="text-[#3D2B1F] font-bold text-xs uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                    <MapPin size={14} /> The Cafe
                                </h3>
                                <p className="font-serif text-lg leading-relaxed text-[#5C4D43]">
                                    {about_text}
                                </p>
                                {address && (
                                    <p className="text-sm font-bold uppercase tracking-widest mt-6 pt-6 border-t border-[#D6D0C4]/50">
                                        📍 {address}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Amenities Badges */}
                        {amenities && (amenities.wifi || amenities.wheelchair || amenities.pet_friendly) && (
                            <div>
                                <h3 className="text-[#3D2B1F] font-bold text-[10px] uppercase tracking-[0.3em] mb-4">Amenities</h3>
                                <div className="flex flex-wrap gap-3">
                                    {amenities.wifi && (
                                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-white/50 px-3 py-1.5 rounded-full border border-[#D6D0C4]">
                                            <Wifi size={12} /> Free WiFi
                                        </span>
                                    )}
                                    {amenities.wheelchair && (
                                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-white/50 px-3 py-1.5 rounded-full border border-[#D6D0C4]">
                                            <Check size={12} /> Wheelchair Accessible
                                        </span>
                                    )}
                                    {amenities.pet_friendly && (
                                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-white/50 px-3 py-1.5 rounded-full border border-[#D6D0C4]">
                                            <Dog size={12} /> Pet Friendly Patio
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Operating Hours */}
                    {hasHours && (
                        <div className="bg-[#F4F1EA] p-8 md:p-12 rounded-[32px] shadow-sm border border-[#D6D0C4] flex flex-col justify-center">
                            <h3 className="text-[#3D2B1F] font-bold text-xs uppercase tracking-[0.3em] mb-8 flex items-center gap-3 border-b border-[#D6D0C4] pb-4">
                                <Clock size={16} /> Opening Hours
                            </h3>

                            <ul className="space-y-4">
                                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                                    const dayHours = hours[day as keyof typeof hours];
                                    if (!dayHours) return null;

                                    return (
                                        <li key={day} className="flex justify-between items-center text-sm">
                                            <span className="font-bold uppercase tracking-widest text-stone-500 w-24">
                                                {day.substring(0, 3)}
                                            </span>
                                            <span className="font-serif italic text-lg text-[#3D2B1F]">
                                                {dayHours === 'Closed' ? (
                                                    <span className="text-stone-400">Closed</span>
                                                ) : (
                                                    dayHours
                                                )}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}

                </div>
            </div>
        </section>
    );
}
