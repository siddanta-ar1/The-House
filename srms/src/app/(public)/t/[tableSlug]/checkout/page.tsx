'use client'

import { useCartStore } from '@/lib/stores/cart'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { placeOrder } from './actions'
import { useState } from 'react'
import { ArrowLeft, Trash2, Plus, Minus, Loader2 } from 'lucide-react'

export default async function CheckoutPage(props: {
    params: Promise<{ tableSlug: string }>
}) {
    const params = await props.params;
    const tableSlug = params.tableSlug;
    const { items, sessionId, removeItem, updateQuantity, totalAmount, totalItems, clearCart, restaurantSlug } = useCartStore()
    const [note, setNote] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const router = useRouter()

    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="text-gray-400 mb-4 flex justify-center">
                        <ShoppingBagIcon className="w-16 h-16" />
                    </div>
                    <h2 className="text-xl font-medium text-gray-900 mb-2">Your cart is empty</h2>
                    <button
                        onClick={() => router.back()}
                        className="text-[var(--color-primary)] font-medium"
                    >
                        Go back to menu
                    </button>
                </div>
            </div>
        )
    }

    const handleCheckout = async () => {
        if (!sessionId) {
            setErrorMsg("No active session found. Please scan the QR code again.")
            return
        }

        setIsSubmitting(true)
        setErrorMsg('')

        const res = await placeOrder(sessionId, restaurantSlug || params.tableSlug, items, note)

        if (res.error) {
            setErrorMsg(res.error)
            setIsSubmitting(false)
        } else if (res.orderId) {
            clearCart()
            router.push(`/t/${params.tableSlug}/order/${res.orderId}`)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            {/* Header */}
            <header className="bg-white px-4 py-4 shadow-sm sticky top-0 z-20 flex items-center gap-3">
                <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-600 rounded-full active:bg-gray-100">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-semibold text-gray-900">Checkout</h1>
            </header>

            <main className="max-w-xl mx-auto px-4 mt-6">
                {errorMsg && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                        {errorMsg}
                    </div>
                )}

                <div className="bg-white rounded-[var(--border-radius)] shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="font-semibold text-gray-700">Order Summary ({totalItems()} items)</h2>
                    </div>

                    <ul className="divide-y divide-gray-100">
                        {items.map((item) => (
                            <li key={item.menuItemId} className="p-4 flex gap-4 bg-white">
                                <div className="flex-1">
                                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                                    <div className="text-[var(--color-primary)] font-medium mt-1">
                                        {formatCurrency(item.price * item.quantity)}
                                    </div>
                                </div>

                                <div className="flex flex-col items-end justify-between">
                                    <div className="flex items-center gap-3 bg-gray-50 rounded-full p-1 border border-gray-200">
                                        <button
                                            onClick={() => item.quantity === 1 ? removeItem(item.menuItemId) : updateQuantity(item.menuItemId, item.quantity - 1)}
                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-600 active:bg-gray-100"
                                        >
                                            {item.quantity === 1 ? <Trash2 size={16} className="text-red-500" /> : <Minus size={16} />}
                                        </button>
                                        <span className="font-medium w-4 text-center">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-primary)] shadow-sm text-white"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Note */}
                <div className="bg-white rounded-[var(--border-radius)] shadow-sm border border-gray-100 p-4 mb-6">
                    <label htmlFor="note" className="block font-semibold text-gray-700 mb-2">Add a note to kitchen</label>
                    <textarea
                        id="note"
                        rows={2}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                        placeholder="E.g. No onions, extra spicy..."
                    />
                </div>
            </main>

            {/* Persistent Bottom Checkout Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 z-50 bg-white border-t border-gray-200">
                <div className="max-w-xl mx-auto">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-600 font-medium">Total to pay</span>
                        <span className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount())}</span>
                    </div>

                    <button
                        onClick={handleCheckout}
                        disabled={isSubmitting}
                        className="w-full bg-[var(--color-primary)] text-white font-medium rounded-xl py-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-70 disabled:active:scale-100 shadow-lg shadow-[var(--color-primary)]/20"
                    >
                        {isSubmitting ? (
                            <><Loader2 className="animate-spin" size={20} /> Sending to Kitchen...</>
                        ) : (
                            'Place Order'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

function ShoppingBagIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <path d="M3 6h18" />
            <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
    )
}
