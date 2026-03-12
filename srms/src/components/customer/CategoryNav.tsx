'use client'

import { useRef } from 'react'
import type { MenuCategory } from '@/types/database'

export default function CategoryNav({
    categories,
    activeCategory,
    onCategoryChange,
}: {
    categories: MenuCategory[]
    activeCategory: string
    onCategoryChange: (id: string) => void
}) {
    const scrollRef = useRef<HTMLDivElement>(null)

    const isActive = (id: string) => activeCategory === id

    return (
        <div className="relative border-b border-gray-200">
            <div
                ref={scrollRef}
                className="flex overflow-x-auto hide-scrollbar gap-6 pb-2"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                <button
                    onClick={() => onCategoryChange('all')}
                    className={`whitespace-nowrap pb-2 border-b-2 font-medium transition ${
                        isActive('all')
                            ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                            : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                >
                    All
                </button>
                {categories.map((c) => (
                    <button
                        key={c.id}
                        onClick={() => onCategoryChange(c.id)}
                        className={`whitespace-nowrap pb-2 border-b-2 font-medium transition ${
                            isActive(c.id)
                                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                                : 'border-transparent text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        {c.name}
                    </button>
                ))}
            </div>
        </div>
    )
}
