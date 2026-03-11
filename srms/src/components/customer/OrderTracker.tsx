'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, timeAgo } from '@/lib/utils'
import { CheckCircle2, ChefHat, Package, CheckCircle, Clock } from 'lucide-react'
import type { Order, OrderItem, MenuItem } from '@/types/database'

type OrderWithItems = Order & {
    order_items?: (OrderItem & { menu_items?: Partial<MenuItem> })[]
}

export default function OrderTracker({ orderId, initialOrder }: { orderId: string, initialOrder: OrderWithItems }) {
    const [order, setOrder] = useState<OrderWithItems>(initialOrder)
    const supabase = createClient()

    useEffect(() => {
        // 1. Subscribe to the specific order channel
        const channel = supabase
            .channel(`order:${orderId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
                (payload) => {
                    setOrder((prev) => ({ ...prev, ...(payload.new as Order) }))
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [orderId, supabase])

    const steps = [
        { id: 'pending', label: 'Received', icon: Clock },
        { id: 'confirmed', label: 'Confirmed', icon: CheckCircle },
        { id: 'preparing', label: 'Preparing', icon: ChefHat },
        { id: 'ready', label: 'Ready', icon: Package },
        { id: 'delivered', label: 'Delivered', icon: CheckCircle2 },
    ]

    const currentStepIndex = steps.findIndex(s => s.id === order.status)

    // Waiter action required simulation
    const isActionNeeded = order.status === 'ready'

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-[var(--border-radius)] shadow-sm border border-gray-100 p-6 overflow-hidden relative">
                {/* Status Header */}
                <div className="text-center mb-8 relative z-10">
                    <h2 className="text-2xl font-bold font-[family-name:var(--font-family)] text-gray-900">
                        {isActionNeeded ? 'Ready for Delivery!' : 'Order Status'}
                    </h2>
                    <p className="text-gray-500 mt-1">
                        Order #{orderId.substring(0, 5).toUpperCase()}
                        <span className="mx-2">•</span>
                        {timeAgo(order.placed_at)}
                    </p>
                </div>

                {/* Stepper */}
                <div className="relative z-10">
                    <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-gray-100 -z-10"></div>

                    <div className="space-y-8">
                        {steps.map((step, index) => {
                            const StateIcon = step.icon
                            const isCompleted = index <= currentStepIndex
                            const isCurrent = index === currentStepIndex

                            return (
                                <div key={step.id} className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-4 border-white transition-colors duration-500 ${isCurrent
                                        ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30'
                                        : isCompleted
                                            ? 'bg-[var(--color-secondary)] text-white'
                                            : 'bg-gray-100 text-gray-400'
                                        }`}>
                                        <StateIcon size={24} className={isCurrent ? 'animate-pulse' : ''} />
                                    </div>
                                    <div>
                                        <h3 className={`font-semibold ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                                            {step.label}
                                        </h3>
                                        {isCurrent && (
                                            <p className="text-sm text-gray-500 mt-0.5 animate-pulse">
                                                {step.id === 'pending' && 'Waiting for kitchen to confirm...'}
                                                {step.id === 'confirmed' && 'Kitchen has received your order.'}
                                                {step.id === 'preparing' && 'The chef is preparing your food.'}
                                                {step.id === 'ready' && 'Your order is ready! A waiter is bringing it.'}
                                                {step.id === 'delivered' && 'Enjoy your meal!'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Background accent */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--color-primary)] opacity-5 rounded-full blur-3xl pointer-events-none"></div>
            </div>

            {/* Order Details */}
            <div className="bg-white rounded-[var(--border-radius)] shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 pb-4 border-b border-gray-100">Order Details</h3>

                <ul className="divide-y divide-gray-50">
                    {order.order_items?.map((item) => (
                        <li key={item.id} className="py-3 flex justify-between">
                            <div>
                                <span className="font-medium mr-2">{item.quantity}x</span>
                                <span className="text-gray-700">{item.menu_items?.name}</span>
                                {item.special_request && (
                                    <p className="text-xs text-gray-400 mt-1">Note: {item.special_request}</p>
                                )}
                            </div>
                            <span className="font-medium text-[var(--color-primary)]">
                                {formatCurrency(item.unit_price * item.quantity)}
                            </span>
                        </li>
                    ))}
                </ul>

                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center px-1">
                    <span className="font-semibold text-gray-600">Total</span>
                    <span className="font-bold text-xl text-gray-900">{formatCurrency(order.total_amount)}</span>
                </div>
            </div>
        </div>
    )
}
