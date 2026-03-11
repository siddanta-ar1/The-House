// lib/stores/cart.ts
// Zustand cart store with localStorage persistence and optimistic updates
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@/types/database'

interface CartState {
    items: CartItem[]
    sessionId: string | null
    restaurantSlug: string | null

    // Actions
    setSession: (sessionId: string, restaurantSlug: string) => void
    addItem: (item: Omit<CartItem, 'quantity'>) => void
    removeItem: (menuItemId: string) => void
    updateQuantity: (menuItemId: string, quantity: number) => void
    updateSpecialRequest: (menuItemId: string, request: string) => void
    clearCart: () => void

    // Computed
    totalAmount: () => number
    totalItems: () => number
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            sessionId: null,
            restaurantSlug: null,

            setSession: (sessionId, restaurantSlug) =>
                set({ sessionId, restaurantSlug }),

            addItem: (item) =>
                set((state) => {
                    const existing = state.items.find(
                        (i) => i.menuItemId === item.menuItemId
                    )
                    if (existing) {
                        return {
                            items: state.items.map((i) =>
                                i.menuItemId === item.menuItemId
                                    ? { ...i, quantity: i.quantity + 1 }
                                    : i
                            ),
                        }
                    }
                    return { items: [...state.items, { ...item, quantity: 1 }] }
                }),

            removeItem: (menuItemId) =>
                set((state) => ({
                    items: state.items.filter((i) => i.menuItemId !== menuItemId),
                })),

            updateQuantity: (menuItemId, quantity) =>
                set((state) => {
                    if (quantity <= 0) {
                        return {
                            items: state.items.filter((i) => i.menuItemId !== menuItemId),
                        }
                    }
                    return {
                        items: state.items.map((i) =>
                            i.menuItemId === menuItemId ? { ...i, quantity } : i
                        ),
                    }
                }),

            updateSpecialRequest: (menuItemId, request) =>
                set((state) => ({
                    items: state.items.map((i) =>
                        i.menuItemId === menuItemId
                            ? { ...i, specialRequest: request }
                            : i
                    ),
                })),

            clearCart: () => set({ items: [] }),

            totalAmount: () =>
                get().items.reduce(
                    (total, item) => total + item.price * item.quantity,
                    0
                ),

            totalItems: () =>
                get().items.reduce((total, item) => total + item.quantity, 0),
        }),
        {
            name: 'srms-cart',
            // Only persist items and session info
            partialize: (state) => ({
                items: state.items,
                sessionId: state.sessionId,
                restaurantSlug: state.restaurantSlug,
            }),
        }
    )
)
