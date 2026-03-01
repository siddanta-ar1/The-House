import React from 'react';

interface GalleryImage {
    id: string;
    image_url: string;
    display_order: number;
}

interface Props {
    images: GalleryImage[];
}

export default function AtmosphereGallery({ images }: Props) {
    if (!images || images.length === 0) return null;

    return (
        <section className="py-20 bg-[#F4F1EA] text-[#3D2B1F]">
            <div className="max-w-6xl mx-auto px-6">

                <div className="text-center mb-12">
                    <h2 className="text-[#3D2B1F] font-serif uppercase tracking-[0.3em] text-sm mb-4">Atmosphere</h2>
                    <div className="h-[1px] w-12 bg-[#3D2B1F]/30 mx-auto mb-4" />
                    <h3 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-[#3D2B1F]">
                        The House Experience
                    </h3>
                </div>

                {/* Masonry CSS Grid Layout */}
                <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
                    {images.map((img) => (
                        <div
                            key={img.id}
                            className="break-inside-avoid relative group overflow-hidden rounded-2xl shadow-sm border border-[#3D2B1F]/10"
                        >
                            <img
                                src={img.image_url}
                                alt="Atmosphere Gallery"
                                className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500 pointer-events-none" />
                        </div>
                    ))}
                </div>

            </div>
        </section>
    );
}
