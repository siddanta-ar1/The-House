'use client'

import { useCartStore } from '@/lib/stores/cart'
import { formatCurrency } from '@/lib/utils'
import { ShoppingBag } from 'lucide-react'
import Link from 'next/link'

export default function CartSummary({ sessionId }: { sessionId?: string }) {
    const { totalItems, totalAmount } = useCartStore()

    const count = totalItems()
    const amount = totalAmount()

    // Don't show if empty or if no active session (view only mode)
    if (count === 0 || !sessionId) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-50 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
            <div className="max-w-2xl mx-auto pointer-events-auto">
                <Link
                    href={`/t/placeholder/checkout`} // Will fix real path mapping via store state context later
                    className="flex items-center justify-between w-full bg-[var(--color-primary)] text-white p-4 rounded-xl shadow-xl shadow-[var(--color-primary)]/20 active:scale-[0.98] transition-transform"
                >
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <ShoppingBag size={24} />
                            <span className="absolute -top-1 -right-2 bg-white text-[var(--color-primary)] text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                                {count}
                            </span>
                        </div>
                        <span className="font-medium">View Cart</span>
                    </div>

                    <div className="font-bold text-lg">
                        {formatCurrency(amount)}
                    </div>
                </Link>
            </div>
        </div>
    )
}
