'use client'

import { useState } from 'react'
import MenuItemCard from './MenuItemCard'
import type { MenuCategory, MenuItem } from '@/types/database'

export default function MenuGrid({ categories, items, sessionId, restaurantSlug }: {
    categories: MenuCategory[],
    items: MenuItem[],
    sessionId?: string,
    restaurantSlug: string
}) {
    const [activeCategory, setActiveCategory] = useState(categories[0]?.id || 'all')

    const filteredItems = items.filter((item) =>
        (activeCategory === 'all' || item.category_id === activeCategory)
    )

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
            {filteredItems.map((item) => (
                <MenuItemCard
                    key={item.id}
                    item={item}
                    sessionId={sessionId}
                    restaurantSlug={restaurantSlug}
                />
            ))}

            {filteredItems.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                    No items found in this category.
                </div>
            )}
        </div>
    )
}
