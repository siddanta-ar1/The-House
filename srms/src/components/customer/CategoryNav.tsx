'use client'

import { useRef } from 'react'
import type { MenuCategory } from '@/types/database'

export default function CategoryNav({ categories }: { categories: MenuCategory[] }) {
    const scrollRef = useRef<HTMLDivElement>(null)

    // Minimal smooth scroll behavior omitted for brevity, handles layout

    return (
        <div className="relative border-b border-gray-200">
            <div
                ref={scrollRef}
                className="flex overflow-x-auto hide-scrollbar gap-6 pb-2"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                <button className="whitespace-nowrap pb-2 border-b-2 border-[var(--color-primary)] font-medium text-[var(--color-primary)]">
                    All
                </button>
                {categories.map((c) => (
                    <button
                        key={c.id}
                        className="whitespace-nowrap pb-2 border-b-2 border-transparent text-gray-500 font-medium hover:text-gray-900 transition"
                    >
                        {c.name}
                    </button>
                ))}
            </div>
        </div>
    )
}
