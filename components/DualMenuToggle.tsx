'use client'
import { useState } from 'react';
import { BookOpen, List } from 'lucide-react';
import FlipbookMenuWrapper from './FlipbookMenuWrapper';
import DynamicMenu from './DynamicMenu';

interface Props {
    pdfUrl: string;
    settings: any;
}

export default function DualMenuToggle({ pdfUrl, settings }: Props) {
    const [view, setView] = useState<'live' | 'pdf'>('live');

    return (
        <div className="w-full">
            {/* Floating Toggle */}
            <div className="flex justify-center mb-2 sticky top-4 z-50">
                <div className="bg-[#1A1A1A]/90 backdrop-blur border border-stone-800 p-1.5 rounded-full flex shadow-2xl">
                    <button
                        onClick={() => setView('live')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${view === 'live' ? 'bg-[#F4F1EA] text-[#1A1A1A] shadow-md' : 'text-stone-400 hover:text-white'}`}
                    >
                        <List size={12} /> Live Menu
                    </button>
                    <button
                        onClick={() => setView('pdf')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${view === 'pdf' ? 'bg-[#F4F1EA] text-[#1A1A1A] shadow-md' : 'text-stone-400 hover:text-white'}`}
                    >
                        <BookOpen size={12} /> PDF Menu
                    </button>
                </div>
            </div>

            {/* Content */}
            {view === 'live' ? (
                <DynamicMenu settings={settings} />
            ) : (
                <FlipbookMenuWrapper pdfUrl={pdfUrl} />
            )}
        </div>
    );
}
