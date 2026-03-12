// lib/stores/cart.ts
// Zustand cart store with localStorage persistence and optimistic updates
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, PromoCode, LoyaltyMember } from '@/types/database'

// Safety cap — prevents malicious users from adding absurd quantities
// that could overflow NUMERIC(10,2) in the database
const MAX_QUANTITY_PER_ITEM = 20

interface CartState {
    items: CartItem[]
    sessionId: string | null
    restaurantSlug: string | null
    restaurantId: string | null

    // Promo & loyalty
    promoCode: PromoCode | null
    promoDiscount: number
    loyaltyMember: LoyaltyMember | null
    loyaltyDiscount: number

    // Actions
    setSession: (sessionId: string, restaurantSlug: string, restaurantId?: string) => void
    addItem: (item: Omit<CartItem, 'quantity'>) => void
    removeItem: (menuItemId: string) => void
    updateQuantity: (menuItemId: string, quantity: number) => void
    updateSpecialRequest: (menuItemId: string, request: string) => void
    setPromo: (promo: PromoCode | null, discount: number) => void
    setLoyaltyMember: (member: LoyaltyMember | null) => void
    setLoyaltyDiscount: (discount: number) => void
    clearCart: () => void

    // Computed
    totalAmount: () => number
    totalItems: () => number
    finalTotal: () => number
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            sessionId: null,
            restaurantSlug: null,
            restaurantId: null,
            promoCode: null,
            promoDiscount: 0,
            loyaltyMember: null,
            loyaltyDiscount: 0,

            setSession: (sessionId, restaurantSlug, restaurantId) =>
                set({ sessionId, restaurantSlug, restaurantId: restaurantId || null }),

            addItem: (item) =>
                set((state) => {
                    const existing = state.items.find(
                        (i) => i.menuItemId === item.menuItemId
                    )
                    if (existing) {
                        return {
                            items: state.items.map((i) =>
                                i.menuItemId === item.menuItemId
                                    ? { ...i, quantity: Math.min(i.quantity + 1, MAX_QUANTITY_PER_ITEM) }
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
                    const capped = Math.min(quantity, MAX_QUANTITY_PER_ITEM)
                    return {
                        items: state.items.map((i) =>
                            i.menuItemId === menuItemId ? { ...i, quantity: capped } : i
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

            clearCart: () => set({
                items: [],
                promoCode: null,
                promoDiscount: 0,
                loyaltyMember: null,
                loyaltyDiscount: 0,
            }),

            setPromo: (promo, discount) =>
                set({ promoCode: promo, promoDiscount: discount }),

            setLoyaltyMember: (member) =>
                set({ loyaltyMember: member }),

            setLoyaltyDiscount: (discount) =>
                set({ loyaltyDiscount: discount }),

            totalAmount: () =>
                get().items.reduce(
                    (total, item) => {
                        const modifierTotal = (item.modifiers || []).reduce(
                            (sum, mod) => sum + mod.priceAdjustment, 0
                        )
                        return total + (item.price + modifierTotal) * item.quantity
                    },
                    0
                ),

            totalItems: () =>
                get().items.reduce((total, item) => total + item.quantity, 0),

            finalTotal: () => {
                const subtotal = get().totalAmount()
                const promoDisc = get().promoDiscount
                const loyaltyDisc = get().loyaltyDiscount
                return Math.max(0, subtotal - promoDisc - loyaltyDisc)
            },
        }),
        {
            name: 'srms-cart',
            // Only persist items and session info
            partialize: (state) => ({
                items: state.items,
                sessionId: state.sessionId,
                restaurantSlug: state.restaurantSlug,
                restaurantId: state.restaurantId,
                promoCode: state.promoCode,
                promoDiscount: state.promoDiscount,
                loyaltyMember: state.loyaltyMember,
                loyaltyDiscount: state.loyaltyDiscount,
            }),
        }
    )
)
