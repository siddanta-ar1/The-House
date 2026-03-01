'use client'
import React from 'react';

// Require client-side only rendering due to ReactPlayer hydration issues with hydration
import dynamic from 'next/dynamic';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;

interface Props {
    videoUrl: string;
}

export default function PromoVideo({ videoUrl }: Props) {
    if (!videoUrl) return null;

    return (
        <section className="bg-[#1A1A1A] py-20 text-[#E5E0D8] relative overflow-hidden">
            <div className="max-w-4xl mx-auto px-6 relative z-10">
                <div className="text-center mb-10">
                    <h2 className="text-[#C6A87C] font-serif uppercase tracking-[0.3em] text-sm mb-4">Our Story</h2>
                    <div className="h-[1px] w-12 bg-[#C6A87C]/30 mx-auto mb-4" />
                    <h3 className="font-serif text-3xl font-bold tracking-tight text-white">
                        Watch Us in Action
                    </h3>
                </div>

                <div className="rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-stone-800 bg-black aspect-video relative">
                    <ReactPlayer
                        url={videoUrl}
                        width="100%"
                        height="100%"
                        controls={true}
                        playing={false}
                        light={true} // Shows a thumbnail until clicked
                        config={{
                            youtube: {
                                playerVars: { showinfo: 0, rel: 0 }
                            }
                        }}
                    />
                </div>
            </div>
        </section>
    );
}
