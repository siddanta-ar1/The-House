'use client'

import { useCartStore } from '@/lib/stores/cart'
import { formatCurrency } from '@/lib/utils'
import { Plus, Minus } from 'lucide-react'
import Image from 'next/image'
import type { MenuItem } from '@/types/database'

export default function MenuItemCard({ item, sessionId, restaurantSlug }: {
    item: MenuItem,
    sessionId?: string,
    restaurantSlug: string
}) {
    const { items, addItem, removeItem, updateQuantity, setSession } = useCartStore()

    const cartItem = items.find((i) => i.menuItemId === item.id)
    const quantity = cartItem?.quantity || 0

    const handleAdd = () => {
        if (!sessionId) return // View only mode

        // Ensure session is set in store
        setSession(sessionId, restaurantSlug)

        if (quantity > 0) {
            updateQuantity(item.id, quantity + 1)
        } else {
            addItem({
                menuItemId: item.id,
                name: item.name,
                price: item.price,
                imageUrl: item.image_url || undefined,
            })
        }
    }

    const handleRemove = () => {
        if (quantity > 1) {
            updateQuantity(item.id, quantity - 1)
        } else if (quantity === 1) {
            removeItem(item.id)
        }
    }

    return (
        <div className="bg-white rounded-[var(--border-radius)] shadow-md border border-gray-100 flex flex-col overflow-hidden transition-all hover:shadow-lg active:scale-[0.98]">
            {/* Edge-to-edge Image Header */}
            <div className="relative w-full aspect-[4/3] bg-gray-100 shrink-0">
                {item.image_url ? (
                    <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <span className="text-gray-400 font-medium opacity-50 text-sm">No Image</span>
                    </div>
                )}

                {/* Sold Out Overlay */}
                {!item.is_available && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
                        <span className="bg-white text-gray-800 font-bold px-4 py-2 rounded-full shadow-lg text-sm tracking-wide">
                            Sold Out
                        </span>
                    </div>
                )}
            </div>

            {/* Content Body */}
            <div className="p-4 flex flex-col flex-1">
                <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-bold text-lg text-gray-900 leading-tight">{item.name}</h3>
                    <div className="font-bold text-[var(--color-primary)] shrink-0">
                        {formatCurrency(item.price)}
                    </div>
                </div>

                {item.description && (
                    <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed flex-1 mb-4">
                        {item.description}
                    </p>
                )}

                {/* Footer Actions */}
                <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                    {!sessionId ? (
                        <span className="text-xs font-medium px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg">View Only</span>
                    ) : quantity === 0 ? (
                        <button
                            onClick={handleAdd}
                            disabled={!item.is_available}
                            className={`flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white w-full justify-center rounded-lg font-medium shadow-sm active:scale-95 transition-all
                            ${!item.is_available ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 hover:shadow-md'}`}
                        >
                            <Plus size={18} /> Add
                        </button>
                    ) : (
                        <div className="flex items-center justify-between w-full bg-gray-50 rounded-lg p-1 border border-gray-200">
                            <button
                                onClick={handleRemove}
                                className="w-10 h-10 flex items-center justify-center rounded-md bg-white shadow-sm text-gray-600 active:bg-gray-100 active:scale-95 transition-all"
                            >
                                <Minus size={18} />
                            </button>
                            <span className="font-semibold text-gray-900 w-8 text-center">{quantity}</span>
                            <button
                                onClick={handleAdd}
                                className="w-10 h-10 flex items-center justify-center rounded-md bg-[var(--color-primary)] shadow-sm text-white active:opacity-80 active:scale-95 transition-all"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
