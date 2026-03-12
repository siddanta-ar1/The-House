'use client'

import { useState } from 'react'
import { useCartStore } from '@/lib/stores/cart'
import { useHydratedStore } from '@/lib/stores/useHydratedStore'
import { formatCurrency } from '@/lib/utils'
import { Plus, Minus, X, Check } from 'lucide-react'
import Image from 'next/image'
import type { MenuItem, CartItemModifier } from '@/types/database'

export default function MenuItemCard({ item, sessionId, restaurantSlug, restaurantId }: {
    item: MenuItem,
    sessionId?: string,
    restaurantSlug: string,
    restaurantId?: string
}) {
    const items = useHydratedStore(useCartStore, (s) => s.items)
    const addItem = useCartStore((s) => s.addItem)
    const removeItem = useCartStore((s) => s.removeItem)
    const updateQuantity = useCartStore((s) => s.updateQuantity)
    const setSession = useCartStore((s) => s.setSession)

    const [showModifiers, setShowModifiers] = useState(false)
    const [selectedMods, setSelectedMods] = useState<Record<string, string[]>>({})

    const cartItem = items.find((i) => i.menuItemId === item.id)
    const quantity = cartItem?.quantity || 0

    const hasModifiers = item.modifier_groups && item.modifier_groups.length > 0

    function initModSelections() {
        const init: Record<string, string[]> = {}
        item.modifier_groups?.forEach(g => { init[g.id] = [] })
        setSelectedMods(init)
    }

    const handleAdd = () => {
        if (!sessionId) return
        setSession(sessionId, restaurantSlug, restaurantId)

        // If item has modifier groups and this is the first add, show modal
        if (hasModifiers && quantity === 0) {
            initModSelections()
            setShowModifiers(true)
            return
        }

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

    function handleConfirmModifiers() {
        // Validate required selections
        for (const group of item.modifier_groups || []) {
            const selected = selectedMods[group.id] || []
            if (selected.length < group.min_selections) {
                return // Don't close — show validation state
            }
        }

        // Build modifier list
        const modifiers: CartItemModifier[] = []
        for (const group of item.modifier_groups || []) {
            for (const modId of (selectedMods[group.id] || [])) {
                const mod = group.modifiers?.find(m => m.id === modId)
                if (mod) {
                    modifiers.push({
                        modifierId: mod.id,
                        name: mod.name,
                        priceAdjustment: mod.price_adjustment,
                    })
                }
            }
        }

        const modifierTotal = modifiers.reduce((s, m) => s + m.priceAdjustment, 0)

        addItem({
            menuItemId: item.id,
            name: item.name,
            price: item.price + modifierTotal,
            imageUrl: item.image_url || undefined,
            modifiers,
        })

        setShowModifiers(false)
    }

    function toggleModifier(groupId: string, modId: string, maxSelections: number) {
        setSelectedMods(prev => {
            const current = prev[groupId] || []
            if (current.includes(modId)) {
                return { ...prev, [groupId]: current.filter(id => id !== modId) }
            }
            if (current.length >= maxSelections) {
                // Replace last selection if at max
                return { ...prev, [groupId]: [...current.slice(0, -1), modId] }
            }
            return { ...prev, [groupId]: [...current, modId] }
        })
    }

    const handleRemove = () => {
        if (quantity > 1) {
            updateQuantity(item.id, quantity - 1)
        } else if (quantity === 1) {
            removeItem(item.id)
        }
    }

    return (
        <>
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

        {/* Modifier Selection Modal */}
        {showModifiers && item.modifier_groups && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
                <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[85vh] flex flex-col">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-gray-900">{item.name}</h3>
                            <p className="text-sm text-gray-500">Customize your order</p>
                        </div>
                        <button onClick={() => setShowModifiers(false)}
                            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="overflow-y-auto flex-1 p-4 space-y-5">
                        {item.modifier_groups.map(group => {
                            const selected = selectedMods[group.id] || []
                            const isRequired = group.min_selections > 0
                            const isSatisfied = selected.length >= group.min_selections
                            return (
                                <div key={group.id}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <h4 className="font-semibold text-gray-900 text-sm">{group.name}</h4>
                                        {isRequired && !isSatisfied && (
                                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Required</span>
                                        )}
                                        {isRequired && isSatisfied && (
                                            <Check size={14} className="text-green-600" />
                                        )}
                                        <span className="text-xs text-gray-400 ml-auto">
                                            {group.max_selections === 1 ? 'Choose 1' : `Up to ${group.max_selections}`}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        {group.modifiers?.filter(m => m.is_available).map(mod => {
                                            const isSelected = selected.includes(mod.id)
                                            return (
                                                <button key={mod.id}
                                                    onClick={() => toggleModifier(group.id, mod.id, group.max_selections)}
                                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition ${isSelected
                                                        ? 'border-gray-900 bg-gray-900/5'
                                                        : 'border-gray-200 hover:bg-gray-50'}`}>
                                                    <span className={isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}>
                                                        {mod.name}
                                                    </span>
                                                    <span className="text-gray-500">
                                                        {mod.price_adjustment > 0 ? `+${formatCurrency(mod.price_adjustment)}` : mod.price_adjustment < 0 ? formatCurrency(mod.price_adjustment) : 'Free'}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="p-4 border-t border-gray-100">
                        <button onClick={handleConfirmModifiers}
                            className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium text-sm active:scale-[0.98] transition">
                            Add to Cart — {formatCurrency(item.price + Object.values(selectedMods).flat().reduce((sum, modId) => {
                                const mod = item.modifier_groups?.flatMap(g => g.modifiers || []).find(m => m.id === modId)
                                return sum + (mod?.price_adjustment || 0)
                            }, 0))}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    )
}
