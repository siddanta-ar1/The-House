'use client'

import { useState } from 'react'
import CategoryNav from './CategoryNav'
import MenuGrid from './MenuGrid'
import type { MenuCategory, MenuItem } from '@/types/database'

export default function MenuSection({
    categories,
    items,
    sessionId,
    restaurantSlug,
    restaurantId,
}: {
    categories: MenuCategory[]
    items: MenuItem[]
    sessionId?: string
    restaurantSlug: string
    restaurantId?: string
}) {
    const [activeCategory, setActiveCategory] = useState('all')

    return (
        <>
            <CategoryNav
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
            />

            <div className="mt-8">
                <MenuGrid
                    items={items}
                    sessionId={sessionId}
                    restaurantSlug={restaurantSlug}
                    restaurantId={restaurantId}
                    activeCategory={activeCategory}
                />
            </div>
        </>
    )
}
