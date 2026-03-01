'use client'
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;

interface VideoItem {
    id: string;
    video_url: string;
    title: string;
}

interface Props {
    videos: VideoItem[];
    // Legacy single URL fallback
    legacyUrl?: string;
}

export default function PromoVideo({ videos, legacyUrl }: Props) {
    const [activeIndex, setActiveIndex] = useState(0);

    // Build combined list: new table entries + legacy single URL fallback
    const allVideos: VideoItem[] = [
        ...videos,
        ...(legacyUrl && videos.length === 0 ? [{ id: 'legacy', video_url: legacyUrl, title: '' }] : [])
    ];

    if (allVideos.length === 0) return null;

    const hasMultiple = allVideos.length > 1;
    const current = allVideos[activeIndex];

    return (
        <section className="bg-[#1A1A1A] py-20 text-[#E5E0D8] relative overflow-hidden">
            <div className="max-w-4xl mx-auto px-6 relative z-10">
                <div className="text-center mb-10">
                    <h2 className="text-[#C6A87C] font-serif uppercase tracking-[0.3em] text-sm mb-4">Our Story</h2>
                    <div className="h-[1px] w-12 bg-[#C6A87C]/30 mx-auto mb-4" />
                    <h3 className="font-serif text-3xl font-bold tracking-tight text-white">
                        {current.title || 'Watch Us in Action'}
                    </h3>
                </div>

                {/* Video Player */}
                <div className="rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-stone-800 bg-black aspect-video relative">
                    <ReactPlayer
                        key={current.id}
                        url={current.video_url}
                        width="100%"
                        height="100%"
                        controls={true}
                        playing={false}
                        light={true}
                        config={{
                            youtube: {
                                playerVars: { showinfo: 0, rel: 0 }
                            }
                        }}
                    />
                </div>

                {/* Navigation — only if multiple videos */}
                {hasMultiple && (
                    <div className="flex items-center justify-center gap-6 mt-8">
                        <button
                            onClick={() => setActiveIndex(i => (i - 1 + allVideos.length) % allVideos.length)}
                            className="p-3 bg-stone-800 rounded-full hover:bg-stone-700 transition-colors text-white"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        {/* Dots */}
                        <div className="flex gap-2">
                            {allVideos.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveIndex(i)}
                                    className={`w-2 h-2 rounded-full transition-all ${i === activeIndex ? 'bg-[#C6A87C] w-6' : 'bg-stone-600 hover:bg-stone-500'}`}
                                />
                            ))}
                        </div>

                        <button
                            onClick={() => setActiveIndex(i => (i + 1) % allVideos.length)}
                            className="p-3 bg-stone-800 rounded-full hover:bg-stone-700 transition-colors text-white"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
